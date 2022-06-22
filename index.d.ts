export interface XXHash {
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
}

export class XXHash32 implements XXHash {
  constructor(seed: Buffer);
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer;
}

export class XXHash64 implements XXHash {
  constructor(seed: Buffer);
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer;
}

export class XXHash3 implements XXHash {
  constructor(seed_or_secret: Buffer);
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer;
}

export class XXHash128 implements XXHash {
  constructor(seed_or_secret: Buffer);
  update(data: Buffer): void;
  digest(): Buffer;
  reset(): void;
  static hash(data: Buffer): Buffer;
}
