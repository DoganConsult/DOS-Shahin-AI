/**
 * Foundation permission-style CI guard.
 *
 * Foundation Horizontal Closure declared DOT style as the only canonical
 * permission format for Foundation enforcement. This guard fails the
 * suite if any new Foundation permission reference re-introduces the
 * legacy colon style (`foundation:read`, `foundation:write`, …) inside:
 *   - the canonical runtime contract (FOUNDATION_PERMISSION_CODES)
 *   - the module-permission catalog (FOUNDATION_MODULE_PERMISSIONS)
 *   - the module-role catalog (FOUNDATION_MODULE_ROLES)
 *   - the navigation/permission contract JSONs
 *   - the foundation-only Dynamic UI widget seed
 *
 * Legacy colon strings remain in the platform_dauth catalog ONLY as
 * deprecated aliases (see modules/foundation/db/migrations/
 * 20260430_1510_foundation_permission_code_reconcile.sql); they MUST NOT
 * appear as active grants or as part of any contract surface.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FOUNDATION_PERMISSION_CODES } from '../../contracts/foundation.permissions';
import { FOUNDATION_MODULE_PERMISSIONS } from '../../interface/security/foundation.permissions';
import { FOUNDATION_MODULE_ROLES } from '../../interface/security/foundation.roles';

const COLON_FOUNDATION_RE = /\b(?:foundation|users|admin|audit|governance|policy|privacy):[a-z_]+\b/i;

function assertNoColon(label: string, value: string): void {
  expect(value, `[${label}] colon-style Foundation permission "${value}" is forbidden — use dot style`)
    .not.toMatch(/:/);
}

describe('foundation permission-code style guard', () => {
  it('FOUNDATION_PERMISSION_CODES uses dot style only', () => {
    for (const [k, v] of Object.entries(FOUNDATION_PERMISSION_CODES)) {
      assertNoColon(`FOUNDATION_PERMISSION_CODES.${k}`, String(v));
    }
  });

  it('FOUNDATION_MODULE_PERMISSIONS uses dot style only', () => {
    for (const p of FOUNDATION_MODULE_PERMISSIONS) {
      assertNoColon(`FOUNDATION_MODULE_PERMISSIONS[${p.permissionCode}]`, p.permissionCode);
      for (const alias of p.legacyAliases || []) {
        // legacyAliases is the only sanctioned field for deprecated colon
        // strings; they remain catalog-only and never become active grants.
        if (typeof alias === 'string' && alias.includes(':')) continue;
        assertNoColon(`FOUNDATION_MODULE_PERMISSIONS[${p.permissionCode}].alias`, alias);
      }
    }
  });

  it('FOUNDATION_MODULE_ROLES.permissions[] use dot style only', () => {
    for (const r of FOUNDATION_MODULE_ROLES) {
      for (const p of r.permissions || []) {
        assertNoColon(`FOUNDATION_MODULE_ROLES[${r.roleCode}].permissions`, p);
      }
    }
  });

  it('navigation contract JSON contains no colon-style Foundation perms', () => {
    const path = resolve(__dirname, '../../contracts/navigation/navigation.json');
    let raw = '';
    try { raw = readFileSync(path, 'utf8'); } catch { return; }
    const found = raw.match(COLON_FOUNDATION_RE);
    expect(found, `navigation.json contains forbidden colon Foundation perm: ${found?.[0]}`).toBeNull();
  });

  it('permission contract JSON contains no colon-style Foundation perms', () => {
    const path = resolve(__dirname, '../../contracts/permissions/permissions.json');
    let raw = '';
    try { raw = readFileSync(path, 'utf8'); } catch { return; }
    const found = raw.match(COLON_FOUNDATION_RE);
    expect(found, `permissions.json contains forbidden colon Foundation perm: ${found?.[0]}`).toBeNull();
  });

  it('Dynamic UI widget contract JSON contains no colon-style Foundation perms', () => {
    const path = resolve(__dirname, '../../contracts/dynamic-ui/widgets.json');
    let raw = '';
    try { raw = readFileSync(path, 'utf8'); } catch { return; }
    const found = raw.match(COLON_FOUNDATION_RE);
    expect(found, `widgets.json contains forbidden colon Foundation perm: ${found?.[0]}`).toBeNull();
  });
});
