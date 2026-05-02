// Shared helper for lifecycle-proof scripts.
// Usage from a scenario's run.mjs:
//
//   import { Runner } from '../_lib/runner.mjs';
//   const r = new Runner({ scenario: 'policy', tenantId, jwt, baseUrl });
//   const policy = await r.call('POST', '/api/policies', { body: {...} });
//   await r.call('POST', `/api/policies/${policy.policy_id}/submit`);
//   ...
//   await r.flushArtifacts();
//
// Writes:
//   ops/scripts/lifecycle-proofs/<scenario>/requests.jsonl
//   ops/scripts/lifecycle-proofs/<scenario>/audit_trail.csv (best-effort via DB)
//   ops/scripts/lifecycle-proofs/<scenario>/summary.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROOFS_DIR = path.resolve(__dirname, '..');

export class Runner {
  constructor({ scenario, tenantId, jwt, baseUrl, dbClient }) {
    if (!scenario) throw new Error('scenario required');
    if (!tenantId) throw new Error('tenantId required');
    this.scenario = scenario;
    this.tenantId = tenantId;
    this.jwt = jwt || null;
    this.baseUrl = baseUrl || process.env.SHAHIN_API_BASE || 'http://127.0.0.1:4000';
    this.dbClient = dbClient || null;
    this.requests = [];
    this.errors = [];
    this.startedAt = new Date().toISOString();
  }

  async call(method, urlPath, opts = {}) {
    const url = urlPath.startsWith('http') ? urlPath : `${this.baseUrl}${urlPath}`;
    const headers = {
      'content-type': 'application/json',
      'x-tenant-id': this.tenantId,
      ...(this.jwt ? { authorization: `Bearer ${this.jwt}` } : {}),
      ...(opts.headers || {}),
    };
    const init = { method, headers };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    const startedAt = new Date().toISOString();
    let res, text, parsed;
    try {
      res = await fetch(url, init);
      text = await res.text();
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    } catch (err) {
      const entry = { startedAt, method, url, error: String(err) };
      this.requests.push(entry);
      this.errors.push(entry);
      throw err;
    }

    const finishedAt = new Date().toISOString();
    const entry = {
      startedAt,
      finishedAt,
      method,
      url,
      requestBody: opts.body ?? null,
      status: res.status,
      response: parsed,
    };
    this.requests.push(entry);

    if (!res.ok && !opts.expectFail) {
      this.errors.push({ ...entry, message: `Unexpected status ${res.status}` });
      throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return parsed?.data ?? parsed;
  }

  async queryAuditTrail({ entityId, entityType, limit = 50 }) {
    if (!this.dbClient) return [];
    // Try the audit-service write target first, then the legacy reader table.
    // Whichever exists wins. (See audit-service domain/audit.service.ts and
    // routes/activity-feed.routes.ts for the schema drift this paves over.)
    const tables = ['dos.audit_logs', 'dos.audit_trail', 'dos.platform_audit_logs'];
    for (const table of tables) {
      try {
        const result = await this.dbClient.query(
          `SELECT created_at, action, entity_type, entity_id, actor_id,
                  before_state, after_state, COALESCE(details, metadata, '{}'::jsonb) AS metadata
             FROM ${table}
            WHERE entity_id = $1 AND entity_type = $2
            ORDER BY created_at ASC
            LIMIT $3`,
          [entityId, entityType, limit],
        );
        if (result.rows.length > 0) return result.rows;
      } catch {
        // table missing or schema mismatch — fall through to next candidate
      }
    }
    return [];
  }

  async flushArtifacts({ auditRows = [], finalState = null } = {}) {
    const dir = path.join(PROOFS_DIR, this.scenario);
    fs.mkdirSync(dir, { recursive: true });

    const reqsFile = path.join(dir, 'requests.jsonl');
    fs.writeFileSync(reqsFile, this.requests.map((r) => JSON.stringify(r)).join('\n') + '\n');

    if (auditRows.length > 0) {
      const csv = [
        'created_at,action,entity_type,entity_id,actor_id,before_state,after_state,metadata',
        ...auditRows.map((r) =>
          [
            r.created_at,
            r.action,
            r.entity_type,
            r.entity_id,
            r.actor_id,
            r.before_state || '',
            r.after_state || '',
            JSON.stringify(r.metadata || {}).replace(/"/g, '""'),
          ]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(','),
        ),
      ].join('\n');
      fs.writeFileSync(path.join(dir, 'audit_trail.csv'), csv + '\n');
    }

    const summary = {
      scenario: this.scenario,
      tenantId: this.tenantId,
      baseUrl: this.baseUrl,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      requestCount: this.requests.length,
      errorCount: this.errors.length,
      auditRowCount: auditRows.length,
      finalState,
      pass: this.errors.length === 0 && auditRows.length >= 6,
    };
    fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    return summary;
  }
}
