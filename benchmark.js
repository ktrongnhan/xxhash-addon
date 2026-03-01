'use strict';
const { XXHash128, XXHash3, XXHash64 } = require('./xxhash-addon');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs');

// ── Sanitizer guard ──
if (process.env.DEBUG === '1') {
  console.error(
    'ERROR: DEBUG=1 — addon may be built with sanitizers (2-5x slower).\n' +
    'Rebuild without sanitizers first: npm install'
  );
  process.exit(1);
}

// ── Configuration ──
const SIZES = [1024, 4096, 16384, 65536, 262144, 1048576, 16777216];
const TARGET_MS = 1000;     // target ~1 s per measured run
const WARMUP = 2;
const RUNS = 5;
const HEADLINE_CHUNK = 65536;
const SEED = Buffer.alloc(8, 0);
const HAS_CRYPTO_HASH = typeof crypto.hash === 'function';

// ── Pre-allocate and fill buffers ──
const buffers = new Map();
for (const size of SIZES) {
  const buf = Buffer.alloc(size);
  crypto.randomFillSync(buf);
  buffers.set(size, buf);
}

// ── Utilities ──
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length & 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sizeLabel(bytes) {
  if (bytes >= 1 << 20) return (bytes >> 20) + 'MB';
  if (bytes >= 1 << 10) return (bytes >> 10) + 'KB';
  return bytes + 'B';
}

function round3(n) { return Math.round(n * 1000) / 1000; }

// ── Calibrate: find iteration count targeting ~TARGET_MS ──
function calibrate(fn) {
  let n = 1;
  for (;;) {
    const t0 = performance.now();
    fn(n);
    const ms = performance.now() - t0;
    if (ms >= 100) return Math.max(1, Math.round(n * TARGET_MS / ms));
    n = ms < 1 ? n * 100 : Math.ceil(n * 200 / ms);
    if (n > 2e9) return n;
  }
}

// ── Measure one benchmark ──
// fn(n) runs n iterations; bytesPerIter = bytes processed per iteration.
function measure(label, fn, bytesPerIter) {
  process.stdout.write(`${label} ...`);
  const n = calibrate(fn);

  for (let i = 0; i < WARMUP; i++) fn(n);

  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    fn(n);
    times.push(performance.now() - t0);
  }

  const totalBytes = n * bytesPerIter;
  const toGbps = (ms) => round3((totalBytes / (1 << 30)) / (ms / 1000));
  const med = median(times);

  process.stdout.write(` ${toGbps(med)} GB/s\n`);

  return {
    median_gbps: toGbps(med),
    min_gbps: toGbps(Math.max(...times)),   // slowest run = lowest throughput
    max_gbps: toGbps(Math.min(...times)),   // fastest run = highest throughput
  };
}

// ── Hasher definitions ──
const XXHASHERS = [['XXH64', XXHash64], ['XXH3', XXHash3], ['XXH128', XXHash128]];
const CRYPTO_ALGOS = [['MD5', 'md5'], ['SHA1', 'sha1']];
const ALL_NAMES = ['XXH64', 'XXH3', 'XXH128', 'MD5', 'SHA1'];

// ═══════════════════════════════════════════
// Part 1: Streaming throughput sweep
// ═══════════════════════════════════════════
function streamingSweep() {
  console.log('\n── Streaming throughput ──');
  const results = [];

  for (const size of SIZES) {
    const buf = buffers.get(size);
    console.log(`\n${sizeLabel(size)}:`);

    for (const [name, Cls] of XXHASHERS) {
      const h = new Cls(SEED);
      const r = measure(`  ${name}`, (n) => {
        h.reset();
        for (let i = 0; i < n; i++) h.update(buf);
        h.digest();
      }, size);
      results.push({ name, size_bytes: size, ...r });
    }

    for (const [name, algo] of CRYPTO_ALGOS) {
      const r = measure(`  ${name}`, (n) => {
        const h = crypto.createHash(algo);
        for (let i = 0; i < n; i++) h.update(buf);
        h.digest();
      }, size);
      results.push({ name, size_bytes: size, ...r });
    }
  }

  return results;
}

// ═══════════════════════════════════════════
// Part 2: One-shot throughput sweep
// ═══════════════════════════════════════════
function oneshotSweep() {
  console.log('\n── One-shot throughput ──');
  const results = [];

  for (const size of SIZES) {
    const buf = buffers.get(size);
    console.log(`\n${sizeLabel(size)}:`);

    for (const [name, Cls] of XXHASHERS) {
      const r = measure(`  ${name}`, (n) => {
        for (let i = 0; i < n; i++) Cls.hash(buf);
      }, size);
      results.push({ name, size_bytes: size, ...r });
    }

    if (HAS_CRYPTO_HASH) {
      for (const [name, algo] of CRYPTO_ALGOS) {
        const r = measure(`  ${name}`, (n) => {
          for (let i = 0; i < n; i++) crypto.hash(algo, buf, 'buffer');
        }, size);
        results.push({ name, size_bytes: size, ...r });
      }
    } else {
      for (const [name, algo] of CRYPTO_ALGOS) {
        const r = measure(`  ${name}`, (n) => {
          for (let i = 0; i < n; i++) crypto.createHash(algo).update(buf).digest();
        }, size);
        results.push({ name, size_bytes: size, ...r });
      }
    }
  }

  return results;
}

// ── Collect metadata ──
function collectMetadata() {
  const cpus = os.cpus();
  return {
    os: os.platform(),
    osVersion: os.version(),
    arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model : 'unknown',
    cpuCount: cpus.length,
    totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    compiler: process.env.BENCHMARK_COMPILER || 'unknown',
    xxhashVersion: '0.8.3',
    sizes: SIZES,
    targetMs: TARGET_MS,
    warmupRuns: WARMUP,
    measuredRuns: RUNS,
    headlineChunk: HEADLINE_CHUNK,
    hasCryptoHash: HAS_CRYPTO_HASH,
    timestamp: new Date().toISOString(),
  };
}

// ── Print summary table ──
function printSweepTable(title, results) {
  console.log(`\n${title}`);
  const nameW = 8;
  const colW = 8;
  let header = 'Hash'.padEnd(nameW);
  for (const s of SIZES) header += sizeLabel(s).padStart(colW);
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const name of ALL_NAMES) {
    let row = name.padEnd(nameW);
    for (const s of SIZES) {
      const r = results.find(x => x.name === name && x.size_bytes === s);
      row += (r ? r.median_gbps.toFixed(2) : '-').padStart(colW);
    }
    console.log(row);
  }
}

// ── Main ──
function main() {
  const metadata = collectMetadata();

  console.log('=== xxhash-addon Benchmark ===');
  console.log(`Platform: ${metadata.os} ${metadata.arch} | CPU: ${metadata.cpuModel}`);
  console.log(`Node: ${metadata.nodeVersion} | Compiler: ${metadata.compiler}`);
  console.log(`Target: ~${TARGET_MS}ms/run | ${WARMUP} warmup + ${RUNS} measured runs`);

  const streaming = streamingSweep();
  const oneshot = oneshotSweep();

  // Extract headline from streaming at HEADLINE_CHUNK size
  const headline = streaming
    .filter(r => r.size_bytes === HEADLINE_CHUNK)
    .map(({ name, median_gbps, min_gbps, max_gbps }) => ({
      name, chunk_bytes: HEADLINE_CHUNK, median_gbps, min_gbps, max_gbps,
    }));

  // ── Summary tables ──
  printSweepTable('=== Streaming Throughput (GB/s) ===', streaming);
  printSweepTable('=== One-shot Throughput (GB/s) ===', oneshot);

  console.log('\n=== Headline: Streaming @ 64 KB chunks (GB/s) ===');
  for (const r of headline) {
    console.log(`  ${r.name.padEnd(8)} ${r.median_gbps.toFixed(2)}`);
  }

  // ── JSON output ──
  const output = { metadata, streaming, oneshot, headline };
  const jsonStr = JSON.stringify(output, null, 2);

  if (process.env.BENCHMARK_OUTPUT) {
    fs.writeFileSync(process.env.BENCHMARK_OUTPUT, jsonStr, 'utf8');
    console.log(`\nJSON written to ${process.env.BENCHMARK_OUTPUT}`);
  }

  console.log('\n--- JSON_START ---');
  console.log(jsonStr);
  console.log('--- JSON_END ---');
}

main();
