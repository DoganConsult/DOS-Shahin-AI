"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEntity = toEntity;
exports.toEntityList = toEntityList;
exports.toCreateInput = toCreateInput;
exports.toApiResponse = toApiResponse;
exports.toApiListResponse = toApiListResponse;
exports.toAudienceShaped = toAudienceShaped;
exports.toAdminResponse = toAdminResponse;
exports.toListItem = toListItem;
exports.redactForAudit = redactForAudit;
exports.stripFieldsForExport = stripFieldsForExport;
exports.toImportEntity = toImportEntity;
function toEntity(row) {
    return {
        snapshot_id: row.snapshot_id ?? row.id,
        tenant_id: row.tenant_id,
        ...row,
        created_at: row.created_at?.toISOString?.() ?? row.created_at,
        updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
        created_by: row.created_by ?? 'system',
    };
}
function toEntityList(rows) {
    return rows.map(toEntity);
}
function toCreateInput(dto, tenantId, userId) {
    return {
        ...dto,
        tenant_id: tenantId,
        created_by: userId,
    };
}
function toApiResponse(entity) {
    const { deleted_at: _deleted_at, ...rest } = entity;
    return rest;
}
function toApiListResponse(entities, total) {
    return {
        data: entities.map(toApiResponse),
        total,
    };
}
const SENSITIVE_FIELDS = ['internal_notes', 'system_flags'];
const INTERNAL_ONLY_FIELDS = ['deleted_at', 'internal_notes', 'system_flags', 'ai_metadata'];
const ADMIN_ONLY_FIELDS = ['tenant_id', 'deleted_at', 'internal_notes', 'system_flags'];
function toAudienceShaped(entity, audience) {
    const result = { ...entity };
    if (audience === 'public' || audience === 'export') {
        for (const f of SENSITIVE_FIELDS)
            delete result[f];
        for (const f of INTERNAL_ONLY_FIELDS)
            delete result[f];
    }
    if (audience === 'internal') {
        for (const f of ADMIN_ONLY_FIELDS)
            delete result[f];
    }
    if (audience === 'export') {
        delete result['deleted_at'];
        result['export_timestamp'] = new Date().toISOString();
    }
    return result;
}
function toAdminResponse(entity) {
    return { ...entity };
}
function toListItem(entity) {
    const { deleted_at: _deleted_at, internal_notes: _internal_notes, system_flags: _system_flags, ai_metadata: _ai_metadata, ...rest } = entity;
    return rest;
}
function redactForAudit(entity) {
    const result = { ...entity };
    for (const f of SENSITIVE_FIELDS) {
        if (f in result)
            result[f] = '[REDACTED]';
    }
    return result;
}
function stripFieldsForExport(entity, excludeFields) {
    const result = {};
    for (const [key, value] of Object.entries(entity)) {
        if (key === 'deleted_at')
            continue;
        if (excludeFields?.includes(key))
            continue;
        result[key] = value;
    }
    result['export_timestamp'] = new Date().toISOString();
    return result;
}
function toImportEntity(row, tenantId, userId) {
    return {
        ...row,
        tenant_id: tenantId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: row.status || 'draft',
    };
}
//# sourceMappingURL=analytics.mapper.js.map