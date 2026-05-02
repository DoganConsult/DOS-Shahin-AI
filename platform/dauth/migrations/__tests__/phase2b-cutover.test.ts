/**
 * Validates the G8 Phase 2b cutover migration is well-formed and
 * symmetric with its down migration. Does NOT execute SQL — that
 * happens during deploy via the platform migration runner.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = join(process.cwd(), 'platform/dauth/migrations/public');
const UP = '20260423_0001_phase2b_cutover_to_platform_dauth.sql';
const DOWN = '20260423_0001_phase2b_cutover_to_platform_dauth_down.sql';

function read(name: string): string {
  return readFileSync(join(MIG_DIR, name), 'utf8');
}

describe('G8 Phase 2b cutover migration', () => {
  it('up + down files exist', () => {
    expect(existsSync(join(MIG_DIR, UP))).toBe(true);
    expect(existsSync(join(MIG_DIR, DOWN))).toBe(true);
  });

  it('up drops every Phase-1 view before moving tables', () => {
    const up = read(UP);
    const expectedDrops = [
      'platform_dauth.access_profiles',
      'platform_dauth.functional_roles',
      'platform_dauth.permissions',
      'platform_dauth.sessions',
      'platform_dauth.sessions_dos',
      'platform_dauth.user_access_profiles',
      'platform_dauth.user_access_profiles_dos',
      'platform_dauth.access_profiles_public',
    ];
    for (const v of expectedDrops) {
      expect(up).toContain(`DROP VIEW IF EXISTS ${v}`);
    }
  });

  it('up resolves the 3 collisions by renaming dos.* to <name>_legacy', () => {
    const up = read(UP);
    expect(up).toMatch(/ALTER TABLE dos\.sessions RENAME TO sessions_legacy/);
    expect(up).toMatch(/ALTER TABLE dos\.access_profiles RENAME TO access_profiles_legacy/);
    expect(up).toMatch(/ALTER TABLE dos\.user_access_profiles RENAME TO user_access_profiles_legacy/);
  });

  it('up performs ALTER TABLE SET SCHEMA on all expected tables (via dynamic loop)', () => {
    const up = read(UP);
    // Dos-side bulk move
    expect(up).toMatch(/dos_tables TEXT\[\] := ARRAY\[/);
    expect(up).toMatch(/format\('ALTER TABLE dos\.%I SET SCHEMA platform_dauth', tbl\)/);
    // Public-side bulk move
    expect(up).toMatch(/pub_tables TEXT\[\] := ARRAY\[/);
    expect(up).toMatch(/format\('ALTER TABLE public\.%I SET SCHEMA platform_dauth', tbl\)/);
  });

  it('up creates REVERSE compat views for the 7 documented external consumers', () => {
    const up = read(UP);
    // dos.* reverse views (external services + 3 module enterprise-authz copies)
    const dosReverse = [
      'dos.functional_roles',
      'dos.permissions',
      'dos.sod_rules',
      'dos.delegations',
      'dos.access_profiles',
      'dos.user_access_profiles',
      'dos.sessions',
      'dos.user_role_assignments',
    ];
    for (const v of dosReverse) {
      expect(up).toMatch(new RegExp(`CREATE OR REPLACE VIEW ${v.replace('.', '\\.')}\\s+AS SELECT \\* FROM platform_dauth`));
    }
    // public.* reverse views (onboarding-service)
    const publicReverse = [
      'public.sessions',
      'public.refresh_token_families',
      'public.invitations',
    ];
    for (const v of publicReverse) {
      expect(up).toMatch(new RegExp(`CREATE OR REPLACE VIEW ${v.replace('.', '\\.')}\\s+AS SELECT \\* FROM platform_dauth`));
    }
  });

  it('down drops every reverse view that up created', () => {
    const down = read(DOWN);
    const upReverseViewMatches = read(UP).match(/CREATE OR REPLACE VIEW\s+(dos|public)\.\w+/g) ?? [];
    expect(upReverseViewMatches.length).toBeGreaterThan(0);
    for (const m of upReverseViewMatches) {
      const objectName = m.replace(/CREATE OR REPLACE VIEW\s+/, '');
      expect(down).toContain(`DROP VIEW IF EXISTS ${objectName}`);
    }
  });

  it('down recreates every Phase-1 view that up dropped', () => {
    const up = read(UP);
    const down = read(DOWN);
    const droppedViews = (up.match(/DROP VIEW IF EXISTS\s+(platform_dauth\.\w+)/g) ?? [])
      .map((m) => m.replace(/DROP VIEW IF EXISTS\s+/, ''));
    expect(droppedViews.length).toBeGreaterThan(20);
    for (const v of droppedViews) {
      expect(down).toMatch(new RegExp(`CREATE OR REPLACE VIEW ${v.replace('.', '\\.')}\\s+AS SELECT \\* FROM`));
    }
  });

  it('down restores collision names (sessions_legacy → sessions, etc.)', () => {
    const down = read(DOWN);
    expect(down).toMatch(/ALTER TABLE dos\.sessions_legacy RENAME TO sessions/);
    expect(down).toMatch(/ALTER TABLE dos\.access_profiles_legacy RENAME TO access_profiles/);
    expect(down).toMatch(/ALTER TABLE dos\.user_access_profiles_legacy RENAME TO user_access_profiles/);
  });

  it('migrations-index records the new entry with both up + down paths', () => {
    const idx = JSON.parse(
      readFileSync(join(process.cwd(), 'platform/dauth/migrations/migrations-index.json'), 'utf8'),
    );
    const entry = idx.ownedMigrations.public.files.find(
      (f: any) => f.filename === '20260423_0001_phase2b_cutover_to_platform_dauth.sql',
    );
    expect(entry).toBeDefined();
    expect(entry.down).toBe('20260423_0001_phase2b_cutover_to_platform_dauth_down.sql');
    expect(existsSync(entry.currentPath)).toBe(true);
  });
});
