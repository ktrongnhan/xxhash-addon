'use strict';
const { XXHash3, XXHash64 } = require('./xxhash-addon');
const XXHash = require('xxhash');
const { createHash, randomFillSync, getHashes } = require('crypto');
const { Buffer } = require('buffer');
const { PerformanceObserver, performance } = require('perf_hooks');

// Init input, a 1GB buffer randomly filled.
const buf = Buffer.alloc(2 ** 30);
randomFillSync(buf);

const seed = 2654435761;
const buf_seed = Buffer.alloc(4);
buf_seed.writeUint32BE(seed);

const md5 = createHash('md5');
const sha1 = createHash('sha1');
const blake = createHash('blake2s256');

const node_xxhash = new XXHash.XXHash64(seed);
const xxh64 = new XXHash64(buf_seed);
const xxh3 = new XXHash3(buf_seed);

const hashes = [md5, sha1, blake, node_xxhash, xxh64, xxh3];
const names = ['MD5', 'SHA1', 'BLAKE2s256', 'XXH64 (node-xxhash)', 'XXH64 (xxhash-addon)', 'XXH3 (xxhash-addon)'];

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
