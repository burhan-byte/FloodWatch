import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import type { DB } from './db';
import { requestsRouter } from './routes/requests';
import type { Stream } from './stream';

export interface AppDeps {
  db: DB;
  stream: Stream;
  ipSalt: string;
  /** Express "trust proxy" setting; use 1 behind a single reverse proxy such as nginx. */
  trustProxy?: number | boolean;
  rateLimits?: boolean;
  /** Built frontend directory (Vite dist/). Served with SPA fallback when set. */
  staticDir?: string;
}

export function createApp({ db, stream, ipSalt, trustProxy, rateLimits = true, staticDir }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  app.use(express.json({ limit: '10kb' }));
  app.get('/api/stream', stream.handler);
  app.use('/api/requests', requestsRouter({ db, stream, ipSalt, rateLimits }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'ไม่พบ' }));

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'ข้อมูลใหญ่เกินไป' });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  });

  return app;
}
