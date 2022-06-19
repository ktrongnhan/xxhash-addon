'use strict';
const { XXHash128, XXHash3, XXHash64 } = require('./xxhash-addon');
const { createHash, randomFillSync } = require('crypto');
const { Buffer } = require('buffer');
const { PerformanceObserver, performance } = require('perf_hooks');

// Init input, a 1GB buffer randomly filled.
const buf = Buffer.alloc(2 ** 30);
randomFillSync(buf);

const buf_seed = Buffer.alloc(8);
randomFillSync(buf_seed);

const md5 = createHash('md5');
const sha1 = createHash('sha1');
const blake = createHash('blake2s256');

const xxh64 = new XXHash64(buf_seed);
const xxh3 = new XXHash3(buf_seed);
const xxh128 = new XXHash128(buf_seed);

const hashes = [md5, sha1, xxh64, xxh3, xxh128];
const names = ['MD5', 'SHA1', 'XXH64', 'XXH3', 'XXH3 128 bits'];

const obs = new PerformanceObserver(items => {
   console.log(items.getEntriesByType('measure'));
   performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

for (let i = 0; i < hashes.length; i++) {
   performance.mark('start');
   for (let j = 0; j < 10; j++) {
      hashes[i].update(buf);
   }
   hashes[i].digest();
   performance.measure(names[i], 'start');
};
