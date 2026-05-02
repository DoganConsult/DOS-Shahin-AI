#!/usr/bin/env node
/**
 * deca-inventory.mjs
 *
 * Read-only DECA enforcement inventory. Reads the canonical scan-set produced
 * by deca-build-scan-set.mjs, classifies every file across 12 enforcement
 * layers, and emits per-layer JSON+Markdown artifacts under
 * docs/audits/deca-2026-04-27/.
 *
 * No source files are mutated. No mocks. No fake-green.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO = '/root/DOS-AIO';
const OUT_DIR = path.join(REPO, 'docs/audits/deca-2026-04-27');
const SCAN_SET = path.join(OUT_DIR, 'scan-set.txt');

// ─── Service / module derivation ────────────────────────────────────────────
function deriveService(file) {
  const rel = path.relative(REPO, file);
  // services/<name>/...
  const svc = rel.match(/^services\/([^/]+)\//);
  if (svc) return { tree: 'services', service: svc[1], module: null };
  // DOS Platform/<Module>/...
  const dos = rel.match(/^DOS Platform\/([^/]+)\//);
  if (dos) return { tree: 'DOS Platform', service: null, module: dos[1] };
  return { tree: 'unknown', service: null, module: null };
}

// ─── Frontend exclusion (content+path signature) ────────────────────────────
function isFrontendFile(file, src) {
  if (/\/_sources\/frontend[_/-]/i.test(file)) return true;
  if (/\/frontend[_-]shahin[_/-]/i.test(file)) return true;
  if (/\/frontend\//.test(file) && !/\/services\/_shared\/templates\//.test(file)) return true;
  if (/\/spa\//.test(file)) return true;
  if (/\/products\/shahin\//.test(file)) return true;
  if (/\/packages\/frontend\//.test(file)) return true;
  // Angular-only signal:
  if (/from\s+['"]@angular\//.test(src) && !/express|fastify|@nestjs/.test(src)) return true;
  return false;
}

// ─── Test detection ─────────────────────────────────────────────────────────
const isTestPath = (f) => /\.(test|spec|e2e)\.(c|m)?[jt]s$/i.test(f);

// ─── Detection signatures ───────────────────────────────────────────────────
//
// Each layer detector returns an array of row-objects. Detectors run on every
// non-frontend file. Rows include source file + line + symbol + classification.

function findLine(src, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < src.length; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

// Layer A — Gateway
function detectGateway(file, src) {
  const rows = [];
  if (!/\/gateway\//.test(file) && !/services\/gateway\//.test(file)) return rows;
  // Mount points: app.use('/api/<x>', ...) / proxy / fastify.register
  const mountRe = /(?:app|router|fastify)\.(use|register|all|get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = mountRe.exec(src))) {
    rows.push({
      kind: 'gateway-mount',
      method: m[1].toUpperCase(),
      symbol: m[2],
      line: findLine(src, m.index),
    });
  }
  // Trust patterns: forwarding x-* headers without verification
  const trustRe = /['"`]x-(user-id|user-email|tenant-id|tenant-code|user-roles|user-name)['"`]/gi;
  while ((m = trustRe.exec(src))) {
    rows.push({ kind: 'gateway-header', symbol: m[0], line: findLine(src, m.index) });
  }
  return rows;
}

// Layer B — Routes
//   Detects: Express/Fastify route definitions, NestJS controllers.
const ROUTE_VERBS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const ROUTE_RE = new RegExp(
  '\\b(?:app|router|fastify|api|server|http|root|instance)\\.(' + ROUTE_VERBS.join('|') + ')\\s*\\(\\s*[\'"`]([^\'"`]+)[\'"`]',
  'g',
);
const NEST_CTRL_RE = /@Controller\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?/g;
const NEST_VERB_RE = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?/g;

function detectRoutes(file, src) {
  const rows = [];
  let m;
  while ((m = ROUTE_RE.exec(src))) {
    rows.push({
      kind: 'route',
      framework: 'express-or-fastify',
      method: m[1].toUpperCase(),
      path: m[2],
      line: findLine(src, m.index),
    });
  }
  let ctrlPath = '';
  const ctrlMatch = NEST_CTRL_RE.exec(src);
  if (ctrlMatch) ctrlPath = ctrlMatch[1] || ctrlMatch[2] || ctrlMatch[3] || '';
  while ((m = NEST_VERB_RE.exec(src))) {
    const sub = m[2] || m[3] || m[4] || '';
    rows.push({
      kind: 'route',
      framework: 'nestjs',
      method: m[1].toUpperCase(),
      path: '/' + [ctrlPath, sub].filter(Boolean).join('/'),
      line: findLine(src, m.index),
    });
  }
  return rows;
}

// Layer C — Service / domain functions (high-risk mutations)
function detectServices(file, src) {
  if (!/\.(service|usecase|handler|domain|business)\.[mc]?[jt]s$/i.test(file)
      && !/\/(domain|services|usecases|handlers)\//.test(file)) return [];
  const rows = [];
  // export async function | export const X = async
  const fnRe = /export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = fnRe.exec(src))) {
    rows.push({
      kind: 'service-fn',
      symbol: m[1],
      line: findLine(src, m.index),
    });
  }
  // class methods (best-effort): public async X(  / async X(
  const methodRe = /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*[:{]/gm;
  while ((m = methodRe.exec(src))) {
    const name = m[1];
    if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(name)) continue;
    rows.push({ kind: 'service-method', symbol: name, line: findLine(src, m.index) });
  }
  return rows;
}

// Layer D — Module manifest / permission declarations
function detectModuleDecl(file, src) {
  const rows = [];
  if (/module\.manifest\.json$/i.test(file)) {
    try {
      const j = JSON.parse(src);
      rows.push({
        kind: 'manifest',
        moduleCode: j.code || j.moduleCode || j.name || '?',
        actions: Array.isArray(j.actions) ? j.actions.length : (j.actions ? Object.keys(j.actions).length : 0),
        permissions: Array.isArray(j.permissions) ? j.permissions.length : (j.permissions ? Object.keys(j.permissions).length : 0),
        roles: j.roles ? (Array.isArray(j.roles) ? j.roles.length : Object.keys(j.roles).length) : 0,
        routes: j.routes ? (Array.isArray(j.routes) ? j.routes.length : Object.keys(j.routes).length) : 0,
        line: 1,
      });
    } catch { /* malformed manifest */ }
  }
  if (/\/(permissions|actions|roles)\.(c|m)?[jt]s$/i.test(file)) {
    rows.push({ kind: 'perm-decl', symbol: path.basename(file), line: 1 });
  }
  return rows;
}

// Layer E — DB / tenant context
function detectDb(file, src) {
  const rows = [];
  const sigs = [
    [/withTenantClient\s*\(/g, 'withTenantClient'],
    [/setTenantContext\s*\(/g, 'setTenantContext'],
    [/SET\s+LOCAL\s+app\.tenant_id/gi, 'SET LOCAL tenant'],
    [/\bpool\.query\s*\(/g, 'pool.query'],
    [/\bdb\.query\s*\(/g, 'db.query'],
    [/\bclient\.query\s*\(/g, 'client.query'],
    [/prisma\.\$executeRawUnsafe\s*\(/g, 'prisma.$executeRawUnsafe'],
    [/prisma\.\$queryRawUnsafe\s*\(/g, 'prisma.$queryRawUnsafe'],
    [/CREATE\s+POLICY/gi, 'RLS-policy'],
    [/ALTER\s+TABLE\s+\w+\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi, 'RLS-enable'],
    [/INSERT\s+INTO\s+/gi, 'INSERT'],
    [/UPDATE\s+\w+\s+SET\s+/gi, 'UPDATE'],
    [/DELETE\s+FROM\s+/gi, 'DELETE'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'db', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer F — Background jobs / cron
function detectJobs(file, src) {
  const rows = [];
  const sigs = [
    [/new\s+CronJob\s*\(/g, 'CronJob'],
    [/cron\.schedule\s*\(/g, 'cron.schedule'],
    [/new\s+Worker\s*\(/g, 'BullMQ.Worker'],
    [/new\s+Queue\s*\(/g, 'BullMQ.Queue'],
    [/queue\.add\s*\(/g, 'queue.add'],
    [/queue\.process\s*\(/g, 'queue.process'],
    [/agenda\.define\s*\(/g, 'agenda.define'],
    [/setInterval\s*\(/g, 'setInterval'],
    [/setTimeout\s*\([^,]+,\s*\d+/g, 'setTimeout'],
    [/@Cron\s*\(/g, 'NestCron'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'job', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer G — WebSocket / SSE
function detectStreams(file, src) {
  const rows = [];
  const sigs = [
    [/new\s+WebSocketServer\s*\(/g, 'WebSocketServer'],
    [/new\s+WebSocket\.Server\s*\(/g, 'WebSocket.Server'],
    [/socket\.io|new\s+IOServer\(|new\s+Server\s*\(\s*\w+\s*,\s*\{[^}]*cors/g, 'socket.io'],
    [/ws\.on\s*\(\s*['"]connection['"]/g, 'ws.on(connection)'],
    [/text\/event-stream/g, 'SSE-content-type'],
    [/res\.setHeader\s*\(\s*['"]Content-Type['"]\s*,\s*['"]text\/event-stream/g, 'SSE-handler'],
    [/EventSource\s*\(/g, 'EventSource-client'], // FE only typically
    [/upgrade\s*:\s*['"]websocket['"]/gi, 'WS-upgrade'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'stream', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer H — AI / agent tools (MCP, agent tool registries)
function detectAiTools(file, src) {
  const rows = [];
  if (/\/mcp[-/]/.test(file) || /mcp-gateway/.test(file)) {
    rows.push({ kind: 'mcp-file', signal: 'mcp-path', line: 1 });
  }
  const sigs = [
    [/registerTool\s*\(/g, 'registerTool'],
    [/tools\.register\s*\(/g, 'tools.register'],
    [/server\.tool\s*\(/g, 'mcp.tool'],
    [/\bagent\.invoke\s*\(/g, 'agent.invoke'],
    [/\bdefineTool\s*\(/g, 'defineTool'],
    [/openai\.chat\.completions\.create/g, 'openai-chat'],
    [/anthropic\.messages\.create/g, 'anthropic-messages'],
    [/\bgenerateText\s*\(/g, 'ai-sdk-generateText'],
    [/promptTemplate|systemPrompt/g, 'prompt-template'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'ai', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer I — File / download / export
function detectDownloads(file, src) {
  const rows = [];
  const sigs = [
    [/res\.download\s*\(/g, 'res.download'],
    [/Content-Disposition\s*:\s*attachment/gi, 'attachment-header'],
    [/application\/octet-stream/g, 'octet-stream'],
    [/createPresignedUrl|getSignedUrl/g, 'presigned-url'],
    [/\barchiver\s*\(/g, 'archiver'],
    [/['"`]\/(export|download)\b/g, '/export-or-download-path'],
    [/PdfPrinter|pdfkit|puppeteer\.launch/g, 'pdf-generator'],
    [/exceljs|xlsx\.utils|XLSX\.write/g, 'xlsx-generator'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'download', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer J — Tests (decision/auth)
function detectTests(file, src) {
  if (!isTestPath(file)) return [];
  const rows = [];
  const sigs = [
    [/\b401\b/g, '401'],
    [/\b403\b/g, '403'],
    [/cross[-_]?tenant/gi, 'cross-tenant'],
    [/decision[_-]?ledger|authz_decision_log/gi, 'decision-ledger'],
    [/requirePermission|hasPermission|denyByDefault/g, 'perm-check'],
    [/x-tenant-id|x-user-id/gi, 'header-trust-test'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'test', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer K — Decision ledger
function detectLedger(file, src) {
  const rows = [];
  const sigs = [
    [/authz_decision_log/g, 'authz_decision_log'],
    [/decision_log\b/g, 'decision_log'],
    [/audit_log\b/g, 'audit_log'],
    [/audit_event\b/g, 'audit_event'],
    [/\blogDecision\s*\(/g, 'logDecision()'],
    [/\brecordDecision\s*\(/g, 'recordDecision()'],
    [/\bauditLogger\.\w+\s*\(/g, 'auditLogger'],
    [/\bemitDecision\s*\(/g, 'emitDecision()'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'ledger', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// Layer L — Tenant trust violations
function detectTenantTrust(file, src) {
  const rows = [];
  const sigs = [
    [/req\.body\.tenantId|req\.body\['tenantId'\]/g, 'req.body.tenantId'],
    [/req\.query\.tenantId|req\.query\['tenantId'\]/g, 'req.query.tenantId'],
    [/req\.params\.tenantId|req\.params\['tenantId'\]/g, 'req.params.tenantId'],
    [/req\.headers\[['"]x-tenant-id['"]\]/gi, 'req.headers.x-tenant-id'],
    [/request\.body\.tenantId/g, 'request.body.tenantId'],
    [/request\.query\.tenantId/g, 'request.query.tenantId'],
  ];
  for (const [re, label] of sigs) {
    let m;
    while ((m = re.exec(src))) {
      rows.push({ kind: 'tenant-trust', signal: label, line: findLine(src, m.index) });
    }
  }
  return rows;
}

// ─── Auth / permission detection (route-level enrichment) ───────────────────
const AUTH_MIDDLEWARE_RE = /\b(verifyToken|cookieAuth|requireAuth|authMiddleware|jwtMiddleware|isAuthenticated|requireSession|verifyJwt|authenticate|requireCaller)\b/;
const PERM_GUARD_RE = /\b(requirePermission|hasPermission|enforcePermission|checkPermission|authorize|requireAction|denyByDefault)\b/;
const TENANT_SCOPE_RE = /\b(tenantId|tenant_id|tenantContext|withTenant|TenantContext|tenantScoped|tenant-scope)\b/;
const PUBLIC_HINT_RE = /\b(public|health|healthz|readiness|liveness|ready|live|ping|metrics|webhook|callback|oidc-callback|oauth)\b/i;

// ─── Aggregator ─────────────────────────────────────────────────────────────
async function readFileSafe(file) {
  try { return await fs.readFile(file, 'utf8'); } catch { return null; }
}

async function main() {
  const scanSet = (await fs.readFile(SCAN_SET, 'utf8')).split('\n').filter(Boolean);
  const layers = {
    gateway: [], routes: [], services: [], modules: [], db: [], jobs: [],
    streams: [], aiTools: [], downloads: [], tests: [], ledger: [], tenantTrust: [],
  };
  let scannedFiles = 0;
  let frontendSkipped = 0;

  for (const file of scanSet) {
    const src = await readFileSafe(file);
    if (src == null) continue;
    if (isFrontendFile(file, src)) { frontendSkipped++; continue; }
    scannedFiles++;
    const meta = deriveService(file);
    const fileFlags = {
      hasAuthMw: AUTH_MIDDLEWARE_RE.test(src),
      hasPermGuard: PERM_GUARD_RE.test(src),
      hasTenantRef: TENANT_SCOPE_RE.test(src),
    };

    const push = (bucket, rows) => {
      for (const r of rows) {
        layers[bucket].push({
          file: path.relative(REPO, file),
          ...meta,
          ...r,
          fileFlags,
          isTest: isTestPath(file),
        });
      }
    };
    if (!isTestPath(file)) {
      push('gateway', detectGateway(file, src));
      push('routes', detectRoutes(file, src));
      push('services', detectServices(file, src));
      push('modules', detectModuleDecl(file, src));
      push('db', detectDb(file, src));
      push('jobs', detectJobs(file, src));
      push('streams', detectStreams(file, src));
      push('aiTools', detectAiTools(file, src));
      push('downloads', detectDownloads(file, src));
      push('ledger', detectLedger(file, src));
      push('tenantTrust', detectTenantTrust(file, src));
    } else {
      push('tests', detectTests(file, src));
    }
  }

  // ─── Risk classification (rubric in plan, deterministic) ─────────────────
  // For routes:
  for (const r of layers.routes) {
    const isPublicHint = PUBLIC_HINT_RE.test(r.path) || /\/(login|register|landing|health|healthz|ready|live|ping|metrics|webhook|callback|public|oidc)\b/i.test(r.path);
    const fl = r.fileFlags;
    let risk = 'P3';
    let reason = '';
    if (!fl.hasAuthMw && !isPublicHint) {
      risk = 'P0'; reason = 'protected route with no auth middleware in file';
    } else if (!fl.hasPermGuard && !isPublicHint) {
      risk = 'P1'; reason = 'auth present but no explicit permission guard';
    } else if (isPublicHint && !fl.hasAuthMw) {
      risk = 'P2'; reason = 'public route — needs explicit justification';
    } else if (fl.hasAuthMw && fl.hasPermGuard) {
      risk = 'P3'; reason = 'auth + permission present (verify ledger separately)';
    }
    r.publicOrProtected = isPublicHint && !fl.hasAuthMw ? 'PUBLIC' : 'PROTECTED';
    r.risk = risk;
    r.reason = reason;
  }

  // For tenant-trust hits: every hit is P0 by default per audit rule:
  // "Browser-supplied tenant authority must be marked P0 when it can affect tenant data."
  // We cannot statically prove it does NOT affect tenant data — fail closed.
  for (const r of layers.tenantTrust) {
    const inServiceOrDb = /\/(services|domain|usecases|handlers|repository|repo|db)\//.test(r.file)
      || /\.(service|usecase|handler|repository|repo)\.[mc]?[jt]s$/i.test(r.file);
    const inRoutes = /\/routes\//.test(r.file) || /\.routes\.[mc]?[jt]s$/i.test(r.file)
      || /\.controller\.[mc]?[jt]s$/i.test(r.file);
    r.risk = 'P0';
    r.reason = inServiceOrDb
      ? 'browser-supplied tenant authority in service/DB layer'
      : inRoutes
        ? 'browser-supplied tenant id referenced in route/controller — fail-closed P0 until proven not authoritative'
        : 'browser-supplied tenant id referenced; cannot prove non-authoritative';
  }

  // For DB mutations without nearby tenant context = P0 for files with INSERT/UPDATE/DELETE
  for (const r of layers.db) {
    if (['INSERT', 'UPDATE', 'DELETE'].includes(r.signal)) {
      const sameFile = layers.db.filter((x) => x.file === r.file).map((x) => x.signal);
      const hasTenant = sameFile.includes('withTenantClient') || sameFile.includes('setTenantContext') || sameFile.includes('SET LOCAL tenant');
      r.risk = hasTenant ? 'P2' : 'P0';
      r.reason = hasTenant
        ? 'tenant-scoped client present — verify it gates this mutation specifically'
        : 'tenant-scoped DB mutation without nearby tenant context';
    } else {
      r.risk = 'P3';
      r.reason = 'context/policy signal — informational';
    }
  }

  // Streams without auth middleware in file = P0
  for (const r of layers.streams) {
    if (['WebSocketServer', 'WebSocket.Server', 'ws.on(connection)', 'WS-upgrade', 'SSE-handler', 'SSE-content-type'].includes(r.signal)) {
      r.risk = r.fileFlags?.hasAuthMw ? 'P1' : 'P0';
      r.reason = r.fileFlags?.hasAuthMw
        ? 'stream handler with auth middleware in file — verify it gates upgrades'
        : 'stream handler with no auth middleware detected in file';
    } else {
      r.risk = 'P3';
      r.reason = 'client-side or informational signal';
    }
  }

  // AI tools without DAuth call = P0; just file-presence is P2 informational
  for (const r of layers.aiTools) {
    const sameFile = layers.aiTools.filter((x) => x.file === r.file).map((x) => x.signal);
    const isToolReg = ['registerTool', 'tools.register', 'mcp.tool', 'defineTool'].includes(r.signal);
    if (isToolReg) {
      r.risk = r.fileFlags?.hasPermGuard ? 'P1' : 'P0';
      r.reason = r.fileFlags?.hasPermGuard
        ? 'tool registration with permission guard in file — verify per-tool DAuth call'
        : 'tool registration without DAuth permission guard in file';
    } else if (['openai-chat', 'anthropic-messages', 'ai-sdk-generateText'].includes(r.signal)) {
      r.risk = r.fileFlags?.hasPermGuard ? 'P2' : 'P1';
      r.reason = 'LLM call site — should run under authenticated tool execution';
    } else {
      r.risk = 'P3';
      r.reason = 'AI signal — informational';
    }
  }

  // Downloads: any export/download path without permission guard in file = P0
  for (const r of layers.downloads) {
    const isPathHit = r.signal === '/export-or-download-path' || r.signal === 'res.download' || r.signal === 'attachment-header';
    if (isPathHit) {
      r.risk = r.fileFlags?.hasPermGuard ? 'P1' : 'P0';
      r.reason = r.fileFlags?.hasPermGuard
        ? 'download endpoint with permission guard in file — verify gate is on the endpoint'
        : 'download/export endpoint with no permission guard detected in file';
    } else {
      r.risk = 'P3';
      r.reason = 'generator signal — verify it runs only under authorized handlers';
    }
  }

  // Jobs: any cron/queue/worker without auth-mw OR explicit system-principal pattern = P1; INSERT/UPDATE/DELETE in same file => P0
  for (const r of layers.jobs) {
    const sameDbSignals = layers.db.filter((x) => x.file === r.file).map((x) => x.signal);
    const writes = sameDbSignals.some((s) => ['INSERT', 'UPDATE', 'DELETE'].includes(s));
    const hasSystemPrincipal = /SYSTEM_ACTOR|systemPrincipal|service_account|actorType\s*=\s*['"]system['"]/.test(r.file);
    if (['CronJob', 'cron.schedule', 'BullMQ.Worker', 'BullMQ.Queue', 'queue.process', 'agenda.define', 'NestCron'].includes(r.signal)) {
      r.risk = writes && !hasSystemPrincipal ? 'P0' : (hasSystemPrincipal ? 'P2' : 'P1');
      r.reason = writes && !hasSystemPrincipal
        ? 'job performs DB mutations without explicit system principal'
        : (hasSystemPrincipal ? 'job has system principal marker' : 'job has no explicit system principal');
    } else {
      r.risk = 'P3';
      r.reason = 'timer signal — informational';
    }
  }

  // Ledger informational (P3); coverage analysis happens cross-cut.
  for (const r of layers.ledger) r.risk = 'P3';

  // Service/method rows: P3 informational unless tenant-trust hits in same file (handled in cross-cut later).
  for (const r of layers.services) r.risk = 'P3';

  // Module/manifest informational P3.
  for (const r of layers.modules) r.risk = 'P3';

  // Gateway: route-mounts informational; trusted-headers without verifyToken in file = P1
  for (const r of layers.gateway) {
    if (r.kind === 'gateway-mount') {
      r.risk = 'P3';
      r.reason = 'gateway mount point — verify protected paths require auth';
    } else if (r.kind === 'gateway-header') {
      r.risk = r.fileFlags?.hasAuthMw ? 'P2' : 'P0';
      r.reason = r.fileFlags?.hasAuthMw
        ? 'gateway-injected header reference with auth middleware in file'
        : 'header reference in file without auth middleware — possible browser-trust path';
    }
  }

  for (const r of layers.tests) r.risk = 'P3';

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, '_meta.json'), JSON.stringify({
    scannedFiles, frontendSkipped, scanSetSize: scanSet.length,
  }, null, 2));

  // Persist all 12 layer JSONs
  const map = {
    '01-gateway': layers.gateway,
    '02-routes': layers.routes,
    '03-services': layers.services,
    '04-modules': layers.modules,
    '05-db': layers.db,
    '06-jobs': layers.jobs,
    '07-streams': layers.streams,
    '08-ai-tools': layers.aiTools,
    '09-downloads': layers.downloads,
    '10-tests': layers.tests,
    '11-ledger': layers.ledger,
    '12-tenant-trust': layers.tenantTrust,
  };
  for (const [name, rows] of Object.entries(map)) {
    await fs.writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(rows, null, 2));
  }
  console.error(JSON.stringify({
    scannedFiles, frontendSkipped, totals: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length])),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
