import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import addon, { XXHash32, XXHash64, XXHash3, XXHash128 } from 'xxhash-addon';

const require = createRequire(import.meta.url);
assert.equal(addon, require('xxhash-addon'));
assert.deepEqual({ XXHash32, XXHash64, XXHash3, XXHash128 }, addon);
assert.equal(XXHash3.hash(Buffer.alloc(0)).toString('hex'), '2d06800538d394c2');
