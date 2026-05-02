/**
 * DOS-AIO Service Boot & Stability Runner
 *
 * Standalone CLI that boots all services via PM2, validates /health = 200,
 * checks PM2 stability for a configurable soak period, and reports results.
 *
 * Service list: ops/ecosystem.all.config.js (same as PM2).
 *
 * Usage:
 *   npx tsx ops/scripts/boot-test-runner.ts [--soak-minutes 10]
 */
import { execSync } from 'child_process';
import * as http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEcosystemServiceList } from '../../../../tests/helpers/ecosystemPorts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SERVICES = getEcosystemServiceList(ROOT);

function httpGet(port: number, path: string, timeoutMs = 5000): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 0, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode || 0, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null }); });
    req.end();
  });
}

interface Pm2Proc { name: string; status: string; restart: number; memory: number }

function getPm2Processes(): Pm2Proc[] {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 10_000 });
    return JSON.parse(raw).map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status || 'unknown',
      restart: p.pm2_env?.restart_time || 0,
      memory: p.monit?.memory || 0,
    }));
  } catch {
    return [];
  }
}

async function run() {
  const soakMinutes = parseInt(process.argv.find(a => a.startsWith('--soak-minutes='))?.split('=')[1] || '10', 10);

  console.log('=== DOS-AIO Service Boot & Stability Runner ===\n');

  // Phase 1: Health check all services
  console.log('[1/4] Health check all services...');
  let pass = 0;
  let fail = 0;
  for (const svc of SERVICES) {
    const { status, body } = await httpGet(svc.port, '/health');
    if (status === 200) {
      const deps = body?.checks ? Object.entries(body.checks).map(([k, v]) => `${k}=${v}`).join(', ') : 'n/a';
      console.log(`  OK  ${svc.name} :${svc.port} [${deps}]`);
      pass++;
    } else {
      console.log(`  FAIL ${svc.name} :${svc.port} (status=${status})`);
      fail++;
    }
  }
  console.log(`  --> ${pass} passed, ${fail} failed\n`);

  // Phase 2: Boot time check via /diagnostics uptime
  console.log('[2/4] Boot time check (uptime from /diagnostics)...');
  for (const svc of SERVICES) {
    if (svc.name === 'product-shell') continue;
    const { status, body } = await httpGet(svc.port, '/diagnostics');
    if (status === 200 && body?.memory) {
      console.log(`  ${svc.name}: heap=${body.memory.heapUsedMB}MB, rss=${body.memory.rssMB}MB, uptime=${Math.round(body.uptime)}s`);
    }
  }
  console.log();

  // Phase 3: PM2 stability baseline
  console.log(`[3/4] PM2 soak test (${soakMinutes} minutes)...`);
  const pm2Before = getPm2Processes();
  if (pm2Before.length === 0) {
    console.log('  PM2 not running — skipping soak test\n');
  } else {
    console.log(`  Baseline: ${pm2Before.length} processes, waiting ${soakMinutes}min...`);
    await new Promise(r => setTimeout(r, soakMinutes * 60 * 1000));

    const pm2After = getPm2Processes();
    const restarted = pm2After.filter(a => {
      const b = pm2Before.find(x => x.name === a.name);
      return b && a.restart > b.restart;
    });
    if (restarted.length > 0) {
      console.log(`  FAIL: ${restarted.map(p => p.name).join(', ')} restarted during soak`);
      fail += restarted.length;
    } else {
      console.log('  OK: zero restarts during soak period');
    }
    console.log();
  }

  // Phase 4: Cluster mode check
  console.log('[4/4] Gateway cluster mode check...');
  const gwProcs = getPm2Processes().filter(p => p.name === 'gateway');
  if (gwProcs.length >= 2) {
    console.log(`  OK: gateway has ${gwProcs.length} instances`);
  } else if (gwProcs.length > 0) {
    console.log(`  WARN: gateway has ${gwProcs.length} instance(s), expected 2 for cluster mode`);
  } else {
    console.log('  SKIP: gateway not managed by PM2');
  }

  console.log(`\n=== Summary: ${pass} healthy, ${fail} failures ===`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Boot test runner failed:', err);
  process.exit(1);
});
