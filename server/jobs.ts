import type { DB } from './db';
import { getVisible, purgeOldPhones, releaseStaleClaims, toPublic } from './requestsRepo';
import type { Stream } from './stream';

export function runJobs(db: DB, stream: Stream, now = new Date()) {
  const reopened = releaseStaleClaims(db, now);
  for (const id of reopened) {
    const row = getVisible(db, id);
    if (row) stream.broadcast('request.updated', toPublic(row));
  }
  const phonesPurged = purgeOldPhones(db, now);
  return { reopened, phonesPurged };
}

export function startJobs(db: DB, stream: Stream, intervalMs = 5 * 60 * 1000): () => void {
  runJobs(db, stream);
  const timer = setInterval(() => runJobs(db, stream), intervalMs);
  return () => clearInterval(timer);
}
