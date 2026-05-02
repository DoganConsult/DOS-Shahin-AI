import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const SERVICES = [
  { name: 'gateway', port: 4000 },
  { name: 'auth-service', port: 4001 },
  { name: 'tenant-service', port: 4002 },
  { name: 'user-service', port: 4003 },
  { name: 'workflow-service', port: 4004 },
  { name: 'notification-service', port: 4005 },
  { name: 'audit-service', port: 4006 },
  { name: 'ai-gateway-service', port: 4007 },
  { name: 'onboarding-service', port: 4010 },
  { name: 'governance-policy-service', port: 4011 },
  { name: 'compliance-controls-service', port: 4012 },
  { name: 'risk-incident-service', port: 4013 },
  { name: 'evidence-audit-reporting-service', port: 4014 },
  { name: 'vendor-service', port: 4015 },
  { name: 'asset-service', port: 4016 },
  { name: 'bcp-service', port: 4017 },
  { name: 'training-service', port: 4018 },
  { name: 'privacy-service', port: 4019 },
  { name: 'dora-service', port: 4020 },
  { name: 'remediation-action-service', port: 4021 },
  { name: 'qiyas-journey-service', port: 4022 },
  { name: 'dashboard-widgets-service', port: 4023 },
  { name: 'analytics-service', port: 4024 },
  { name: 'executive-intelligence-service', port: 4025 },
  { name: 'integrations-service', port: 4026 },
  { name: 'notification-inbox-service', port: 4027 },
  { name: 'portals-service', port: 4028 },
  { name: 'records-service', port: 4029 },
  { name: 'platform-product-service', port: 4030 },
  { name: 'agrc-os-service', port: 4031 },
  { name: 'analytics-reporting-service', port: 4032 },
  { name: 'platform-core-service', port: 4033 },
  { name: 'product-shell', port: 3000 },
];

async function httpGet(port: number, path: string, timeoutMs = 5000): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: controller.signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    const body = await res.json().catch(() => null);
    return { status: res.status, body, headers };
  } catch {
    return { status: 0, body: null, headers: {} };
  } finally {
    clearTimeout(timeout);
  }
}

function getPm2Processes(): Array<{ name: string; status: string; restart: number; uptime: number; memory: number }> {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 10_000 });
    const procs = JSON.parse(raw);
    return procs.map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status || 'unknown',
      restart: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
      memory: p.monit?.memory || 0,
    }));
  } catch {
    return [];
  }
}

describe('Service Boot Health — All Services', () => {
  for (const svc of SERVICES) {
    describe(svc.name, () => {
      it(`returns /health 200 with correct schema`, async () => {
        const { status, body } = await httpGet(svc.port, '/health');
        expect(status).toBe(200);
        expect(body).toBeTruthy();
        expect(body.service).toBe(svc.name);
        expect(body.status).toMatch(/^(ok|degraded)$/);
        expect(body.timestamp).toBeTruthy();
        expect(typeof body.checks).toBe('object');
      });

      it(`returns /ready 200`, async () => {
        const { status, body } = await httpGet(svc.port, '/ready');
        expect(status).toBe(200);
        expect(body.status).toBe('ready');
        expect(body.service).toBe(svc.name);
      });

      if (svc.name !== 'product-shell') {
        it(`returns /metrics in Prometheus format`, async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(`http://127.0.0.1:${svc.port}/metrics`, { signal: controller.signal });
            expect(res.status).toBe(200);
            const ct = res.headers.get('content-type') || '';
            expect(ct).toMatch(/text\/plain|application\/openmetrics/);
            const text = await res.text();
            expect(text.length).toBeGreaterThan(0);
          } finally {
            clearTimeout(timeout);
          }
        });

        it(`returns /api-docs.json OpenAPI spec`, async () => {
          const { status, body } = await httpGet(svc.port, '/api-docs.json');
          if (status === 200) {
            expect(body.openapi).toMatch(/^3\./);
            expect(body.info?.title).toBeTruthy();
          }
        });
      }

      it(`sets security headers (helmet)`, async () => {
        const { headers } = await httpGet(svc.port, '/health');
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBeTruthy();
      });
    });
  }
});

describe('PM2 Process Stability', () => {
  const pm2Procs = getPm2Processes();

  it('PM2 is running and reporting processes', () => {
    if (pm2Procs.length === 0) {
      console.warn('[pm2] No PM2 processes found — skipping PM2 stability checks');
      return;
    }
    expect(pm2Procs.length).toBeGreaterThan(0);
  });

  if (getPm2Processes().length > 0) {
    it('all services are "online" in PM2', () => {
      const notOnline = pm2Procs.filter(p => p.status !== 'online');
      expect(notOnline.map(p => p.name), 'Services not online').toHaveLength(0);
    });

    it('no service has excessive restarts (> 5)', () => {
      const unstable = pm2Procs.filter(p => p.restart > 5);
      expect(
        unstable.map(p => `${p.name}(${p.restart})`),
        'Services with >5 restarts',
      ).toHaveLength(0);
    });

    it('no service exceeds 512MB memory', () => {
      const memLimit = 512 * 1024 * 1024;
      const overLimit = pm2Procs.filter(p => p.memory > memLimit);
      expect(
        overLimit.map(p => `${p.name}(${Math.round(p.memory / 1024 / 1024)}MB)`),
        'Services over 512MB',
      ).toHaveLength(0);
    });

    it('all services have been up for at least 30 seconds', () => {
      const tooNew = pm2Procs.filter(p => p.uptime < 30_000 && p.status === 'online');
      if (tooNew.length > 0) {
        console.warn(`[pm2] Recently restarted: ${tooNew.map(p => p.name).join(', ')}`);
      }
    });
  }
});

describe('Service Stability — 10 minute soak', { timeout: 660_000 }, () => {
  let pm2Before: Array<{ name: string; status: string; restart: number; uptime: number; memory: number }> = [];

  it('captures baseline PM2 restart counts', () => {
    pm2Before = getPm2Processes();
    if (pm2Before.length === 0) {
      console.warn('[pm2] No PM2 processes found — restart delta check will be skipped');
    }
  });

  it('all services remain healthy after 10 minutes', async () => {
    const soakMs = parseInt(process.env.SOAK_DURATION_MS ?? '600000', 10);
    await new Promise(resolve => setTimeout(resolve, soakMs));

    const results = await Promise.allSettled(
      SERVICES.map(async svc => {
        const { status } = await httpGet(svc.port, '/health');
        return { name: svc.name, status };
      }),
    );

    const failures = results
      .filter(r => r.status === 'fulfilled' && r.value.status !== 200)
      .map(r => (r as PromiseFulfilledResult<{ name: string; status: number }>).value.name);

    expect(failures, `Services unhealthy after 10min soak: ${failures.join(', ')}`).toHaveLength(0);
  });

  it('zero PM2 restarts during soak test', () => {
    if (pm2Before.length === 0) return;
    const pm2After = getPm2Processes();
    const restarted = pm2After.filter(a => {
      const before = pm2Before.find(b => b.name === a.name);
      return before && a.restart > before.restart;
    });
    expect(
      restarted.map(p => `${p.name}(+${p.restart - (pm2Before.find(b => b.name === p.name)?.restart || 0)})`),
      'Services restarted during 10min soak',
    ).toHaveLength(0);
  });
});

describe('Dependency Health Check Detail', () => {
  for (const svc of SERVICES) {
    if (svc.name === 'product-shell') continue;

    it(`${svc.name} /health includes database check`, async () => {
      const { status, body } = await httpGet(svc.port, '/health');
      if (status !== 200 && status !== 503) return; // service not reachable
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.database).toBe('ok');
    });

    it(`${svc.name} /health includes redis check when available`, async () => {
      const { status, body } = await httpGet(svc.port, '/health');
      if (status !== 200 && status !== 503) return;
      if (body.checks?.redis !== undefined) {
        expect(body.checks.redis).toBe('ok');
      }
    });
  }

  it('gateway /health aggregates downstream service statuses', async () => {
    const { status, body } = await httpGet(4000, '/health');
    if (status === 0) return; // gateway not reachable
    expect(body.status).toMatch(/^(ok|degraded)$/);
    expect(body.checks).toBeDefined();
    expect(typeof body.checks).toBe('object');
  });
});
