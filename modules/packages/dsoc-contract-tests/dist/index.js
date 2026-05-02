"use strict";
/**
 * Shared DSOCPort consumer contract-test suite.
 * Same idea as @dos/dauth-contract-tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDSOCPortContract = runDSOCPortContract;
const vitest_1 = require("vitest");
const ports_1 = require("@dos/ports");
function runDSOCPortContract(getPort, opts = {}) {
    const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
    const expectedVersion = opts.expectedPortsVersion ?? '1.0';
    (0, vitest_1.describe)(`DSOCPort consumer contract${label}`, () => {
        (0, vitest_1.it)('consumer @dos/ports major matches the loaded version', () => {
            (0, vitest_1.expect)(() => (0, ports_1.assertPortsCompatible)('dsoc', expectedVersion)).not.toThrow();
        });
        (0, vitest_1.it)('exposes all three DSOCPort methods', () => {
            const port = getPort();
            for (const m of ['recordAuditEvent', 'raiseAlert', 'getLatestPosture']) {
                (0, vitest_1.expect)(typeof port[m], `missing method: ${m}`).toBe('function');
            }
        });
        (0, vitest_1.it)('recordAuditEvent returns void (Promise<undefined>)', async () => {
            const port = getPort();
            await (0, vitest_1.expect)(port.recordAuditEvent({
                tenantId: 't-ct',
                category: 'authn',
                severity: 'info',
                actor: { type: 'service', id: 'contract-test' },
                action: 'contract.probe',
                outcome: 'success',
                occurredAt: new Date().toISOString(),
            })).resolves.toBeUndefined();
        });
        (0, vitest_1.it)('raiseAlert returns void (Promise<undefined>)', async () => {
            const port = getPort();
            await (0, vitest_1.expect)(port.raiseAlert({
                tenantId: 't-ct',
                category: 'threat',
                severity: 'high',
                actor: { type: 'service', id: 'contract-test' },
                action: 'contract.alert.probe',
                outcome: 'denied',
                occurredAt: new Date().toISOString(),
            })).resolves.toBeUndefined();
        });
        (0, vitest_1.it)('getLatestPosture returns a snapshot or null', async () => {
            const port = getPort();
            const result = await port.getLatestPosture('t-ct-nonexistent');
            (0, vitest_1.expect)(result === null || typeof result === 'object').toBe(true);
        });
    });
}
//# sourceMappingURL=index.js.map