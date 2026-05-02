#!/usr/bin/env node
/**
 * Pull-mode Keycloak event bridge (fallback for the SPI webhook).
 *
 * Polls the Keycloak Admin API (/admin/realms/{realm}/events and
 * /admin/realms/{realm}/admin-events) and forwards new events to the DAuth
 * webhook receiver at POST /api/keycloak/events. Safe to run under pm2 as a
 * long-lived fork; dedup + replay safety is provided by the webhook receiver
 * via its ON CONFLICT DO NOTHING index.
 *
 * Cursor state is stored in platform_dauth.keycloak_event_bridge_cursor so
 * restarts do not refetch the full history window.
 *
 * Env:
 *   KEYCLOAK_BASE_URL, KEYCLOAK_REALM
 *   KEYCLOAK_ADMIN_WRITE_CLIENT_ID / _SECRET
 *   DAUTH_WEBHOOK_URL                (default http://127.0.0.1:4001/api/keycloak/events)
 *   KEYCLOAK_WEBHOOK_SECRET          (shared with auth-service)
 *   DATABASE_URL                     (for cursor persistence)
 *
 * Usage:
 *   node scripts/bridge-keycloak-events.mjs --once
 *   node scripts/bridge-keycloak-events.mjs --interval 5000
 */
import { Client } from 'pg';

function env(n, f) { const v = process.env[n]; return v && v.length > 0 ? v : f; }

function parseArgs(argv) {
  const out = { once: false, interval: 5000, window: 60000 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--once') out.once = true;
    else if (argv[i] === '--interval') out.interval = Number(argv[++i]);
    else if (argv[i] === '--window') out.window = Number(argv[++i]);
  }
  return out;
}

async function adminToken(baseUrl, realm, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret,
  });
  const r = await fetch(
    `${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
  );
  if (!r.ok) throw new Error(`admin token: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

async function fetchEvents(baseUrl, realm, token, fromMs) {
  const base = `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}`;
  const q = `?dateFrom=${encodeURIComponent(new Date(fromMs).toISOString().slice(0, 10))}&first=0&max=200`;
  const r = await fetch(`${base}/events${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`events: ${r.status} ${await r.text()}`);
  const events = await r.json();
  return events.filter((e) => Number(e.time || 0) > fromMs);
}

async function forward(webhookUrl, secret, event) {
  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-DOS-Webhook-Secret': secret },
    body: JSON.stringify({
      time: Number(event.time) || Date.now(),
      type: String(event.type || 'UNKNOWN'),
      realmId: String(event.realmId || ''),
      clientId: event.clientId ?? null,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      ipAddress: event.ipAddress ?? null,
      details: event.details ?? {},
      error: event.error ?? null,
    }),
  });
  if (!r.ok) throw new Error(`webhook: ${r.status} ${await r.text()}`);
}

async function ensureCursor(pg) {
  await pg.query(`CREATE SCHEMA IF NOT EXISTS platform_dauth`);
  await pg.query(
    `CREATE TABLE IF NOT EXISTS platform_dauth.keycloak_event_bridge_cursor (
       realm_id TEXT PRIMARY KEY,
       last_event_time_ms BIGINT NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
}

async function getCursor(pg, realm) {
  const { rows } = await pg.query(
    `SELECT last_event_time_ms FROM platform_dauth.keycloak_event_bridge_cursor WHERE realm_id = $1`,
    [realm],
  );
  return rows.length ? Number(rows[0].last_event_time_ms) : Date.now() - 60_000;
}

async function setCursor(pg, realm, ms) {
  await pg.query(
    `INSERT INTO platform_dauth.keycloak_event_bridge_cursor (realm_id, last_event_time_ms)
     VALUES ($1, $2)
     ON CONFLICT (realm_id) DO UPDATE SET last_event_time_ms = EXCLUDED.last_event_time_ms, updated_at = now()`,
    [realm, ms],
  );
}

async function runOnce(ctx) {
  const { baseUrl, realm, clientId, clientSecret, webhookUrl, secret, pg } = ctx;
  const token = await adminToken(baseUrl, realm, clientId, clientSecret);
  const from = await getCursor(pg, realm);
  const events = await fetchEvents(baseUrl, realm, token, from);
  let forwarded = 0;
  let maxTime = from;
  for (const ev of events) {
    try {
      await forward(webhookUrl, secret, ev);
      forwarded++;
      if (Number(ev.time) > maxTime) maxTime = Number(ev.time);
    } catch (err) {
      console.error(`[bridge] forward failed: ${err.message}`);
    }
  }
  if (maxTime > from) await setCursor(pg, realm, maxTime);
  return { fetched: events.length, forwarded };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = env('KEYCLOAK_BASE_URL');
  const realm = env('KEYCLOAK_REALM', 'dogan');
  const clientId = env('KEYCLOAK_ADMIN_WRITE_CLIENT_ID') ?? env('KEYCLOAK_CLIENT_ID');
  const clientSecret = env('KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET') ?? env('KEYCLOAK_ADMIN_CLIENT_SECRET');
  const secret = env('KEYCLOAK_WEBHOOK_SECRET');
  const webhookUrl = env('DAUTH_WEBHOOK_URL', 'http://127.0.0.1:4001/api/keycloak/events');
  const dbUrl = env('DATABASE_URL');
  if (!baseUrl || !clientId || !clientSecret || !secret || !dbUrl) {
    console.error('missing env (KEYCLOAK_*, KEYCLOAK_WEBHOOK_SECRET, DATABASE_URL)');
    process.exit(2);
  }
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();
  await ensureCursor(pg);
  const ctx = { baseUrl, realm, clientId, clientSecret, webhookUrl, secret, pg };
  try {
    if (args.once) {
      const r = await runOnce(ctx);
      console.log(JSON.stringify(r));
      return;
    }
    let stopping = false;
    process.on('SIGTERM', () => { stopping = true; });
    process.on('SIGINT', () => { stopping = true; });
    while (!stopping) {
      try {
        const r = await runOnce(ctx);
        if (r.forwarded > 0) console.log(JSON.stringify(r));
      } catch (e) {
        console.error(`[bridge] cycle failed: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, args.interval));
    }
  } finally {
    await pg.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
