import { describe, it, expect } from 'vitest';
import { CANONICAL_ROLES, CANONICAL_PERMISSIONS, ROLE_PERMISSION_MAP } from './seed-rbac-data';
import { ALWAYS_ON_MODULES, GRC_CORE_MODULES } from '@dos/platform-core/modules';
import * as fs from 'fs';
import * as path from 'path';

const CLASSIFIED_RAW = new Set([...ALWAYS_ON_MODULES, ...GRC_CORE_MODULES]);
const CLASSIFIED = new Set([...CLASSIFIED_RAW, ...[...CLASSIFIED_RAW].map(m => m.replace(/-/g, '_'))]);
const PERM_LOOKUP = new Map(CANONICAL_PERMISSIONS.map(p => [p.code, p]));

describe('RBAC Seed Data — structural invariants', () => {
  it('every code in ROLE_PERMISSION_MAP exists in CANONICAL_PERMISSIONS', () => {
    const orphans: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const code of codes) {
        if (!PERM_LOOKUP.has(code)) orphans.push(`${role} → ${code}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('no colon-format permission codes in non-super-admin role mappings', () => {
    const colonCodes: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      if (role === 'platform_super_admin') continue;
      for (const code of codes) {
        if (code.includes(':')) colonCodes.push(`${role} → ${code}`);
      }
    }
    expect(colonCodes).toEqual([]);
  });

  it('all permission codes follow module.resource.action format', () => {
    const bad: string[] = [];
    for (const p of CANONICAL_PERMISSIONS) {
      if (p.code.includes(':')) continue;
      const parts = p.code.split('.');
      if (parts.length < 2) bad.push(p.code);
    }
    expect(bad).toEqual([]);
  });

  it('no duplicate codes in CANONICAL_PERMISSIONS', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const p of CANONICAL_PERMISSIONS) {
      if (seen.has(p.code)) dupes.push(p.code);
      seen.add(p.code);
    }
    expect(dupes).toEqual([]);
  });

  it('no duplicate codes within a single role mapping', () => {
    const dupes: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      const seen = new Set<string>();
      for (const code of codes) {
        if (seen.has(code)) dupes.push(`${role} → ${code}`);
        seen.add(code);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('platform_super_admin has ALL permission codes', () => {
    const superAdmin = ROLE_PERMISSION_MAP.platform_super_admin;
    expect(superAdmin.length).toBe(CANONICAL_PERMISSIONS.length);
  });

  it('every derived module code is classified as ALWAYS_ON or GRC_CORE', () => {
    const unclassified: string[] = [];
    for (const p of CANONICAL_PERMISSIONS) {
      if (p.code.includes(':')) continue;
      const mod = p.code.split('.')[0];
      if (!CLASSIFIED.has(mod)) unclassified.push(`${p.code} → module "${mod}"`);
    }
    expect(unclassified).toEqual([]);
  });

  it('every CANONICAL_ROLE has a corresponding entry in ROLE_PERMISSION_MAP', () => {
    const missing = CANONICAL_ROLES
      .map(r => r.code)
      .filter(code => !(code in ROLE_PERMISSION_MAP));
    expect(missing).toEqual([]);
  });
});

describe('RBAC Seed Data — permission family convergence', () => {
  it('no deprecated old-family codes used in non-super-admin role mappings', () => {
    const deprecatedReadManage = [
      'risk.register.read', 'risk.register.manage',
      'audit.plan.read', 'audit.plan.manage',
      'incident.ticket.read', 'incident.ticket.manage',
      'vendor.profile.read', 'vendor.profile.manage',
      'compliance.attestation.create',
    ];
    const found: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      if (role === 'platform_super_admin') continue;
      for (const code of codes) {
        if (deprecatedReadManage.includes(code)) found.push(`${role} → ${code}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('sub-resource action codes (finding.create, assessment.approve, etc.) are retained', () => {
    const subResourceActions = [
      'risk.assessment.create', 'risk.assessment.approve',
      'audit.finding.create', 'audit.finding.resolve', 'audit.finding.read',
      'incident.ticket.resolve',
      'vendor.assessment.create',
      'compliance.evidence.submit', 'compliance.evidence.review',
    ];
    for (const code of subResourceActions) {
      expect(PERM_LOOKUP.has(code)).toBe(true);
    }
  });

  it('every role with old sub-resource action codes also has the canonical record-family equivalent', () => {
    const pairs: [string, string][] = [
      ['risk.assessment.create', 'risk.record.write'],
      ['risk.assessment.approve', 'risk.record.read'],
      ['audit.finding.create', 'audit.record.manage'],
      ['audit.finding.resolve', 'audit.record.manage'],
      ['audit.finding.read', 'audit.record.read'],
      ['vendor.assessment.create', 'vendor.record.write'],
    ];
    const missing: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      const codeSet = new Set(codes);
      for (const [oldCode, newCode] of pairs) {
        if (codeSet.has(oldCode) && !codeSet.has(newCode)) {
          missing.push(`${role}: has ${oldCode} but missing ${newCode}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('RBAC Seed Data — migration dependency validation', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../migrations/tenant');

  it('migration 030 (roles table) exists', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files.some(f => f.startsWith('030'))).toBe(true);
  });

  it('migration 163 (permissions table) exists', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files.some(f => f.startsWith('163'))).toBe(true);
  });

  it('migration 412 (role_permission_map table) exists', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files.some(f => f.startsWith('412'))).toBe(true);
  });

  it('migration 412 schema matches seed INSERT columns', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '412_role_permission_map.sql'), 'utf8');
    expect(sql).toContain('tenant_id');
    expect(sql).toContain('role_code');
    expect(sql).toContain('permission_code');
    expect(sql).toContain('module_code');
    expect(sql).toContain('UNIQUE(tenant_id, role_code, permission_code, module_code)');
  });

  it('migration 163 permissions schema matches seed INSERT columns', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '163_enterprise_authorization_tables.sql'), 'utf8');
    expect(sql).toContain('code TEXT NOT NULL UNIQUE');
    expect(sql).toContain('module_code');
    expect(sql).toContain('resource_code');
    expect(sql).toContain('action_code');
  });

  it('migration 030 roles schema matches seed INSERT columns', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '030_authorization_redesign_tenant.sql'), 'utf8');
    expect(sql).toContain('role_id UUID');
    expect(sql).toContain('role_code VARCHAR(50)');
    expect(sql).toContain('name_en');
    expect(sql).toContain('is_system');
  });
});

describe('RBAC Seed Data — cross-module route coverage', () => {
  it('standard_user and viewer have read access to all GRC_CORE modules with defined permissions', () => {
    const modulesWithPerms = new Set(
      CANONICAL_PERMISSIONS.filter(p => !p.code.includes(':')).map(p => p.code.split('.')[0])
    );
    const grcModulesWithPerms = [...GRC_CORE_MODULES].filter(m => modulesWithPerms.has(m));
    for (const role of ['standard_user', 'viewer'] as const) {
      const codes = ROLE_PERMISSION_MAP[role];
      const coveredModules = new Set(codes.filter(c => !c.includes(':')).map(c => c.split('.')[0]));
      const missing = grcModulesWithPerms.filter(m => !coveredModules.has(m) && !ALWAYS_ON_MODULES.has(m));
      expect(missing).toEqual([]);
    }
  });

  it('tenant_admin covers all ALWAYS_ON modules', () => {
    const codes = ROLE_PERMISSION_MAP.tenant_admin;
    const coveredModules = new Set(codes.filter(c => !c.includes(':')).map(c => c.split('.')[0]));
    const normalize = (m: string) => m.replace(/-/g, '_');
    const alwaysOn = [...ALWAYS_ON_MODULES];
    const missing = alwaysOn.filter(m =>
      !coveredModules.has(m) && !coveredModules.has(normalize(m))
    );
    expect(missing).toEqual([]);
  });
});
