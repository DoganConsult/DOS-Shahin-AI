import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'node:http';

import platformHealthRouter, { configurePlatformHealthProbes } from '../platform-health.routes';

function startStub(status: number): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(status);
      res.end('{}');
    });
    server.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({
        port,
        close: () => server.close(),
      });
    });
  });
}

function buildApp() {
  const app = express();
  app.use('/api/dos', platformHealthRouter);
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

describe('GET /api/dos/platform/health', () => {
  let stubs: Array<{ port: number; close: () => void }> = [];
  afterEach(() => {
    for (const s of stubs) s.close();
    stubs = [];
  });

  it('aggregates healthy when every module returns 200', async () => {
    const [a, b, c, d] = await Promise.all([startStub(200), startStub(200), startStub(200), startStub(200)]);
    stubs = [a, b, c, d];
    configurePlatformHealthProbes([
      { moduleCode: 'dos',   url: `http://127.0.0.1:${a.port}` },
      { moduleCode: 'dauth', url: `http://127.0.0.1:${b.port}` },
      { moduleCode: 'dsoc',  url: `http://127.0.0.1:${c.port}` },
      { moduleCode: 'dnoc',  url: `http://127.0.0.1:${d.port}` },
    ]);

    const res = await call(buildApp(), '/api/dos/platform/health?timeoutMs=2000');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.modules).toHaveLength(4);
    for (const m of res.body.modules) {
      expect(m.status).toBe('healthy');
      expect(m.httpStatus).toBe(200);
      expect(typeof m.latencyMs).toBe('number');
    }
  });

  it('returns 503 unhealthy when one module 500s', async () => {
    const [a, b, c, d] = await Promise.all([startStub(200), startStub(500), startStub(200), startStub(200)]);
    stubs = [a, b, c, d];
    configurePlatformHealthProbes([
      { moduleCode: 'dos',   url: `http://127.0.0.1:${a.port}` },
      { moduleCode: 'dauth', url: `http://127.0.0.1:${b.port}` },
      { moduleCode: 'dsoc',  url: `http://127.0.0.1:${c.port}` },
      { moduleCode: 'dnoc',  url: `http://127.0.0.1:${d.port}` },
    ]);

    const res = await call(buildApp(), '/api/dos/platform/health?timeoutMs=2000');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
    const dauth = res.body.modules.find((m: any) => m.moduleCode === 'dauth');
    expect(dauth.status).toBe('unhealthy');
    expect(dauth.httpStatus).toBe(500);
  });

  it('returns 207 degraded when a module 4xxs', async () => {
    const [a, b, c, d] = await Promise.all([startStub(200), startStub(200), startStub(404), startStub(200)]);
    stubs = [a, b, c, d];
    configurePlatformHealthProbes([
      { moduleCode: 'dos',   url: `http://127.0.0.1:${a.port}` },
      { moduleCode: 'dauth', url: `http://127.0.0.1:${b.port}` },
      { moduleCode: 'dsoc',  url: `http://127.0.0.1:${c.port}` },
      { moduleCode: 'dnoc',  url: `http://127.0.0.1:${d.port}` },
    ]);
    const res = await call(buildApp(), '/api/dos/platform/health?timeoutMs=2000');
    expect(res.status).toBe(207);
    expect(res.body.status).toBe('degraded');
  });

  it('reports an unhealthy module when the upstream is unreachable', async () => {
    configurePlatformHealthProbes([
      // Port 1 is privileged + will refuse immediately.
      { moduleCode: 'dos', url: 'http://127.0.0.1:1' },
    ]);
    const res = await call(buildApp(), '/api/dos/platform/health?timeoutMs=500');
    expect(res.status).toBe(503);
    expect(res.body.modules[0].status).toBe('unhealthy');
    expect(typeof res.body.modules[0].error).toBe('string');
  });
});
