import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = join(process.cwd(), 'platform/dauth/migrations/public');

describe('G8 Phase 1 — platform_dauth schema migration', () => {
  it('up migration file exists', () => {
    expect(existsSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema.sql'))).toBe(true);
  });

  it('down migration file exists', () => {
    expect(existsSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema_down.sql'))).toBe(true);
  });

  it('up migration creates the schema idempotently', () => {
    const sql = readFileSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema.sql'), 'utf8');
    expect(sql).toMatch(/CREATE SCHEMA IF NOT EXISTS platform_dauth/i);
  });

  it('up migration uses CREATE OR REPLACE VIEW for every table', () => {
    const sql = readFileSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema.sql'), 'utf8');
    const views = sql.match(/CREATE OR REPLACE VIEW platform_dauth\.\w+/g) ?? [];
    // Expect views for every DAuth-owned table: 22 in dos.* + 13 in public.* = 35
    expect(views.length).toBeGreaterThanOrEqual(35);
  });

  it('up migration covers every table declared in the platform-module manifest', () => {
    // G8 Phase 3.5 (DOS Platform restructure): canonical manifest path is now
    // `platform/dauth/module.manifest.json` and rich module metadata is nested
    // under `metadata.*`.
    const sql = readFileSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema.sql'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'platform/dauth/module.manifest.json'), 'utf8'),
    );
    for (const t of manifest.metadata.schemas.shared.tables) {
      expect(sql, `missing view for dos.${t}`).toMatch(new RegExp(`FROM dos\\.${t}\\b`));
    }
    for (const t of manifest.metadata.schemas.public.tables) {
      expect(sql, `missing view for public.${t}`).toMatch(new RegExp(`FROM public\\.${t}\\b`));
    }
  });

  it('down migration drops the schema cleanly with CASCADE', () => {
    const sql = readFileSync(join(MIG_DIR, '20260422_0005_create_platform_dauth_schema_down.sql'), 'utf8');
    expect(sql).toMatch(/DROP SCHEMA IF EXISTS platform_dauth CASCADE/i);
  });

  it('migrations-index records the new entry with both up + down paths', () => {
    const idx = JSON.parse(
      readFileSync(join(process.cwd(), 'platform/dauth/migrations/migrations-index.json'), 'utf8'),
    );
    const entry = idx.ownedMigrations.public.files.find(
      (f: any) => f.filename === '20260422_0005_create_platform_dauth_schema.sql',
    );
    expect(entry, 'migrations-index missing the schema-isolation entry').toBeDefined();
    expect(entry.down).toBe('20260422_0005_create_platform_dauth_schema_down.sql');
    expect(existsSync(entry.currentPath)).toBe(true);
  });
});
