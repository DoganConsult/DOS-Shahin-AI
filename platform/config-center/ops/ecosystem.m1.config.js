const path = require('path');
const fs = require('fs');
// File lives at platform/config-center/ops/ — repo root is three levels up.
const repoRoot = path.join(__dirname, '..', '..', '..');
// Microservices live at <repo-root>/services/ (promoted from platform/config-center/services
// during the four-tier consolidation, 2026-05-01).
const servicesDir = path.join(repoRoot, 'services');
// Canonical AI-OS source tree post Wave-1 reorg. The legacy
// 'DOS Platform/AI-OS Module/_sources' path was retired when services
// moved under platform/ai/services/<svc>/.
const aiSrcDir = path.join(repoRoot, 'platform', 'ai', 'services');
// 4D operational pillars — each ships its own service tree under
// platform/{pillar}/services/{pillar}-service/dist/.
const dnocSrcDir = path.join(repoRoot, 'platform', 'dnoc', 'services');
const dsocSrcDir = path.join(repoRoot, 'platform', 'dsoc', 'services');
const envDir = path.join(repoRoot, 'platform', 'config-center', 'env');
const pm2LogDir = process.env.DOS_PM2_LOG_ROOT || path.join(repoRoot, 'logs', 'pm2');
try {
  fs.mkdirSync(pm2LogDir, { recursive: true });
} catch {
  // best-effort
}

function parseEnvFile(filePath) {
  const env = {};
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
  } catch {}
  return env;
}

function loadEnv(serviceName) {
  // Load shared config first, then service-specific overrides
  const shared = parseEnvFile(path.join(envDir, '.env.shared'));
  const specific = parseEnvFile(path.join(envDir, `${serviceName}.env`));
  return { NODE_ENV: 'production', LOG_LEVEL: 'info', ...shared, ...specific };
}

module.exports = {
  apps: [
    { name: 'gateway',              script: `${servicesDir}/gateway/dist/server.js`,              port: 4000, instances: 2, exec_mode: 'cluster', max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
    { name: 'auth-service',         script: `${servicesDir}/auth-service/dist/server.js`,         port: 4001, max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
    { name: 'tenant-service',       script: `${servicesDir}/tenant-service/dist/server.js`,       port: 4002, max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
    { name: 'user-service',         script: `${servicesDir}/user-service/dist/server.js`,         port: 4003, max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
    { name: 'workflow-service',     script: `${servicesDir}/workflow-service/dist/server.js`,     port: 4004, max_memory_restart: '1536M', node_args: '--max-old-space-size=1024' },
    { name: 'notification-service', script: `${servicesDir}/notification-service/dist/server.js`, port: 4005, max_memory_restart: '768M', node_args: '--max-old-space-size=512' },
    { name: 'audit-service',        script: `${servicesDir}/audit-service/dist/server.js`,        port: 4006, max_memory_restart: '768M', node_args: '--max-old-space-size=512' },
    { name: 'ai-gateway-service',    cwd: `${aiSrcDir}/ai-gateway-service`,    script: 'dist/server.js', port: 4310, max_memory_restart: '2G',    node_args: '--max-old-space-size=1536' },
    { name: 'ai-engine-service',     cwd: `${aiSrcDir}/ai-engine-service`,     script: 'dist/main.js',   port: 4311, max_memory_restart: '2G',    node_args: '--max-old-space-size=1536' },
    { name: 'ai-temporal-worker',    cwd: `${aiSrcDir}/ai-engine-service`,     script: 'dist/temporal/worker.js', max_memory_restart: '2G', node_args: '--max-old-space-size=1536', env: { TEMPORAL_WORKER_HEALTH_PORT: '4313' } },
    // Second worker process on the same task queue. Temporal load-
    // balances dispatch across both. Doubles activity slots so heavier
    // LLM mixes don't stall during burst traffic.
    { name: 'ai-temporal-worker-2',  cwd: `${aiSrcDir}/ai-engine-service`,     script: 'dist/temporal/worker.js', max_memory_restart: '2G', node_args: '--max-old-space-size=1536', env: { TEMPORAL_WORKER_HEALTH_PORT: '4314' } },
    { name: 'ai-governance-service', cwd: `${aiSrcDir}/ai-governance-service`, script: 'dist/server.js', port: 4312, max_memory_restart: '1G',    node_args: '--max-old-space-size=768' },
    // Platform Admin Workspace — unified DOS/DAuth/DSOC/DNOC operator
    // surface + PM2 fleet dashboard. Lives under platform/ai/admin/ today
    // (per ports.allocation.json + workspace registration); env loaded from
    // platform/config-center/env/admin-service.env.
    { name: 'admin-service', cwd: path.join(repoRoot, 'platform', 'ai', 'admin', 'services', 'admin-service'), script: 'dist/server.js', port: 4080, max_memory_restart: '512M', node_args: '--max-old-space-size=384' },
    // 4D operational pillars. DNOC owns observability ingestion +
    // retention; DSOC owns platform_dsoc audit trail, alerts, and the
    // hourly tenant-posture loop wired in c865fcb0.
    { name: 'dnoc-service', cwd: `${dnocSrcDir}/dnoc-service`, script: 'dist/server.js', port: 4102, max_memory_restart: '1G', node_args: '--max-old-space-size=768' },
    { name: 'dsoc-service', cwd: `${dsocSrcDir}/dsoc-service`, script: 'dist/server.js', port: 4101, max_memory_restart: '1G', node_args: '--max-old-space-size=768' },
    // Onboarding-service lives outside `services/` (legacy folder name
    // 'Onboarding Module/services-onboarding-service'); use cwd + relative
    // script so the spaces in the path never reach a shell.
    { name: 'onboarding-service', cwd: path.join(repoRoot, 'Onboarding Module', 'services-onboarding-service'), script: 'dist/server.js', port: 4010, max_memory_restart: '1G', node_args: '--max-old-space-size=768' },
    { name: 'ui-os-service', script: `${servicesDir}/ui-os-service/dist/server.js`, port: 4015, max_memory_restart: '512M', node_args: '--max-old-space-size=512' },
    { name: 'platform-core-service', script: `${servicesDir}/platform-core-service/dist/server.js`, port: 4033, max_memory_restart: '1G', node_args: '--max-old-space-size=768' },
    // Sales Room — public asset hub + per-prospect demo rooms + signed
    // preview/download URLs + AI ingestion (A14 Sales Concierge).
    // Phase 1 = platform-owned (public.sales_room_*); Phase 2 will add
    // tenant-owned rooms.
    { name: 'sales-room-service',    script: `${servicesDir}/sales-room-service/dist/server.js`,    port: 4047, max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
    // Self-hosted Langfuse (Next.js LLM observability) — Postgres + ClickHouse + Redis backed.
    // Bash launcher sources /opt/langfuse/.env (DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY etc).
    // wait_ready=false because Next.js doesn't emit the process.send('ready') signal that PM2 looks for.
    { name: 'langfuse', script: '/opt/langfuse/start.sh', interpreter: 'bash', cwd: '/opt/langfuse', port: 4090, max_memory_restart: '2G', node_args: '', _wait_ready: false },
    // Product shell — serves Angular SPA on :3000, proxies /api to gateway :4000
    { name: 'product-shell',       script: `${servicesDir}/product-shell/dist/server.js`,       port: 3000, max_memory_restart: '1G',   node_args: '--max-old-space-size=768' },
  ].map(app => ({
    ...app,
    exec_mode: app.exec_mode || 'fork',
    instances: app.instances || 1,
    // wait_ready defaults to true, but apps that don't emit process.send('ready')
    // (e.g. Next.js / langfuse) can opt out via _wait_ready: false.
    wait_ready: app._wait_ready === false ? false : true,
    listen_timeout: 30000,
    kill_timeout: 30000,
    autorestart: true,
    node_args: app.node_args,
    env: { ...loadEnv(app.name), PORT: app.port, ...(app.env || {}) },
    error_file: path.join(pm2LogDir, `${app.name}-error.log`),
    out_file: path.join(pm2LogDir, `${app.name}-out.log`),
    merge_logs: true,
  })),
};
