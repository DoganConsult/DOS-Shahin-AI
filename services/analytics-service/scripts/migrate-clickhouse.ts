#!/usr/bin/env ts-node
/**
 * ClickHouse migrator — applies .sql files from clickhouse-migrations/ in
 * lexicographic order. Tracks applied versions in `schema_migrations`.
 *
 * Usage:
 *   CLICKHOUSE_ENABLED=true \
 *   CLICKHOUSE_HOST=127.0.0.1 \
 *   CLICKHOUSE_PORT=8123 \
 *   CLICKHOUSE_DATABASE=dos_analytics \
 *   ts-node scripts/migrate-clickhouse.ts
 *
 * Re-runs are idempotent — already-applied versions are skipped.
 */
import { readdirSync, readFileSync, createHash } from 'node:fs';
import { join } from 'node:path';
import { createHash as _createHash } from 'node:crypto';

async function main(): Promise<void> {
  if (process.env.CLICKHOUSE_ENABLED !== 'true') {
    console.error('CLICKHOUSE_ENABLED must be true to run migrator.');
    process.exit(1);
  }
  const host = process.env.CLICKHOUSE_HOST || '127.0.0.1';
  const port = process.env.CLICKHOUSE_PORT || '8123';
  const database = process.env.CLICKHOUSE_DATABASE;
  if (!database) {
    console.error('CLICKHOUSE_DATABASE must be set.');
    process.exit(1);
  }

  const { createClient } = require('@clickhouse/client') as {
    createClient: (cfg: Record<string, unknown>) => {
      command: (args: { query: string; query_params?: Record<string, unknown> }) => Promise<unknown>;
      query: (args: { query: string; format: string; query_params?: Record<string, unknown> }) => Promise<{ json: <T>() => Promise<T[]> }>;
    };
  };

  const client = createClient({
    url: `http://${host}:${port}`,
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    request_timeout: 60_000,
  });

  // Ensure DB + schema_migrations exist before we query them.
  await client.command({ query: `CREATE DATABASE IF NOT EXISTS \`${database}\`` });
  await client.command({
    query: `CREATE TABLE IF NOT EXISTS \`${database}\`.schema_migrations (
      version String,
      applied_at DateTime DEFAULT now(),
      checksum String
    ) ENGINE = ReplacingMergeTree(applied_at) ORDER BY version`,
  });

  const appliedResult = await client.query({
    query: `SELECT version, checksum FROM \`${database}\`.schema_migrations FINAL`,
    format: 'JSONEachRow',
  });
  const applied = new Map<string, string>();
  for (const row of await appliedResult.json<{ version: string; checksum: string }>()) {
    applied.set(row.version, row.checksum);
  }

  const dir = join(__dirname, '..', 'clickhouse-migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const sql = readFileSync(join(dir, file), 'utf8');
    const checksum = _createHash('sha256').update(sql).digest('hex');
    if (applied.has(version)) {
      if (applied.get(version) !== checksum) {
        console.warn(`[migrate-clickhouse] WARN checksum drift for ${version} — migration already applied with different content.`);
      } else {
        console.log(`[migrate-clickhouse] skip  ${version} (already applied)`);
      }
      continue;
    }

    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.replace(/--[^\n]*\n/g, '').trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      const resolved = stmt.replace(/\{database:Identifier\}/g, `\`${database}\``);
      await client.command({ query: resolved });
    }
    await client.command({
      query: `INSERT INTO \`${database}\`.schema_migrations (version, checksum) VALUES ('${version}', '${checksum}')`,
    });
    console.log(`[migrate-clickhouse] apply ${version} ✓`);
  }

  console.log('[migrate-clickhouse] done.');
}

main().catch((err) => {
  console.error('[migrate-clickhouse] failed:', err);
  process.exit(1);
});
