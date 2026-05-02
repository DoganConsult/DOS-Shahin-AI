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
export declare const PORTS_VERSION: "1.0.0";
export declare const MODULE_PORTS_VERSION: {
    readonly dos: "1.0.0";
    readonly dauth: "1.0.0";
    readonly dsoc: "1.0.0";
    readonly dnoc: "1.0.0";
};
export type PlatformModuleCode = keyof typeof MODULE_PORTS_VERSION;
/**
 * Compatibility check: throws if the consumer expects a major or minor
 * version greater than the loaded @dos/ports.
 *
 * Usage at consumer bootstrap:
 *   assertPortsCompatible('dauth', '1.0');
 */
export declare function assertPortsCompatible(module: PlatformModuleCode, expected: string): void;
//# sourceMappingURL=version.d.ts.map