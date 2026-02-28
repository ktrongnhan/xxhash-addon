## v2.1.0
### Dependencies
- Remove `jest` dependency; use plain `assert`-based tests (zero dependencies)
- Upgrade `xxHash` to `v0.8.3`
### Performance
- Enable `XXH3_STREAM_USE_STACK` for ~2x faster XXH3 and XXH128 streaming throughput on Apple Silicon with clang
- Remove `XXH_INLINE_ALL`; compile `xxhash.c` as a separate translation unit (aligning with xxhsum Release build)
- Enable runtime x86 SIMD dispatch (AVX2/AVX512) via `xxh_x86dispatch.c` on x86/x64
### CI
- Bump `actions/checkout` and `actions/setup-node` to v4
- Drop AppVeyor; GitHub Actions covers Windows builds
- Remove deprecated `windows-2016` runner
- Streamline CI matrix: build+test on Node.js 20 and 24 across Linux/macOS/Windows
- Sanitizer job now tests the release-optimized binary (`-O3` + `XXH3_STREAM_USE_STACK`) instead of an unoptimized `-O0` build; Clang-only; ASan+UBSan+LSan on Linux, ASan+UBSan on macOS (Apple Clang does not support LSan)
- Add dedicated benchmark workflow (`benchmark.yml`) on 7 platform/compiler combos (Linux x86_64/ARM64 GCC+Clang, macOS ARM64 Clang, Windows x86_64/ARM64 MSVC), runs on push to `master` only
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
