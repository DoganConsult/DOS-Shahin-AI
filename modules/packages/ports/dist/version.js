"use strict";
/**
 * @dos/ports semver — single source of truth for the port contract version.
 *
 * Bumping rules (every consumer relies on these):
 *   - PATCH: doc / comment changes; no shape changes; no behavior contract changes.
 *   - MINOR: additive — new optional fields, new methods, new types.
 *            Existing callers compile and run unchanged.
 *   - MAJOR: breaking — removed/renamed methods, required-field additions,
 *            tightened types, semantic changes.
 *
 * `PORTS_VERSION` is the runtime value consumers can assert against to
 * fail fast at bootstrap if the linked @dos/ports is incompatible.
 *
 * `MODULE_PORTS_VERSION` is the per-module port version. A platform
 * module can ship a newer minor at its own pace, while the package as
 * a whole uses the highest of all module versions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_PORTS_VERSION = exports.PORTS_VERSION = void 0;
exports.assertPortsCompatible = assertPortsCompatible;
exports.PORTS_VERSION = '1.0.0';
exports.MODULE_PORTS_VERSION = {
    dos: '1.0.0',
    dauth: '1.0.0',
    dsoc: '1.0.0',
    dnoc: '1.0.0',
};
/**
 * Compatibility check: throws if the consumer expects a major or minor
 * version greater than the loaded @dos/ports.
 *
 * Usage at consumer bootstrap:
 *   assertPortsCompatible('dauth', '1.0');
 */
function assertPortsCompatible(module, expected) {
    const actual = exports.MODULE_PORTS_VERSION[module];
    const [aMaj, aMin] = actual.split('.').map(Number);
    const [eMaj, eMin] = expected.split('.').map(Number);
    if (eMaj !== aMaj) {
        throw new Error(`[@dos/ports] '${module}' major version mismatch: consumer expects ${expected}, ` +
            `loaded ${actual}. Update either the consumer or the platform module.`);
    }
    if (typeof eMin === 'number' && eMin > aMin) {
        throw new Error(`[@dos/ports] '${module}' minor version too low: consumer expects >= ${expected}, ` +
            `loaded ${actual}. Upgrade @dos/ports.`);
    }
}
//# sourceMappingURL=version.js.map