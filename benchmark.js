'use strict';
const { XXHash128, XXHash3, XXHash64 } = require('./xxhash-addon');
const { createHash, randomFillSync } = require('node:crypto');
const { Buffer } = require('node:buffer');
const { performance } = require('node:perf_hooks');
const os = require('node:os');
const fs = require('node:fs');

// ── Configuration ──
const BUFFER_SIZE = 2 ** 30;  // 1 GB
const ITERATIONS = 10;        // 10 updates per run = 10 GB per run
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;
const TOTAL_DATA_GB = (BUFFER_SIZE * ITERATIONS) / (2 ** 30);

// ── Deterministic zero seed for reproducibility ──
const seed = Buffer.alloc(8, 0);

// ── Allocate and fill 1 GB input buffer ──
const buf = Buffer.alloc(BUFFER_SIZE);
randomFillSync(buf);

// ── Define hash functions to benchmark ──
function getHashers() {
  const isDebug = !!process.env.DEBUG;
  const hashers = [];

  if (!isDebug) {
    hashers.push({
      name: 'MD5', bits: 128, type: 'crypto',
      create: () => createHash('md5'),
    });
    hashers.push({
      name: 'SHA1', bits: 160, type: 'crypto',
      create: () => createHash('sha1'),
    });
  }

  hashers.push({
    name: 'XXH64', bits: 64, type: 'xxhash',
    instance: new XXHash64(seed),
  });
  hashers.push({
    name: 'XXH3', bits: 64, type: 'xxhash',
    instance: new XXHash3(seed),
  });
  hashers.push({
    name: 'XXH128', bits: 128, type: 'xxhash',
    instance: new XXHash128(seed),
  });

  return hashers;
}

// ── Run one benchmark pass for a hasher ──
function benchmarkRun(hasher) {
  let h;
  if (hasher.type === 'crypto') {
    // node:crypto hashers are single-use; recreate each run
    h = hasher.create();
  } else {
    hasher.instance.reset();
    h = hasher.instance;
  }

  const start = performance.now();
  for (let j = 0; j < ITERATIONS; j++) {
    h.update(buf);
  }
  h.digest();
  const end = performance.now();
  return end - start;
}

// ── Statistics ──
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round1(n) { return Math.round(n * 10) / 10; }

// ── Collect system metadata ──
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
    bufferSizeGB: BUFFER_SIZE / (2 ** 30),
    iterationsPerRun: ITERATIONS,
    totalDataGB: TOTAL_DATA_GB,
    warmupRuns: WARMUP_RUNS,
    measuredRuns: MEASURED_RUNS,
    timestamp: new Date().toISOString(),
  };
}

// ── Main ──
function main() {
  const hashers = getHashers();
  const metadata = collectMetadata();
  const results = [];

  for (const hasher of hashers) {
    // Warmup
    process.stdout.write(`Warming up ${hasher.name}...`);
    for (let w = 0; w < WARMUP_RUNS; w++) {
      benchmarkRun(hasher);
    }
    process.stdout.write(' done.\n');

    // Measured runs
    const durations = [];
    for (let r = 0; r < MEASURED_RUNS; r++) {
      process.stdout.write(`  ${hasher.name} run ${r + 1}/${MEASURED_RUNS}...`);
      const ms = benchmarkRun(hasher);
      durations.push(ms);
      process.stdout.write(` ${ms.toFixed(1)} ms\n`);
    }

    const med = median(durations);
    results.push({
      name: hasher.name,
      bits: hasher.bits,
      type: hasher.type,
      durations_ms: durations.map(round1),
      median_ms: round1(med),
      min_ms: round1(Math.min(...durations)),
      max_ms: round1(Math.max(...durations)),
      throughput_gbps: Math.round((TOTAL_DATA_GB / (med / 1000)) * 1000) / 1000,
    });
  }

  // ── Human-readable summary ──
  console.log('\n=== Benchmark Results ===');
  console.log(`Platform: ${metadata.os} ${metadata.arch} | CPU: ${metadata.cpuModel}`);
  console.log(`Node: ${metadata.nodeVersion} | Compiler: ${metadata.compiler}`);
  console.log(`Data: ${metadata.totalDataGB} GB per run | Runs: ${metadata.measuredRuns} (after ${metadata.warmupRuns} warmup)\n`);

  const header = `${'Hash'.padEnd(10)} ${'Bits'.padStart(4)} ${'Median(ms)'.padStart(12)} ${'Min(ms)'.padStart(10)} ${'Max(ms)'.padStart(10)} ${'GB/s'.padStart(8)}`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of results) {
    console.log(
      `${r.name.padEnd(10)} ${String(r.bits).padStart(4)} ${r.median_ms.toFixed(1).padStart(12)} ${r.min_ms.toFixed(1).padStart(10)} ${r.max_ms.toFixed(1).padStart(10)} ${r.throughput_gbps.toFixed(3).padStart(8)}`
    );
  }

  // ── JSON output ──
  const output = { metadata, results };
  const jsonStr = JSON.stringify(output, null, 2);

  if (process.env.BENCHMARK_OUTPUT) {
    fs.writeFileSync(process.env.BENCHMARK_OUTPUT, jsonStr, 'utf8');
    console.log(`\nJSON results written to ${process.env.BENCHMARK_OUTPUT}`);
  }

  console.log('\n--- JSON_START ---');
  console.log(jsonStr);
  console.log('--- JSON_END ---');
}

main();
