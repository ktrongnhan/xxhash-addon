## v3.0.0
### Dependencies
- Remove `jest` dependency; migrate tests to Node.js built-in test runner (`node:test`)
- Zero devDependencies
- Upgrade `xxHash` to `v0.8.3`
### Breaking changes
- Minimum supported Node.js version is now 20 (dropping 8, 10, 12, 14, 16, 18)
### Performance
- Enable `XXH3_STREAM_USE_STACK` for ~2x faster XXH3 and XXH128 streaming throughput on Apple Silicon with clang
- Add `-march=native` to release builds for optimal SIMD vectorization (enables AVX2 on x86_64 instead of SSE2 baseline)
### CI
- Update GitHub Actions to test Node.js 20, 22, 24
- Update AppVeyor to test Node.js 20, 22, 24
- Bump `actions/checkout` and `actions/setup-node` to v4
- Remove deprecated `windows-2016` runner
- Remove stale jest references from ASan CI jobs
- Drop AppVeyor; GitHub Actions covers Windows builds
- Add dedicated benchmark workflow (`benchmark.yml`) with expanded platform matrix:
  Linux x86_64 and ARM64 (GCC + Clang), macOS ARM64 (Clang), Windows x86_64 and ARM64 (MSVC)
- Benchmark results published as GitHub Actions Job Summary
- Auto-update benchmark results table in README on push to `master`
### Improvements
- Rewrite `benchmark.js`: warmup iterations, 5 measured runs, median/min/max statistics, GB/s throughput, machine-readable JSON output
- Add `benchmark-summary.js` to consolidate CI benchmark results into a Markdown table

## v2.0.3
### Fixes
- README to ref the correct version of xxHash

## v2.0.2
### Dependencies
- Upgrading `xxhash` to `v0.8.2`
### Fixes
- Auto-discover Release and Debug builds (#31)

## v2.0.1
### Fixes
- Move jest to devDependencies (#30)

## v2.0.0
### Breaking changes
- API change https://github.com/ktrongnhan/xxhash-addon#api-reference
- One-shot hash functions are now static.
- Much better performance.

## v1.5.0
### Dependencies
- Upgrading `xxhash` to `v0.8.1`
### Features
- Support for TypeScript - https://github.com/ktrongnhan/xxhash-addon/pull/14


## v1.4.0
### Dependencies
- Upgrading `xxhash` to `v0.8.0`


## v1.3.0
### Dependencies
- Upgrading `xxhash` to `v0.7.3`


## v1.2.0
### Features
- Adding support for `XXHash128()`


## v1.1.0
### Features
- Adding shorthands for constructing 0-seeded hashers: `XXHash32()`, `XXHash64()`, `XXHash3()`
