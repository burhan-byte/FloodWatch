import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createApp } from './app';
import { openDb } from './db';
import { startJobs } from './jobs';
import { createStream } from './stream';

const PORT = Number(process.env.PORT ?? 8080);
const DB_PATH = process.env.DB_PATH ?? './data/floodwatch.db';
const TRUST_PROXY = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : undefined;

let ipSalt = process.env.IP_SALT;
if (!ipSalt) {
  console.warn('IP_SALT is not set; using a random salt, so fake-case flags reset on restart.');
  ipSalt = randomBytes(16).toString('hex');
}

const db = openDb(DB_PATH);
const stream = createStream();
const app = createApp({
  db,
  stream,
  ipSalt,
  trustProxy: TRUST_PROXY,
  staticDir: path.resolve(import.meta.dirname, '../dist'),
});
startJobs(db, stream);

app.listen(PORT, () => console.log(`FloodWatch server listening on http://localhost:${PORT}`));
