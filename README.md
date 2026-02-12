Yet another `xxhash` addon for Node.js which can be ***x69 times faster*** than `crypto` MD5

__IMPORTANT__: `xxhash-addon` v2 is finally here. This is almost a re-work of this project with heavy focus on performance and consistency. [FAQ](https://github.com/ktrongnhan/xxhash-addon#FAQ) has some very good info that you may not want to miss.

![npm](https://img.shields.io/npm/v/xxhash-addon?style=plastic)
![NPM](https://img.shields.io/npm/l/xxhash-addon?style=plastic)

[![CI](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/ci.yml/badge.svg)](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/ci.yml)
[![Benchmarks](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/benchmark.yml/badge.svg)](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/benchmark.yml)

Overview
===========
`xxhash-addon` is a native addon for Node.js (^20 || ^22 || >=24) written using N-API. It 'thinly' wraps [xxhash](https://github.com/Cyan4973/xxHash) `v0.8.3`, which has support for a new algorithm `XXH3` that has been showed to outperform its predecessor.

__IMPORTANT__: As of `v0.8.0`, XXH3 and XXH128 are now considered stable. Rush to the upstream [CHANGELOG](https://github.com/Cyan4973/xxHash/blob/v0.8.0/CHANGELOG) for the formal announcement! `xxhash-addon v1.4.0` is the first iteration packed with stable XXH3 and XXH128.

Why v2?
==========
1. Greatly improved performance backed by benchmarks (see charts below.)
2. Better consistency and smaller code size thanks to pure C-style wrapping.


CI Benchmarks
==========

Benchmarks run automatically on every push to `master` and every pull request across multiple platforms, compilers, architectures, and Node.js versions. Results are published as a [GitHub Actions Job Summary](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/benchmark.yml) — click any workflow run to see the consolidated throughput table.

**Coverage:** Linux x86_64/ARM64 (GCC + Clang), macOS ARM64 (Clang), Windows x86_64/ARM64 (MSVC), Node.js 22 + 24.

The benchmark measures streaming throughput (`update()` + `digest()`) over 10 GB of data, with 2 warmup runs and 5 measured runs per hash function, reporting median throughput in GB/s.

To run locally:
```bash
npm run benchmark
```

To save results as JSON:
```bash
BENCHMARK_OUTPUT=results.json node benchmark.js
```

<!-- BENCHMARK_RESULTS_START -->
## Benchmark Results

> Streaming throughput in GB/s (higher is better). Each cell shows median of 5 runs over 10 GB.

| Platform | Compiler | Node | XXH64 | XXH3 | XXH128 | MD5 | SHA1 |
|----------|----------|------|------:|------:|------:|------:|------:|
| macOS arm64 | Apple Clang 17.0.0 | v22 | 11.07 | 22.53 | 22.22 | 0.45 | 1.75 |
| macOS arm64 | Apple Clang 17.0.0 | v24 | 8.82 | 22.70 | 23.83 | 0.48 | 1.87 |
| Linux arm64 | GCC 13.3.0 | v22 | 16.33 | 16.93 | 16.94 | 0.70 | 1.94 |
| Linux arm64 | GCC 13.3.0 | v24 | 16.55 | 17.60 | 17.58 | 0.70 | 1.94 |
| Linux arm64 | Clang 18.1.3 | v22 | 15.61 | 17.69 | 17.70 | 0.70 | 1.94 |
| Linux arm64 | Clang 18.1.3 | v24 | 15.52 | 17.43 | 17.40 | 0.70 | 1.94 |
| Linux x64 | GCC 13.3.0 | v22 | 11.54 | 18.89 | 18.87 | 0.66 | 1.58 |
| Linux x64 | GCC 13.3.0 | v24 | 11.47 | 17.51 | 17.68 | 0.66 | 1.58 |
| Linux x64 | Clang 18.1.3 | v22 | 11.54 | 18.39 | 18.44 | 0.66 | 1.58 |
| Linux x64 | Clang 18.1.3 | v24 | 10.50 | 19.44 | 19.26 | 0.59 | 1.40 |
| Windows arm64 | MSVC 17.14.36811.4 | v22 | 16.57 | 8.93 | 8.94 | 0.44 | 0.50 |
| Windows arm64 | MSVC 17.14.36811.4 | v24 | 16.35 | 8.87 | 8.89 | 0.66 | 0.74 |
| Windows x64 | MSVC 17.14.36915.13 | v22 | 10.70 | 17.79 | 17.85 | 0.66 | 1.57 |
| Windows x64 | MSVC 17.14.36915.13 | v24 | 10.72 | 17.77 | 17.80 | 0.66 | 1.57 |

*Generated at 2026-02-12T10:27:28.381Z with xxHash v0.8.3*

<!-- BENCHMARK_RESULTS_END -->


Features
==========
* `xxhash-addon` exposes xxhash's API in a friendly way for downstream consumption (see the Example of Usage section).
* Covering all 4 variants of the algorithm: XXH32, XXH64, XXH3 64-bit, XXH3 128-bit.
* Supporting XXH3 secret.
* Consistently producing canonical (big-endian) form of hash values as per [xxhash's recommendation](https://github.com/Cyan4973/xxHash/blob/e2f4695899e831171ecd2e780078474712ea61d3/xxhash.h#L243).
* The addon is extensively sanity-checked againts xxhash's sanity test suite to ensure that generated hashes are correct and align with xxhsum's (`xxhsum` is the official utility of xxhash). Check the file `xxhash-addon.test.js` to see how `xxhash-addon` is being tested.
* Being seriously checked against memory safety and UB issues with ASan and UBSan. See [the CI](https://github.com/ktrongnhan/xxhash-addon/actions/workflows/ci.yml) for how this is done.
* Benchmarks are publicly available.
* Minimal dependency: the package does not depend on any other npm packages.
* TypeScript support. `xxhash-addon` **is strongly recommended** to be used with TypeScript. Definitely check [FAQ](https://github.com/ktrongnhan/xxhash-addon#FAQ) before using the addon.

Installation
=========
```bash
npm install xxhash-addon
```

Note: This native addon requires recompiling. If you do not have Node.js building toolchain then you must install them first:

On a Windows machine

```bash
npm install --global --production windows-build-tools
```

On a Debian/Ubuntu machine

```bash
sudo apt-get update && sudo apt-get install python g++ make
```

On a RHEL/CentOS machine

If you are on RHEL 6 or 7, you would need to install GCC/G++ >= 6.3 via `devtoolset-` for the module to compile. See [SCL](https://www.softwarecollections.org/en/scls/rhscl/devtoolset-6/).

On a Mac

Install `Xcode command line tools`


Example
=========

```javascript
const { XXHash32, XXHash3 } = require('xxhash-addon');

// Hash a string using the static one-shot method.
const salute = 'hello there';
const buf_salute = Buffer.from(salute);
console.log(XXHash32.hash(buf_salute).toString('hex'));

// Digest a byte-stream (hash a buffer piece by piece).
const hasher32 = new XXHash32(Buffer.from([0, 0, 0, 0]));
hasher32.update(buf_salute.slice(0, 3));
console.log(hasher32.digest().toString('hex'));
hasher32.update(buf_salute.slice(3));
console.log(hasher32.digest().toString('hex'));

// Reset the hasher for another hashing.
hasher32.reset();

// Using secret for XXH3
// Same constructor call syntax, but hasher switches to secret mode whenever
// it gets a buffer of at least 136 bytes.
const hasher3 = new XXHash3(require('fs').readFileSync('package-lock.json'));
```


FAQ
=========

1. Why TypeScript?
* Short answer: for much better performance and security.
* Long answer:
Dynamic type check is so expensive that it can hurt performance. In the world with no TypeScript, the streaming `update()` method had to check whether the buffer passed to it was an actual Node's `Buffer`. Failing to detect Buffer type might cause `v8` to `CHECK` and crashed Node process. Such dynamic type check could degrade performance of `xxhash-addon` by 10-15% per my onw benchmark on a low-end Intel Mac mini (on Apple Silicon, the difference is neglectable though.)

So how does TypeScript (TS) help? Static type check.

There is still a theoretical catch. TS' type system is structural so in a corner case where you have a class that is structurally like `Buffer` and you pass an instance of that class to `update()`. This is an extreme case that should never happen in practice. Nevertheless, there are official techniques to 'force' nominal typing. Check https://www.typescriptlang.org/play#example/nominal-typing for an in-depth.

If you don't use TS then you probably want to enable run-time type check of `xxhash-addon`. Uncomment the line `# "defines": [ "ENABLE_RUNTIME_TYPE_CHECK" ]` in `binding.gyp` and re-compile the addon. Use this at your own risk.


Development
=========

This is for people who are interested in creating a PR.

**How to clone?**

```bash
git clone https://github.com/ktrongnhan/xxhash-addon
git submodule update --init
npm run debug:build
npm run benchmark
npm test
```
Note: `debug:build` compiles and links with Address Sanitizer (`-fsanitze=address`). `npm test` may not work out-of-the-box on macOS.

**How to debug asan build?**

You may have troubles running tests with asan build. Here is my snippet to get it running under `lldb` on macOS.

```bash
$ lldb node -- --test xxhash-addon.test.js
(lldb) env DYLD_INSERT_LIBRARIES=/Library/Developer/CommandLineTools/usr/lib/clang/13.1.6/lib/darwin/libclang_rt.asan_osx_dynamic.dylib
(lldb) env ASAN_OPTIONS=detect_leaks=1
(lldb) breakpoint set -f src/addon.c -l 100
(lldb) run
(lldb) next
```

OR

```bash
DYLD_INSERT_LIBRARIES=$(clang --print-file-name=libclang_rt.asan_osx_dynamic.dylib) ASAN_OPTIONS=detect_leaks=1 node --test xxhash-addon.test.js
```

Key takeaways:
* If you see an error saying ASan Interceptor is loaded too late, set the env `DYLD_INSERT_LIBRARIES`. You need to use absolute path to your Node.js binary as well. Curious why? [An interesting article](https://jonasdevlieghere.com/sanitizing-python-modules).
* ASan doesn't detect mem-leak on macOS by default. You may want to turn this on with the env `ASAN_OPTIONS=detect_leaks=1`.

If you are debugging on Linux with GCC as your default compiler, here is a helpful oneliner:

```bash
$ LD_PRELOAD=$(gcc -print-file-name=libasan.so) LSAN_OPTIONS=suppressions=suppr.lsan DEBUG=1 node --test xxhash-addon.test.js
```

**How to upgrade xxHash?**

Everything should be set up already. Just pull from the release branch of xxHash.

```bash
git submodule update --remote
git status
git add xxHash
git commit -m "Bump xxHash to..."
git push origin your_name/upgrade_deps
```




API reference
===========

### Streaming Interface
```
export interface XXHash {
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
}
```

### XXHash32
```
export class XXHash32 implements XXHash {
  constructor(seed: Buffer); // Buffer must be 4-byte long.
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer; // One-shot with default seed (zero).
}
```

### XXHash64
```
export class XXHash64 implements XXHash {
  constructor(seed: Buffer); // Buffer must be 4- or 8-byte long.
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer; // One-shot with default seed (zero).
}
```

### XXHash3
```
export class XXHash3 implements XXHash {
  constructor(seed_or_secret: Buffer); // For using seed: Buffer must be 4- or 8-byte long; for using secret: must be at least 136-byte long.
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer; // One-shot with default seed (zero).
}
```

### XXHash128
```
export class XXHash128 implements XXHash {
  constructor(seed_or_secret: Buffer); // For using seed: Buffer must be 4- or 8-byte long; for using secret: must be at least 136-byte long.
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer; // One-shot with default seed (zero).
}
```



Licence
===========
The project is licensed under BSD-2-Clause.
