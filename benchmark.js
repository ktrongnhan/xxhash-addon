'use strict';
const { XXHash128, XXHash3, XXHash64 } = require('./xxhash-addon');
const { createHash, randomFillSync } = require('crypto');
const { Buffer } = require('buffer');
const { PerformanceObserver, performance } = require('perf_hooks');

// const major_ver = process.versions.node.split('.')[0];
// const platform = process.platform;

// // Windows perf_hooks fails on CI with Node 8. Likely because perf_hooks was
// // still experimental at that time.
// if (major_ver === '8' && platform === 'win32') {
//    process.exit();
// }

// Init input, a 1GB buffer randomly filled.
const buf = Buffer.alloc(2 ** 30);
randomFillSync(buf);

const buf_seed = Buffer.alloc(8);
randomFillSync(buf_seed);

const md5 = process.env.DEBUG ? null : createHash('md5');
const sha1 = process.env.DEBUG ? null : createHash('sha1');
// const blake = process.env.DEBUG ? null : createHash('blake2s256');

const xxh64 = new XXHash64(buf_seed);
const xxh3 = new XXHash3(buf_seed);
const xxh128 = new XXHash128(buf_seed);

const hashes = process.env.DEBUG ? [xxh64, xxh3, xxh128] : [md5, sha1, xxh64, xxh3, xxh128];
const names = process.env.DEBUG ? ['XXH64', 'XXH3', 'XXH3 128 bits'] : ['MD5', 'SHA1', 'XXH64', 'XXH3', 'XXH3 128 bits'];

const obs = new PerformanceObserver(items => {
   console.log(items.getEntriesByType('measure'));
   performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

for (let i = 0; i < hashes.length; i++) {
   performance.mark('start - ' + names[i]);
   for (let j = 0; j < 10; j++) {
      hashes[i].update(buf);
   }
   hashes[i].digest();
   performance.mark('end - ' + names[i]);
   performance.measure(names[i], 'start - ' + names[i], 'end - ' + names[i]);
};
