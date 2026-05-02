/**
 * Shared DNOCPort consumer contract-test suite.
 */

import { describe, it, expect } from 'vitest';
import type { DNOCPort } from '@dos/ports/dnoc';
import { assertPortsCompatible } from '@dos/ports';

export interface ContractTestOptions {
  readonly expectedPortsVersion?: string;
  readonly consumerName?: string;
}

export function runDNOCPortContract(
  getPort: () => DNOCPort,
  opts: ContractTestOptions = {},
): void {
  const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
  const expectedVersion = opts.expectedPortsVersion ?? '1.0';

  describe(`DNOCPort consumer contract${label}`, () => {
    it('consumer @dos/ports major matches the loaded version', () => {
      expect(() => assertPortsCompatible('dnoc', expectedVersion)).not.toThrow();
    });

    it('exposes all five DNOCPort methods', () => {
      const port = getPort();
      for (const m of ['recordMetric', 'emitLog', 'emitSpan', 'registerRoute', 'getHealth']) {
        expect(typeof (port as any)[m], `missing method: ${m}`).toBe('function');
      }
    });

    it('recordMetric returns void synchronously', () => {
      const port = getPort();
      expect(() => port.recordMetric({ name: 'ct.metric', kind: 'counter', value: 1 })).not.toThrow();
    });

    it('emitLog returns void synchronously', () => {
      const port = getPort();
      expect(() => port.emitLog({ level: 'info', message: 'ct', moduleCode: 'contract-test' })).not.toThrow();
    });

    it('emitSpan returns void synchronously', () => {
      const port = getPort();
      expect(() =>
        port.emitSpan({
          traceId: 'ct-T', spanId: 'ct-S', name: 'ct.span',
          startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    });

    it('registerRoute returns void synchronously (idempotent)', () => {
      const port = getPort();
      expect(() =>
        port.registerRoute({
          moduleCode: 'contract-test', serviceCode: 'ct-svc',
          method: 'GET', path: '/ct', authRequired: false,
        }),
      ).not.toThrow();
    });

    it('getHealth resolves to a known status enum value', async () => {
      const port = getPort();
      const status = await port.getHealth('contract-test-svc');
      expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(status);
    });
  });
}
