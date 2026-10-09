import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { openDb } from './db';
import { createStream, type Stream } from './stream';

const valid = { lat: 14.35, lng: 100.57, needs: ['evacuate'], phone: '081-234-5678', hasElderly: true };

let stream: Stream;
function setup(rateLimits = false) {
  const db = openDb(':memory:');
  stream = createStream();
  const app = createApp({ db, stream, ipSalt: 'test-salt', trustProxy: 1, rateLimits });
  return { db, app };
}
afterEach(() => stream.close());

async function create(app: ReturnType<typeof setup>['app']) {
  const res = await request(app).post('/api/requests').send(valid).expect(201);
  return res.body as { id: string; ownerToken: string };
}

describe('help request API', () => {
  it('creates a request, broadcasts it, and never leaks the phone in reads', async () => {
    const { app } = setup();
    const spy = vi.spyOn(stream, 'broadcast');
    const { id, ownerToken } = await create(app);
    expect(ownerToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(spy).toHaveBeenCalledWith('request.created', expect.objectContaining({ id }));

    const list = await request(app).get('/api/requests').expect(200);
    expect(list.body).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('0812345678');

    const one = await request(app).get(`/api/requests/${id}`).expect(200);
    expect(one.body).not.toHaveProperty('phone');

    const phone = await request(app).post(`/api/requests/${id}/phone`).expect(200);
    expect(phone.body).toEqual({ phone: '0812345678' });
  });

  it('returns field errors in Thai for invalid input', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/requests')
      .send({ ...valid, lat: 35.6, needs: [] })
      .expect(400);
    expect(res.body.fields.lat).toBe('ตำแหน่งต้องอยู่ในประเทศไทย');
    expect(res.body.fields.needs).toBe('เลือกประเภทความช่วยเหลืออย่างน้อย 1 อย่าง');
  });

  it('lets one volunteer claim, then release with the claim token', async () => {
    const { app } = setup();
    const { id } = await create(app);
    const claim = await request(app).post(`/api/requests/${id}/claim`).send({ name: 'ทีมเรือ' }).expect(200);
    await request(app).post(`/api/requests/${id}/claim`).send({ name: 'อีกทีม' }).expect(409);

    await request(app).post(`/api/requests/${id}/release`).set('X-Token', 'wrong').expect(403);
    const released = await request(app)
      .post(`/api/requests/${id}/release`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    expect(released.body.status).toBe('open');
  });

  it('resolves with the owner token or the claim token only', async () => {
    const { app } = setup();
    const a = await create(app);
    await request(app).post(`/api/requests/${a.id}/resolve`).expect(403);
    await request(app).post(`/api/requests/${a.id}/resolve`).set('X-Token', a.ownerToken).expect(200);
    await request(app).post(`/api/requests/${a.id}/resolve`).set('X-Token', a.ownerToken).expect(409);

    const b = await create(app);
    const claim = await request(app).post(`/api/requests/${b.id}/claim`).send({ name: 'ทีม' });
    const res = await request(app)
      .post(`/api/requests/${b.id}/resolve`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    expect(res.body.status).toBe('resolved');
  });

  it('lets only the owner edit', async () => {
    const { app } = setup();
    const { id, ownerToken } = await create(app);
    await request(app).patch(`/api/requests/${id}`).send({ details: 'x' }).expect(403);
    const res = await request(app)
      .patch(`/api/requests/${id}`)
      .set('X-Token', ownerToken)
      .send({ details: 'น้ำสูงถึงหน้าต่างแล้ว' })
      .expect(200);
    expect(res.body.details).toBe('น้ำสูงถึงหน้าต่างแล้ว');
  });

  it('hides a case after three different IPs flag it', async () => {
    const { app } = setup();
    const spy = vi.spyOn(stream, 'broadcast');
    const { id } = await create(app);
    for (const ip of ['10.0.0.1', '10.0.0.1', '10.0.0.2']) {
      await request(app).post(`/api/requests/${id}/flag`).set('X-Forwarded-For', ip).expect(204);
    }
    await request(app).get(`/api/requests/${id}`).expect(200);
    await request(app).post(`/api/requests/${id}/flag`).set('X-Forwarded-For', '10.0.0.3').expect(204);
    await request(app).get(`/api/requests/${id}`).expect(404);
    expect((await request(app).get('/api/requests')).body).toHaveLength(0);
    expect(spy).toHaveBeenCalledWith('request.removed', { id });
  });

  it('returns 404 for unknown cases', async () => {
    const { app } = setup();
    await request(app).get('/api/requests/nope1234').expect(404);
  });

  it('rate limits request creation per IP', async () => {
    const { app } = setup(true);
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/requests').set('X-Forwarded-For', '10.1.1.1').send(valid).expect(201);
    }
    const res = await request(app).post('/api/requests').set('X-Forwarded-For', '10.1.1.1').send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่');
  });
});
