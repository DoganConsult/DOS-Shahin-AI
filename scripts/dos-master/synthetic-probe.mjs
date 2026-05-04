#!/usr/bin/env node
/**
 * DOS Master L36 — synthetic prober.
 *
 * Walks every dos.platform_slo row and probes the corresponding
 * service /health endpoint, then writes a dos.platform_slo_event
 * row (append-only ledger).
 *
 * Trust-zone routing:
 *   admin    → https://127.0.0.1:<port>/health  with mTLS client cert
 *   tenant   → http://127.0.0.1:<port>/health
 *   customer → http://127.0.0.1:<port>/health   (gateway)
 *
 * Run from cron / pm2-cron:
 *   node scripts/dos-master/synthetic-probe.mjs
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { request as httpReq } from 'node:http';
import { request as httpsReq, Agent as HttpsAgent } from 'node:https';

const url = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';
const CA   = process.env.ADMIN_MTLS_CA   || 'platform/config-center/secrets/admin-mtls/ca.crt';
const CERT = process.env.ADMIN_MTLS_CERT || 'platform/config-center/secrets/admin-mtls/gateway-client.crt';
const KEY  = process.env.ADMIN_MTLS_KEY  || 'platform/config-center/secrets/admin-mtls/gateway-client.key';

let agent = null;
if (existsSync(CA) && existsSync(CERT) && existsSync(KEY)) {
  agent = new HttpsAgent({
    ca: readFileSync(CA), cert: readFileSync(CERT), key: readFileSync(KEY),
    rejectUnauthorized: true, keepAlive: true,
  });
}

function probe(host, port, useHttps) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = (useHttps ? httpsReq : httpReq)({
      host, port, path: '/health', method: 'GET',
      timeout: 3000,
      ...(useHttps && agent ? { agent } : {}),
    }, (res) => {
      const ms = Date.now() - t0;
      res.resume();
      res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, ms, err: null }));
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, ms: Date.now() - t0, err: String(e.message).slice(0, 120) }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, ms: 3000, err: 'timeout' }); });
    req.end();
  });
}

const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query("SET dos.actor='dos-master'");
const slos = await c.query(`SELECT service_code, trust_zone FROM dos.platform_slo`);
let probed = 0, ok = 0;
for (const row of slos.rows) {
  // Resolve port from registry — default-fallback to common 4xxx pattern.
  const r = await c.query(
    `SELECT port FROM dos_master.service_registry WHERE service_code=$1 LIMIT 1`,
    [row.service_code],
  );
  const port = r.rows[0]?.port;
  if (!port) continue;
  const useHttps = row.trust_zone === 'admin' && row.service_code !== 'gateway';
  const result = await probe('127.0.0.1', port, useHttps);
  await c.query(
    `INSERT INTO dos.platform_slo_event (service_code, ok, http_status, latency_ms, error_message, emitted_by)
     VALUES ($1,$2,$3,$4,$5,'synthetic-probe')`,
    [row.service_code, result.ok, result.status || null, result.ms, result.err],
  );
  probed++;
  if (result.ok) ok++;
}
await c.end();
console.log(`[synthetic-probe] probed=${probed} ok=${ok} fail=${probed - ok}`);
