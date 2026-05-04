#!/usr/bin/env node
/**
 * DOS Master CLI — Doctrine Article 9 (CLI ↔ UI parity).
 *
 * Subcommands implemented in M6 D1:
 *   dos product:add        --code <c> --name <n> [--edition standard]
 *                          [--marketing /] [--workspace /workspace-home]
 *   dos product:list
 *   dos product:enroll     --product <c> --module <m> [--edition standard]
 *                          [--enabled true]
 *   dos service:register   --code <c> --name <n> --zone <public|tenant|admin>
 *                          --port <n> [--pm2 <name>]
 *   dos service:list
 *   dos doctrine:list
 *   dos rollout:list
 *   dos publish:revisions  [--target-kind k] [--target-key k]
 *   dos signup:flows
 *
 * Every write is mediated by the `dos-master` PG application identity
 * (SET dos.actor='dos-master') so the trg_dos_master_only enforcement
 * fires through the same path as the onboarding-service HTTP API.
 *
 * Connection: DATABASE_URL or PG_* envs. No external deps beyond `pg`,
 * which is already present in the workspace.
 */
import { Client } from 'pg';

const argv = process.argv.slice(2);
const cmd = argv.shift();

function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

function bool(v, def = false) {
  if (v === undefined) return def;
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return def;
}

async function withClient(fn) {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  const c = new Client({ connectionString: cs });
  await c.connect();
  try {
    await c.query(`SET dos.actor = 'dos-master'`);
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function productAdd() {
  const code = flag('code'); const name = flag('name');
  if (!code || !name) { console.error('--code and --name required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.product_registry
         (product_code, display_name, edition_default, marketing_root, workspace_root, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (product_code) DO UPDATE SET
         display_name=EXCLUDED.display_name,
         edition_default=EXCLUDED.edition_default,
         marketing_root=EXCLUDED.marketing_root,
         workspace_root=EXCLUDED.workspace_root`,
      [code, name, flag('edition', 'standard'), flag('marketing', null), flag('workspace', null)],
    );
    console.log(`[dos] product registered: ${code}`);
  });
}

async function productList() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT product_code, display_name, edition_default, status FROM dos_master.product_registry ORDER BY product_code`,
    );
    console.table(r.rows);
  });
}

async function productEnroll() {
  const product = flag('product'); const mod = flag('module');
  if (!product || !mod) { console.error('--product and --module required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.product_module_enrollment (product_code, module_code, edition, enabled)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_code, module_code, edition) DO UPDATE SET enabled=EXCLUDED.enabled`,
      [product, mod, flag('edition', 'standard'), bool(flag('enabled'), true)],
    );
    console.log(`[dos] enrolled ${product} ← ${mod}`);
  });
}

async function serviceRegister() {
  const code = flag('code'); const name = flag('name');
  const zone = flag('zone'); const port = Number(flag('port'));
  if (!code || !name || !zone || !port) {
    console.error('--code --name --zone --port required'); process.exit(2);
  }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.service_registry (service_code, display_name, trust_zone, port, pm2_name, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (service_code) DO UPDATE SET
         display_name=EXCLUDED.display_name, trust_zone=EXCLUDED.trust_zone,
         port=EXCLUDED.port, pm2_name=EXCLUDED.pm2_name`,
      [code, name, zone, port, flag('pm2', null)],
    );
    console.log(`[dos] service registered: ${code} :${port} [${zone}]`);
  });
}

async function serviceList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT service_code, port, trust_zone, status FROM dos_master.service_registry ORDER BY port`);
    console.table(r.rows);
  });
}

async function doctrineList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT article_no, title, enforced_by FROM dos_master.doctrine_article ORDER BY article_no`);
    console.table(r.rows);
  });
}

async function rolloutList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT id, title, status, created_at FROM dos.rollout_plan ORDER BY created_at DESC LIMIT 50`);
    console.table(r.rows);
  });
}

async function publishRevisions() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, target_kind, target_key, revision_no, status, created_at
         FROM dos.publish_revision
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

async function signupFlows() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT flow_code, product_code, display_name, enabled FROM dos_master.signup_flow ORDER BY flow_code`);
    console.table(r.rows);
  });
}

async function signupAttempts() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, flow_code, email, status, tenant_id, created_at
         FROM dos_master.signup_attempt
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

async function publishTargetAdd() {
  const kind = flag('kind'); const key = flag('key'); const name = flag('name');
  if (!kind || !key || !name) { console.error('--kind --key --name required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos.publish_target (target_kind, target_key, display_name, owner_team)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (target_kind, target_key) DO UPDATE SET display_name=EXCLUDED.display_name`,
      [kind, key, name, flag('owner', null)],
    );
    console.log(`[dos] publish target: ${kind}:${key}`);
  });
}

async function publishRevisionAdd() {
  const kind = flag('kind'); const key = flag('key'); const by = flag('by', 'dos-master-cli');
  const payload = flag('payload', '{}');
  if (!kind || !key) { console.error('--kind --key required'); process.exit(2); }
  return withClient(async (c) => {
    const n = await c.query(
      `SELECT COALESCE(MAX(revision_no),0)+1 AS n FROM dos.publish_revision WHERE target_kind=$1 AND target_key=$2`,
      [kind, key],
    );
    const r = await c.query(
      `INSERT INTO dos.publish_revision (target_kind, target_key, revision_no, payload, created_by, status)
       VALUES ($1,$2,$3,$4::jsonb,$5,'draft') RETURNING id, revision_no`,
      [kind, key, Number(n.rows[0].n), payload, by],
    );
    console.log(`[dos] revision created: ${r.rows[0].id} (rev ${r.rows[0].revision_no})`);
  });
}

async function publishGo() {
  const id = flag('id');
  if (!id) { console.error('--id required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`, [id]);
    if (!cur.rows.length) { console.error('revision_not_found'); process.exit(3); }
    const { target_kind, target_key } = cur.rows[0];
    const sup = await c.query(
      `UPDATE dos.publish_revision SET status='superseded'
        WHERE target_kind=$1 AND target_key=$2 AND status='live' AND id<>$3::uuid`,
      [target_kind, target_key, id],
    );
    await c.query(`UPDATE dos.publish_revision SET status='live' WHERE id=$1::uuid`, [id]);
    await c.query(
      `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
       VALUES ('global', $1, $2, 'v1', 0)`,
      [`${target_kind}:${target_key}`, `publish_revision:${id}`],
    );
    console.log(`[dos] published live; superseded ${sup.rowCount ?? 0}`);
  });
}

async function publishRollback() {
  const id = flag('id'); const by = flag('by', 'dos-master-cli'); const reason = flag('reason', 'cli rollback');
  if (!id) { console.error('--id required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`, [id]);
    if (!cur.rows.length || cur.rows[0].status !== 'live') { console.error('not_live'); process.exit(3); }
    await c.query(`INSERT INTO dos.publish_rollback (revision_id, rolled_back_by, reason) VALUES ($1::uuid,$2,$3)`, [id, by, reason]);
    await c.query(`UPDATE dos.publish_revision SET status='rolled_back' WHERE id=$1::uuid`, [id]);
    await c.query(
      `UPDATE dos.publish_revision SET status='live'
        WHERE id = (SELECT id FROM dos.publish_revision WHERE target_kind=$1 AND target_key=$2 AND status='superseded' ORDER BY revision_no DESC LIMIT 1)`,
      [cur.rows[0].target_kind, cur.rows[0].target_key],
    );
    await c.query(
      `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
       VALUES ('global', $1, $2, 'v1', 0)`,
      [`${cur.rows[0].target_kind}:${cur.rows[0].target_key}`, `publish_rollback:${id}`],
    );
    console.log(`[dos] rolled back ${id}`);
  });
}

async function provisioningJobs() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, tenant_id, product_code, edition, status, created_at
         FROM dos_master.provisioning_job
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

const dispatch = {
  'product:add': productAdd,
  'product:list': productList,
  'product:enroll': productEnroll,
  'service:register': serviceRegister,
  'service:list': serviceList,
  'doctrine:list': doctrineList,
  'rollout:list': rolloutList,
  'publish:revisions': publishRevisions,
  'signup:flows': signupFlows,
  'signup:attempts': signupAttempts,
  'provisioning:jobs': provisioningJobs,
  'publish:target:add': publishTargetAdd,
  'publish:revision:add': publishRevisionAdd,
  'publish:go': publishGo,
  'publish:rollback': publishRollback,
};

if (!cmd || cmd === '-h' || cmd === '--help') {
  console.log('Usage: dos <command> [--flag value ...]');
  console.log('Commands:');
  for (const k of Object.keys(dispatch).sort()) console.log('  dos', k);
  process.exit(cmd ? 0 : 1);
}

const fn = dispatch[cmd];
if (!fn) { console.error(`unknown command: ${cmd}`); process.exit(2); }
fn().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
