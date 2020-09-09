Yet another xxhash addon for Node.js

![npm](https://img.shields.io/npm/v/xxhash-addon?style=plastic)
![NPM](https://img.shields.io/npm/l/xxhash-addon?style=plastic)

|Platform |Build Status |
|------------|---------|
|Windows | [![Build status](https://ci.appveyor.com/api/projects/status/github/ktrongnhan/xxhash-addon?svg=true)](https://ci.appveyor.com/project/ktrongnhan/xxhash-addon) |
|Debian | [![CircleCI](https://circleci.com/gh/ktrongnhan/xxhash-addon.svg?style=svg)](https://circleci.com/gh/ktrongnhan/xxhash-addon) |
|OSX | [![Build Status](https://travis-ci.org/ktrongnhan/xxhash-addon.svg?branch=master)](https://travis-ci.org/ktrongnhan/xxhash-addon) |

Overview
===========
`xxhash-addon` is a native addon for Node.js (>=8.6.0) written using N-API. It 'thinly' wraps [xxhash](https://github.com/Cyan4973/xxHash) `v0.8.0`, which has support for a new algorithm `XXH3` that has showed to outperform its predecessor.

__IMPORTANT__: As of `v0.8.0`, XXH3 and XXH123 are now considered stable. Rush to the upstream [CHANGELOG](https://github.com/Cyan4973/xxHash/blob/v0.8.0/CHANGELOG) for the formal announcement!

Features
==========
* `xxhash-addon` exposes xxhash's API in a friendly way for downstream consumption (see the Example of Usage section).
* Covering all 4 variants of the algorithm: XXH32, XXH64, XXH3 64-bit, XXH3 128-bit.
* Supporting XXH3 secret.
* Consistently producing canonical (big-endian) form of hash values as per [xxhash's recommendation](https://github.com/Cyan4973/xxHash/blob/e2f4695899e831171ecd2e780078474712ea61d3/xxhash.h#L243).
* The addon is extensively sanity-checked againts xxhash's sanity test suite to ensure that generated hashes are correct and align with xxhsum's (`xxhsum` is the official utility of xxhash). Check the file `xxhash-addon.test.js` to see how `xxhash-addon` is being tested.
* Minimal dependency: the package does not depend on any other npm packages.

Installation
=========
```bash
npm install xxhash-addon
```

Note: This native addon requires recompiling. If you do not have Node.js building toolchain installed then you must install them first:

* On a Windows machine

```bash
npm install --global --production windows-build-tools
```

* On a Debian/Ubuntu machine

```bash
sudo apt-get install python g++ make
```

* On a RHEL/CentOS machine

If you are on RHEL 6 or 7, you would need to install GCC/G++ >= 6.3 via `devtoolset-` for the module to compile. See [SCL](https://www.softwarecollections.org/en/scls/rhscl/devtoolset-6/).

* On a Mac

Install `Xcode command line tools`

In comparison to other implementations/bindings
=========
* [node-xxhash](https://github.com/mscdex/node-xxhash)

Although node-xxhash offers incredible compability as it requires Node.js >= 4.0.0, it does not seem to produce consistent hash values.
For example, given a seed value of 0xDEADBEEF and the string 'hello', node-xxhash's XXH32 produces 2717969635 as the string's hash, which is in big-endian form, whilst its XXH64 produces cd6d9204aaad5b0c, which is in little-endian form.

* [xxhashjs](https://github.com/pierrec/js-xxhash)

This fantastic project is a pure JavaScript implementation of the algorithm. However it has not been updated for years.

Example of Usage
=========

```javascript
// Construct a new hasher and seed it 0 (default seed value)
// Note: constructors can take either JS Number or Buffer as their argument
const { XXHash32, XXHash64, XXHash3 } = require('xxhash-addon');
const hasher32 = new XXHash32(0);
// const hasher32 = new XXHash32(); // equivalent to the previous call
// const hasher32 = new XXHash32(Buffer.alloc(4)); // equivalent to the previous call, too

// Hash a string
const salute = 'hello there';
const buf_salute = Buffer.from(salute);
console.log(hasher32.hash(buf_salute));

// Digest a byte-stream (hash a buffer piece by piece)
hasher32.update(buf_salute.slice(0, 3));
console.log(hasher32.digest());
hasher32.update(buf_salute.slice(3));
console.log(hasher32.digest());

// Reset the hasher for another hashing
hasher32.reset();

// Using secret for XXH3
// Same constructor call syntax, but hasher switches to secret mode whenever
// it gets a buffer larger than 135 bytes
const hasher3 = new XXHash3(require('fs').readFileSync('package-lock.json'));
```

API reference
===========

### XXHash32
```
(constructor) XXHash32([Number or 4-byte Buffer])
(constructor) XXHash32() - using default seed value of 0
XXHash32.update([Buffer]) - updates internal state for stream hashing
XXHash32.digest() - produces hash of a stream
XXHash32.reset() - resets internal state. You can use this rather than creating another hasher instance
```
### XXHash64
```
(constructor) XXHash64([Number or 4-byte Buffer or 8-byte Buffer])
(constructor) XXHash64() - using default seed value of 0
XXHash64.update([Buffer]) - updates internal state for stream hashing
XXHash64.digest() - produces hash of a stream
XXHash64.reset() - resets internal state. You can use this rather than creating another hasher instance
```
### XXHash3
```
(constructor) XXHash3([Number or 4-byte Buffer or 8-byte Buffer]) - using seed
(constructor) XXHash3() - using default seed value of 0
(constructor) XXHash3([longer-than-135-byte Buffer]) - using secret
XXHash3.update([Buffer]) - updates internal state for stream hashing
XXHash3.digest() - produces hash of a stream
XXHash3.reset() - resets internal state. You can use this rather than creating another hasher instance
```
### XXHash128
```
(constructor) XXHash128([Number or 4-byte Buffer or 8-byte Buffer]) - using seed
(constructor) XXHash128() - using default seed value of 0
(constructor) XXHash128([longer-than-135-byte Buffer]) - using secret
XXHash128.update([Buffer]) - updates internal state for stream hashing
XXHash128.digest() - produces hash of a stream
XXHash128.reset() - resets internal state. You can use this rather than creating another hasher instance
```

Licence
===========
The project is licensed under BSD-2-Clause.
