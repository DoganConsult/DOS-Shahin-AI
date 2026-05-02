// ============================================================================
// PM2 Dashboard — web-mounted ops surface.
//
// Public URL  : https://shahin-ai.com/admin/pm2/
// Auth        : HTTP Basic (PM2_DASHBOARD_USER / PM2_DASHBOARD_PASS).
//               Mirrors the langfuse pattern: this surface is intentionally
//               OUTSIDE the platform JWT layer so an operator can reach it
//               even when KC / DAuth is degraded — that is exactly the
//               scenario where the fleet board is most needed.
// Layout      : self-contained HTML page (no SPA build step) at GET /,
//               JSON read at GET /processes,
//               actions POST /:name/{restart|reload|stop|start|reset}
//               every action emits a structured audit log line.
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import pm2 from 'pm2';

const router = Router();

// ── Basic auth gate ────────────────────────────────────────────────────────
// Whitelist model: PM2_DASHBOARD_ALLOWED_USERS is a comma-separated list of
// usernames (emails). The shared password lives in PM2_DASHBOARD_PASS. Any
// username NOT in the whitelist is rejected with 401 even if the password
// is correct — the password is a *second* gate, not the only gate.
//
// We intentionally keep Basic auth here (not Keycloak) because the dashboard
// MUST be reachable when KC/DAuth degrade — that is exactly when the
// operator needs the fleet board. Treat the credential as break-glass.
const ALLOWED_USERS = new Set(
  (process.env.PM2_DASHBOARD_ALLOWED_USERS
    || process.env.PM2_DASHBOARD_USER
    || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
const PASS = process.env.PM2_DASHBOARD_PASS || '';
const REALM = 'DOS Platform - PM2 Fleet';

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function basicAuth(req: Request, res: Response, next: NextFunction): void {
  if (ALLOWED_USERS.size === 0 || !PASS) {
    res.status(503).type('text/plain').send(
      'PM2 dashboard is not provisioned. Set PM2_DASHBOARD_ALLOWED_USERS ' +
      'and PM2_DASHBOARD_PASS in platform/config-center/env/admin-service.env.'
    );
    return;
  }
  const hdr = req.headers.authorization || '';
  if (!hdr.toLowerCase().startsWith('basic ')) {
    res.set('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`);
    res.status(401).type('text/plain').send('Authentication required');
    return;
  }
  const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  const u = (idx >= 0 ? decoded.slice(0, idx) : '').toLowerCase();
  const p = idx >= 0 ? decoded.slice(idx + 1) : '';
  // Run BOTH checks even if username is wrong — keep timing constant by always
  // calling the password compare against the configured PASS.
  const userOk = ALLOWED_USERS.has(u);
  const passOk = safeEq(p, PASS);
  if (!userOk || !passOk) {
    // Audit every rejection so brute-force attempts surface in observability.
    console.log(JSON.stringify({
      ts: new Date().toISOString(), src: 'pm2-dashboard',
      action: 'auth_reject', target: '*', ok: false,
      detail: userOk ? 'bad_password' : 'user_not_whitelisted',
      actor: u || '<empty>',
      ip: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
        || req.socket.remoteAddress || 'unknown',
    }));
    res.set('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`);
    res.status(401).type('text/plain').send('Invalid credentials');
    return;
  }
  next();
}

router.use(basicAuth);

// ── PM2 programmatic API helpers ───────────────────────────────────────────
function pm2Connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => (err ? reject(err) : resolve()));
  });
}
function pm2List(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => (err ? reject(err) : resolve(list as any[])));
  });
}
function pm2Action(action: 'restart'|'reload'|'stop'|'start', name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    (pm2 as any)[action](name, (err: Error | null, proc: unknown) =>
      err ? reject(err) : resolve(proc));
  });
}
function pm2Reset(name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    (pm2 as any).reset(name, (err: Error | null, proc: unknown) =>
      err ? reject(err) : resolve(proc));
  });
}

function audit(req: Request, action: string, target: string, ok: boolean, detail?: string): void {
  const who = (req.headers.authorization || '').toLowerCase().startsWith('basic ')
    ? Buffer.from((req.headers.authorization as string).slice(6), 'base64').toString('utf8').split(':')[0]
    : 'anon';
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown';
  // Structured single-line audit; ops/observability stack scrapes pino-style
  // JSON via stdout. No PII beyond the dashboard local username.
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    src: 'pm2-dashboard',
    action, target, ok, detail: detail || null,
    actor: who, ip,
  }));
}

// ── JSON: process list ─────────────────────────────────────────────────────
router.get('/processes', async (req, res) => {
  try {
    await pm2Connect();
    const list = await pm2List();
    const out = list.map((p) => ({
      name: p.name,
      pm_id: p.pm_id,
      status: p.pm2_env?.status || 'unknown',
      restarts: p.pm2_env?.restart_time || 0,
      unstable: p.pm2_env?.unstable_restarts || 0,
      uptime_ms: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
      cpu: p.monit?.cpu ?? 0,
      memory: p.monit?.memory ?? 0,
      exec_mode: p.pm2_env?.exec_mode || 'fork',
      autorestart: !!p.pm2_env?.autorestart,
      max_memory_restart: p.pm2_env?.max_memory_restart || null,
      node_args: p.pm2_env?.node_args || [],
      port: p.pm2_env?.PORT || null,
      service_code: p.pm2_env?.SERVICE_CODE || null,
    }));
    res.json({ data: out, generated_at: new Date().toISOString() });
  } catch (e: any) {
    audit(req, 'list', '*', false, e?.message);
    res.status(500).json({ error: e?.message || 'pm2_list_failed' });
  }
});

// ── Actions ────────────────────────────────────────────────────────────────
const ACTIONS = new Set(['restart', 'reload', 'stop', 'start', 'reset']);
router.post('/:name/:action', async (req, res) => {
  const { name, action } = req.params as { name: string; action: string };
  if (!ACTIONS.has(action)) {
    res.status(400).json({ error: 'unknown_action' });
    return;
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    res.status(400).json({ error: 'invalid_name' });
    return;
  }
  try {
    await pm2Connect();
    if (action === 'reset') {
      await pm2Reset(name);
    } else {
      await pm2Action(action as any, name);
    }
    audit(req, action, name, true);
    res.json({ ok: true });
  } catch (e: any) {
    audit(req, action, name, false, e?.message);
    res.status(500).json({ ok: false, error: e?.message || 'pm2_action_failed' });
  }
});

// ── Self-contained HTML UI ─────────────────────────────────────────────────
const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DOS Platform — PM2 Fleet</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #0b0f14; color: #d6dde6; }
  header { padding: 14px 20px; border-bottom: 1px solid #1c2530; display: flex;
    align-items: center; gap: 16px; background: #11161d; }
  header h1 { font-size: 14px; font-weight: 600; margin: 0; color: #e6edf3; }
  header .pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; }
  .pill.ok { background: #133c1a; color: #56d364; border: 1px solid #1f6f2c; }
  .pill.bad { background: #3c1313; color: #f85149; border: 1px solid #6f1f1f; }
  header .actions { margin-left: auto; display: flex; gap: 8px; }
  button { background: #1c2530; color: #d6dde6; border: 1px solid #2d3947;
    padding: 5px 10px; border-radius: 4px; cursor: pointer; font: inherit; }
  button:hover { background: #243043; }
  button.danger { color: #f85149; border-color: #6f1f1f; }
  button.warn { color: #f0883e; border-color: #6f4a1f; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 10px; border-bottom: 1px solid #1c2530; text-align: left;
    white-space: nowrap; }
  th { background: #11161d; font-weight: 600; color: #8b949e; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.04em; position: sticky; top: 0; }
  tr:hover td { background: #11161d; }
  td.right { text-align: right; }
  .status { padding: 1px 7px; border-radius: 10px; font-size: 11px; }
  .status.online { background: #133c1a; color: #56d364; }
  .status.stopped { background: #2d3947; color: #8b949e; }
  .status.errored, .status.waiting { background: #3c1313; color: #f85149; }
  .status.launching { background: #3c2913; color: #f0883e; }
  .footer { padding: 10px 20px; color: #8b949e; font-size: 11px;
    border-top: 1px solid #1c2530; }
  .row-actions button { padding: 2px 6px; font-size: 11px; }
  .num { color: #8b949e; }
  .high { color: #f0883e; }
  .alert { color: #f85149; }
</style>
</head>
<body>
  <header>
    <h1>DOS Platform — PM2 Fleet</h1>
    <span id="summary" class="pill ok">loading…</span>
    <div class="actions">
      <label><input type="checkbox" id="autoRefresh" checked /> auto-refresh 5s</label>
      <button onclick="refresh()">↻ Refresh</button>
    </div>
  </header>
  <table>
    <thead><tr>
      <th>Name</th><th>Status</th><th>Restarts</th><th class="right">CPU %</th>
      <th class="right">Mem</th><th class="right">Uptime</th><th>Port</th>
      <th>Actions</th>
    </tr></thead>
    <tbody id="rows"><tr><td colspan="8">loading…</td></tr></tbody>
  </table>
  <div class="footer" id="footer">—</div>

<script>
const fmtMem = (b) => b < 1024*1024 ? (b/1024).toFixed(0)+' KB' : (b/1048576).toFixed(0)+' MB';
const fmtUp = (ms) => {
  if (ms == null) return '—';
  const s = Math.floor(ms/1000);
  if (s < 60) return s+'s';
  const m = Math.floor(s/60);
  if (m < 60) return m+'m';
  const h = Math.floor(m/60);
  if (h < 24) return h+'h '+(m%60)+'m';
  return Math.floor(h/24)+'d '+(h%24)+'h';
};
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function refresh() {
  try {
    const r = await fetch('processes', { credentials: 'include' });
    if (r.status === 401) { location.reload(); return; }
    const { data, generated_at } = await r.json();
    data.sort((a,b) => a.name.localeCompare(b.name));
    const onlineN = data.filter(p => p.status === 'online').length;
    const totalN = data.length;
    const sum = document.getElementById('summary');
    sum.textContent = onlineN+'/'+totalN+' online';
    sum.className = 'pill ' + (onlineN === totalN ? 'ok' : 'bad');
    document.getElementById('footer').textContent =
      'Last refresh: '+new Date(generated_at).toLocaleString()+
      '   |   '+totalN+' processes';
    document.getElementById('rows').innerHTML = data.map(p => {
      const restartsCls = p.restarts > 5 ? ' class="alert"' : (p.restarts > 0 ? ' class="high"' : ' class="num"');
      const cpuCls = p.cpu > 80 ? ' class="alert"' : (p.cpu > 40 ? ' class="high"' : ' class="num"');
      return '<tr>'
        +'<td><b>'+escape(p.name)+'</b></td>'
        +'<td><span class="status '+escape(p.status.replace(/\\s+/g,' '))+'">'+escape(p.status)+'</span></td>'
        +'<td'+restartsCls+'>'+p.restarts+(p.unstable?' ('+p.unstable+'!)':'')+'</td>'
        +'<td class="right"'+cpuCls+'>'+(p.cpu||0).toFixed(1)+'</td>'
        +'<td class="right num">'+fmtMem(p.memory||0)+'</td>'
        +'<td class="right num">'+fmtUp(p.uptime_ms)+'</td>'
        +'<td class="num">'+(p.port||'—')+'</td>'
        +'<td class="row-actions">'
          +'<button onclick="act(\\''+escape(p.name)+'\\',\\'restart\\')">restart</button> '
          +'<button onclick="act(\\''+escape(p.name)+'\\',\\'reload\\')">reload</button> '
          +'<button class="warn" onclick="act(\\''+escape(p.name)+'\\',\\'stop\\')">stop</button> '
          +'<button onclick="act(\\''+escape(p.name)+'\\',\\'reset\\')">reset</button>'
        +'</td></tr>';
    }).join('');
  } catch (e) {
    document.getElementById('footer').textContent = 'Error: '+e.message;
  }
}
async function act(name, action) {
  if (!confirm(action+' '+name+' ?')) return;
  const r = await fetch(encodeURIComponent(name)+'/'+action, { method: 'POST', credentials: 'include' });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) alert(action+' failed: '+(j.error||r.status));
  setTimeout(refresh, 500);
}
refresh();
setInterval(() => { if (document.getElementById('autoRefresh').checked) refresh(); }, 5000);
</script>
</body>
</html>`;

router.get('/', (_req, res) => {
  res.type('html').send(HTML);
});

export default router;
