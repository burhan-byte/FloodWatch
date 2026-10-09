import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { createStream } from './stream';

function fakeClient() {
  const req = new EventEmitter() as unknown as Request;
  const writes: string[] = [];
  const res = {
    writeHead: () => res,
    write: (chunk: string) => writes.push(chunk),
    end: () => undefined,
  } as unknown as Response;
  return { req, res, writes };
}

describe('stream', () => {
  it('broadcasts named events to connected clients until they disconnect', () => {
    const stream = createStream();
    const a = fakeClient();
    stream.handler(a.req, a.res);
    expect(stream.clientCount()).toBe(1);

    stream.broadcast('request.created', { id: 'abc' });
    expect(a.writes.at(-1)).toBe('event: request.created\ndata: {"id":"abc"}\n\n');

    (a.req as unknown as EventEmitter).emit('close');
    expect(stream.clientCount()).toBe(0);
    stream.close();
  });
});
