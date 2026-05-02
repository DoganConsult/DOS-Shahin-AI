"use strict";
/**
 * Shared DOSPort consumer contract-test suite.
 * Every consumer runs this against its bound DOSPort.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDOSPortContract = runDOSPortContract;
const vitest_1 = require("vitest");
const ports_1 = require("@dos/ports");
function runDOSPortContract(getPort, opts = {}) {
    const label = opts.consumerName ? ` [${opts.consumerName}]` : '';
    const expectedVersion = opts.expectedPortsVersion ?? '1.0';
    (0, vitest_1.describe)(`DOSPort consumer contract${label}`, () => {
        (0, vitest_1.it)('consumer @dos/ports major matches the loaded version', () => {
            (0, vitest_1.expect)(() => (0, ports_1.assertPortsCompatible)('dos', expectedVersion)).not.toThrow();
        });
        (0, vitest_1.it)('exposes all six DOSPort methods', () => {
            const port = getPort();
            for (const m of [
                'getTenant', 'publishEvent', 'subscribeEvent',
                'registerModule', 'isModuleRegistered', 'listProducts',
            ]) {
                (0, vitest_1.expect)(typeof port[m], `missing method: ${m}`).toBe('function');
            }
        });
        (0, vitest_1.it)('getTenant returns null for unknown tenants', async () => {
            const port = getPort();
            const t = await port.getTenant('__contract_test_nonexistent_tenant__');
            (0, vitest_1.expect)(t).toBeNull();
        });
        (0, vitest_1.it)('publishEvent resolves to undefined', async () => {
            const port = getPort();
            await (0, vitest_1.expect)(port.publishEvent({
                eventType: 'contract.test.probe',
                tenantId: 't-ct',
                occurredAt: new Date().toISOString(),
                payload: { probe: true },
            })).resolves.toBeUndefined();
        });
        (0, vitest_1.it)('registerModule accepts a descriptor synchronously', () => {
            const port = getPort();
            (0, vitest_1.expect)(() => port.registerModule({
                moduleCode: 'contract-test-module',
                version: '0.0.0',
                layer: 'platform',
                ownerTeam: 'contract-test',
            })).not.toThrow();
        });
        (0, vitest_1.it)('isModuleRegistered returns a boolean', () => {
            const port = getPort();
            (0, vitest_1.expect)(typeof port.isModuleRegistered('any')).toBe('boolean');
        });
        (0, vitest_1.it)('listProducts returns an array (possibly empty)', async () => {
            const port = getPort();
            const list = await port.listProducts();
            (0, vitest_1.expect)(Array.isArray(list)).toBe(true);
        });
    });
}
//# sourceMappingURL=index.js.map