Yet another xxhash addon for Node.js

|Platform |Build Status |
|------------|---------|
|Windows | [![Build status](https://ci.appveyor.com/api/projects/status/github/ktrongnhan/xxhash-addon?svg=true)](https://ci.appveyor.com/project/ktrongnhan/xxhash-addon) |
|Debian | [![CircleCI](https://circleci.com/gh/ktrongnhan/xxhash-addon.svg?style=svg)](https://circleci.com/gh/ktrongnhan/xxhash-addon) |

Overview
===========
`xxhash-addon` is a native addon for Node.js (>=8.6.0) written using N-API. It 'thinly' wraps [xxhash](https://github.com/Cyan4973/xxHash) version 0.7.2, which has support for a new algorithm `XXH3` that has showed to outperform its predecessor.

Features
==========
* `xxhash-addon` exposes xxhash's API in a friendly way for downstream consumption(see the Example of Usage section).
* Covering 3 out of 4 variants of the algorithm: XXH32, XXH64 and XXH3 64-bit (for experimental use only).
* Supporting XXH3 secret.
* Consistently producing canonical (big-endian) form of hash values as per [xxhash's recommendation](https://github.com/Cyan4973/xxHash/blob/e2f4695899e831171ecd2e780078474712ea61d3/xxhash.h#L243).
* The addon is extensively sanity-checked againts xxhash's sanity test suite to ensure that generated hashes are correct and align with xxhsum's (`xxhsum` is the official utility of xxhash). Check the file `xxhash-addon.test.js` to see how `xxhash-addon` is being tested.

Example of Usage
=========

```javascript
// Construct a new hasher and seed it 0
// Note: constructors can take either JS Number or Buffer as their argument
const { XXHash32, XXHash64, XXHash3 } = require('xxhash-addon');
const hasher32 = new XXHash32(0); // equivalent to new XXHash32(Buffer.from[0x00, 0x00, 0x00, 0x00])

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
// it gets a buffer longer than 135 
const hasher3 = new XXHash3(require('fs').readFileSync('package-lock.json'));
```

API reference
===========
```
(constructor) XXHash32([Number or 4-byte Buffer])
XXHash32.update([Buffer]) - updates internal state for stream hashing
XXHash32.digest() - produces hash of a stream
XXHash32.reset() - resets internal state. You can use this rather than creating another hasher instance

(constructor) XXHash64([Number or 4-byte Buffer or 8-byte Buffer])
XXHash64.update([Buffer]) - updates internal state for stream hashing
XXHash64.digest() - produces hash of a stream
XXHash64.reset() - resets internal state. You can use this rather than creating another hasher instance


(Experimental)
(constructor) XXHash3([Number or 4-byte Buffer or 8-byte Buffer]) - using seed
(constructor) XXHash3([longer-than-135-byte Buffer]) - using secret
XXHash3.update([Buffer]) - updates internal state for stream hashing
XXHash3.digest() - produces hash of a stream
XXHash3.reset() - resets internal state. You can use this rather than creating another hasher instance
```


Licence
===========
The project is licensed under BSD-2-Clause.
