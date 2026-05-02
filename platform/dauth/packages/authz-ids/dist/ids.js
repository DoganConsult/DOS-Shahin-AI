"use strict";
/**
 * Canonical identifier primitives shared by Keycloak, Postgres, OpenFGA, and
 * Cerbos. These branded types guarantee at the type level that an id originated
 * from its authoritative system and is safe to propagate across the three
 * stores without reshape.
 *
 * Sources of truth:
 *   UserId         ← Keycloak `sub` (UUIDv4). Mirrored to users.keycloak_sub.
 *   TenantId       ← Postgres platform_dos.tenants_registry.tenant_id (UUIDv7).
 *   ProductCode    ← Postgres platform_dos.products_registry.product_code.
 *   ModuleCode     ← Postgres platform_dos.modules_registry.module_code.
 *   WorkspaceId    ← Postgres workspaces table (UUIDv7).
 *   ResourceUrn    ← Derived: urn:dos:<module>:<tenant>:<id>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuidV7 = exports.isUuidV4 = exports.asSessionId = exports.asRoleCode = exports.asWorkspaceId = exports.asModuleCode = exports.asProductCode = exports.asTenantId = exports.asUserId = void 0;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[a-z][a-z0-9_-]{1,63}$/;
function asUserId(value) {
    if (!UUID_ANY.test(value)) {
        throw new Error(`[authz-ids] invalid UserId (expected UUID): ${redact(value)}`);
    }
    return value;
}
exports.asUserId = asUserId;
function asTenantId(value) {
    if (!UUID_ANY.test(value)) {
        throw new Error(`[authz-ids] invalid TenantId (expected UUID): ${redact(value)}`);
    }
    return value;
}
exports.asTenantId = asTenantId;
function asProductCode(value) {
    if (!CODE.test(value)) {
        throw new Error(`[authz-ids] invalid ProductCode (expected lowercase kebab/snake): ${redact(value)}`);
    }
    return value;
}
exports.asProductCode = asProductCode;
function asModuleCode(value) {
    if (!CODE.test(value)) {
        throw new Error(`[authz-ids] invalid ModuleCode (expected lowercase kebab/snake): ${redact(value)}`);
    }
    return value;
}
exports.asModuleCode = asModuleCode;
function asWorkspaceId(value) {
    if (!UUID_ANY.test(value)) {
        throw new Error(`[authz-ids] invalid WorkspaceId (expected UUID): ${redact(value)}`);
    }
    return value;
}
exports.asWorkspaceId = asWorkspaceId;
function asRoleCode(value) {
    if (!CODE.test(value)) {
        throw new Error(`[authz-ids] invalid RoleCode: ${redact(value)}`);
    }
    return value;
}
exports.asRoleCode = asRoleCode;
function asSessionId(value) {
    if (!value || value.length < 8 || value.length > 128) {
        throw new Error(`[authz-ids] invalid SessionId length`);
    }
    return value;
}
exports.asSessionId = asSessionId;
function isUuidV4(value) {
    return UUID_V4.test(value);
}
exports.isUuidV4 = isUuidV4;
function isUuidV7(value) {
    return UUID_V7.test(value);
}
exports.isUuidV7 = isUuidV7;
function redact(value) {
    if (value.length <= 8) {
        return '***';
    }
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
//# sourceMappingURL=ids.js.map