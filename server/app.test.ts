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

  it('counts IPv6 addresses in the same /56 as one flagger', async () => {
    const { app } = setup();
    const { id } = await create(app);
    for (const ip of ['2001:db8:1:1::1', '2001:db8:1:1::2', '2001:db8:1:2::3']) {
      await request(app).post(`/api/requests/${id}/flag`).set('X-Forwarded-For', ip).expect(204);
    }
    await request(app).get(`/api/requests/${id}`).expect(200);
  });

  it('rate limits claims per IP', async () => {
    const { app } = setup(true);
    const { id } = await create(app);
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post(`/api/requests/${id}/claim`)
        .set('X-Forwarded-For', '10.2.2.2')
        .send({ name: 'ทีม' });
    }
    await request(app)
      .post(`/api/requests/${id}/claim`)
      .set('X-Forwarded-For', '10.2.2.2')
      .send({ name: 'ทีม' })
      .expect(429);
  });

  it('does not count failed creates against the hourly limit', async () => {
    const { app } = setup(true);
    const ip = '10.3.3.3';
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/requests').set('X-Forwarded-For', ip).send({}).expect(400);
    }
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/requests').set('X-Forwarded-For', ip).send(valid).expect(201);
    }
    await request(app).post('/api/requests').set('X-Forwarded-For', ip).send(valid).expect(429);
  });

  it('withholds the phone of resolved cases unless a valid token is sent', async () => {
    const { app } = setup();
    const { id, ownerToken } = await create(app);
    await request(app).post(`/api/requests/${id}/resolve`).set('X-Token', ownerToken).expect(200);
    const res = await request(app).post(`/api/requests/${id}/phone`).expect(409);
    expect(res.body).toEqual({ error: 'เคสนี้ปิดแล้ว' });
    await request(app).post(`/api/requests/${id}/phone`).set('X-Token', 'wrong').expect(409);
    const ok = await request(app).post(`/api/requests/${id}/phone`).set('X-Token', ownerToken).expect(200);
    expect(ok.body).toEqual({ phone: '0812345678' });

    const b = await create(app);
    const claim = await request(app).post(`/api/requests/${b.id}/claim`).send({ name: 'ทีม' });
    await request(app)
      .post(`/api/requests/${b.id}/resolve`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    const ok2 = await request(app)
      .post(`/api/requests/${b.id}/phone`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    expect(ok2.body).toEqual({ phone: '0812345678' });
  });

  it('rejects edits to resolved cases', async () => {
    const { app } = setup();
    const { id, ownerToken } = await create(app);
    await request(app).post(`/api/requests/${id}/resolve`).set('X-Token', ownerToken).expect(200);
    const res = await request(app)
      .patch(`/api/requests/${id}`)
      .set('X-Token', ownerToken)
      .send({ details: 'x' })
      .expect(409);
    expect(res.body).toEqual({ error: 'เคสนี้ปิดแล้ว' });
  });

  it('never puts the phone in broadcasts or mutation responses', async () => {
    const { app } = setup();
    const spy = vi.spyOn(stream, 'broadcast');
    const { id, ownerToken } = await create(app);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('0812345678');
    const claim = await request(app).post(`/api/requests/${id}/claim`).send({ name: 'ทีม' }).expect(200);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('0812345678');
    const patched = await request(app)
      .patch(`/api/requests/${id}`)
      .set('X-Token', ownerToken)
      .send({ details: 'x' })
      .expect(200);
    const released = await request(app)
      .post(`/api/requests/${id}/release`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    const resolved = await request(app)
      .post(`/api/requests/${id}/resolve`)
      .set('X-Token', ownerToken)
      .expect(200);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('0812345678');
    for (const body of [patched.body, released.body, resolved.body]) {
      expect(JSON.stringify(body)).not.toContain('0812345678');
    }
  });

  it('ignores status and hidden in PATCH bodies', async () => {
    const { app } = setup();
    const { id, ownerToken } = await create(app);
    const res = await request(app)
      .patch(`/api/requests/${id}`)
      .set('X-Token', ownerToken)
      .send({ status: 'resolved', hidden: 1, details: 'x' })
      .expect(200);
    expect(res.body.status).toBe('open');
    expect(res.body.details).toBe('x');
    await request(app).get(`/api/requests/${id}`).expect(200);
  });

  it('sets Referrer-Policy strict-origin', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/requests').expect(200);
    expect(res.headers['referrer-policy']).toBe('strict-origin');
  });

  it('answers other client errors with their status and a Thai message', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/requests')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'bogus')
      .send('{}');
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'ข้อมูลไม่ถูกต้อง' });
  });
});
