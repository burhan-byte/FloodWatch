import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// 32 symbols without l/o/0/1 so ids are easy to read aloud over the phone
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newId(length = 8): string {
  let id = '';
  for (const byte of randomBytes(length)) id += ID_ALPHABET[byte & 31];
  return id;
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function tokenMatches(token: string | undefined, hash: string | null): boolean {
  if (!token || !hash) return false;
  const a = Buffer.from(sha256(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
