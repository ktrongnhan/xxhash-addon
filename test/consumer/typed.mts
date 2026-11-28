import { XXHash3 } from 'xxhash-addon';

const digest: Buffer = XXHash3.hash(Buffer.alloc(0));
if (digest.toString('hex') !== '2d06800538d394c2') {
  throw new Error('Unexpected XXHash3 digest');
}
