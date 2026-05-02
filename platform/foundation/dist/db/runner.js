"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
/**
 * Foundation DB migration runner — accepts any client conforming to DbClient.
 * Usable from a host service that already has a Postgres client wired
 * (no pg dep required at module level).
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const MODULE_DIR = __dirname;
const DEFAULT_DIR = (0, node_path_1.join)(MODULE_DIR, 'migrations');
async function runMigrations(client, opts = {}) {
    const dir = opts.migrationsDir ?? DEFAULT_DIR;
    const files = (0, node_fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
        .sort();
    await client.query(`CREATE TABLE IF NOT EXISTS foundation_schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
    const applied = await client.query('SELECT filename FROM foundation_schema_migrations');
    const seen = new Set(applied.rows.map((r) => r.filename));
    const newlyApplied = [];
    const skipped = [];
    for (const f of files) {
        if (seen.has(f)) {
            skipped.push(f);
            continue;
        }
        const sql = (0, node_fs_1.readFileSync)((0, node_path_1.join)(dir, f), 'utf8');
        await client.query('BEGIN');
        try {
            await client.query(sql);
            await client.query('INSERT INTO foundation_schema_migrations(filename) VALUES ($1)', [f]);
            await client.query('COMMIT');
            newlyApplied.push(f);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
    }
    return { applied: newlyApplied, skipped };
}
//# sourceMappingURL=runner.js.map