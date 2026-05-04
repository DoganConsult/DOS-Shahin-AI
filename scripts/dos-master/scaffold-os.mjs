#!/usr/bin/env node
// DOS Master Phase-2 OS scaffolder. Emits a controlled DDL + writer triggers
// + seed, a runtime service skeleton, env, ports.allocation entry, BFF proxy
// router, and 2 Carbon FE panels per OS. Invoked once per OS spec.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

const OSES = [
  { code: 'ai-os',                 port: 4019, prefix: 'ai',                 entity: 'AI model registry',           seed: 'shahin.gpt-classifier' },
  { code: 'notification-os',       port: 4020, prefix: 'notification',       entity: 'Notification template',       seed: 'tenant.signup.welcome' },
  { code: 'integration-os',        port: 4021, prefix: 'integration',        entity: 'Connector definition',        seed: 'core.slack' },
  { code: 'data-governance-os',    port: 4022, prefix: 'data_governance',    entity: 'Classification policy',       seed: 'core.pii.email' },
  { code: 'billing-os',            port: 4023, prefix: 'billing',            entity: 'Plan + price book',           seed: 'shahin.trial' },
  { code: 'feature-flag-os',       port: 4024, prefix: 'feature_flag',       entity: 'Feature flag',                seed: 'core.workflow.composer' },
  { code: 'security-secrets-os',   port: 4025, prefix: 'security_secret',    entity: 'Secret metadata + rotation',  seed: 'core.kc.client-secret' },
  { code: 'telemetry-os',          port: 4026, prefix: 'telemetry',          entity: 'Telemetry sink + alert rule', seed: 'core.prom.error-rate' },
  { code: 'schema-authoring-os',   port: 4027, prefix: 'schema_authoring',   entity: 'Schema artefact',             seed: 'core.dos.access-store' },
  { code: 'deployment-os',         port: 4028, prefix: 'deployment',         entity: 'Deployment artefact',         seed: 'core.gateway.v1' },
  { code: 'release-os',            port: 4029, prefix: 'release',            entity: 'Release train + gate',        seed: 'core.platform.r1' },
  { code: 'vendor-risk-os',        port: 4030, prefix: 'vendor_risk',        entity: 'Vendor risk record',          seed: 'core.vendor.aws' },
  { code: 'marketplace-os',        port: 4031, prefix: 'marketplace',        entity: 'Marketplace listing',         seed: 'core.app.compliance' },
  { code: 'dr-os',                 port: 4032, prefix: 'dr',                 entity: 'Disaster recovery plan',      seed: 'core.dr.region.failover' },
];

const TEMPLATE_KIND = {
  'ai-os':                ['llm','retrieval','classifier','agent','embedding'],
  'notification-os':      ['email','sms','push','webhook','in-app'],
  'integration-os':       ['inbound','outbound','bidirectional','webhook'],
  'data-governance-os':   ['classification','retention','consent','dlp','dsar'],
  'billing-os':           ['plan','addon','one-shot','metered'],
  'feature-flag-os':      ['boolean','percentage','cohort','kill-switch'],
  'security-secrets-os':  ['static','rotating','dynamic','federated'],
  'telemetry-os':         ['sink','alert','dashboard','synthetic'],
  'schema-authoring-os':  ['typescript','sql','json-schema','protobuf'],
  'deployment-os':        ['blue-green','canary','rolling','recreate'],
  'release-os':           ['minor','patch','major','hotfix'],
  'vendor-risk-os':       ['critical','elevated','standard','baseline'],
  'marketplace-os':       ['app','module','template','dataset'],
  'dr-os':                ['failover','restore','rebuild','simulate'],
};

const TODAY = '2026-05-04';

function w(p, body) {
  const dir = p.substring(0, p.lastIndexOf('/'));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(p, body);
}

for (const os of OSES) {
  const { code, port, prefix, entity, seed } = os;
  const recordTbl = `${prefix}_record`;
  const eventTbl = `${prefix}_event`;
  const camel = code.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
  const kebab = code;
  const camelLower = camel.charAt(0).toLowerCase() + camel.slice(1);
  const kinds = TEMPLATE_KIND[code] || ['generic'];

  // ── 1. DDL migration ──────────────────────────────────────────────────
  const ddl = `-- DOS Master Phase 2 — ${code} controlled tables.
-- Doctrine: Articles 4 (admin trust zone), 11 (DOS Master is the only writer).

BEGIN;

CREATE TABLE IF NOT EXISTS dos.${recordTbl} (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_key      text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  kind            text NOT NULL CHECK (kind IN (${kinds.map(k => `'${k}'`).join(',')})),
  trust_zone      text NOT NULL CHECK (trust_zone IN ('public','tenant','admin')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  retired_at      timestamptz,
  UNIQUE (record_key, version)
);
CREATE INDEX IF NOT EXISTS ix_${recordTbl}_status
  ON dos.${recordTbl}(record_key, status);

CREATE TABLE IF NOT EXISTS dos.${eventTbl} (
  id              bigserial PRIMARY KEY,
  record_id       uuid REFERENCES dos.${recordTbl}(id) ON DELETE CASCADE,
  record_key      text,
  kind            text NOT NULL,
  payload         jsonb,
  emitted_by      text NOT NULL,
  emitted_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_${eventTbl}_record
  ON dos.${eventTbl}(record_id, emitted_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['${recordTbl}','${eventTbl}'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_dos_master_only_%I ON dos.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_dos_master_only_%I
         BEFORE INSERT OR UPDATE OR DELETE ON dos.%I
         FOR EACH ROW EXECUTE FUNCTION trg_dos_master_only()',
      t, t);
  END LOOP;
END $$;

SET LOCAL dos.actor = 'dos-master';
INSERT INTO dos.${recordTbl} (record_key, version, title, kind, trust_zone, status, config, created_by, published_at)
VALUES ('${seed}', 1, '${entity}', '${kinds[0]}', 'admin', 'published',
        jsonb_build_object('seed', true), 'dos-master', now())
ON CONFLICT (record_key, version) DO NOTHING;

COMMIT;
`;
  w(`${ROOT}/platform/dos/migrations/public/20260504_0900_dos_master_${code.replace(/-/g, '_')}.sql`, ddl);

  // ── 2. Service skeleton ──────────────────────────────────────────────
  const svcDir = `${ROOT}/services/${code}-service`;

  w(`${svcDir}/package.json`, JSON.stringify({
    name: `@dos/${code}-service`,
    version: '0.1.0',
    description: `DOS Master Phase 2 — ${entity}`,
    private: true,
    main: 'dist/server.js',
    scripts: { build: 'tsc -p tsconfig.json', start: 'node dist/server.js', clean: 'rm -rf dist' },
    dependencies: {
      '@dos/service-bootstrap': 'workspace:*',
      '@dos/runtime-config': 'workspace:*',
      '@dos/db': 'workspace:*',
      express: '^4.22.0',
      zod: '^3.24.0',
    },
    devDependencies: { '@types/express': '^4.17.21', '@types/node': '^25.6.0', typescript: '^5.7.0' },
  }, null, 2) + '\n');

  w(`${svcDir}/tsconfig.json`, JSON.stringify({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: 'dist', rootDir: 'src', strict: false, declaration: false, declarationMap: false,
      composite: false, incremental: false, skipLibCheck: true, baseUrl: '.', paths: {},
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
  }, null, 2) + '\n');

  w(`${svcDir}/service.manifest.json`, JSON.stringify({
    serviceCode: `${code}-service`,
    version: '0.1.0',
    domains: ['platform'],
    trustZone: 'admin',
    dependencies: ['rollout-service'],
    apiPrefix: `/api/admin/${code}`,
    doctrineArticle: 11,
    controlled: true,
    writerActor: 'dos-master',
  }, null, 2) + '\n');

  w(`${svcDir}/src/lib/${code}-repo.ts`,
`import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> { await masterQuery(\`SET dos.actor = 'dos-master'\`); }

export async function listRecords(status?: string) {
  const r = await masterQuery(
    \`SELECT id, record_key, version, title, kind, trust_zone, status,
            created_by, created_at, published_at
       FROM dos.${recordTbl}
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY record_key, version DESC\`,
    [status ?? null],
  );
  return r.rows;
}

export async function getRecord(recordKey: string, version?: number) {
  const r = version
    ? await masterQuery(\`SELECT * FROM dos.${recordTbl} WHERE record_key=$1 AND version=$2\`, [recordKey, version])
    : await masterQuery(\`SELECT * FROM dos.${recordTbl} WHERE record_key=$1 ORDER BY version DESC LIMIT 1\`, [recordKey]);
  return r.rows[0] ?? null;
}

export async function createRecord(input: { record_key: string; title: string; kind: string; trust_zone: 'public'|'tenant'|'admin'; config: unknown; created_by: string; }) {
  await actor();
  const v = await masterQuery(
    \`SELECT COALESCE(MAX(version),0)::int + 1 AS next FROM dos.${recordTbl} WHERE record_key=$1\`,
    [input.record_key],
  );
  const next = (v.rows[0] as { next: number }).next;
  const r = await masterQuery(
    \`INSERT INTO dos.${recordTbl} (record_key, version, title, kind, trust_zone, status, config, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7) RETURNING *\`,
    [input.record_key, next, input.title, input.kind, input.trust_zone, JSON.stringify(input.config ?? {}), input.created_by],
  );
  return r.rows[0];
}

export async function publishRecord(recordKey: string, version: number) {
  await actor();
  const r = await masterQuery(
    \`UPDATE dos.${recordTbl} SET status='published', published_at=now()
      WHERE record_key=$1 AND version=$2 AND status='draft' RETURNING *\`,
    [recordKey, version],
  );
  if (!r.rows.length) throw new Error('not_found_or_not_draft');
  return r.rows[0];
}

export async function listEvents(recordKey?: string, limit = 100) {
  const r = await masterQuery(
    \`SELECT e.id, e.record_id, COALESCE(e.record_key, d.record_key) AS record_key,
            e.kind, e.payload, e.emitted_by, e.emitted_at
       FROM dos.${eventTbl} e
       LEFT JOIN dos.${recordTbl} d ON d.id = e.record_id
      WHERE ($1::text IS NULL OR COALESCE(e.record_key, d.record_key) = $1)
      ORDER BY e.emitted_at DESC LIMIT $2\`,
    [recordKey ?? null, Math.min(500, limit)],
  );
  return r.rows;
}

export async function emitEvent(input: { record_key: string; kind: string; payload?: Record<string, unknown>; emitted_by: string; }) {
  await actor();
  const rec = await getRecord(input.record_key);
  const r = await masterQuery(
    \`INSERT INTO dos.${eventTbl} (record_id, record_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3,$4::jsonb,$5) RETURNING *\`,
    [rec ? (rec as { id: string }).id : null, input.record_key, input.kind,
     JSON.stringify(input.payload ?? {}), input.emitted_by],
  );
  return r.rows[0];
}
`);

  w(`${svcDir}/src/schemas/${code}.schemas.ts`,
`import { z } from 'zod';

export const RecordCreateSchema = z.object({
  record_key: z.string().min(3).max(160).regex(/^[a-z0-9.\\-]+$/),
  title:      z.string().min(3).max(240),
  kind:       z.enum([${kinds.map(k => `'${k}'`).join(',')}]),
  trust_zone: z.enum(['public','tenant','admin']),
  config:     z.any().optional(),
  created_by: z.string().min(1).max(120),
});

export const RecordPublishSchema = z.object({
  record_key: z.string().min(3).max(160),
  version:    z.number().int().positive(),
});

export const EventEmitSchema = z.object({
  record_key: z.string().min(3).max(160),
  kind:       z.string().min(1).max(80),
  payload:    z.any().optional(),
  emitted_by: z.string().min(1).max(120),
});
`);

  w(`${svcDir}/src/routes/${code}.route.ts`,
`import { Router, type Request, type Response } from 'express';
import { listRecords, getRecord, createRecord, publishRecord, listEvents, emitEvent } from '../lib/${code}-repo.js';
import { RecordCreateSchema, RecordPublishSchema, EventEmitSchema } from '../schemas/${code}.schemas.js';

export const ${camelLower}Router = Router();

${camelLower}Router.get('/records', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ records: await listRecords(status) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

${camelLower}Router.get('/records/:record_key', async (req: Request, res: Response) => {
  try {
    const v = req.query.version ? Number(req.query.version) : undefined;
    const rec = await getRecord(String(req.params.record_key), v);
    if (!rec) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ record: rec });
  } catch (e) { res.status(500).json({ error: 'get_failed', detail: String((e as Error).message) }); }
});

${camelLower}Router.post('/records', async (req: Request, res: Response) => {
  const p = RecordCreateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, record: await createRecord(p.data as Parameters<typeof createRecord>[0]) }); }
  catch (e) { res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) }); }
});

${camelLower}Router.post('/records/publish', async (req: Request, res: Response) => {
  const p = RecordPublishSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.json({ ok: true, record: await publishRecord(String(p.data.record_key), Number(p.data.version)) }); }
  catch (e) { res.status(409).json({ error: 'publish_failed', detail: String((e as Error).message) }); }
});

${camelLower}Router.get('/events', async (req: Request, res: Response) => {
  try {
    const rk = typeof req.query.record_key === 'string' ? req.query.record_key : undefined;
    const lim = req.query.limit ? Number(req.query.limit) : 100;
    res.json({ events: await listEvents(rk, lim) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

${camelLower}Router.post('/events', async (req: Request, res: Response) => {
  const p = EventEmitSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, event: await emitEvent(p.data as Parameters<typeof emitEvent>[0]) }); }
  catch (e) { res.status(500).json({ error: 'emit_failed', detail: String((e as Error).message) }); }
});
`);

  w(`${svcDir}/src/routes/index.ts`,
`import { Router } from 'express';
import { ${camelLower}Router } from './${code}.route.js';

export const routes = Router();
routes.use('/admin/${code}', ${camelLower}Router);
routes.get('/admin/${code}/health', (_req, res) => res.json({ ok: true, service: '${code}-service' }));
`);

  w(`${svcDir}/src/server.ts`,
`import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';

const SERVICE_CODE = '${code}-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [{ path: '/api', router: routes }],
  });
  await start();
}

main().catch((err) => { console.error(\`Failed to start \${SERVICE_CODE}:\`, err); process.exit(1); });
`);

  // ── 3. env file ───────────────────────────────────────────────────────
  w(`${ROOT}/platform/config-center/env/${code}-service.env`,
`# DOS Master Phase 2 — ${code}-service env (${entity}).
NODE_ENV=production
PORT=${port}
LOG_LEVEL=info
DATABASE_URL=postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc
DB_POOL_MAX=4
REDIS_URL=redis://:d57921272933f2d3a94a6f1fbf42982791b8afdd74f96f89@127.0.0.1:6379/0
REDIS_PREFIX=dos:
GATEWAY_URL=http://127.0.0.1:4000
INTER_SERVICE_SECRET=local-dev-inter-service-secret-rotate-2026-04-28
DOS_MASTER_ACTOR=dos-master
`);

  // ── 4. admin-console-bff proxy router ────────────────────────────────
  w(`${ROOT}/services/admin-console-bff/src/routes/${code}-proxy.route.ts`,
`import { Router, type Request, type Response, type NextFunction } from 'express';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';
import { authWhoami } from '../lib/dos-master-evidence.js';

/** DOS Master Phase 2 — admin-console-bff → ${code}-service proxy.
 *  Doctrine: Article 4 (admin BFF mediates every admin-FE call). */
export const ${camelLower}ProxyRouter = Router();

const TARGET = process.env.DOS_${code.toUpperCase().replace(/-/g, '_')}_SERVICE_URL || 'http://127.0.0.1:${port}';

function readToken(req: Request): string | null {
  const h = req.header('authorization') ?? '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  const c = req.header('x-dos-admin-token');
  return c ? String(c) : null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readToken(req);
  if (!token) { res.status(401).json({ error: 'token_required' }); return; }
  const who = await authWhoami(token);
  if (!who) { res.status(401).json({ error: 'invalid_or_expired_token' }); return; }
  (req as Request & { admin?: unknown }).admin = who;
  next();
}

function forward(req: Request, res: Response): void {
  const url = new URL(\`\${TARGET}/api/admin/${code}\${req.url}\`);
  const lib = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = lib({
    protocol: url.protocol, hostname: url.hostname, port: url.port,
    path: url.pathname + url.search, method: req.method,
    headers: { 'content-type': req.header('content-type') ?? 'application/json', accept: 'application/json' },
  }, (r) => {
    res.status(r.statusCode ?? 502);
    const ct = r.headers['content-type']; if (ct) res.setHeader('content-type', String(ct));
    r.pipe(res);
  });
  upstream.on('error', (e) => res.status(502).json({ error: '${code}_upstream_error', detail: String(e.message) }));
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') upstream.write(JSON.stringify(req.body ?? {}));
  upstream.end();
}

${camelLower}ProxyRouter.use(requireAdmin);
${camelLower}ProxyRouter.all(/.*/, forward);
`);

  // ── 5. FE Carbon panels (records + events) ───────────────────────────
  const PanelDir = `${ROOT}/products/shahin-ai/app/src/app/pages/platform-admin/panels`;
  w(`${PanelDir}/${code}-records.panel.component.ts`,
`import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Row { id: string; record_key: string; version: number; title: string; kind: string; trust_zone: string; status: string; created_by: string; created_at: string; published_at: string | null; }
interface Payload { records: Row[] }

@Component({
  selector: 'app-platform-admin-${code}-records',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: \`
    <app-admin-panel-frame #frame
      title="${entity} — Records"
      subtitle="Source: dos.${recordTbl} (controlled by trg_dos_master_only_${recordTbl})."
      testid="panel-${code}-records">
      <cds-table [model]="model" data-testid="${code}-records-table"></cds-table>
    </app-admin-panel-frame>
  \`,
})
export class PlatformAdmin${camel}RecordsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/${code}/records');
      const d = this.frame.applyResult(r, (x) => !x?.records?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Key','Version','Title','Kind','Trust zone','Status','Created by','Published'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.records.map(r0 => [
          new TableItem({ data: r0.record_key }),
          new TableItem({ data: String(r0.version) }),
          new TableItem({ data: r0.title }),
          new TableItem({ data: r0.kind }),
          new TableItem({ data: r0.trust_zone }),
          new TableItem({ data: r0.status }),
          new TableItem({ data: r0.created_by }),
          new TableItem({ data: r0.published_at ?? '—' }),
        ]);
      }
    });
    void this.frame.load();
  }
}
`);

  w(`${PanelDir}/${code}-events.panel.component.ts`,
`import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Row { id: number; record_key: string | null; kind: string; emitted_by: string; emitted_at: string; }
interface Payload { events: Row[] }

@Component({
  selector: 'app-platform-admin-${code}-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: \`
    <app-admin-panel-frame #frame
      title="${entity} — Events"
      subtitle="Source: dos.${eventTbl} (append-only ledger, ${TODAY})."
      testid="panel-${code}-events">
      <cds-table [model]="model" data-testid="${code}-events-table"></cds-table>
    </app-admin-panel-frame>
  \`,
})
export class PlatformAdmin${camel}EventsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/${code}/events');
      const d = this.frame.applyResult(r, (x) => !x?.events?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Record key','Kind','Emitted by','Emitted at'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.events.map(r0 => [
          new TableItem({ data: r0.record_key ?? '—' }),
          new TableItem({ data: r0.kind }),
          new TableItem({ data: r0.emitted_by }),
          new TableItem({ data: r0.emitted_at }),
        ]);
      }
    });
    void this.frame.load();
  }
}
`);
}

// ── 6. ports.allocation.json (append) ───────────────────────────────────
const allocPath = `${ROOT}/platform/config-center/ops/ports.allocation.json`;
const alloc = JSON.parse(readFileSync(allocPath, 'utf8'));
for (const os of OSES) {
  if (alloc.services[`${os.code}-service`]) continue;
  alloc.services[`${os.code}-service`] = {
    port: os.port,
    cwd: `services/${os.code}-service`,
    script: 'dist/server.js',
    wave: 1,
    gatewayPrefix: `/api/admin/${os.code}`,
    envFile: `${os.code}-service`,
    note: `DOS Master Phase 2 — ${os.entity}. Allocated ${TODAY}.`,
  };
}
writeFileSync(allocPath, JSON.stringify(alloc, null, 2) + '\n');

console.log(`scaffolded ${OSES.length} OS surfaces`);
