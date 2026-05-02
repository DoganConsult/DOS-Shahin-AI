/**
 * Shared DOSPort consumer contract-test suite.
 * Every consumer runs this against its bound DOSPort.
 */

import { describe, it, expect } from 'vitest';
import type { DOSPort } from '@dos/ports/dos';
import { assertPortsCompatible } from '@dos/ports';

export interface ContractTestOptions {
  readonly expectedPortsVersion?: string;
  readonly consumerName?: string;
}

export function runDOSPortContract(
  getPort: () => DOSPort,
  opts: ContractTestOptions = {},
): void {
  const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
  const expectedVersion = opts.expectedPortsVersion ?? '1.0';

  describe(`DOSPort consumer contract${label}`, () => {
    it('consumer @dos/ports major matches the loaded version', () => {
      expect(() => assertPortsCompatible('dos', expectedVersion)).not.toThrow();
    });

    it('exposes all six DOSPort methods', () => {
      const port = getPort();
      for (const m of [
        'getTenant', 'publishEvent', 'subscribeEvent',
        'registerModule', 'isModuleRegistered', 'listProducts',
      ]) {
        expect(typeof (port as any)[m], `missing method: ${m}`).toBe('function');
      }
    });

    it('getTenant returns null for unknown tenants', async () => {
      const port = getPort();
      const t = await port.getTenant('__contract_test_nonexistent_tenant__');
      expect(t).toBeNull();
    });

    it('publishEvent resolves to undefined', async () => {
      const port = getPort();
      await expect(
        port.publishEvent({
          eventType: 'contract.test.probe',
          tenantId: 't-ct',
          occurredAt: new Date().toISOString(),
          payload: { probe: true },
        }),
      ).resolves.toBeUndefined();
    });

    it('registerModule accepts a descriptor synchronously', () => {
      const port = getPort();
      expect(() =>
        port.registerModule({
          moduleCode: 'contract-test-module',
          version: '0.0.0',
          layer: 'platform',
          ownerTeam: 'contract-test',
        }),
      ).not.toThrow();
    });

    it('isModuleRegistered returns a boolean', () => {
      const port = getPort();
      expect(typeof port.isModuleRegistered('any')).toBe('boolean');
    });

    it('listProducts returns an array (possibly empty)', async () => {
      const port = getPort();
      const list = await port.listProducts();
      expect(Array.isArray(list)).toBe(true);
    });
  });
}
