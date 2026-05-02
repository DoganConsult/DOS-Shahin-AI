"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObligation = createObligation;
exports.getObligationById = getObligationById;
exports.listObligations = listObligations;
exports.updateObligation = updateObligation;
exports.deleteObligation = deleteObligation;
exports.seedObligationsFromFramework = seedObligationsFromFramework;
exports.autoMapObligationToControls = autoMapObligationToControls;
exports.autoMapAllObligationsForFramework = autoMapAllObligationsForFramework;
exports.getObligationControls = getObligationControls;
exports.mapControlToObligation = mapControlToObligation;
exports.unmapControlFromObligation = unmapControlFromObligation;
exports.getObligationPolicies = getObligationPolicies;
exports.linkPolicyToObligation = linkPolicyToObligation;
exports.unlinkPolicyFromObligation = unlinkPolicyFromObligation;
const logger_port_1 = require("../../ports/logger.port");
// ============================================
// Shahin — Obligation Register Service
// Priority 12: Explicit L4 layer (regulation → obligation → control → evidence)
// ============================================
const uuid_1 = require("uuid");
const database_port_1 = require("../../ports/database.port");
const platform_port_1 = require("../../ports/platform.port");
const db_1 = require("@dos/db");
// ============================================================================
// CRUD Operations
// ============================================================================
/**
 * Create a new obligation
 */
async function createObligation(tenantId, input, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const obligationId = (0, uuid_1.v4)();
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".compliance_obligations
     (obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
      applicability, owner_id, status, priority, evidence_types, review_frequency, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
        obligationId,
        input.frameworkId,
        input.requirementRef,
        input.titleEn,
        input.titleAr || null,
        input.descriptionEn || null,
        input.descriptionAr || null,
        input.applicability || null,
        input.ownerId || null,
        input.status || 'active',
        input.priority || 'medium',
        input.evidenceTypes || [],
        input.reviewFrequency || null,
        userId,
        userId
    ]);
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'create',
        entityType: 'obligation',
        entityId: obligationId,
        userId,
        metadata: { frameworkId: input.frameworkId, requirementRef: input.requirementRef }
    });
    return getObligationById(tenantId, obligationId);
}
/**
 * Get obligation by ID
 */
async function getObligationById(tenantId, obligationId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
            applicability, owner_id, status, mapped_controls, priority, evidence_types, review_frequency,
            created_at, updated_at, created_by, updated_by
     FROM "${schema}".compliance_obligations
     WHERE obligation_id = $1 AND deleted_at IS NULL`, [obligationId]);
    if (result.rows.length === 0) {
        const err = Object.assign(new Error(`Obligation ${obligationId} not found`), { status: 404 });
        throw err;
    }
    const row = (0, db_1.getFirstRow)(result);
    return {
        obligationId: row.obligation_id,
        frameworkId: row.framework_id,
        requirementRef: row.requirement_ref,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        descriptionEn: row.description_en,
        descriptionAr: row.description_ar,
        applicability: row.applicability,
        ownerId: row.owner_id,
        status: row.status,
        mappedControls: row.mapped_controls || [],
        priority: row.priority,
        evidenceTypes: row.evidence_types || [],
        reviewFrequency: row.review_frequency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by
    };
}
/**
 * List obligations with optional filters
 */
async function listObligations(tenantId, filters = {}) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;
    let sql = `
    SELECT obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
           applicability, owner_id, status, mapped_controls, priority, evidence_types, review_frequency,
           created_at, updated_at, created_by, updated_by
    FROM "${schema}".compliance_obligations
    WHERE deleted_at IS NULL
  `;
    const params = [];
    let paramIdx = 1;
    if (filters.frameworkId) {
        sql += ` AND framework_id = $${paramIdx++}`;
        params.push(filters.frameworkId);
    }
    if (filters.status) {
        sql += ` AND status = $${paramIdx++}`;
        params.push(filters.status);
    }
    if (filters.ownerId) {
        sql += ` AND owner_id = $${paramIdx++}`;
        params.push(filters.ownerId);
    }
    if (filters.search) {
        sql += ` AND (title_en ILIKE $${paramIdx} OR title_ar ILIKE $${paramIdx} OR requirement_ref ILIKE $${paramIdx} OR description_en ILIKE $${paramIdx})`;
        params.push(`%${filters.search}%`);
        paramIdx++;
    }
    // Count total
    const countSql = sql.replace(/SELECT[\s\S]+?FROM/, "SELECT COUNT(*) FROM");
    const countResult = await (0, database_port_1.safeQuery)(countSql, params);
    const total = parseInt((0, db_1.getFirstRow)(countResult)?.count, 10);
    sql += ` ORDER BY framework_id, requirement_ref LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);
    const result = await (0, database_port_1.safeQuery)(sql, params);
    const obligations = result.rows.map((row) => ({
        obligationId: row.obligation_id,
        frameworkId: row.framework_id,
        requirementRef: row.requirement_ref,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        descriptionEn: row.description_en,
        descriptionAr: row.description_ar,
        applicability: row.applicability,
        ownerId: row.owner_id,
        status: row.status,
        mappedControls: row.mapped_controls || [],
        priority: row.priority,
        evidenceTypes: row.evidence_types || [],
        reviewFrequency: row.review_frequency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by
    }));
    return { obligations, total };
}
/**
 * Update obligation
 */
async function updateObligation(tenantId, obligationId, updates, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const updateFields = [];
    const params = [];
    let paramIdx = 1;
    if (updates.titleEn !== undefined) {
        updateFields.push(`title_en = $${paramIdx++}`);
        params.push(updates.titleEn);
    }
    if (updates.titleAr !== undefined) {
        updateFields.push(`title_ar = $${paramIdx++}`);
        params.push(updates.titleAr);
    }
    if (updates.descriptionEn !== undefined) {
        updateFields.push(`description_en = $${paramIdx++}`);
        params.push(updates.descriptionEn);
    }
    if (updates.descriptionAr !== undefined) {
        updateFields.push(`description_ar = $${paramIdx++}`);
        params.push(updates.descriptionAr);
    }
    if (updates.applicability !== undefined) {
        updateFields.push(`applicability = $${paramIdx++}`);
        params.push(updates.applicability);
    }
    if (updates.ownerId !== undefined) {
        updateFields.push(`owner_id = $${paramIdx++}`);
        params.push(updates.ownerId);
    }
    if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIdx++}`);
        params.push(updates.status);
    }
    if (updates.priority !== undefined) {
        updateFields.push(`priority = $${paramIdx++}`);
        params.push(updates.priority);
    }
    if (updates.evidenceTypes !== undefined) {
        updateFields.push(`evidence_types = $${paramIdx++}`);
        params.push(updates.evidenceTypes);
    }
    if (updates.reviewFrequency !== undefined) {
        updateFields.push(`review_frequency = $${paramIdx++}`);
        params.push(updates.reviewFrequency);
    }
    if (updateFields.length === 0) {
        return getObligationById(tenantId, obligationId);
    }
    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramIdx++}`);
    params.push(userId);
    params.push(obligationId);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".compliance_obligations
     SET ${updateFields.join(', ')}
     WHERE obligation_id = $${paramIdx} AND deleted_at IS NULL`, params);
    await (0, platform_port_1.recordActivity)(tenantId, {
        action: 'update',
        entityType: 'obligation',
        entityId: obligationId,
        userId,
        metadata: { updates: Object.keys(updates) }
    });
    return getObligationById(tenantId, obligationId);
}
/**
 * Delete obligation (soft delete)
 */
async function deleteObligation(tenantId, obligationId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".compliance_obligations
     SET deleted_at = NOW(), updated_by = $1
     WHERE obligation_id = $2 AND deleted_at IS NULL`, [userId, obligationId]);
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'delete',
        entityType: 'obligation',
        entityId: obligationId,
        userId
    });
}
// ============================================================================
// Seeding from Regulatory Controls (instrument_structure)
// ============================================================================
/**
 * Seed obligations from instrument_structure (regulatory controls) for a framework
 * This is called during workspace provisioning
 */
async function seedObligationsFromFramework(tenantId, frameworkId, userId = 'system') {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let created = 0;
    const errors = [];
    // Get all regulatory controls (level 4) for this framework from master schema
    const registryControls = await (0, database_port_1.safeQuery)(`SELECT node_id, code, title_en, title_ar, description_en, description_ar, priority, evidence_types
     FROM instrument_structure
     WHERE instrument_id = $1 AND level = 4
     ORDER BY sort_order, code`, [frameworkId]);
    // Get framework name for context
    const frameworkResult = await (0, database_port_1.safeQuery)(`SELECT name_en, name_ar FROM instruments WHERE instrument_id = $1`, [frameworkId]);
    const frameworkName = (0, db_1.getFirstRow)(frameworkResult)?.name_en || frameworkId;
    for (const control of registryControls.rows) {
        try {
            const obligationId = (0, uuid_1.v4)();
            const requirementRef = control.code || `OBL-${control.node_id.substring(0, 8)}`;
            // Check if obligation already exists for this requirement_ref
            const existing = await (0, database_port_1.safeQuery)(`SELECT obligation_id FROM "${schema}".compliance_obligations
         WHERE framework_id = $1 AND requirement_ref = $2 AND deleted_at IS NULL`, [frameworkId, requirementRef]);
            if (existing.rows.length > 0) {
                continue; // Skip if already exists
            }
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".compliance_obligations
         (obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
          priority, evidence_types, status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                obligationId,
                frameworkId,
                requirementRef,
                control.title_en || `Obligation ${requirementRef}`,
                control.title_ar || null,
                control.description_en || null,
                control.description_ar || null,
                control.priority || 'medium',
                control.evidence_types || [],
                'active',
                userId,
                userId
            ]);
            created++;
        }
        catch (err) {
            errors.push(`Failed to seed obligation for ${control.code || control.node_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    logger_port_1.logger.info(`[ObligationService] Seeded ${created} obligations from framework ${frameworkId} (${frameworkName})`);
    if (errors.length > 0) {
        logger_port_1.logger.warn(`[ObligationService] ${errors.length} errors during seeding:`, errors);
    }
    return { created, errors };
}
// ============================================================================
// Auto-Mapping: Obligations → Controls via Framework→Control entity_links
// ============================================================================
/**
 * Auto-map obligations to controls using framework→control entity_links
 * This discovers controls that are mapped to the same framework as the obligation
 */
async function autoMapObligationToControls(tenantId, obligationId, userId = 'system') {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let mapped = 0;
    const errors = [];
    // Get obligation details
    const obligation = await getObligationById(tenantId, obligationId);
    // Find controls mapped to this framework via entity_links
    // Note: entity_links uses UUID for source_id/target_id, but framework_id is VARCHAR(100)
    // We need to find links where source_type='framework' and source_id matches the framework_id
    // However, entity_links.source_id is UUID, so we need a different approach
    // Alternative: Find controls that have this framework in their frameworks array
    const controlsResult = await (0, database_port_1.safeQuery)(`SELECT control_id, title
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`, [obligation.frameworkId]);
    // Also check entity_links for framework→control mappings
    // Since entity_links uses UUID and framework_id is VARCHAR, we need to check if there's a mapping
    // For now, we'll use the frameworks array approach, but could enhance to use entity_links if needed
    for (const control of controlsResult.rows) {
        try {
            // Check if mapping already exists
            const existing = await (0, database_port_1.safeQuery)(`SELECT mapping_id FROM "${schema}".obligation_control_mappings
         WHERE obligation_id = $1 AND control_id = $2`, [obligationId, control.control_id]);
            if (existing.rows.length > 0) {
                continue; // Skip if already mapped
            }
            // Create mapping
            const mappingId = (0, uuid_1.v4)();
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".obligation_control_mappings
         (mapping_id, obligation_id, control_id, mapping_type, coverage_percent, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`, [mappingId, obligationId, control.control_id, 'direct', 100.00, userId]);
            mapped++;
        }
        catch (err) {
            errors.push(`Failed to map control ${control.control_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    // Update obligation's mapped_controls array
    if (mapped > 0) {
        const controlIds = controlsResult.rows.map((r) => r.control_id);
        await (0, database_port_1.safeQuery)(`UPDATE "${schema}".compliance_obligations
       SET mapped_controls = $1, updated_at = NOW(), updated_by = $2
       WHERE obligation_id = $3`, [controlIds, userId, obligationId]);
    }
    logger_port_1.logger.info(`[ObligationService] Auto-mapped ${mapped} controls to obligation ${obligationId}`);
    if (errors.length > 0) {
        logger_port_1.logger.warn(`[ObligationService] ${errors.length} errors during auto-mapping:`, errors);
    }
    return { mapped, errors };
}
/**
 * Auto-map all obligations for a framework to their controls
 */
async function autoMapAllObligationsForFramework(tenantId, frameworkId, userId = 'system') {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let totalMapped = 0;
    const errors = [];
    // Get all active obligations for this framework
    const obligationsResult = await (0, database_port_1.safeQuery)(`SELECT obligation_id FROM "${schema}".compliance_obligations
     WHERE framework_id = $1 AND status = 'active' AND deleted_at IS NULL`, [frameworkId]);
    const totalObligations = obligationsResult.rows.length;
    for (const row of obligationsResult.rows) {
        try {
            const result = await autoMapObligationToControls(tenantId, row.obligation_id, userId);
            totalMapped += result.mapped;
            errors.push(...result.errors);
        }
        catch (err) {
            errors.push(`Failed to auto-map obligation ${row.obligation_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return { totalObligations, totalMapped, errors };
}
/**
 * Get controls mapped to an obligation
 */
async function getObligationControls(tenantId, obligationId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT m.control_id, m.mapping_type, m.coverage_percent, c.title
     FROM "${schema}".obligation_control_mappings m
     JOIN "${schema}".controls c ON c.control_id = m.control_id
     WHERE m.obligation_id = $1 AND c.deleted_at IS NULL
     ORDER BY m.coverage_percent DESC, c.title`, [obligationId]);
    return result.rows.map((row) => ({
        controlId: row.control_id,
        title: row.title,
        mappingType: row.mapping_type,
        coveragePercent: parseFloat(row.coverage_percent)
    }));
}
/**
 * Manually map a control to an obligation
 */
async function mapControlToObligation(tenantId, obligationId, controlId, mappingType = 'direct', coveragePercent = 100.00, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const mappingId = (0, uuid_1.v4)();
    const result = await (0, database_port_1.withTransaction)(tenantId, async (client) => {
        const existing = await (0, database_port_1.safeQueryWithClient)(`SELECT mapping_id FROM "${schema}".obligation_control_mappings
       WHERE obligation_id = $1 AND control_id = $2`, [obligationId, controlId], client);
        if (existing.rows.length > 0) {
            await (0, database_port_1.safeQueryWithClient)(`UPDATE "${schema}".obligation_control_mappings
         SET mapping_type = $1, coverage_percent = $2, updated_at = NOW()
         WHERE obligation_id = $3 AND control_id = $4`, [mappingType, coveragePercent, obligationId, controlId], client);
            return {
                mappingId: (0, db_1.getFirstRow)(existing)?.mapping_id,
                obligationId,
                controlId,
                mappingType,
                coveragePercent
            };
        }
        await (0, database_port_1.safeQueryWithClient)(`INSERT INTO "${schema}".obligation_control_mappings
       (mapping_id, obligation_id, control_id, mapping_type, coverage_percent, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [mappingId, obligationId, controlId, mappingType, coveragePercent, userId], client);
        const oblRes = await (0, database_port_1.safeQueryWithClient)(`SELECT mapped_controls FROM "${schema}".compliance_obligations
       WHERE obligation_id = $1 AND deleted_at IS NULL`, [obligationId], client);
        const currentControls = (0, db_1.getFirstRow)(oblRes)?.mapped_controls || [];
        if (!currentControls.includes(controlId)) {
            const updatedControls = [...currentControls, controlId];
            await (0, database_port_1.safeQueryWithClient)(`UPDATE "${schema}".compliance_obligations
         SET mapped_controls = $1, updated_at = NOW(), updated_by = $2
         WHERE obligation_id = $3`, [updatedControls, userId, obligationId], client);
        }
        return { mappingId, obligationId, controlId, mappingType, coveragePercent };
    });
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'create',
        entityType: 'obligation',
        entityId: obligationId,
        userId,
        metadata: { controlId, mappingType, coveragePercent }
    });
    return result;
}
/**
 * Remove a control mapping from an obligation
 */
async function unmapControlFromObligation(tenantId, obligationId, controlId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.withTransaction)(tenantId, async (client) => {
        await (0, database_port_1.safeQueryWithClient)(`DELETE FROM "${schema}".obligation_control_mappings
       WHERE obligation_id = $1 AND control_id = $2`, [obligationId, controlId], client);
        const oblRes = await (0, database_port_1.safeQueryWithClient)(`SELECT mapped_controls FROM "${schema}".compliance_obligations
       WHERE obligation_id = $1 AND deleted_at IS NULL`, [obligationId], client);
        const currentControls = (0, db_1.getFirstRow)(oblRes)?.mapped_controls || [];
        const updatedControls = currentControls.filter(id => id !== controlId);
        await (0, database_port_1.safeQueryWithClient)(`UPDATE "${schema}".compliance_obligations
       SET mapped_controls = $1, updated_at = NOW(), updated_by = $2
       WHERE obligation_id = $3`, [updatedControls, userId, obligationId], client);
    });
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'delete',
        entityType: 'obligation',
        entityId: obligationId,
        userId,
        metadata: { controlId }
    });
}
/**
 * Get policies linked to an obligation
 */
async function getObligationPolicies(tenantId, obligationId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT l.link_id, l.obligation_id, l.policy_id, l.link_type,
            l.relevance_score, l.notes, p.title AS policy_title, p.status AS policy_status
     FROM "${schema}".obligation_policy_links l
     LEFT JOIN "${schema}".policies p ON p.policy_id::text = l.policy_id::text
     WHERE l.obligation_id = $1
     ORDER BY l.relevance_score DESC`, [obligationId]);
    return result.rows.map((row) => ({
        linkId: row.link_id,
        obligationId: row.obligation_id,
        policyId: row.policy_id,
        linkType: row.link_type,
        relevanceScore: parseFloat(row.relevance_score),
        notes: row.notes,
        policyTitle: row.policy_title,
        policyStatus: row.policy_status,
    }));
}
/**
 * Link a policy to an obligation (upsert)
 */
async function linkPolicyToObligation(tenantId, obligationId, policyId, linkType = 'implements', relevanceScore = 100.00, notes, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const existing = await (0, database_port_1.safeQuery)(`SELECT link_id FROM "${schema}".obligation_policy_links
     WHERE obligation_id = $1 AND policy_id = $2`, [obligationId, policyId]);
    if (existing.rows.length > 0) {
        await (0, database_port_1.safeQuery)(`UPDATE "${schema}".obligation_policy_links
       SET link_type = $1, relevance_score = $2, notes = $3, updated_at = NOW()
       WHERE obligation_id = $4 AND policy_id = $5`, [linkType, relevanceScore, notes, obligationId, policyId]);
        return {
            linkId: (0, db_1.getFirstRow)(existing)?.link_id,
            obligationId, policyId, linkType, relevanceScore, notes: notes || undefined
        };
    }
    const linkId = (0, uuid_1.v4)();
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".obligation_policy_links
     (link_id, obligation_id, policy_id, link_type, relevance_score, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [linkId, obligationId, policyId, linkType, relevanceScore, notes, userId]);
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'create',
        entityType: 'obligation_policy_link',
        entityId: obligationId,
        userId,
        metadata: { policyId, linkType, relevanceScore }
    });
    return { linkId, obligationId, policyId, linkType, relevanceScore, notes: notes || undefined };
}
/**
 * Remove a policy link from an obligation
 */
async function unlinkPolicyFromObligation(tenantId, obligationId, policyId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".obligation_policy_links
     WHERE obligation_id = $1 AND policy_id = $2`, [obligationId, policyId]);
    await (0, platform_port_1.recordActivity)(tenantId, {
        module: 'governance',
        action: 'delete',
        entityType: 'obligation_policy_link',
        entityId: obligationId,
        userId,
        metadata: { policyId }
    });
}
//# sourceMappingURL=obligation.service.js.map