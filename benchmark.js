'use strict';
const { XXHash128 } = require('./xxhash-addon');
const { createHash, randomFillSync } = require('crypto');
const { Buffer } = require('buffer');
const { PerformanceObserver, performance } = require('perf_hooks');

// Init input, a 1GB buffer randomly filled.
const buf = Buffer.alloc(2 ** 30);
randomFillSync(buf);

const md5 = createHash('md5');
const sha1 = createHash('sha1');

const seed = 2654435761;
const buf_seed = Buffer.alloc(4);
buf_seed.writeUint32BE(seed);
const xxh = new XXHash128(buf_seed);

const hashes = [md5, sha1, xxh];

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
