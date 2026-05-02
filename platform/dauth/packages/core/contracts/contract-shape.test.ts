/**
 * DAuth Contract Shape Validation Tests — Patch 2 §13
 *
 * Validates that all DAuth contract interfaces maintain their required fields
 * and structural expectations. Prevents silent breaking changes to inter-service
 * contracts during refactoring.
 *
 * Strategy: read each contract file's source to verify required field declarations
 * exist, ensuring contracts don't silently lose fields during edits.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTRACTS_DIR = path.resolve(__dirname);

function readContract(filename: string): string {
  return fs.readFileSync(path.join(CONTRACTS_DIR, filename), 'utf-8');
}

describe('DAuth Contract Shape Validation (Patch 2 §13)', () => {
  // ── Session Contract ──
  describe('session.contract.ts', () => {
    const src = readContract('session.contract.ts');

    it('SessionCreateRequest has required fields', () => {
      expect(src).toContain('interface SessionCreateRequest');
      for (const field of ['version', 'userId', 'email', 'tenantId', 'role']) {
        expect(src).toContain(`${field}:`);
      }
    });

    it('SessionTokenPair has required fields', () => {
      expect(src).toContain('interface SessionTokenPair');
      for (const field of ['version', 'accessToken', 'refreshToken', 'expiresIn']) {
        expect(src).toContain(`${field}:`);
      }
    });

    it('SessionInfo has required fields', () => {
      expect(src).toContain('interface SessionInfo');
      for (const field of ['version', 'sessionId', 'userId', 'tenantId', 'status']) {
        expect(src).toContain(`${field}:`);
      }
    });
  });

  // ── Principal Context Contract ──
  describe('principal-context.contract.ts', () => {
    const src = readContract('principal-context.contract.ts');

    it('PrincipalContext has required fields', () => {
      expect(src).toContain('PrincipalContext');
      for (const field of ['userId', 'tenantId', 'role']) {
        expect(src).toContain(`${field}:`);
      }
    });
  });

  // ── Access Snapshot Contract ──
  describe('access-snapshot.contract.ts', () => {
    const src = readContract('access-snapshot.contract.ts');

    it('AccessSnapshot contract exists', () => {
      expect(src).toContain('AccessSnapshot');
    });

    it('has permission and role fields', () => {
      expect(src).toMatch(/permissions|permission/i);
      expect(src).toMatch(/roles|role/i);
    });
  });

  // ── Scope Resolution Contract ──
  describe('scope-resolution.contract.ts', () => {
    const src = readContract('scope-resolution.contract.ts');

    it('defines scope resolution types', () => {
      expect(src).toMatch(/ScopeResolution|EffectiveScope|ResolvedScope/);
    });

    it('includes tenantId in scope resolution', () => {
      expect(src).toContain('tenantId');
    });
  });

  // ── Authority Decision Contract ──
  describe('authority-decision.contract.ts', () => {
    const src = readContract('authority-decision.contract.ts');

    it('defines authority decision types', () => {
      expect(src).toMatch(/AuthorityDecision|AuthorityCheck/);
    });
  });

  // ── Delegation Contract ──
  describe('delegation.contract.ts', () => {
    const src = readContract('delegation.contract.ts');

    it('DelegationGrantRequest has required fields', () => {
      expect(src).toContain('interface DelegationGrantRequest');
      for (const field of ['version', 'tenantId', 'userId', 'agentId', 'scopes']) {
        expect(src).toContain(`${field}:`);
      }
    });

    it('DelegationGrant has required fields', () => {
      expect(src).toContain('interface DelegationGrant');
      for (const field of ['version', 'grantId', 'tenantId', 'userId']) {
        expect(src).toContain(`${field}:`);
      }
    });

    it('defines bounded DelegationScopeCode type', () => {
      expect(src).toContain('DelegationScopeCode');
    });
  });

  // ── SoD Decision Contract ──
  describe('sod-decision.contract.ts', () => {
    const src = readContract('sod-decision.contract.ts');

    it('defines SoD decision types', () => {
      expect(src).toMatch(/SodDecision|SodCheck|SodConflict/);
    });
  });

  // ── Lifecycle Auth Contract ──
  describe('lifecycle-auth.contract.ts', () => {
    const src = readContract('lifecycle-auth.contract.ts');

    it('defines lifecycle auth types', () => {
      expect(src).toMatch(/LifecycleAuth|LifecycleTransition/);
    });
  });

  // ── Auth Error Contract ──
  describe('auth-error.contract.ts', () => {
    const src = readContract('auth-error.contract.ts');

    it('defines error codes or error types', () => {
      expect(src).toMatch(/AuthError|ErrorCode|error/i);
    });
  });

  // ── Table Classification ──
  describe('table-classification.ts', () => {
    const src = readContract('table-classification.ts');

    it('defines table classification buckets', () => {
      expect(src).toMatch(/bucket|Bucket|classification|Classification/i);
    });
  });

  // ── Cross-contract consistency checks ──
  describe('cross-contract consistency', () => {
    it('all contract files exist', () => {
      const requiredFiles = [
        'session.contract.ts',
        'principal-context.contract.ts',
        'access-snapshot.contract.ts',
        'access-snapshot.types.ts',
        'scope-resolution.contract.ts',
        'authority-decision.contract.ts',
        'delegation.contract.ts',
        'sod-decision.contract.ts',
        'lifecycle-auth.contract.ts',
        'auth-error.contract.ts',
        'auth-errors.ts',
        'table-classification.ts',
      ];
      for (const file of requiredFiles) {
        expect(fs.existsSync(path.join(CONTRACTS_DIR, file)),
          `Missing contract file: ${file}`).toBe(true);
      }
    });

    it('versioned contracts include version field', () => {
      const versionedContracts = [
        'session.contract.ts',
        'delegation.contract.ts',
      ];
      for (const file of versionedContracts) {
        const src = readContract(file);
        expect(src).toContain('version:');
      }
    });
  });
});
