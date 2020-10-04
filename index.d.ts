export interface XXHash {
  update(data: Buffer): void;
  hash(data: Buffer): Buffer;
  digest(): Buffer;
  reset(): void;
}

export class XXHash32 implements XXHash {
  constructor(seed?: Buffer | number);
  update(data: Buffer): void;
  hash(data: Buffer): Buffer;
  digest(): Buffer;
  reset(): void;
}

export class XXHash64 implements XXHash {
  constructor(seed?: Buffer | number);
  update(data: Buffer): void;
  hash(data: Buffer): Buffer;
  digest(): Buffer;
  reset(): void;
}

export class XXHash3 implements XXHash {
  constructor(seed?: Buffer | number);
  update(data: Buffer): void;
  hash(data: Buffer): Buffer;
  digest(): Buffer;
  reset(): void;
}

export class XXHash128 implements XXHash {
  constructor(seed?: Buffer | number);
  update(data: Buffer): void;
  hash(data: Buffer): Buffer;
  digest(): Buffer;
  reset(): void;
}

