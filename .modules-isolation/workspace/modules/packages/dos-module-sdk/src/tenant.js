"use strict";
/**
 * @dos/module-sdk tenant utilities
 * Tenant and workspace context helpers for module development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantContext = getTenantContext;
exports.getFullTenantContext = getFullTenantContext;
exports.buildTenantSchema = buildTenantSchema;
exports.isValidTenantSchema = isValidTenantSchema;
exports.assertWorkspaceId = assertWorkspaceId;
exports.assertUserAuthenticated = assertUserAuthenticated;
exports.belongsToTenant = belongsToTenant;
exports.isSuperAdmin = isSuperAdmin;
exports.isTenantAdmin = isTenantAdmin;
exports.isSystemUser = isSystemUser;
exports.buildTenantQueryContext = buildTenantQueryContext;
exports.tenantTable = tenantTable;
exports.getWorkspaceContext = getWorkspaceContext;
exports.isTenantActive = isTenantActive;
exports.isTenantSuspended = isTenantSuspended;
exports.isWorkspaceActive = isWorkspaceActive;
exports.canAccessWorkspace = canAccessWorkspace;
exports.getTenantLanguage = getTenantLanguage;
exports.isRTL = isRTL;
exports.getTenantTimezone = getTenantTimezone;
exports.formatTenantDate = formatTenantDate;
exports.formatTenantDateTime = formatTenantDateTime;
exports.createServiceContext = createServiceContext;
// ────────────────────────────────────────────────────────────────────────────
// Context Extraction
// ────────────────────────────────────────────────────────────────────────────
/**
 * Extract tenant context from authenticated request
 */
function getTenantContext(req) {
    const tenantId = req.tenantId;
    if (!tenantId) {
        throw new Error('Request missing tenantId - middleware may not be applied');
    }
    return {
        tenantId,
        tenantSchema: req.tenantSchema || buildTenantSchema(tenantId),
        workspaceId: req.query?.workspaceId,
        correlationId: req.correlationId,
    };
}
/**
 * Extract full tenant context including user info
 */
function getFullTenantContext(req) {
    const baseCtx = getTenantContext(req);
    const user = req.user;
    if (!user) {
        throw new Error('Request missing user - authentication middleware may not be applied');
    }
    return {
        ...baseCtx,
        user,
        scopes: req.externalScope ? [req.externalScope] : [],
    };
}
/**
 * Build tenant schema name from tenant ID
 */
function buildTenantSchema(tenantId) {
    if (!tenantId)
        throw new Error('tenantId is required');
    return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '')}`;
}
/**
 * Validate tenant schema name
 */
function isValidTenantSchema(schema) {
    return /^tenant_[a-zA-Z0-9_]+$/.test(schema);
}
// ────────────────────────────────────────────────────────────────────────────
// Tenant Assertions
// ────────────────────────────────────────────────────────────────────────────
function assertWorkspaceId(workspaceId) {
    if (!workspaceId) {
        throw new Error('workspaceId is required');
    }
}
function assertUserAuthenticated(user) {
    if (!user || !user.userId) {
        throw new Error('User not authenticated');
    }
}
// ────────────────────────────────────────────────────────────────────────────
// Tenant Membership Helpers
// ────────────────────────────────────────────────────────────────────────────
function belongsToTenant(user, tenantId) {
    return user.tenantId === tenantId;
}
function isSuperAdmin(user) {
    return user.role?.toLowerCase() === 'super_admin' || user.isSuperAdmin === true;
}
function isTenantAdmin(user) {
    const role = user.role?.toLowerCase();
    return role === 'tenant_admin' || role === 'admin' || isSuperAdmin(user);
}
function isSystemUser(user) {
    return user.actorType === 'system' || user.userId === 'SYSTEM';
}
function buildTenantQueryContext(ctx) {
    return {
        tenantId: ctx.tenantId,
        tenantSchema: ctx.tenantSchema,
        userId: ctx.user.userId ?? '',
        workspaceId: ctx.workspaceId,
    };
}
/**
 * Generate tenant-scoped table reference
 * @example tenantTable('users', 'tenant_abc123') => 'tenant_abc123.users'
 */
function tenantTable(tableName, tenantSchema) {
    if (!isValidTenantSchema(tenantSchema)) {
        throw new Error(`Invalid tenant schema: ${tenantSchema}`);
    }
    return `${tenantSchema}.${tableName}`;
}
function getWorkspaceContext(req) {
    const tenantCtx = getTenantContext(req);
    const rawReq = req;
    const workspaceId = rawReq.query?.workspaceId || rawReq.params?.workspaceId;
    if (!workspaceId) {
        throw new Error('workspaceId is required in query or params');
    }
    return {
        ...tenantCtx,
        workspaceId,
    };
}
// ────────────────────────────────────────────────────────────────────────────
// Tenant Contract Helpers
// ────────────────────────────────────────────────────────────────────────────
function isTenantActive(tenant) {
    return tenant.status === 'active';
}
function isTenantSuspended(tenant) {
    return tenant.status === 'suspended';
}
function isWorkspaceActive(workspace) {
    return workspace.isActive === true;
}
function canAccessWorkspace(user, workspace) {
    return belongsToTenant(user, workspace.tenantId) && isWorkspaceActive(workspace);
}
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'ar'];
function getTenantLanguage(tenant) {
    const lang = tenant.language?.toLowerCase();
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
        return lang;
    }
    return DEFAULT_LANGUAGE;
}
function isRTL(language) {
    return language === 'ar';
}
// ────────────────────────────────────────────────────────────────────────────
// Tenant Timezone Helpers
// ────────────────────────────────────────────────────────────────────────────
const DEFAULT_TIMEZONE = 'UTC';
function getTenantTimezone(tenant) {
    return tenant.timezone || DEFAULT_TIMEZONE;
}
function formatTenantDate(date, tenant) {
    const timezone = getTenantTimezone(tenant);
    const language = getTenantLanguage(tenant);
    try {
        return new Intl.DateTimeFormat(language, { timeZone: timezone }).format(date);
    }
    catch {
        return date.toISOString();
    }
}
function formatTenantDateTime(date, tenant) {
    const timezone = getTenantTimezone(tenant);
    const language = getTenantLanguage(tenant);
    try {
        return new Intl.DateTimeFormat(language, {
            timeZone: timezone,
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }
    catch {
        return date.toISOString();
    }
}
function createServiceContext(req, moduleCode) {
    const ctx = getFullTenantContext(req);
    return {
        tenantId: ctx.tenantId,
        tenantSchema: ctx.tenantSchema,
        userId: ctx.user.userId ?? '',
        correlationId: ctx.correlationId || generateCorrelationId(),
        moduleCode,
    };
}
function generateCorrelationId() {
    return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
//# sourceMappingURL=tenant.js.map