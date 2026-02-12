'use strict';
const { XXHash3 } = require('./xxhash-addon');
const { randomFillSync } = require('node:crypto');
const { Buffer } = require('node:buffer');
const { performance } = require('node:perf_hooks');
const os = require('node:os');
const { execSync } = require('node:child_process');

// Diagnostic benchmark to determine if XXH3 throughput is compute-bound or
// memory-bandwidth-bound. Varies buffer size from 64 KB (fits in L1/L2 cache)
// to 1 GB (far exceeds any cache) and measures throughput at each level.
//
// If throughput is roughly constant across sizes → compute-bound.
// If throughput drops sharply beyond L3 cache size → bandwidth-bound.

const seed = Buffer.alloc(8, 0);

// Buffer sizes to test: 64KB, 256KB, 1MB, 4MB, 16MB, 64MB, 256MB, 1GB
const BUFFER_SIZES = [
  64 * 1024,          // 64 KB  — fits L1/L2
  256 * 1024,         // 256 KB — fits L2
  1 * 1024 * 1024,    // 1 MB   — fits L2/L3
  4 * 1024 * 1024,    // 4 MB   — fits L3
  16 * 1024 * 1024,   // 16 MB  — may fit L3
  64 * 1024 * 1024,   // 64 MB  — exceeds L3
  256 * 1024 * 1024,  // 256 MB — far exceeds L3
  1024 * 1024 * 1024, // 1 GB   — main memory
];

const TARGET_DATA_GB = 5; // Process ~5 GB per measured run for consistency
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${bytes / (1024 * 1024 * 1024)} GB`;
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
  return `${bytes / 1024} KB`;
}

function detectCacheInfo() {
  const info = {};
  try {
    if (os.platform() === 'linux') {
      // Try to read cache sizes from sysfs
      for (const [level, idx] of [['L1d', 'index0'], ['L2', 'index2'], ['L3', 'index3']]) {
        try {
          const size = execSync(`cat /sys/devices/system/cpu/cpu0/cache/${idx}/size 2>/dev/null`, { encoding: 'utf8' }).trim();
          info[level] = size;
        } catch { /* ignore */ }
      }
      // Also try lscpu
      try {
        const lscpu = execSync('lscpu 2>/dev/null', { encoding: 'utf8' });
        for (const line of lscpu.split('\n')) {
          if (line.includes('L1d cache')) info.L1d_lscpu = line.split(':')[1].trim();
          if (line.includes('L2 cache')) info.L2_lscpu = line.split(':')[1].trim();
          if (line.includes('L3 cache')) info.L3_lscpu = line.split(':')[1].trim();
        }
      } catch { /* ignore */ }
    } else if (os.platform() === 'darwin') {
      try {
        const l1 = execSync('sysctl -n hw.l1dcachesize 2>/dev/null', { encoding: 'utf8' }).trim();
        const l2 = execSync('sysctl -n hw.l2cachesize 2>/dev/null', { encoding: 'utf8' }).trim();
        const l3 = execSync('sysctl -n hw.l3cachesize 2>/dev/null', { encoding: 'utf8' }).trim();
        if (l1) info.L1d = `${Number(l1) / 1024} KB`;
        if (l2) info.L2 = `${Number(l2) / 1024} KB`;
        if (l3) info.L3 = `${Number(l3) / (1024 * 1024)} MB`;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return info;
}

function benchmarkRun(hasher, buffer, iterations) {
  hasher.reset();
  const start = performance.now();
  for (let j = 0; j < iterations; j++) {
    hasher.update(buffer);
  }
  hasher.digest();
  return performance.now() - start;
}

function main() {
  const cpus = os.cpus();
  const cacheInfo = detectCacheInfo();

  console.log('=== XXH3 Buffer-Size Diagnostic Benchmark ===');
  console.log(`Platform: ${os.platform()} ${os.arch()}`);
  console.log(`CPU: ${cpus.length > 0 ? cpus[0].model : 'unknown'} (${cpus.length} cores)`);
  console.log(`Memory: ${Math.round(os.totalmem() / (1024 * 1024))} MB`);
  console.log(`Node: ${process.version}`);
  console.log(`Compiler: ${process.env.BENCHMARK_COMPILER || 'unknown'}`);
  if (Object.keys(cacheInfo).length > 0) {
    console.log(`Cache: ${JSON.stringify(cacheInfo)}`);
  }
  console.log(`Target data per run: ${TARGET_DATA_GB} GB`);
  console.log(`Warmup: ${WARMUP_RUNS}, Measured: ${MEASURED_RUNS} runs\n`);

  const hasher = new XXHash3(seed);
  const results = [];

  const header = `${'Buffer Size'.padEnd(12)} ${'Iters'.padStart(8)} ${'Median(ms)'.padStart(12)} ${'GB/s'.padStart(10)}  Note`;
  console.log(header);
  console.log('-'.repeat(70));

  for (const bufSize of BUFFER_SIZES) {
    const iterations = Math.max(1, Math.round((TARGET_DATA_GB * 1024 * 1024 * 1024) / bufSize));
    const totalDataGB = (bufSize * iterations) / (1024 * 1024 * 1024);

    process.stdout.write(`${formatSize(bufSize).padEnd(12)} `);

    // Allocate and fill buffer
    const buffer = Buffer.alloc(bufSize);
    randomFillSync(buffer);

    // Warmup
    for (let w = 0; w < WARMUP_RUNS; w++) {
      benchmarkRun(hasher, buffer, iterations);
    }

    // Measured runs
    const durations = [];
    for (let r = 0; r < MEASURED_RUNS; r++) {
      durations.push(benchmarkRun(hasher, buffer, iterations));
    }

    const med = median(durations);
    const gbps = totalDataGB / (med / 1000);

    let note = '';
    if (bufSize <= 256 * 1024) note = '≈ L2';
    else if (bufSize <= 16 * 1024 * 1024) note = '≈ L3';
    else note = '> L3 (DRAM)';

    results.push({
      bufferSize: bufSize,
      bufferLabel: formatSize(bufSize),
      iterations,
      totalDataGB: Math.round(totalDataGB * 100) / 100,
      durations_ms: durations.map(d => Math.round(d * 10) / 10),
      median_ms: Math.round(med * 10) / 10,
      throughput_gbps: Math.round(gbps * 1000) / 1000,
      note,
    });

    console.log(`${String(iterations).padStart(8)} ${med.toFixed(1).padStart(12)} ${gbps.toFixed(3).padStart(10)}  ${note}`);
  }

  // Summary
  const smallest = results[0];
  const largest = results[results.length - 1];
  const ratio = smallest.throughput_gbps / largest.throughput_gbps;

  console.log('\n=== Analysis ===');
  console.log(`Smallest buffer (${smallest.bufferLabel}): ${smallest.throughput_gbps.toFixed(3)} GB/s`);
  console.log(`Largest buffer  (${largest.bufferLabel}): ${largest.throughput_gbps.toFixed(3)} GB/s`);
  console.log(`Ratio (small/large): ${ratio.toFixed(2)}x`);

  if (ratio > 2.0) {
    console.log('\nConclusion: BANDWIDTH-BOUND. Throughput drops significantly with larger');
    console.log('buffers that exceed CPU cache, indicating memory bandwidth is the bottleneck.');
  } else if (ratio > 1.3) {
    console.log('\nConclusion: PARTIALLY BANDWIDTH-BOUND. Some throughput degradation with');
    console.log('larger buffers, suggesting partial memory bandwidth limitation.');
  } else {
    console.log('\nConclusion: COMPUTE-BOUND. Throughput is roughly constant regardless of');
    console.log('buffer size, indicating the CPU is the bottleneck, not memory bandwidth.');
  }

  // JSON output
  const output = {
    diagnostic: 'buffer-size-sweep',
    metadata: {
      os: os.platform(),
      arch: os.arch(),
      cpuModel: cpus.length > 0 ? cpus[0].model : 'unknown',
      cpuCount: cpus.length,
      totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
      nodeVersion: process.version,
      compiler: process.env.BENCHMARK_COMPILER || 'unknown',
      cacheInfo,
      timestamp: new Date().toISOString(),
    },
    config: {
      targetDataGB: TARGET_DATA_GB,
      warmupRuns: WARMUP_RUNS,
      measuredRuns: MEASURED_RUNS,
    },
    results,
    analysis: {
      smallestBufferGbps: smallest.throughput_gbps,
      largestBufferGbps: largest.throughput_gbps,
      ratio: Math.round(ratio * 100) / 100,
    },
  };

  console.log('\n--- JSON_START ---');
  console.log(JSON.stringify(output, null, 2));
  console.log('--- JSON_END ---');
}

main();
