import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { fork, ChildProcess, execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getEcosystemPorts } from '../helpers/ecosystemPorts';

const ROOT = path.resolve(__dirname, '../..');
/** Ports from ops/ecosystem.all.config.js (same source as PM2 / health-check-all.sh) */
const SERVICE_PORTS: Record<string, number> = getEcosystemPorts(ROOT);
const ALL_SERVICES = Object.keys(SERVICE_PORTS);
const runBootTests = process.env.RUN_SERVICE_BOOT_TESTS === 'true';

// ── Helpers ──────────────────────────────────────────────────────────

async function httpGet(port: number, urlPath: string, timeoutMs = 5000): Promise<{ status: number; body: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch {
    return { status: 0, body: null };
  } finally {
    clearTimeout(timeout);
  }
}

function getPm2Processes(): Array<{ name: string; status: string; restart: number; pid: number; memory: number }> {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 10_000 });
    const procs = JSON.parse(raw);
    return procs.map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status || 'unknown',
      restart: p.pm2_env?.restart_time || 0,
      pid: p.pid || 0,
      memory: p.monit?.memory || 0,
    }));
  } catch {
    return [];
  }
}

// ── 100%: Boot & Health for All 33 Services ──────────────────────────

(runBootTests ? describe : describe.skip)('Service Boot Health — All Services', () => {
  for (const svc of ALL_SERVICES) {
    const port = SERVICE_PORTS[svc];

    describe(svc, () => {
      it(`returns /health 200 with correct schema`, async () => {
        const { status, body } = await httpGet(port, '/health');
        expect(status).toBe(200);
        expect(body).toBeTruthy();
        expect(body.service).toBe(svc);
        expect(body.status).toMatch(/^(ok|degraded)$/);
        expect(body.timestamp).toBeTruthy();
        expect(typeof body.checks).toBe('object');
      });

      it(`returns /ready 200`, async () => {
        const { status, body } = await httpGet(port, '/ready');
        expect(status).toBe(200);
        expect(body.status).toBe('ready');
        expect(body.service).toBe(svc);
      });

      if (svc !== 'product-shell') {
        it(`returns /metrics in Prometheus format`, async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(`http://127.0.0.1:${port}/metrics`, { signal: controller.signal });
            expect(res.status).toBe(200);
            const ct = res.headers.get('content-type') || '';
            expect(ct).toMatch(/text\/plain|application\/openmetrics/);
            const text = await res.text();
            expect(text.length).toBeGreaterThan(0);
          } finally {
            clearTimeout(timeout);
          }
        });

        it(`returns /diagnostics with memory info`, async () => {
          const { status, body } = await httpGet(port, '/diagnostics');
          if (status === 200) {
            expect(body.memory).toBeDefined();
            expect(typeof body.memory.heapUsedMB).toBe('number');
            expect(typeof body.memory.rssMB).toBe('number');
          }
        });

        it(`/health checks report dependency status`, async () => {
          const { status, body } = await httpGet(port, '/health');
          if (status === 200 || status === 503) {
            expect(body.checks).toBeDefined();
            // All non-shell services should have a database check
            expect(body.checks.database).toBeDefined();
            expect(body.checks.database).toBe('ok');
          }
        });
      }

      it(`sets security headers (helmet)`, async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal });
          expect(res.headers.get('x-content-type-options')).toBe('nosniff');
          expect(res.headers.get('x-frame-options')).toBeTruthy();
        } finally {
          clearTimeout(timeout);
        }
      });
    });
  }
});

// ── 150%: Boot Time Benchmark ────────────────────────────────────────

(runBootTests ? describe : describe.skip)('Boot Time Benchmark — each service < 3 seconds', { timeout: 120_000 }, () => {
  const processes: Map<string, ChildProcess> = new Map();
  // Test a representative subset to keep CI reasonable
  const benchmarkServices = [
    'auth-service', 'tenant-service', 'user-service',
    'audit-service', 'notification-service', 'vendor-service',
    'asset-service', 'bcp-service', 'training-service',
  ];

  afterAll(async () => {
    for (const [, child] of processes) {
      child.kill('SIGTERM');
    }
    await new Promise(r => setTimeout(r, 3000));
    for (const [, child] of processes) {
      if (!child.killed) child.kill('SIGKILL');
    }
  });

  for (const svc of benchmarkServices) {
    it(`${svc} boots and responds to /health in < 3 seconds`, async () => {
      const scriptPath = path.join(ROOT, 'services', svc, 'dist', 'server.js');
      if (!existsSync(scriptPath)) {
        console.warn(`[skip] ${svc} has no dist/server.js — build first`);
        return;
      }

      // Use a unique test port to avoid conflicts with running services
      const testPort = SERVICE_PORTS[svc] + 5000;
      const start = performance.now();

      const child = fork(scriptPath, [], {
        cwd: path.join(ROOT, 'services', svc),
        env: {
          ...process.env,
          PORT: testPort.toString(),
          NODE_ENV: 'test',
          LOG_LEVEL: 'silent',
          RUN_MIGRATIONS: 'false',
          SERVICE_CODE: svc,
        },
        stdio: 'pipe',
      });
      processes.set(svc, child);

      // Wait for the 'ready' IPC message (emitted by createServiceServer on listen)
      const readyPromise = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${svc} did not send ready within 10s`)), 10_000);
        child.on('message', (msg) => {
          if (msg === 'ready') { clearTimeout(timer); resolve(); }
        });
        child.on('error', (err) => { clearTimeout(timer); reject(err); });
        child.on('exit', (code) => {
          if (code !== 0) { clearTimeout(timer); reject(new Error(`${svc} exited with code ${code}`)); }
        });
      });

      await readyPromise;
      const bootTime = performance.now() - start;

      // Verify health endpoint responds
      const { status } = await httpGet(testPort, '/health');
      expect(status).toBe(200);
      expect(bootTime, `${svc} boot time ${Math.round(bootTime)}ms exceeds 3s SLA`).toBeLessThan(3000);

      console.log(`  ${svc}: ${Math.round(bootTime)}ms`);

      // Cleanup
      child.kill('SIGTERM');
      processes.delete(svc);
      await new Promise(r => setTimeout(r, 1000));
    });
  }
});

// ── 150%: Graceful Shutdown Test ─────────────────────────────────────

(runBootTests ? describe : describe.skip)('Graceful Shutdown — SIGTERM completes in-flight requests', { timeout: 60_000 }, () => {
  it('in-flight request completes after SIGTERM, then process exits 0', async () => {
    const svc = 'audit-service'; // lightweight service for testing
    const scriptPath = path.join(ROOT, 'services', svc, 'dist', 'server.js');
    if (!existsSync(scriptPath)) {
      console.warn(`[skip] ${svc} has no dist/server.js`);
      return;
    }

    const testPort = SERVICE_PORTS[svc] + 6000;
    const child = fork(scriptPath, [], {
      cwd: path.join(ROOT, 'services', svc),
      env: {
        ...process.env,
        PORT: testPort.toString(),
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        RUN_MIGRATIONS: 'false',
        SERVICE_CODE: svc,
      },
      stdio: 'pipe',
    });

    // Wait for ready
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Not ready in 15s')), 15_000);
      child.on('message', (msg) => {
        if (msg === 'ready') { clearTimeout(timer); resolve(); }
      });
      child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Exited with ${code}`)); });
    });

    // Start an in-flight request (will take some time due to network I/O)
    const inflightPromise = httpGet(testPort, '/diagnostics', 35_000);

    // Small delay to ensure the request is being processed
    await new Promise(r => setTimeout(r, 50));

    // Send SIGTERM while request is in flight
    child.kill('SIGTERM');

    // The in-flight request should complete successfully
    const { status } = await inflightPromise;
    expect(status, 'In-flight request should complete after SIGTERM').toBe(200);

    // Process should exit with code 0 (graceful)
    const exitCode = await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(null); }, 35_000);
      child.on('exit', (code) => { clearTimeout(timer); resolve(code); });
    });
    expect(exitCode, 'Process should exit with code 0 after graceful shutdown').toBe(0);

    // New connections should be refused after shutdown
    const { status: postStatus } = await httpGet(testPort, '/health', 2000);
    expect(postStatus, 'New connections should be refused after shutdown').toBe(0);
  });
});

// ── 150%: Memory Leak Test (gated by RUN_LONG_TESTS) ────────────────

const runLongTests = process.env.RUN_LONG_TESTS === 'true';

((runBootTests && runLongTests) ? describe : describe.skip)('Memory Leak Test — 1 hour, memory stays within 2x initial', { timeout: 3_700_000 }, () => {
  let child: ChildProcess | null = null;
  const svc = 'audit-service';
  const testPort = SERVICE_PORTS[svc] + 7000;

  beforeAll(async () => {
    const scriptPath = path.join(ROOT, 'services', svc, 'dist', 'server.js');
    if (!existsSync(scriptPath)) return;

    child = fork(scriptPath, [], {
      cwd: path.join(ROOT, 'services', svc),
      env: {
        ...process.env,
        PORT: testPort.toString(),
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        RUN_MIGRATIONS: 'false',
        SERVICE_CODE: svc,
      },
      stdio: 'pipe',
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Not ready')), 15_000);
      child!.on('message', (msg) => { if (msg === 'ready') { clearTimeout(timer); resolve(); } });
      child!.on('exit', () => { clearTimeout(timer); reject(new Error('Exited')); });
    });
  });

  afterAll(() => {
    if (child && !child.killed) {
      child.kill('SIGTERM');
      setTimeout(() => { if (child && !child.killed) child.kill('SIGKILL'); }, 5000);
    }
  });

  it('memory stays within 2x initial after 1 hour of load', async () => {
    if (!child) { console.warn('[skip] Service not started'); return; }

    // Let service settle for 10 seconds
    await new Promise(r => setTimeout(r, 10_000));

    // Record initial memory
    const initialDiag = await httpGet(testPort, '/diagnostics');
    expect(initialDiag.status).toBe(200);
    const initialHeap = initialDiag.body.memory.heapUsedMB;
    console.log(`  Initial heap: ${initialHeap}MB`);

    const samples: number[] = [initialHeap];
    const ONE_HOUR = 60 * 60 * 1000;
    const SAMPLE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const LOAD_INTERVAL = 30_000; // send requests every 30s

    const startTime = Date.now();

    while (Date.now() - startTime < ONE_HOUR) {
      // Send a burst of requests to simulate load
      const requests = Array.from({ length: 100 }, () =>
        httpGet(testPort, '/health', 5000).catch(() => null)
      );
      await Promise.allSettled(requests);

      // Sample memory at 5-minute intervals
      const elapsed = Date.now() - startTime;
      if (elapsed > 0 && elapsed % SAMPLE_INTERVAL < LOAD_INTERVAL) {
        const diag = await httpGet(testPort, '/diagnostics');
        if (diag.status === 200) {
          const heap = diag.body.memory.heapUsedMB;
          samples.push(heap);
          console.log(`  [${Math.round(elapsed / 60_000)}min] heap: ${heap}MB`);
        }
      }

      await new Promise(r => setTimeout(r, LOAD_INTERVAL));
    }

    // Final sample
    const finalDiag = await httpGet(testPort, '/diagnostics');
    const finalHeap = finalDiag.body?.memory?.heapUsedMB ?? 0;
    samples.push(finalHeap);
    console.log(`  Final heap: ${finalHeap}MB (initial: ${initialHeap}MB, ratio: ${(finalHeap / initialHeap).toFixed(2)}x)`);

    expect(finalHeap, `Memory grew from ${initialHeap}MB to ${finalHeap}MB (>2x)`).toBeLessThan(initialHeap * 2);
  });
});

// ── 150%: PM2 Cluster Mode — Gateway 2 Instances + Zero-Downtime Reload ──

(runBootTests ? describe : describe.skip)('PM2 Cluster Mode — Gateway', { timeout: 60_000 }, () => {
  const pm2Procs = getPm2Processes();
  const gatewayProcs = pm2Procs.filter(p => p.name === 'gateway');

  it('gateway runs 2 instances in cluster mode', () => {
    if (pm2Procs.length === 0) {
      console.warn('[skip] PM2 not running');
      return;
    }
    expect(gatewayProcs.length, 'Gateway should have 2 PM2 instances').toBe(2);
    gatewayProcs.forEach(p => {
      expect(p.status, `Gateway instance pid=${p.pid} should be online`).toBe('online');
    });
  });

  it('zero-downtime reload: no failed health checks during pm2 reload gateway', async () => {
    if (gatewayProcs.length < 2) {
      console.warn('[skip] Gateway not in cluster mode or PM2 not running');
      return;
    }

    const originalPids = gatewayProcs.map(p => p.pid).sort();
    let failures = 0;
    let checks = 0;
    let polling = true;

    // Start continuous health polling (every 200ms)
    const pollLoop = (async () => {
      while (polling) {
        const { status } = await httpGet(4000, '/health', 2000);
        checks++;
        if (status !== 200) failures++;
        await new Promise(r => setTimeout(r, 200));
      }
    })();

    // Wait a beat then reload
    await new Promise(r => setTimeout(r, 500));

    try {
      execSync('pm2 reload gateway 2>/dev/null', { timeout: 30_000 });
    } catch (err) {
      console.warn('[pm2 reload] Command failed:', err);
    }

    // Wait for reload to settle
    await new Promise(r => setTimeout(r, 5000));
    polling = false;
    await pollLoop;

    console.log(`  Health checks during reload: ${checks}, failures: ${failures}`);
    expect(failures, `${failures}/${checks} health checks failed during reload`).toBe(0);

    // Verify new process IDs differ (processes actually restarted)
    const newProcs = getPm2Processes().filter(p => p.name === 'gateway');
    const newPids = newProcs.map(p => p.pid).sort();
    expect(newPids.length).toBe(2);

    const pidsChanged = newPids[0] !== originalPids[0] || newPids[1] !== originalPids[1];
    expect(pidsChanged, 'Gateway PIDs should change after reload').toBe(true);

    // Gateway still healthy
    const { status } = await httpGet(4000, '/health');
    expect(status).toBe(200);
  });
});
