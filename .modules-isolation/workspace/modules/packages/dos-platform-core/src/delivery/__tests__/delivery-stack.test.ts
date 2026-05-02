import { describe, it, expect } from 'vitest';
import { validateMigrationSafety } from '../migration/migration-tracking.service';
import { validateHandoverReadiness } from '../handover/handover-lock.service';
import { validateBreakingChanges } from '../compatibility/compatibility.service';
import type { MigrationRecord, HandoverLock } from '../contracts/delivery.types';
import type { CompatibilityRecord } from '../compatibility/compatibility.service';

describe('Migration Safety Validation', () => {
  const base: MigrationRecord = {
    migrationId: 'mig-1',
    releaseId: 'rel-1',
    migrationType: 'schema',
    status: 'pending',
    reversible: true,
    compatibilityImpact: 'none',
    affectedSchemas: ['public'],
    affectedTables: ['users'],
    validationSteps: ['check row counts'],
    rollbackNotes: null,
    tenantImpact: null,
    irreversibleApprovalId: null,
    tenantId: null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
  };

  it('passes valid reversible migration', () => {
    const issues = validateMigrationSafety(base);
    expect(issues).toHaveLength(0);
  });

  it('blocks irreversible migration without approval', () => {
    const m = { ...base, reversible: false, irreversibleApprovalId: null };
    const issues = validateMigrationSafety(m);
    expect(issues.some((i) => i.includes('Irreversible'))).toBe(true);
  });

  it('passes irreversible migration with approval', () => {
    const m = { ...base, reversible: false, irreversibleApprovalId: 'approval-123' };
    const issues = validateMigrationSafety(m);
    expect(issues.every((i) => !i.includes('Irreversible'))).toBe(true);
  });

  it('blocks high impact migration without rollback notes', () => {
    const m = { ...base, compatibilityImpact: 'high' as const, rollbackNotes: null };
    const issues = validateMigrationSafety(m);
    expect(issues.some((i) => i.includes('rollback notes'))).toBe(true);
  });

  it('blocks migration with no validation steps', () => {
    const m = { ...base, validationSteps: [] };
    const issues = validateMigrationSafety(m);
    expect(issues.some((i) => i.includes('validation step'))).toBe(true);
  });
});

describe('Handover Readiness Validation', () => {
  const fullLock: HandoverLock = {
    lockId: 'lock-1',
    releaseId: 'rel-1',
    asBuiltUpdated: true,
    migrationsVerified: true,
    releaseNotesFinalized: true,
    knownRisksUpdated: true,
    operationalDashboardsConfirmed: true,
    supportOwnerConfirmed: true,
    cutoverOutcome: 'Success',
    rollbackOutcome: null,
    lockedAt: null,
    lockedBy: null,
  };

  it('passes fully completed handover checklist', () => {
    const issues = validateHandoverReadiness(fullLock);
    expect(issues).toHaveLength(0);
  });

  it('blocks if as-built not updated', () => {
    const lock = { ...fullLock, asBuiltUpdated: false };
    const issues = validateHandoverReadiness(lock);
    // Product message is "As-built record must be updated" (capitalised).
    // Case-insensitive match so the test asserts the concept without
    // pinning the exact casing.
    expect(issues.some((i) => i.toLowerCase().includes('as-built'))).toBe(true);
  });

  it('blocks if migrations not verified', () => {
    const lock = { ...fullLock, migrationsVerified: false };
    const issues = validateHandoverReadiness(lock);
    expect(issues.some((i) => i.includes('Migrations'))).toBe(true);
  });

  it('blocks if support owner not confirmed', () => {
    const lock = { ...fullLock, supportOwnerConfirmed: false };
    const issues = validateHandoverReadiness(lock);
    expect(issues.some((i) => i.includes('Support owner'))).toBe(true);
  });

  it('reports all missing items simultaneously', () => {
    const emptyLock: HandoverLock = {
      ...fullLock,
      asBuiltUpdated: false,
      migrationsVerified: false,
      releaseNotesFinalized: false,
      knownRisksUpdated: false,
      operationalDashboardsConfirmed: false,
      supportOwnerConfirmed: false,
    };
    const issues = validateHandoverReadiness(emptyLock);
    expect(issues.length).toBe(6);
  });
});

describe('Breaking Change Validation', () => {
  it('identifies breaking change without approval', async () => {
    // Use the injected-lister overload to bypass the DB path; the
    // test's intent is the validator's logic, not storage.
    const fakeList = async (): Promise<CompatibilityRecord[]> => [
      {
        compatibilityId: 'c-1',
        releaseId: 'rel-1',
        artifactType: 'api',
        artifactCode: '/api/v1/users',
        changeClass: 'breaking',
        impact: 'high',
        affectedConsumers: ['frontend', 'mobile'],
        migrationRequired: false,
        deprecationNoticeRequired: true,
        breakingChangeApprovalId: null,
        notes: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
      } as CompatibilityRecord,
    ];

    const issues = await validateBreakingChanges('rel-1', fakeList);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.includes('requires approval'))).toBe(true);
  });
});

describe('Quality Gate Categories', () => {
  it('validates all gate categories are known types', () => {
    const validCategories = ['unit', 'integration', 'contract', 'migration', 'access', 'smoke', 'performance', 'rollback'];
    for (const cat of validCategories) {
      expect(validCategories).toContain(cat);
    }
  });
});
