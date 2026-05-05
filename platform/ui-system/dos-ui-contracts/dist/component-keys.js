"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerApprovedComponentKeys = registerApprovedComponentKeys;
exports.registerComponentKey = registerComponentKey;
exports.isApprovedComponentKey = isApprovedComponentKey;
exports.getApprovedComponentKeys = getApprovedComponentKeys;
// ── Runtime registry (populated from DB at bootstrap) ─────────────────────
const _approvedKeys = new Set();
/**
 * Populate the approved key set from the resolver bootstrap response.
 * Called once at app init by the bootstrap service.
 */
function registerApprovedComponentKeys(keys) {
    _approvedKeys.clear();
    for (const k of keys)
        _approvedKeys.add(k);
}
/**
 * Add a single key at runtime (e.g. lazy-loaded module registering a
 * domain widget after bootstrap).
 */
function registerComponentKey(key) {
    _approvedKeys.add(key);
}
/**
 * Runtime type guard — returns true only if the key was registered
 * from the DB via registerApprovedComponentKeys().
 */
function isApprovedComponentKey(key) {
    return _approvedKeys.has(key);
}
/**
 * Snapshot of currently registered keys (for admin validation, CI guards).
 */
function getApprovedComponentKeys() {
    return _approvedKeys;
}
//# sourceMappingURL=component-keys.js.map