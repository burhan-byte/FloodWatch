import { describe, expect, it } from 'vitest';
import { newId, newToken, sha256, tokenMatches } from './tokens';

describe('tokens', () => {
  it('creates 8-char ids from an unambiguous alphabet', () => {
    const id = newId();
    expect(id).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{8}$/);
    expect(newId()).not.toBe(id);
  });

  it('creates url-safe 43-char tokens', () => {
    expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('matches a token only against its own hash', () => {
    const t = newToken();
    expect(tokenMatches(t, sha256(t))).toBe(true);
    expect(tokenMatches(newToken(), sha256(t))).toBe(false);
    expect(tokenMatches(t, null)).toBe(false);
    expect(tokenMatches(undefined, sha256(t))).toBe(false);
  });
});
