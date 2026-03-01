'use strict';
const fs = require('fs');
const path = require('path');

// Usage: node benchmark-summary.js <artifacts-dir> <output-file> [--readme <readme-path>]
const args = process.argv.slice(2);
const readmeIdx = args.indexOf('--readme');
let readmePath = null;
if (readmeIdx !== -1) {
  readmePath = args[readmeIdx + 1];
  args.splice(readmeIdx, 2);
}
const artifactsDir = args[0];
const outputFile = args[1];

if (!artifactsDir || !outputFile) {
  console.error('Usage: node benchmark-summary.js <artifacts-dir> <output-file> [--readme <readme-path>]');
  process.exit(1);
}

function findJsonFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function platformLabel(meta) {
  const osMap = { linux: 'Linux', darwin: 'macOS', win32: 'Windows' };
  return `${osMap[meta.os] || meta.os} ${meta.arch}`;
}

function compilerShort(compiler) {
  if (!compiler || compiler === 'unknown') return 'default';
  const gcc = compiler.match(/gcc.*?(\d+\.\d+\.\d+)/i);
  if (gcc) return `GCC ${gcc[1]}`;
  const appleClang = compiler.match(/Apple clang.*?(\d+\.\d+\.\d+)/i);
  if (appleClang) return `Apple Clang ${appleClang[1]}`;
  const clang = compiler.match(/clang.*?(\d+\.\d+\.\d+)/i);
  if (clang) return `Clang ${clang[1]}`;
  const msvc = compiler.match(/MSVC\s+([\d.]+)/i);
  if (msvc) return `MSVC ${msvc[1]}`;
  return compiler.slice(0, 30);
}

function nodeShort(version) {
  const m = version.match(/^v?(\d+)/);
  return m ? `v${m[1]}` : version;
}

function sizeLabel(bytes) {
  if (bytes >= 1 << 20) return (bytes >> 20) + 'MB';
  if (bytes >= 1 << 10) return (bytes >> 10) + 'KB';
  return bytes + 'B';
}

const jsonFiles = findJsonFiles(artifactsDir);
if (jsonFiles.length === 0) {
  console.error('No JSON files found in', artifactsDir);
  process.exit(1);
}

const benchmarks = jsonFiles.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));

benchmarks.sort((a, b) => {
  const key = (m) => `${m.os}-${m.arch}-${m.compiler}-${m.nodeVersion}`;
  return key(a.metadata).localeCompare(key(b.metadata));
});

const hashColumns = ['XXH64', 'XXH3', 'XXH128', 'MD5', 'SHA1'];

// ── Headline table (streaming @ 64 KB chunks) for README ──
let md = '## Benchmark Results\n\n';
md += '> Streaming throughput in GB/s at 64 KB chunks (higher is better). Median of 5 runs.\n\n';

md += '| Platform | Compiler | Node |';
for (const name of hashColumns) md += ` ${name} |`;
md += '\n';

md += '|----------|----------|------|';
for (let i = 0; i < hashColumns.length; i++) md += '------:|';
md += '\n';

for (const bench of benchmarks) {
  const meta = bench.metadata;
  const cells = [
    platformLabel(meta),
    compilerShort(meta.compiler),
    nodeShort(meta.nodeVersion),
  ];

  // Use headline data (streaming @ 64 KB) if available, fall back to old format
  const source = bench.headline || bench.results;
  for (const name of hashColumns) {
    const r = source.find(x => x.name === name);
    const gbps = r ? (r.median_gbps || r.throughput_gbps) : null;
    cells.push(gbps != null ? gbps.toFixed(2) : '-');
  }
  md += `| ${cells.join(' | ')} |\n`;
}

md += `\n*Generated at ${new Date().toISOString()} with xxHash v0.8.3*\n`;

// ── Detailed sweep tables (for Job Summary only) ──
let detail = '';

for (const section of ['streaming', 'oneshot']) {
  // Check if any benchmark has this section
  if (!benchmarks.some(b => b[section] && b[section].length > 0)) continue;

  const title = section === 'streaming' ? 'Streaming' : 'One-shot';
  detail += `\n### ${title} Throughput by Buffer Size (GB/s)\n\n`;

  // Collect all sizes from the first benchmark that has this section
  const ref = benchmarks.find(b => b[section] && b[section].length > 0);
  const sizes = [...new Set(ref[section].map(r => r.size_bytes))].sort((a, b) => a - b);

  detail += '| Platform | Compiler | Hash |';
  for (const s of sizes) detail += ` ${sizeLabel(s)} |`;
  detail += '\n';

  detail += '|----------|----------|------|';
  for (let i = 0; i < sizes.length; i++) detail += '------:|';
  detail += '\n';

  for (const bench of benchmarks) {
    const meta = bench.metadata;
    const data = bench[section];
    if (!data || data.length === 0) continue;

    for (const name of hashColumns) {
      const cells = [
        platformLabel(meta),
        compilerShort(meta.compiler),
        name,
      ];
      for (const s of sizes) {
        const r = data.find(x => x.name === name && x.size_bytes === s);
        cells.push(r ? r.median_gbps.toFixed(2) : '-');
      }
      detail += `| ${cells.join(' | ')} |\n`;
    }
  }
}

// Write headline + detail to Job Summary
fs.appendFileSync(outputFile, md + detail, 'utf8');
console.log('Summary written to', outputFile);
console.log(md);

// Optionally update README between markers (headline table only)
if (readmePath) {
  const START_MARKER = '<!-- BENCHMARK_RESULTS_START -->';
  const END_MARKER = '<!-- BENCHMARK_RESULTS_END -->';

  const readme = fs.readFileSync(readmePath, 'utf8');
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    console.error('README markers not found, skipping README update');
  } else {
    const before = readme.slice(0, startIdx + START_MARKER.length);
    const after = readme.slice(endIdx);
    fs.writeFileSync(readmePath, before + '\n' + md + '\n' + after, 'utf8');
    console.log('README updated at', readmePath);
  }
}
