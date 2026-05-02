"use strict";
/**
 * DOS Foundation Service — Canonical CRUD for org hierarchy entities.
 *
 * This service provides the single entry point for positions CRUD (with reports-to)
 * and re-exports the existing org hierarchy services for organizations, business_units,
 * departments, and teams.
 *
 * Existing coverage (no duplication needed):
 *   - organizations CRUD + hierarchy  → org-hierarchy.service.ts  (upsertOrgHierarchyNode, getOrgHierarchyTree)
 *   - business_units CRUD             → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='division')
 *   - departments CRUD                → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='department')
 *   - teams CRUD + members            → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='team')
 *                                       org-hierarchy-ops.service.ts (assignMember, bulkAssignMembers, searchOrgStructure)
 *   - bulk ops                        → org-hierarchy-ops.service.ts (bulkCreate, bulkDelete, bulkMove, bulkUpdateStatus)
 *   - admin features                  → org-hierarchy-admin.service.ts (activation, templates, visualization, analytics)
 *   - team recommendations            → team-builder.service.ts
 *   - responsibility suggestions      → responsibility-suggest.service.ts
 *   - org pack seeding (provisioning) → ../provisioning/org-pack-seeding.service.ts
 *
 * This file adds: positions CRUD with reports-to hierarchy.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAssignMembers = exports.assignMember = exports.searchOrgStructure = exports.bulkMoveNodes = exports.bulkDeleteNodes = exports.bulkUpdateStatus = exports.bulkCreateNodes = exports.getUserAccessibleTeams = exports.getUserAccessibleDepartments = exports.getOrgHierarchyAccessRules = exports.validateOrgStructure = exports.upsertOrgHierarchyNode = exports.getOrgHierarchyTree = void 0;
exports.createPosition = createPosition;
exports.getPosition = getPosition;
exports.listPositions = listPositions;
exports.updatePosition = updatePosition;
exports.deletePosition = deletePosition;
exports.getPositionReportingChain = getPositionReportingChain;
exports.getPositionDirectReports = getPositionDirectReports;
exports.getNodes = getNodes;
exports.getNodeById = getNodeById;
exports.createNode = createNode;
exports.updateNode = updateNode;
exports.deleteNode = deleteNode;
exports.transitionStatus = transitionStatus;
exports.getHierarchyTree = getHierarchyTree;
exports.getChildren = getChildren;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
const crypto_1 = require("crypto");
// ── Re-exports for unified import ──
var org_hierarchy_service_1 = require("../org-hierarchy/org-hierarchy.service");
Object.defineProperty(exports, "getOrgHierarchyTree", { enumerable: true, get: function () { return org_hierarchy_service_1.getOrgHierarchyTree; } });
Object.defineProperty(exports, "upsertOrgHierarchyNode", { enumerable: true, get: function () { return org_hierarchy_service_1.upsertOrgHierarchyNode; } });
Object.defineProperty(exports, "validateOrgStructure", { enumerable: true, get: function () { return org_hierarchy_service_1.validateOrgStructure; } });
Object.defineProperty(exports, "getOrgHierarchyAccessRules", { enumerable: true, get: function () { return org_hierarchy_service_1.getOrgHierarchyAccessRules; } });
Object.defineProperty(exports, "getUserAccessibleDepartments", { enumerable: true, get: function () { return org_hierarchy_service_1.getUserAccessibleDepartments; } });
Object.defineProperty(exports, "getUserAccessibleTeams", { enumerable: true, get: function () { return org_hierarchy_service_1.getUserAccessibleTeams; } });
var org_hierarchy_ops_service_1 = require("../org-hierarchy/org-hierarchy-ops.service");
Object.defineProperty(exports, "bulkCreateNodes", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.bulkCreateNodes; } });
Object.defineProperty(exports, "bulkUpdateStatus", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.bulkUpdateStatus; } });
Object.defineProperty(exports, "bulkDeleteNodes", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.bulkDeleteNodes; } });
Object.defineProperty(exports, "bulkMoveNodes", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.bulkMoveNodes; } });
Object.defineProperty(exports, "searchOrgStructure", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.searchOrgStructure; } });
Object.defineProperty(exports, "assignMember", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.assignMember; } });
Object.defineProperty(exports, "bulkAssignMembers", { enumerable: true, get: function () { return org_hierarchy_ops_service_1.bulkAssignMembers; } });
// ── Position CRUD ──
/**
 * Create a new position in the tenant schema.
 */
async function createPosition(tenantId, userId, input) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const positionId = (0, crypto_1.randomUUID)();
    const cols = [
        'position_id', 'title_en', 'status', 'created_by',
    ];
    const vals = [
        positionId, input.titleEn, input.status || 'active', userId,
    ];
    if (input.titleAr !== undefined) {
        cols.push('title_ar');
        vals.push(input.titleAr);
    }
    if (input.deptId !== undefined) {
        cols.push('dept_id');
        vals.push(input.deptId);
    }
    if (input.grade !== undefined) {
        cols.push('grade');
        vals.push(input.grade);
    }
    if (input.reportsToPositionId !== undefined) {
        cols.push('reports_to_position_id');
        vals.push(input.reportsToPositionId);
    }
    if (input.metadata !== undefined) {
        cols.push('metadata');
        vals.push(JSON.stringify(input.metadata));
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".positions (${cols.join(', ')}) VALUES (${placeholders})`, vals);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions WHERE position_id = $1`, [positionId]);
    logger_port_1.logger.info(`[DOS Foundation] Position created: ${positionId} in tenant ${tenantId}`);
    return rows[0];
}
/**
 * Retrieve a single position by ID.
 */
async function getPosition(tenantId, positionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`, [positionId]);
    return rows[0] || null;
}
/**
 * List positions with optional filters and pagination.
 */
async function listPositions(tenantId, options = {}) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let idx = 1;
    if (options.deptId) {
        conditions.push(`dept_id = $${idx}`);
        params.push(options.deptId);
        idx++;
    }
    if (options.status) {
        conditions.push(`status = $${idx}`);
        params.push(options.status);
        idx++;
    }
    if (options.searchTerm) {
        conditions.push(`(title_en ILIKE $${idx} OR title_ar ILIKE $${idx})`);
        params.push(`%${options.searchTerm}%`);
        idx++;
    }
    if (options.reportsToPositionId) {
        conditions.push(`reports_to_position_id = $${idx}`);
        params.push(options.reportsToPositionId);
        idx++;
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const limit = Math.min(options.limit || 100, 500);
    const offset = options.offset || 0;
    const countRes = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".positions ${where}`, params);
    const total = countRes.rows[0]?.total || 0;
    const dataRes = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions ${where} ORDER BY title_en LIMIT ${limit} OFFSET ${offset}`, params);
    return { data: dataRes.rows, total };
}
/**
 * Update an existing position. Supports partial updates.
 */
async function updatePosition(tenantId, userId, positionId, input) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const setClauses = [];
    const params = [];
    let idx = 1;
    if (input.titleEn !== undefined) {
        setClauses.push(`title_en = $${idx}`);
        params.push(input.titleEn);
        idx++;
    }
    if (input.titleAr !== undefined) {
        setClauses.push(`title_ar = $${idx}`);
        params.push(input.titleAr);
        idx++;
    }
    if (input.deptId !== undefined) {
        setClauses.push(`dept_id = $${idx}`);
        params.push(input.deptId);
        idx++;
    }
    if (input.grade !== undefined) {
        setClauses.push(`grade = $${idx}`);
        params.push(input.grade);
        idx++;
    }
    if (input.reportsToPositionId !== undefined) {
        setClauses.push(`reports_to_position_id = $${idx}`);
        params.push(input.reportsToPositionId);
        idx++;
    }
    if (input.status !== undefined) {
        setClauses.push(`status = $${idx}`);
        params.push(input.status);
        idx++;
    }
    if (input.metadata !== undefined) {
        setClauses.push(`metadata = $${idx}`);
        params.push(JSON.stringify(input.metadata));
        idx++;
    }
    if (setClauses.length === 0) {
        return getPosition(tenantId, positionId);
    }
    setClauses.push('updated_at = NOW()');
    setClauses.push(`updated_by = $${idx}`);
    params.push(userId);
    idx++;
    params.push(positionId);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".positions SET ${setClauses.join(', ')} WHERE position_id = $${idx} AND deleted_at IS NULL`, params);
    logger_port_1.logger.info(`[DOS Foundation] Position updated: ${positionId} in tenant ${tenantId}`);
    return getPosition(tenantId, positionId);
}
/**
 * Soft-delete a position.
 */
async function deletePosition(tenantId, userId, positionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const res = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".positions SET deleted_at = NOW(), updated_by = $1 WHERE position_id = $2 AND deleted_at IS NULL`, [userId, positionId]);
    const deleted = (res.rowCount || 0) > 0;
    if (deleted) {
        logger_port_1.logger.info(`[DOS Foundation] Position soft-deleted: ${positionId} in tenant ${tenantId}`);
    }
    return { deleted };
}
/**
 * Get the reporting chain (ancestors) for a position, walking up reports_to_position_id.
 * Returns an ordered array from the immediate supervisor to the top of the chain.
 * Stops at maxDepth (default 20) to prevent infinite loops from circular references.
 */
async function getPositionReportingChain(tenantId, positionId, maxDepth = 20) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const chain = [];
    const visited = new Set();
    let currentId = positionId;
    // First, get the starting position to find its reports_to
    const start = await getPosition(tenantId, positionId);
    if (!start)
        return chain;
    currentId = start.reports_to_position_id;
    while (currentId && chain.length < maxDepth) {
        if (visited.has(currentId)) {
            logger_port_1.logger.warn(`[DOS Foundation] Circular reporting chain detected at position ${currentId}`);
            break;
        }
        visited.add(currentId);
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`, [currentId]);
        if (rows.length === 0)
            break;
        chain.push(rows[0]);
        currentId = rows[0].reports_to_position_id;
    }
    return chain;
}
/**
 * Get direct reports for a position — all positions whose reports_to_position_id matches.
 */
async function getPositionDirectReports(tenantId, positionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions
     WHERE reports_to_position_id = $1 AND deleted_at IS NULL
     ORDER BY title_en`, [positionId]);
    return rows;
}
// ── Generic Node Facade ─────────────────────────────────────────────
// Thin CRUD wrappers that route to the appropriate org-hierarchy primitives
// based on entityType. Used by the generic foundation HTTP controller.
const org_hierarchy_service_2 = require("../org-hierarchy/org-hierarchy.service");
const org_hierarchy_ops_service_2 = require("../org-hierarchy/org-hierarchy-ops.service");
async function getNodes(tenantId, query = {}) {
    const tree = await (0, org_hierarchy_service_2.getOrgHierarchyTree)(tenantId);
    const flat = flattenTree(tree);
    if (query.entityType)
        return flat.filter((n) => n.type === query.entityType);
    if (query.parentId)
        return flat.filter((n) => n.parent_id === query.parentId);
    return flat;
}
async function getNodeById(tenantId, id) {
    const flat = flattenTree(await (0, org_hierarchy_service_2.getOrgHierarchyTree)(tenantId));
    return flat.find((n) => n.id === id) ?? null;
}
async function createNode(tenantId, input) {
    const userId = String(input?.createdBy ?? input?.userId ?? 'system');
    const nodeType = (input?.entityType ?? input?.type ?? 'department');
    return (0, org_hierarchy_service_2.upsertOrgHierarchyNode)(tenantId, userId, nodeType, input);
}
async function updateNode(tenantId, id, input) {
    const userId = String(input?.updatedBy ?? input?.userId ?? 'system');
    const nodeType = (input?.entityType ?? input?.type ?? 'department');
    return (0, org_hierarchy_service_2.upsertOrgHierarchyNode)(tenantId, userId, nodeType, { id, ...input });
}
async function deleteNode(tenantId, id, userId, nodeType = 'department') {
    const result = await (0, org_hierarchy_ops_service_2.bulkDeleteNodes)(tenantId, userId, [id], nodeType);
    return result?.deleted > 0;
}
async function transitionStatus(tenantId, id, toStatus, userId, nodeType = 'department') {
    await (0, org_hierarchy_ops_service_2.bulkUpdateStatus)(tenantId, userId, [id], nodeType, toStatus);
    return getNodeById(tenantId, id);
}
async function getHierarchyTree(tenantId) {
    return (0, org_hierarchy_service_2.getOrgHierarchyTree)(tenantId);
}
async function getChildren(tenantId, parentId) {
    const flat = flattenTree(await (0, org_hierarchy_service_2.getOrgHierarchyTree)(tenantId));
    return flat.filter((n) => n.parent_id === parentId);
}
function flattenTree(tree) {
    const out = [];
    const walk = (n) => {
        if (!n)
            return;
        if (Array.isArray(n)) {
            n.forEach(walk);
            return;
        }
        out.push(n);
        if (Array.isArray(n.children))
            n.children.forEach(walk);
    };
    walk(tree);
    return out;
}
//# sourceMappingURL=foundation.service.js.map