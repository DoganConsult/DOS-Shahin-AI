import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { z } from 'zod';

import { dnocErrorMiddleware } from '../error.middleware';
import {
  setDNOCPort,
  resetDNOCPort,
  createDNOCPort,
  InMemoryMetricsRepository,
  InMemoryLogsRepository,
  InMemoryTracesRepository,
  InMemoryRoutesRepository,
  InMemoryHealthRepository,
} from '@dos/dnoc-core';

function buildApp(throwing: () => Error) {
  const app = express();
  app.use(express.json());
  app.get('/boom', (_req, _res, next) => next(throwing()));
  app.use(dnocErrorMiddleware);
  return app;
}

async function call(app: express.Express, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        const body = await res.json().catch(() => ({}));
        server.close();
        resolve({ status: res.status, body });
      } catch (err) { server.close(); reject(err); }
    });
  });
}

describe('dnocErrorMiddleware', () => {
  let logs: InMemoryLogsRepository;

  beforeEach(() => {
    logs = new InMemoryLogsRepository();
    setDNOCPort(
      createDNOCPort({
        metrics: new InMemoryMetricsRepository(),
        logs,
        traces: new InMemoryTracesRepository(),
        routes: new InMemoryRoutesRepository(),
        health: new InMemoryHealthRepository(),
      }),
    );
  });
  afterEach(() => resetDNOCPort());

  it('ZodError → 400 with issue list', async () => {
    const app = buildApp(() => z.number().parse('oops') as unknown as Error);
    const res = await call(app, '/boom');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });

  it('error with explicit status → that status', async () => {
    class BadGateway extends Error { status = 502; code = 'upstream_unavailable'; }
    const app = buildApp(() => new BadGateway('upstream is down'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('upstream_unavailable');
  });

  it('unknown error → 500 + emits an error log through the DNOC port', async () => {
    const app = buildApp(() => new Error('log probe'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('internal_error');
    expect(await logs.count()).toBe(1);
  });

  it('4xx errors do NOT emit a log (only 5xx do)', async () => {
    class BadReq extends Error { status = 400; }
    const app = buildApp(() => new BadReq('bad'));
    await call(app, '/boom');
    expect(await logs.count()).toBe(0);
  });
});
