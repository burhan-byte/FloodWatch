import { describe, expect, it } from 'vitest';
import { claimSchema, createRequestSchema, updateRequestSchema } from './schema';

const valid = { lat: 14.35, lng: 100.57, needs: ['evacuate'], phone: '081-234-5678' };

describe('createRequestSchema', () => {
  it('normalizes phone, dedupes needs and fills defaults', () => {
    const out = createRequestSchema.parse({ ...valid, needs: ['food', 'food', 'medical'] });
    expect(out.phone).toBe('0812345678');
    expect(out.needs).toEqual(['food', 'medical']);
    expect(out.peopleCount).toBe(1);
    expect(out.hasElderly).toBe(false);
    expect(out.details).toBe('');
  });

  it('rejects coordinates outside Thailand', () => {
    const r = createRequestSchema.safeParse({ ...valid, lat: 35.6, lng: 139.7 });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(['lat', 'lng']));
  });

  it('requires at least one need', () => {
    const r = createRequestSchema.safeParse({ ...valid, needs: [] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(['needs']);
  });

  it('rejects unknown needs and malformed phones', () => {
    expect(createRequestSchema.safeParse({ ...valid, needs: ['pizza'] }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
  });
});

describe('updateRequestSchema', () => {
  it('does not inject defaults for omitted fields', () => {
    expect(updateRequestSchema.parse({ details: 'น้ำสูงขึ้น' })).toEqual({ details: 'น้ำสูงขึ้น' });
  });
});

describe('claimSchema', () => {
  it('requires a non-empty name', () => {
    expect(claimSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(claimSchema.parse({ name: ' ทีมเรือ ' })).toEqual({ name: 'ทีมเรือ' });
  });
});

describe('type errors', () => {
  it('uses Thai messages for wrongly typed optional fields', () => {
    const r = createRequestSchema.safeParse({ ...valid, hasElderly: 'yes', details: 5 });
    expect(r.success).toBe(false);
    const msgs = r.error!.issues.map((i) => i.message);
    expect(msgs).toEqual(['ค่าไม่ถูกต้อง', 'ค่าไม่ถูกต้อง']);
  });
});

describe('top-level zod messages', () => {
  it('uses Thai for an unknown need', () => {
    const r = createRequestSchema.safeParse({ ...valid, needs: ['pizza'] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('ประเภทความช่วยเหลือไม่ถูกต้อง');
  });

  it('uses Thai when the body is not an object', () => {
    for (const schema of [createRequestSchema, updateRequestSchema, claimSchema]) {
      const r = schema.safeParse([]);
      expect(r.success).toBe(false);
      expect(r.error!.issues[0].message).toBe('ข้อมูลไม่ถูกต้อง');
    }
  });
});
