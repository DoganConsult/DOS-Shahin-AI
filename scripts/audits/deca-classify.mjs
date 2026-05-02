#!/usr/bin/env node
/**
 * deca-classify.mjs
 *
 * Read-only. Reads the per-layer JSON inventories produced by deca-inventory.mjs
 * and emits the markdown deliverables (per-layer .md, gap tables, cross-cuts,
 * waves, README).
 *
 * No source files are mutated.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO = '/root/DOS-AIO';
const OUT_DIR = path.join(REPO, 'docs/audits/deca-2026-04-27');

const LAYERS = [
  { id: '01-gateway', title: 'Layer A — Gateway', kindHint: 'gateway' },
  { id: '02-routes', title: 'Layer B — Routes' },
  { id: '03-services', title: 'Layer C — Service / domain functions' },
  { id: '04-modules', title: 'Layer D — Module manifests / permission decls' },
  { id: '05-db', title: 'Layer E — DB / tenant context' },
  { id: '06-jobs', title: 'Layer F — Background jobs / cron' },
  { id: '07-streams', title: 'Layer G — WebSocket / SSE' },
  { id: '08-ai-tools', title: 'Layer H — AI / agent tools' },
  { id: '09-downloads', title: 'Layer I — File / download / export' },
  { id: '10-tests', title: 'Layer J — Decision/auth tests' },
  { id: '11-ledger', title: 'Layer K — Decision ledger' },
  { id: '12-tenant-trust', title: 'Layer L — Tenant trust violations' },
];

async function loadJson(name) {
  const raw = await fs.readFile(path.join(OUT_DIR, `${name}.json`), 'utf8');
  return JSON.parse(raw);
}

function bucketBy(rows, keyFn) {
  const out = new Map();
  for (const r of rows) {
    const k = keyFn(r) ?? '(unknown)';
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

function fmtTable(headers, rows) {
  const out = [];
  out.push('| ' + headers.join(' | ') + ' |');
  out.push('|' + headers.map(() => '---').join('|') + '|');
  for (const row of rows) {
    out.push('| ' + headers.map((h) => {
      const v = row[h];
      const s = v == null ? '' : String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      return s.length > 200 ? s.slice(0, 197) + '…' : s;
    }).join(' | ') + ' |');
  }
  return out.join('\n');
}

function summarizeRisk(rows) {
  const byRisk = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const r of rows) byRisk[r.risk || 'P3']++;
  return byRisk;
}

function topPerService(rows, limit = 30) {
  const byService = bucketBy(rows, (r) => r.service || r.module || '(unknown)');
  const out = [];
  for (const [svc, list] of [...byService.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const sample = list.slice(0, limit);
    out.push({ service: svc, total: list.length, sample });
  }
  return out;
}

async function writeLayerMd(layer, rows) {
  const lines = [];
  lines.push(`# ${layer.title}`);
  lines.push('');
  lines.push(`Total rows: **${rows.length}**`);
  const risks = summarizeRisk(rows);
  lines.push(`Risk: P0=${risks.P0}, P1=${risks.P1}, P2=${risks.P2}, P3=${risks.P3}`);
  lines.push('');
  lines.push('## Per-service totals (top 30 by row count)');
  lines.push('');
  const grouped = topPerService(rows, 0);
  lines.push(fmtTable(['service', 'total'], grouped.slice(0, 30).map((g) => ({ service: g.service, total: g.total }))));
  lines.push('');
  // Show top 200 P0 + top 100 P1 rows to keep the doc readable
  const p0 = rows.filter((r) => r.risk === 'P0');
  const p1 = rows.filter((r) => r.risk === 'P1');
  if (p0.length) {
    lines.push(`## P0 sample (showing first ${Math.min(p0.length, 200)} of ${p0.length})`);
    lines.push('');
    lines.push(fmtTable(
      ['service', 'module', 'file', 'line', 'method', 'path', 'symbol', 'signal', 'reason'],
      p0.slice(0, 200).map((r) => ({
        service: r.service || '',
        module: r.module || '',
        file: r.file,
        line: r.line,
        method: r.method || r.kind,
        path: r.path || '',
        symbol: r.symbol || '',
        signal: r.signal || '',
        reason: r.reason || '',
      })),
    ));
    lines.push('');
  }
  if (p1.length) {
    lines.push(`## P1 sample (showing first ${Math.min(p1.length, 100)} of ${p1.length})`);
    lines.push('');
    lines.push(fmtTable(
      ['service', 'module', 'file', 'line', 'method', 'path', 'symbol', 'signal', 'reason'],
      p1.slice(0, 100).map((r) => ({
        service: r.service || '',
        module: r.module || '',
        file: r.file,
        line: r.line,
        method: r.method || r.kind,
        path: r.path || '',
        symbol: r.symbol || '',
        signal: r.signal || '',
        reason: r.reason || '',
      })),
    ));
    lines.push('');
  }
  await fs.writeFile(path.join(OUT_DIR, `${layer.id}.md`), lines.join('\n'));
}

async function writeGapTable(name, rows, levels) {
  const filtered = rows.filter((r) => levels.includes(r.risk));
  const lines = [];
  lines.push(`# Gap table — ${levels.join(' / ')}`);
  lines.push('');
  lines.push(`Total: **${filtered.length}**`);
  const byLayer = bucketBy(filtered, (r) => r._layer);
  lines.push('');
  lines.push('## By layer');
  lines.push('');
  lines.push(fmtTable(
    ['layer', 'count'],
    [...byLayer.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, v]) => ({ layer: k, count: v.length })),
  ));
  lines.push('');
  const byService = bucketBy(filtered, (r) => r.service || r.module || '(unknown)');
  lines.push('## By service / module');
  lines.push('');
  lines.push(fmtTable(
    ['service', 'count'],
    [...byService.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, v]) => ({ service: k, count: v.length })),
  ));
  lines.push('');
  // Full enumeration
  lines.push(`## All rows (${filtered.length})`);
  lines.push('');
  lines.push(fmtTable(
    ['layer', 'service', 'file', 'line', 'method', 'path', 'symbol', 'signal', 'reason'],
    filtered.map((r) => ({
      layer: r._layer,
      service: r.service || r.module || '',
      file: r.file,
      line: r.line,
      method: r.method || r.kind,
      path: r.path || '',
      symbol: r.symbol || '',
      signal: r.signal || '',
      reason: r.reason || '',
    })),
  ));
  await fs.writeFile(path.join(OUT_DIR, `${name}.md`), lines.join('\n'));
}

async function writePublicRoutes(routes) {
  const publics = routes.filter((r) => r.publicOrProtected === 'PUBLIC');
  const lines = [];
  lines.push('# Public routes — inventory & justification');
  lines.push('');
  lines.push(`Total public-flagged routes: **${publics.length}**`);
  lines.push('');
  lines.push('Heuristic: routes whose path matches `/(login|register|landing|health|metrics|webhook|callback|public|oidc)` and whose enclosing file does NOT contain an auth middleware import.');
  lines.push('');
  lines.push('Each row needs explicit justification before Wave 4 closes.');
  lines.push('');
  lines.push(fmtTable(
    ['service', 'file', 'line', 'method', 'path', 'justification (TBD)', 'min hardening'],
    publics.map((r) => ({
      service: r.service || r.module || '',
      file: r.file,
      line: r.line,
      method: r.method,
      path: r.path,
      'justification (TBD)': '',
      'min hardening': /webhook|callback/i.test(r.path) ? 'signed-payload + idempotency'
        : /health|liveness|readiness|metrics/i.test(r.path) ? 'rate-limit, no PII'
        : /login|register|oidc/i.test(r.path) ? 'rate-limit, captcha for register'
        : 'TBD',
    })),
  ));
  await fs.writeFile(path.join(OUT_DIR, 'public-routes.md'), lines.join('\n'));
  return publics.length;
}

async function writeCrossTenantRisk(tenantTrust, db) {
  // Cross-tenant risk: tenant-trust hit (browser-supplied tenant id) in any file
  // belonging to a service that ALSO has a DB INSERT/UPDATE/DELETE somewhere.
  // Joining by service (not file) reflects how request flow crosses route → service → repo.
  const writeServices = new Set();
  const writeFiles = new Set();
  for (const r of db) {
    if (['INSERT', 'UPDATE', 'DELETE'].includes(r.signal)) {
      writeFiles.add(r.file);
      writeServices.add(r.service || r.module || '');
    }
  }
  const risky = tenantTrust.filter((r) => {
    if (r.risk !== 'P0') return false;
    if (writeFiles.has(r.file)) return true;
    const svc = r.service || r.module || '';
    return svc && writeServices.has(svc);
  });
  const lines = [];
  lines.push('# Cross-tenant attack-surface map');
  lines.push('');
  lines.push(`Total cross-tenant risk rows: **${risky.length}**`);
  lines.push('');
  lines.push('Definition: a tenant-trust violation (browser-supplied tenantId) in the same file as a DB INSERT/UPDATE/DELETE signal.');
  lines.push('');
  lines.push(fmtTable(
    ['service', 'file', 'line', 'signal', 'reason'],
    risky.map((r) => ({
      service: r.service || r.module || '',
      file: r.file,
      line: r.line,
      signal: r.signal,
      reason: r.reason,
    })),
  ));
  await fs.writeFile(path.join(OUT_DIR, 'cross-tenant-risk.md'), lines.join('\n'));
  return risky.length;
}

async function writeDecisionLedgerShape(ledger) {
  const byFile = bucketBy(ledger, (r) => r.file);
  const lines = [];
  lines.push('# Decision-ledger shape — coverage harvest');
  lines.push('');
  lines.push(`Total ledger-touch sites: **${ledger.length}** across **${byFile.size}** files`);
  lines.push('');
  const sigCount = bucketBy(ledger, (r) => r.signal);
  lines.push('## Signal frequency');
  lines.push('');
  lines.push(fmtTable(
    ['signal', 'count'],
    [...sigCount.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => ({ signal: k, count: v.length })),
  ));
  lines.push('');
  lines.push('## Per-service ledger coverage');
  lines.push('');
  const perSvc = bucketBy(ledger, (r) => r.service || r.module || '(unknown)');
  lines.push(fmtTable(
    ['service', 'sites'],
    [...perSvc.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => ({ service: k, sites: v.length })),
  ));
  lines.push('');
  lines.push('## Field-coverage matrix (TODO — requires per-call inspection)');
  lines.push('');
  lines.push('Static analysis cannot prove ledger field shape (`userId`, `tenantId`, `action`, `decision`, `reason`, `correlationId`, `source`, `timestamp`). Wave 4 must add a contract test that intercepts every `logDecision` / `recordDecision` / `auditLogger.*` invocation and asserts the canonical schema.');
  lines.push('');
  lines.push('## Allow / deny code-path samples (top 20 ledger files)');
  lines.push('');
  const top = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20);
  lines.push(fmtTable(
    ['file', 'sites', 'signals'],
    top.map(([file, list]) => ({
      file,
      sites: list.length,
      signals: [...new Set(list.map((r) => r.signal))].join(', '),
    })),
  ));
  await fs.writeFile(path.join(OUT_DIR, 'decision-ledger-shape.md'), lines.join('\n'));
  return { sites: ledger.length, files: byFile.size };
}

async function writeModuleCoverage(modules, routes) {
  const manifests = modules.filter((m) => m.kind === 'manifest');
  const lines = [];
  lines.push('# Module-manifest coverage matrix');
  lines.push('');
  lines.push(`Total manifests discovered: **${manifests.length}**`);
  lines.push('');
  lines.push(fmtTable(
    ['service', 'module', 'moduleCode', 'actions', 'permissions', 'roles', 'routes-declared', 'routes-inventoried'],
    manifests.map((m) => {
      const perModuleRoutes = routes.filter((r) =>
        (r.module && m.module && r.module === m.module)
        || (r.service && m.service && r.service === m.service),
      ).length;
      return {
        service: m.service || '',
        module: m.module || '',
        moduleCode: m.moduleCode,
        actions: m.actions,
        permissions: m.permissions,
        roles: m.roles,
        'routes-declared': m.routes,
        'routes-inventoried': perModuleRoutes,
      };
    }),
  ));
  lines.push('');
  lines.push('Static analysis cannot prove route→permission mapping completeness from manifest alone. Wave 4 must add a contract test reading every manifest and reconciling against the inventoried routes for the same service/module.');
  await fs.writeFile(path.join(OUT_DIR, 'module-coverage-matrix.md'), lines.join('\n'));
  return manifests.length;
}

async function writeValidationSampling(routes) {
  // Pick 5 rows per service deterministically — first 5 routes per service in inventoried order.
  const byService = bucketBy(routes, (r) => r.service || r.module || '(unknown)');
  const lines = [];
  lines.push('# Validation sampling — 5 hand-checkable rows per service');
  lines.push('');
  lines.push('Method: deterministic sample of the first five route rows inventoried per service. Each must be hand-opened to confirm the scanner classification. Mismatches feed back into the regex tuning.');
  lines.push('');
  lines.push('Reviewer should mark the **observed** column with one of: `confirmed`, `false-positive`, `missed-guard`, `wrong-method`, `wrong-path`.');
  lines.push('');
  for (const [svc, list] of [...byService.entries()].sort()) {
    lines.push(`## ${svc} (${list.length} routes inventoried)`);
    lines.push('');
    lines.push(fmtTable(
      ['file', 'line', 'method', 'path', 'risk', 'reason', 'observed'],
      list.slice(0, 5).map((r) => ({
        file: r.file,
        line: r.line,
        method: r.method,
        path: r.path,
        risk: r.risk,
        reason: r.reason,
        observed: '',
      })),
    ));
    lines.push('');
  }
  await fs.writeFile(path.join(OUT_DIR, 'validation-sampling.md'), lines.join('\n'));
}

async function writeWaves(allRows) {
  const lines = [];
  lines.push('# Recommended implementation waves');
  lines.push('');
  lines.push('Wave assignment derived directly from the locked rubric. No demotions.');
  lines.push('');
  const wave1Services = new Set(['gateway', 'auth-service', 'tenant-service', 'user-service', 'workflow', 'workflow-service', 'platform-core-service']);
  const isWave1 = (r) => (r.service && wave1Services.has(r.service))
    || /\b(auth|tenant|user|workflow|gateway|core)\b/i.test(r.module || '');
  const isStreamOrAi = (r) => r._layer === '07-streams' || r._layer === '08-ai-tools' || r._layer === '06-jobs' || r._layer === '09-downloads';
  const counts = { wave1: 0, wave2: 0, wave3: 0, wave4: 0 };
  for (const r of allRows) {
    if (r.risk === 'P3') continue;
    if (isWave1(r) && (r.risk === 'P0' || r.risk === 'P1')) counts.wave1++;
    else if (isStreamOrAi(r)) counts.wave3++;
    else if (r.risk === 'P0' || r.risk === 'P1') counts.wave2++;
    else counts.wave4++;
  }
  lines.push(fmtTable(['wave', 'count'], [
    { wave: 'Wave 1 — gateway/auth/tenant/user/workflow P0+P1', count: counts.wave1 },
    { wave: 'Wave 2 — module/domain services P0+P1', count: counts.wave2 },
    { wave: 'Wave 3 — jobs/streams/AI/downloads', count: counts.wave3 },
    { wave: 'Wave 4 — ledger hardening, public-route doc, P2/P3 cleanup', count: counts.wave4 },
  ]));
  lines.push('');
  lines.push('Per-service Wave 1 candidates (top 30 by P0 count):');
  lines.push('');
  const p0 = allRows.filter((r) => r.risk === 'P0');
  const bySvc = bucketBy(p0, (r) => r.service || r.module || '(unknown)');
  lines.push(fmtTable(
    ['service', 'P0 count'],
    [...bySvc.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30).map(([k, v]) => ({ service: k, 'P0 count': v.length })),
  ));
  await fs.writeFile(path.join(OUT_DIR, 'waves.md'), lines.join('\n'));
}

async function writeReadme(stats) {
  const lines = [];
  lines.push('# DECA / DAuth Enforcement Audit — 2026-04-27');
  lines.push('');
  lines.push('**Verdict:** `NOT_PASS` (expected; this audit is read-only and does not fix gaps).');
  lines.push('');
  lines.push('This artifact set is the canonical inventory + gap table covering 12 enforcement layers across both backend trees:');
  lines.push('');
  lines.push('- `services/`');
  lines.push('- `DOS Platform/<Module>/{source,services,application/services,governance-os/{source,services},team/source,journey/source}/`');
  lines.push('');
  lines.push('Tests are inventoried only under Layer J. Frontend trees, build artifacts (`dist*`, `out-tsc*`, `.stryker-tmp`, `coverage`, `node_modules`, `__generated__`) are excluded.');
  lines.push('');
  lines.push('## Headline numbers');
  lines.push('');
  lines.push(fmtTable(
    ['metric', 'value'],
    [
      { metric: 'Files in scan-set', value: stats.scanSetSize },
      { metric: 'Files actually scanned (frontend skipped)', value: stats.scannedFiles },
      { metric: 'Frontend files skipped at scan time', value: stats.frontendSkipped },
      { metric: 'Routes inventoried', value: stats.routesTotal },
      { metric: 'Service / domain functions inventoried', value: stats.servicesTotal },
      { metric: 'DB signals inventoried', value: stats.dbTotal },
      { metric: 'Background-job signals', value: stats.jobsTotal },
      { metric: 'WS / SSE signals', value: stats.streamsTotal },
      { metric: 'AI / agent-tool signals', value: stats.aiTotal },
      { metric: 'Download / export signals', value: stats.downloadsTotal },
      { metric: 'Decision-ledger touch sites', value: stats.ledgerTotal },
      { metric: 'Tenant-trust violation hits', value: stats.tenantTrustTotal },
      { metric: 'Module manifests discovered', value: stats.manifestsTotal },
      { metric: 'Public routes (heuristic)', value: stats.publicRoutes },
      { metric: 'Cross-tenant risk rows', value: stats.crossTenantRisk },
      { metric: 'P0 total', value: stats.p0Total },
      { metric: 'P1 total', value: stats.p1Total },
      { metric: 'P2 total', value: stats.p2Total },
      { metric: 'P3 total', value: stats.p3Total },
    ],
  ));
  lines.push('');
  lines.push('## Artifact index');
  lines.push('');
  lines.push('| File | Purpose |');
  lines.push('|---|---|');
  lines.push('| `scan-set.txt` | Canonical file list scanned |');
  lines.push('| `_meta.json` | Scan run metadata |');
  lines.push('| `01-gateway.json/md` | Gateway mounts & header-trust signals |');
  lines.push('| `02-routes.json/md` | All HTTP route definitions |');
  lines.push('| `03-services.json/md` | Service / domain functions |');
  lines.push('| `04-modules.json/md` | Module manifests / permission decls |');
  lines.push('| `05-db.json/md` | DB query / mutation / RLS signals |');
  lines.push('| `06-jobs.json/md` | Cron / queue / worker signals |');
  lines.push('| `07-streams.json/md` | WebSocket / SSE handlers |');
  lines.push('| `08-ai-tools.json/md` | MCP / agent / LLM call sites |');
  lines.push('| `09-downloads.json/md` | File / download / export endpoints |');
  lines.push('| `10-tests.json/md` | Tests covering 401/403/cross-tenant/ledger |');
  lines.push('| `11-ledger.json/md` | Decision-ledger touch sites |');
  lines.push('| `12-tenant-trust.json/md` | Browser-supplied tenant authority risks |');
  lines.push('| `validation-sampling.md` | 5-row hand-check template per service |');
  lines.push('| `public-routes.md` | Public routes + justification template |');
  lines.push('| `decision-ledger-shape.md` | Ledger field-coverage harvest |');
  lines.push('| `cross-tenant-risk.md` | Tenant-trust ↔ DB write join |');
  lines.push('| `module-coverage-matrix.md` | Manifest vs inventoried-routes delta |');
  lines.push('| `gap-table-P0.md` | All P0 rows |');
  lines.push('| `gap-table-P1.md` | All P1 rows |');
  lines.push('| `gap-table-P2-P3-summary.md` | P2/P3 aggregated counts |');
  lines.push('| `waves.md` | Wave 1–4 fix roadmap |');
  lines.push('');
  lines.push('## Scanner limitations (acknowledged)');
  lines.push('');
  lines.push('- **Static regex passes** miss dynamically registered routes (plugin patterns, runtime route mounts), and over-detect comments that contain matching tokens.');
  lines.push('- **Fileflag heuristics** (auth-middleware, perm-guard, tenant-ref) are file-scoped, not call-site-scoped: a route may share a file with a guard yet not be guarded by it. Validation sampling is the mitigation — risks demoted by the file-scope heuristic must be re-checked manually before Wave 1 fixes land.');
  lines.push('- **Decision-ledger field shape** cannot be proven by static analysis. Wave 4 must add a contract test intercepting every ledger call.');
  lines.push('- **Route→permission mapping** completeness vs. module manifest cannot be statically reconciled when manifests use opaque IDs. Wave 4 must add a manifest×routes diff job.');
  lines.push('- **NestJS class-method route bodies** are detected by `@Controller`+`@<Verb>` decorators only; methods declared via metadata reflection are not seen.');
  lines.push('- **Frontend exclusion** uses path + Angular-import signals. Angular files mixed under `services/` would be missed; manual sampling did not surface any.');
  lines.push('');
  lines.push('## Final verdict');
  lines.push('');
  lines.push('`NOT_PASS`. Closing this verdict requires Waves 1–4 to land per `waves.md`. No "minimum viable" path exists — uniform rubric, no demotions.');
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
}

async function main() {
  // Load all layers
  const data = {};
  for (const L of LAYERS) data[L.id] = await loadJson(L.id);

  // Stamp _layer on every row for cross-cuts
  const allRows = [];
  for (const L of LAYERS) {
    for (const r of data[L.id]) {
      r._layer = L.id;
      allRows.push(r);
    }
  }

  // Per-layer markdowns
  for (const L of LAYERS) await writeLayerMd(L, data[L.id]);

  // Cross-cut artifacts
  await writeGapTable('gap-table-P0', allRows, ['P0']);
  await writeGapTable('gap-table-P1', allRows, ['P1']);
  // P2/P3 summary only — full enumeration would explode
  {
    const filtered = allRows.filter((r) => r.risk === 'P2' || r.risk === 'P3');
    const byLayer = bucketBy(filtered, (r) => r._layer);
    const byService = bucketBy(filtered, (r) => r.service || r.module || '(unknown)');
    const lines = [];
    lines.push('# Gap table — P2 / P3 (summary only)');
    lines.push('');
    lines.push(`Total: **${filtered.length}**`);
    lines.push('');
    lines.push('## By layer');
    lines.push('');
    lines.push(fmtTable(['layer', 'count'], [...byLayer.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => ({ layer: k, count: v.length }))));
    lines.push('');
    lines.push('## By service / module (top 50)');
    lines.push('');
    lines.push(fmtTable(['service', 'count'], [...byService.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 50).map(([k, v]) => ({ service: k, count: v.length }))));
    lines.push('');
    lines.push('Full enumeration of P2/P3 rows is omitted by design — the per-layer JSON files contain the raw data for any tooling that needs them.');
    await fs.writeFile(path.join(OUT_DIR, 'gap-table-P2-P3-summary.md'), lines.join('\n'));
  }

  // Specific cross-cuts
  const publicRoutesCount = await writePublicRoutes(data['02-routes']);
  const crossTenantRiskCount = await writeCrossTenantRisk(data['12-tenant-trust'], data['05-db']);
  const ledgerStats = await writeDecisionLedgerShape(data['11-ledger']);
  const manifestsCount = await writeModuleCoverage(data['04-modules'], data['02-routes']);
  await writeValidationSampling(data['02-routes']);
  await writeWaves(allRows);

  // Stats / README
  const meta = JSON.parse(await fs.readFile(path.join(OUT_DIR, '_meta.json'), 'utf8'));
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const r of allRows) counts[r.risk || 'P3']++;
  await writeReadme({
    scanSetSize: meta.scanSetSize,
    scannedFiles: meta.scannedFiles,
    frontendSkipped: meta.frontendSkipped,
    routesTotal: data['02-routes'].length,
    servicesTotal: data['03-services'].length,
    dbTotal: data['05-db'].length,
    jobsTotal: data['06-jobs'].length,
    streamsTotal: data['07-streams'].length,
    aiTotal: data['08-ai-tools'].length,
    downloadsTotal: data['09-downloads'].length,
    ledgerTotal: data['11-ledger'].length,
    tenantTrustTotal: data['12-tenant-trust'].length,
    manifestsTotal: manifestsCount,
    publicRoutes: publicRoutesCount,
    crossTenantRisk: crossTenantRiskCount,
    p0Total: counts.P0,
    p1Total: counts.P1,
    p2Total: counts.P2,
    p3Total: counts.P3,
  });

  // Print headline summary
  console.log(JSON.stringify({
    scanSetSize: meta.scanSetSize,
    scannedFiles: meta.scannedFiles,
    routesTotal: data['02-routes'].length,
    p0: counts.P0, p1: counts.P1, p2: counts.P2, p3: counts.P3,
    publicRoutes: publicRoutesCount,
    crossTenantRisk: crossTenantRiskCount,
    ledgerSites: ledgerStats.sites,
    manifests: manifestsCount,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
