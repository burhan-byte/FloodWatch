import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const HOUR_MS = 60 * 60 * 1000;

export function hourlyLimit(limit: number, enabled: boolean): RequestHandler {
  if (!enabled) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: HOUR_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' },
  });
}
