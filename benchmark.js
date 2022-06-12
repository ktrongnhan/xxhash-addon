'use strict';
const addon64 = require('./xxhash-addon').XXHash64;
const addon364 = require('./xxhash-addon').XXHash3;
const xxhash64 = require('xxhash').XXHash64;
const { createHash, randomFillSync, getHashes } = require('crypto');
const { Buffer } = require('buffer');
const { PerformanceObserver, performance } = require('perf_hooks');

// Init input, a 1GB buffer randomly filled.
const buf = Buffer.alloc(2 ** 30);
randomFillSync(buf);

const md5 = createHash('md5');
const sha1 = createHash('sha1');
const blake = createHash('blake2b512');

const seed = 2654435761;
const xxh = new xxhash64(seed);
const buf_seed = Buffer.alloc(4);
buf_seed.writeUint32BE(seed);
const addon = new addon64(buf_seed);
const addon3 = new addon364(buf_seed);

const hashes = [md5, sha1, blake, xxh, addon, addon3];

const obs = new PerformanceObserver(items => {
   console.log(items.getEntriesByType('measure'));
   performance.clearMarks();
});

obs.observe({ entryTypes: ['measure'] });

hashes.forEach(h => {
   performance.mark('start');
   for (let i = 0; i < 10; i++) {
      h.update(buf);
   }
   h.digest();
   performance.measure('end', 'start');
});
