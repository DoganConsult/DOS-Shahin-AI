"use strict";
/**
 * Resource URN primitive — the single canonical shape of a resource across
 * Postgres (typed column), OpenFGA (object id), and Cerbos (resource.id).
 *
 * Format: urn:dos:<moduleCode>:<tenantId>:<resourceId>[:<subPath>]
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResourceUrn = exports.buildResourceUrn = void 0;
const ids_js_1 = require("./ids.js");
const URN_SCHEME = 'urn:dos';
function buildResourceUrn(parts) {
    const tail = parts.subPath ? `:${parts.subPath}` : '';
    return `${URN_SCHEME}:${parts.moduleCode}:${parts.tenantId}:${parts.resourceId}${tail}`;
}
exports.buildResourceUrn = buildResourceUrn;
function parseResourceUrn(urn) {
    const parts = urn.split(':');
    if (parts.length < 5 || parts[0] !== 'urn' || parts[1] !== 'dos') {
        throw new Error(`[authz-ids] invalid resource URN: ${urn}`);
    }
    const [, , moduleCode, tenantId, resourceId, ...rest] = parts;
    if (!moduleCode || !tenantId || !resourceId) {
        throw new Error(`[authz-ids] invalid resource URN parts: ${urn}`);
    }
    return {
        moduleCode: (0, ids_js_1.asModuleCode)(moduleCode),
        tenantId: (0, ids_js_1.asTenantId)(tenantId),
        resourceId,
        subPath: rest.length > 0 ? rest.join(':') : undefined,
    };
}
exports.parseResourceUrn = parseResourceUrn;
//# sourceMappingURL=urn.js.map