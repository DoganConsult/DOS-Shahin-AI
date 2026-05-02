/**
 * G8 Phase 2a — DAuth code must only address owned tables via the
 * `platform_dauth.*` namespace (the views layer today, the native
 * schema after Phase 2b ALTER TABLE SET SCHEMA cutover).
 *
 * This test greps the DAuth source tree for direct `dos.<t>` /
 * `public.<t>` references where `<t>` is any DAuth-owned table. Any
 * hit = an isolation regression.
 *
 * Migrations themselves (.sql files) are NOT in scope: the migrations
 * create the underlying `dos.*` / `public.*` tables themselves, so
 * they necessarily reference the legacy names. Only TypeScript query
 * sites matter here.
 */

import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// G8 Phase 3.5 (DOS Platform restructure): DAuth manifest standardized to the
// canonical path `platform/dauth/module.manifest.json` with rich module
// metadata (schemas, events, routes, security, …) nested under `metadata.*`.
// Schema-table inventories that drive the isolation tests now live at
// `metadata.schemas.shared.tables` and `metadata.schemas.public.tables`.
const MANIFEST = JSON.parse(
  readFileSync(join(process.cwd(), 'platform/dauth/module.manifest.json'), 'utf8'),
);

const DAUTH_DOS_TABLES: string[] = MANIFEST.metadata.schemas.shared.tables;
const DAUTH_PUBLIC_TABLES: string[] = MANIFEST.metadata.schemas.public.tables;

const CODE_ROOTS = [
  'platform/dauth/packages/core',
  'platform/dauth/packages/shared/src',
  'platform/dauth/services/auth-service/src',
];

function greps(pattern: string): string[] {
  try {
    const out = execSync(
      `grep -rEn "${pattern}" ${CODE_ROOTS.join(' ')} --include="*.ts" 2>/dev/null || true`,
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('G8 Phase 2a — DAuth code targets platform_dauth.*', () => {
  it.each(DAUTH_DOS_TABLES)(
    'no TypeScript code references dos.%s — must use platform_dauth',
    (table) => {
      const hits = greps(`\\\\bdos\\\\.${table}\\\\b`);
      expect(hits, `found legacy dos.${table} refs:\n${hits.join('\n')}`).toEqual([]);
    },
  );

  it.each(DAUTH_PUBLIC_TABLES)(
    'no TypeScript code references public.%s — must use platform_dauth',
    (table) => {
      const hits = greps(`\\\\bpublic\\\\.${table}\\\\b`);
      expect(hits, `found legacy public.${table} refs:\n${hits.join('\n')}`).toEqual([]);
    },
  );

  it('at least one platform_dauth.* reference exists (sanity: rewrites landed)', () => {
    const hits = greps('\\\\bplatform_dauth\\\\.');
    expect(hits.length).toBeGreaterThan(0);
  });
});
