/**
 * Shared DSOCPort consumer contract-test suite.
 * Same idea as @dos/dauth-contract-tests.
 */

import { describe, it, expect } from 'vitest';
import type { DSOCPort } from '@dos/ports/dsoc';
import { assertPortsCompatible } from '@dos/ports';

export interface ContractTestOptions {
  readonly expectedPortsVersion?: string;
  readonly consumerName?: string;
}

export function runDSOCPortContract(
  getPort: () => DSOCPort,
  opts: ContractTestOptions = {},
): void {
  const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
  const expectedVersion = opts.expectedPortsVersion ?? '1.0';

  describe(`DSOCPort consumer contract${label}`, () => {
    it('consumer @dos/ports major matches the loaded version', () => {
      expect(() => assertPortsCompatible('dsoc', expectedVersion)).not.toThrow();
    });

    it('exposes all three DSOCPort methods', () => {
      const port = getPort();
      for (const m of ['recordAuditEvent', 'raiseAlert', 'getLatestPosture']) {
        expect(typeof (port as any)[m], `missing method: ${m}`).toBe('function');
      }
    });

    it('recordAuditEvent returns void (Promise<undefined>)', async () => {
      const port = getPort();
      await expect(
        port.recordAuditEvent({
          tenantId: 't-ct',
          category: 'authn',
          severity: 'info',
          actor: { type: 'service', id: 'contract-test' },
          action: 'contract.probe',
          outcome: 'success',
          occurredAt: new Date().toISOString(),
        }),
      ).resolves.toBeUndefined();
    });

    it('raiseAlert returns void (Promise<undefined>)', async () => {
      const port = getPort();
      await expect(
        port.raiseAlert({
          tenantId: 't-ct',
          category: 'threat',
          severity: 'high',
          actor: { type: 'service', id: 'contract-test' },
          action: 'contract.alert.probe',
          outcome: 'denied',
          occurredAt: new Date().toISOString(),
        }),
      ).resolves.toBeUndefined();
    });

    it('getLatestPosture returns a snapshot or null', async () => {
      const port = getPort();
      const result = await port.getLatestPosture('t-ct-nonexistent');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
}
