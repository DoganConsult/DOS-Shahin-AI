"use strict";
/**
 * Shared DNOCPort consumer contract-test suite.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDNOCPortContract = runDNOCPortContract;
const vitest_1 = require("vitest");
const ports_1 = require("@dos/ports");
function runDNOCPortContract(getPort, opts = {}) {
    const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
    const expectedVersion = opts.expectedPortsVersion ?? '1.0';
    (0, vitest_1.describe)(`DNOCPort consumer contract${label}`, () => {
        (0, vitest_1.it)('consumer @dos/ports major matches the loaded version', () => {
            (0, vitest_1.expect)(() => (0, ports_1.assertPortsCompatible)('dnoc', expectedVersion)).not.toThrow();
        });
        (0, vitest_1.it)('exposes all five DNOCPort methods', () => {
            const port = getPort();
            for (const m of ['recordMetric', 'emitLog', 'emitSpan', 'registerRoute', 'getHealth']) {
                (0, vitest_1.expect)(typeof port[m], `missing method: ${m}`).toBe('function');
            }
        });
        (0, vitest_1.it)('recordMetric returns void synchronously', () => {
            const port = getPort();
            (0, vitest_1.expect)(() => port.recordMetric({ name: 'ct.metric', kind: 'counter', value: 1 })).not.toThrow();
        });
        (0, vitest_1.it)('emitLog returns void synchronously', () => {
            const port = getPort();
            (0, vitest_1.expect)(() => port.emitLog({ level: 'info', message: 'ct', moduleCode: 'contract-test' })).not.toThrow();
        });
        (0, vitest_1.it)('emitSpan returns void synchronously', () => {
            const port = getPort();
            (0, vitest_1.expect)(() => port.emitSpan({
                traceId: 'ct-T', spanId: 'ct-S', name: 'ct.span',
                startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
            })).not.toThrow();
        });
        (0, vitest_1.it)('registerRoute returns void synchronously (idempotent)', () => {
            const port = getPort();
            (0, vitest_1.expect)(() => port.registerRoute({
                moduleCode: 'contract-test', serviceCode: 'ct-svc',
                method: 'GET', path: '/ct', authRequired: false,
            })).not.toThrow();
        });
        (0, vitest_1.it)('getHealth resolves to a known status enum value', async () => {
            const port = getPort();
            const status = await port.getHealth('contract-test-svc');
            (0, vitest_1.expect)(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(status);
        });
    });
}
//# sourceMappingURL=index.js.map