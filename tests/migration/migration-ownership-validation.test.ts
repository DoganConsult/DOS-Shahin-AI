import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')) as T;
}

type OwnershipMap = {
  services: Record<string, {
    migrationFile: string;
    tables: string[];
  }>;
  centralMigrationsRetained: string[];
};

describe('Migration Ownership Validation', () => {
  const ownershipMap = readJson<OwnershipMap>('migration/extraction-plans/migration-ownership-map.json');

  it('ownership map exists and is well-formed', () => {
    expect(ownershipMap.services).toBeDefined();
    expect(Object.keys(ownershipMap.services).length).toBeGreaterThan(0);
    expect(ownershipMap.centralMigrationsRetained).toBeDefined();
  });

  it('every service in ownership map has a migration file on disk', () => {
    for (const [svc, info] of Object.entries(ownershipMap.services)) {
      const migrationPath = path.join(ROOT, info.migrationFile);
      expect(fs.existsSync(migrationPath), `${svc} migration file should exist at ${info.migrationFile}`).toBe(true);
    }
  });

  it('every service migration file contains CREATE TABLE statements', () => {
    for (const [svc, info] of Object.entries(ownershipMap.services)) {
      const migrationPath = path.join(ROOT, info.migrationFile);
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content.includes('CREATE TABLE'), `${svc} migration should contain CREATE TABLE`).toBe(true);
    }
  });

  it('no table appears in more than one service ownership', () => {
    const tableToService = new Map<string, string>();
    for (const [svc, info] of Object.entries(ownershipMap.services)) {
      for (const table of info.tables) {
        if (tableToService.has(table)) {
          expect.fail(`Table ${table} is owned by both ${tableToService.get(table)} and ${svc}`);
        }
        tableToService.set(table, svc);
      }
    }
  });

  it('central migrations are retained on disk', () => {
    for (const migrationPath of ownershipMap.centralMigrationsRetained) {
      const fullPath = path.join(ROOT, migrationPath);
      expect(fs.existsSync(fullPath), `Central migration ${migrationPath} should exist`).toBe(true);
    }
  });

  it('each service migration file wraps in BEGIN/COMMIT', () => {
    for (const [svc, info] of Object.entries(ownershipMap.services)) {
      const content = fs.readFileSync(path.join(ROOT, info.migrationFile), 'utf-8');
      expect(content.includes('BEGIN'), `${svc} migration should use BEGIN`).toBe(true);
      expect(content.includes('COMMIT'), `${svc} migration should use COMMIT`).toBe(true);
    }
  });

  it('auth-service owns session and access-related tables', () => {
    const authTables = ownershipMap.services['auth-service'].tables;
    expect(authTables).toContain('public.sessions');
    expect(authTables).toContain('dos.sod_rules');
    expect(authTables).toContain('dos.delegations');
  });

  it('tenant-service owns tenant and membership tables', () => {
    const tenantTables = ownershipMap.services['tenant-service'].tables;
    expect(tenantTables).toContain('public.tenants');
    expect(tenantTables).toContain('public.tenant_user_memberships');
  });

  it('workflow-service owns approval and job tables', () => {
    const workflowTables = ownershipMap.services['workflow-service'].tables;
    expect(workflowTables).toContain('dos.workflow_approvals');
    expect(workflowTables).toContain('public.approval_requests');
    expect(workflowTables).toContain('dos.job_registry');
  });

  it('user-service owns user and team tables', () => {
    const userTables = ownershipMap.services['user-service'].tables;
    expect(userTables).toContain('public.users');
    expect(userTables).toContain('dos.teams');
  });
});
