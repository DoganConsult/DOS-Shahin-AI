/**
 * Shared DAuthPort consumer contract-test suite.
 *
 * A consumer (product shell, service bootstrap, test harness) that
 * depends on `@dos/ports/dauth.DAuthPort` should exercise this suite
 * against its bound port instance. The suite is deliberately thin:
 * it asserts the port's shape and method signatures at runtime, not
 * the underlying business logic. Business-logic tests belong to the
 * DAuth module itself.
 *
 * Usage in a consumer test file:
 *
 *   import { describe } from 'vitest';
 *   import { runDAuthPortContract } from '@dos/dauth-contract-tests';
 *   import { getDAuthPort } from '@dos/dauth-core';
 *   import { bootstrapDAuthPlatformPorts } from '../bootstrap';
 *
 *   describe('my-service consumer contract', () => {
 *     bootstrapDAuthPlatformPorts();
 *     runDAuthPortContract(() => getDAuthPort());
 *   });
 *
 * The suite will fail fast if:
 *   - any DAuthPort method is missing,
 *   - a method returns the wrong shape,
 *   - the port singleton is not bound,
 *   - the @dos/ports major doesn't match the consumer's expectation.
 */

import { describe, it, expect } from 'vitest';
import type { DAuthPort } from '@dos/ports/dauth';
import { assertPortsCompatible } from '@dos/ports';

export interface ContractTestOptions {
  /** Consumer's required @dos/ports major.minor. Default: '1.0'. */
  readonly expectedPortsVersion?: string;
  /** Optional human-readable consumer name shown in test output. */
  readonly consumerName?: string;
}

/**
 * Register the DAuthPort contract-test suite for a consumer.
 * Pass a getter so the suite can re-resolve the port lazily
 * (bootstrap-order independent).
 */
export function runDAuthPortContract(
  getPort: () => DAuthPort,
  opts: ContractTestOptions = {},
): void {
  const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
  const expectedVersion = opts.expectedPortsVersion ?? '1.0';

  describe(`DAuthPort consumer contract${label}`, () => {
    it('consumer @dos/ports major matches the loaded version', () => {
      expect(() => assertPortsCompatible('dauth', expectedVersion)).not.toThrow();
    });

    it('exposes all six DAuthPort methods', () => {
      const port = getPort();
      const required = [
        'validateSession',
        'checkAccess',
        'checkAuthority',
        'getActiveDelegations',
        'evaluateSoD',
        'revokeSession',
      ];
      for (const m of required) {
        expect(typeof (port as any)[m], `missing method: ${m}`).toBe('function');
      }
    });

    it('validateSession returns null for an unknown token', async () => {
      const port = getPort();
      const session = await port.validateSession('__definitely_not_a_real_token__');
      expect(session).toBeNull();
    });

    it('checkAccess returns an allow/deny decision with a decisionId', async () => {
      const port = getPort();
      const result = await port.checkAccess({
        principal: { userId: 'u-c', tenantId: 't-c', roles: [], scopes: [] },
        action: 'contract-test.probe',
        resource: { type: 'contract-probe' },
      });
      expect(result).toBeDefined();
      expect(['allow', 'deny']).toContain(result.decision);
      expect(typeof result.decisionId).toBe('string');
      expect(Array.isArray(result.reasonCodes)).toBe(true);
      expect(typeof result.evaluatedAt).toBe('string');
    });

    it('checkAuthority returns a boolean', async () => {
      const port = getPort();
      const holds = await port.checkAuthority({
        principal: { userId: 'u-c', tenantId: 't-c', roles: [], scopes: [] },
        authorityCode: '__contract_test_authority__',
      });
      expect(typeof holds).toBe('boolean');
    });

    it('getActiveDelegations returns an array (possibly empty)', async () => {
      const port = getPort();
      const rows = await port.getActiveDelegations({
        userId: 'u-c',
        tenantId: 't-c',
        roles: [],
        scopes: [],
      });
      expect(Array.isArray(rows)).toBe(true);
    });

    it('evaluateSoD returns a result with conflict boolean + ruleCodes array', async () => {
      const port = getPort();
      const result = await port.evaluateSoD(
        { userId: 'u-c', tenantId: 't-c', roles: [], scopes: [] },
        [{ roleCode: 'a' }, { roleCode: 'b' }],
      );
      expect(typeof result.conflict).toBe('boolean');
      expect(Array.isArray(result.ruleCodes)).toBe(true);
    });

    it('evaluateSoD short-circuits to no-conflict for fewer than 2 grants', async () => {
      const port = getPort();
      const result = await port.evaluateSoD(
        { userId: 'u-c', tenantId: 't-c', roles: [], scopes: [] },
        [{ roleCode: 'only-one' }],
      );
      expect(result.conflict).toBe(false);
    });

    it('revokeSession returns a boolean (idempotent)', async () => {
      const port = getPort();
      const res = await port.revokeSession('__nonexistent_session__', 'contract-test');
      expect(typeof res).toBe('boolean');
    });
  });
}
