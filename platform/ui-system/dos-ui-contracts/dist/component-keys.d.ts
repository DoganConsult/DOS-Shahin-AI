/**
 * Dynamic UI component key registry.
 *
 * NO hardcoded keys. The approved set is populated at bootstrap from
 * the DB (dos.dynamic_ui_component_registry) via the workspace-runtime
 * resolver. CI guards validate against the live DB, not this file.
 *
 * Migration from static:
 *   - Old: APPROVED_COMPONENT_KEYS = ['PageHeader', 'Tabs', ...] as const
 *   - New: mutable Set populated at runtime from resolver/bootstrap
 */
/**
 * Populate the approved key set from the resolver bootstrap response.
 * Called once at app init by the bootstrap service.
 */
export declare function registerApprovedComponentKeys(keys: ReadonlyArray<string>): void;
/**
 * Add a single key at runtime (e.g. lazy-loaded module registering a
 * domain widget after bootstrap).
 */
export declare function registerComponentKey(key: string): void;
/**
 * Runtime type guard — returns true only if the key was registered
 * from the DB via registerApprovedComponentKeys().
 */
export declare function isApprovedComponentKey(key: string): boolean;
/**
 * Snapshot of currently registered keys (for admin validation, CI guards).
 */
export declare function getApprovedComponentKeys(): ReadonlySet<string>;
/**
 * @deprecated Use string directly. No compile-time union — keys come from DB.
 */
export type ApprovedComponentKey = string;
