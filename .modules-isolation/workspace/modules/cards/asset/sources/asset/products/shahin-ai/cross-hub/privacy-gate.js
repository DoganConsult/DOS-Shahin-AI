"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePrivacyByDesign = enforcePrivacyByDesign;
exports.releaseFromQuarantine = releaseFromQuarantine;
exports.reQuarantine = reQuarantine;
exports.getQuarantineStatus = getQuarantineStatus;
exports.getQuarantineHistory = getQuarantineHistory;
exports.checkDataTransferCompliance = checkDataTransferCompliance;
exports.computePrivacyImpactScore = computePrivacyImpactScore;
exports.getPrivacyDashboardMetrics = getPrivacyDashboardMetrics;
exports.checkFgaClearance = checkFgaClearance;
// @ts-nocheck — module-layer imports not yet extracted
const observability_1 = require("@dos/platform-core/observability");
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
const db_3 = require("@dos/db");
const events_1 = require("@dos/platform-core/events");
const fga_client_1 = require("./fga-client");
const CLASSIFICATION_RISK_WEIGHTS = {
    public: 0,
    internal: 10,
    confidential: 30,
    restricted: 50,
    pii: 70,
    phi: 90,
    pci: 85,
};
async function enforcePrivacyByDesign(tenantId, entityType, entityId, containsPersonalData, dataClassification) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    if (!containsPersonalData && (!dataClassification || CLASSIFICATION_RISK_WEIGHTS[dataClassification] < 50)) {
        return { cleared: true, reason: 'Out of scope for DPIA.', quarantined: false, dataClassification };
    }
    const dpiaRes = await (0, db_1.safeQuery)(`SELECT dpia_id, status, risk_level, valid_until
     FROM "${schema}".dpias
     WHERE related_entity_id = $1
       AND status = 'approved'
       AND valid_until > NOW()
     ORDER BY valid_until DESC LIMIT 1`, [entityId]);
    if (dpiaRes.rows.length > 0) {
        const dpia = dpiaRes.rows[0];
        observability_1.logger.info(`[Privacy-Gate] Entity ${entityId} cleared via approved DPIA ${dpia.dpia_id}.`);
        const fgaOk = await syncFgaTuple(entityType, entityId, true);
        await recordQuarantineAction(tenantId, entityType, entityId, 'released', 'Cleared via approved DPIA', dpia.dpia_id, 'dpia_approval', undefined, fgaOk);
        await emitPrivacyEvent(tenantId, 'privacy.clearance_granted', entityType, entityId, { dpiaId: dpia.dpia_id });
        return {
            cleared: true,
            reason: 'DPIA formally approved.',
            quarantined: false,
            dpiaId: dpia.dpia_id,
            dataClassification,
        };
    }
    observability_1.logger.warn(`[Privacy-Gate] Entity ${entityId} QUARANTINED. PII/PHI processing requires DPIA approval.`);
    const fgaOk = await syncFgaTuple(entityType, entityId, false);
    const ledger = await recordQuarantineAction(tenantId, entityType, entityId, 'quarantined', 'Privacy-by-Design Lock: Quarantined pending DPIA.', null, 'auto_quarantine', { dataClassification, containsPersonalData }, fgaOk);
    await emitPrivacyEvent(tenantId, 'privacy.entity_quarantined', entityType, entityId, { dataClassification });
    return {
        cleared: false,
        reason: 'Privacy-by-Design Lock: Quarantined pending Data Privacy Impact Assessment (DPIA).',
        quarantined: true,
        dataClassification,
        ledgerId: ledger?.ledger_id,
    };
}
async function releaseFromQuarantine(tenantId, entityType, entityId, releasedBy, releaseReason, dpiaId) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".privacy_quarantine_ledger
     SET quarantine_status = 'released', released_at = NOW(), released_by = $1, release_reason = $2,
       dpia_id = COALESCE($3, dpia_id), updated_at = NOW()
     WHERE entity_type = $4 AND entity_id = $5 AND quarantine_status = 'quarantined'
     RETURNING *`, [releasedBy, releaseReason, dpiaId || null, entityType, entityId]);
    const record = (0, db_3.getFirstRow)(result);
    if (record) {
        const fgaOk = await syncFgaTuple(entityType, entityId, true);
        await (0, db_1.safeQuery)(`UPDATE "${schema}".privacy_quarantine_ledger SET fga_synced = $1 WHERE ledger_id = $2`, [fgaOk, record.ledger_id]).catch(() => { });
        await emitPrivacyEvent(tenantId, 'privacy.quarantine_released', entityType, entityId, { releasedBy, releaseReason, dpiaId });
        observability_1.logger.info(`[Privacy-Gate] Entity ${entityId} released from quarantine by ${releasedBy}.`, { tenantId });
    }
    return record;
}
async function reQuarantine(tenantId, entityType, entityId, reason) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".privacy_quarantine_ledger
     SET quarantine_status = 'superseded', updated_at = NOW()
     WHERE entity_type = $1 AND entity_id = $2 AND quarantine_status IN ('released', 'quarantined')`, [entityType, entityId]);
    const fgaOk = await syncFgaTuple(entityType, entityId, false);
    const ledger = await recordQuarantineAction(tenantId, entityType, entityId, 'quarantined', reason, null, 're_quarantine', undefined, fgaOk);
    await emitPrivacyEvent(tenantId, 'privacy.entity_re_quarantined', entityType, entityId, { reason });
    return ledger;
}
async function getQuarantineStatus(tenantId, entityType, entityId) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".privacy_quarantine_ledger
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 1`, [entityType, entityId]);
    return (0, db_3.getFirstRow)(result);
}
async function getQuarantineHistory(tenantId, entityType, entityId, limit = 50) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (entityType) {
        conditions.push(`entity_type = $${idx++}`);
        params.push(entityType);
    }
    if (entityId) {
        conditions.push(`entity_id = $${idx++}`);
        params.push(entityId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".privacy_quarantine_ledger ${where} ORDER BY created_at DESC LIMIT $${idx}`, params);
    return result.rows;
}
async function checkDataTransferCompliance(tenantId, sourceCountry, destinationCountry, dataClassification) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    const restrictionResult = await (0, db_1.safeQuery)(`SELECT restriction_type, requires_scc, requires_dpia, notes
     FROM "${schema}".cross_border_transfer_rules
     WHERE (source_country = $1 OR source_country = '*')
       AND (destination_country = $2 OR destination_country = '*')
       AND min_classification_level <= $3
       AND enabled = true
     ORDER BY priority DESC LIMIT 1`, [sourceCountry, destinationCountry, CLASSIFICATION_RISK_WEIGHTS[dataClassification]]);
    const restriction = (0, db_3.getFirstRow)(restrictionResult);
    if (!restriction) {
        const isHighRisk = CLASSIFICATION_RISK_WEIGHTS[dataClassification] >= 70;
        return {
            allowed: !isHighRisk,
            reason: isHighRisk
                ? `High-risk data (${dataClassification}) requires explicit cross-border transfer approval.`
                : 'No specific cross-border restriction found.',
            requiresSCC: isHighRisk,
            requiresDPIA: isHighRisk,
        };
    }
    return {
        allowed: restriction.restriction_type !== 'blocked',
        reason: restriction.notes || `Transfer rule: ${restriction.restriction_type}`,
        requiresSCC: restriction.requires_scc ?? false,
        requiresDPIA: restriction.requires_dpia ?? false,
    };
}
function computePrivacyImpactScore(params) {
    const classWeight = CLASSIFICATION_RISK_WEIGHTS[params.dataClassification] || 30;
    const dataVolume = Math.min(Math.log10(Math.max(params.recordCount, 1)) * 15, 100);
    const sensitivityLevel = classWeight;
    const crossBorderRisk = params.crossBorderTransfer ? 80 : 10;
    const retentionRisk = Math.min(params.retentionDays / 365 * 50, 100);
    const thirdPartyRisk = params.thirdPartySharing ? 70 : 5;
    const automationBoost = params.automatedDecisionMaking ? 15 : 0;
    const overall = Math.min(Math.round((dataVolume * 0.15) +
        (sensitivityLevel * 0.30) +
        (crossBorderRisk * 0.20) +
        (retentionRisk * 0.15) +
        (thirdPartyRisk * 0.15) +
        automationBoost), 100);
    let recommendation = 'low';
    if (overall >= 75)
        recommendation = 'critical';
    else if (overall >= 50)
        recommendation = 'high';
    else if (overall >= 25)
        recommendation = 'medium';
    return {
        overall,
        dataVolume: Math.round(dataVolume),
        sensitivityLevel,
        crossBorderRisk,
        retentionRisk: Math.round(retentionRisk),
        thirdPartyRisk,
        recommendation,
    };
}
async function getPrivacyDashboardMetrics(tenantId) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    const [quarantinedResult, releasedResult, dpiaResult, byTypeResult, recentResult] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".privacy_quarantine_ledger WHERE quarantine_status = 'quarantined'`),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".privacy_quarantine_ledger WHERE quarantine_status = 'released'`),
        (0, db_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE status = 'approved' AND valid_until > NOW())::int AS active,
         COUNT(*) FILTER (WHERE status = 'approved' AND valid_until <= NOW())::int AS expired,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
       FROM "${schema}".dpias`),
        (0, db_1.safeQuery)(`SELECT entity_type, COUNT(*)::int AS count
       FROM "${schema}".privacy_quarantine_ledger
       WHERE quarantine_status = 'quarantined'
       GROUP BY entity_type ORDER BY count DESC`),
        (0, db_1.safeQuery)(`SELECT * FROM "${schema}".privacy_quarantine_ledger ORDER BY created_at DESC LIMIT 10`),
    ]);
    const dpiaStats = (0, db_3.getFirstRow)(dpiaResult);
    return {
        totalQuarantined: (0, db_3.getFirstRow)(quarantinedResult)?.cnt ?? 0,
        totalReleased: (0, db_3.getFirstRow)(releasedResult)?.cnt ?? 0,
        activeDPIAs: dpiaStats?.active ?? 0,
        expiredDPIAs: dpiaStats?.expired ?? 0,
        pendingDPIAs: dpiaStats?.pending ?? 0,
        quarantinesByType: byTypeResult.rows,
        recentActions: recentResult.rows,
    };
}
async function checkFgaClearance(entityType, entityId) {
    try {
        const response = await fga_client_1.fgaClient.check({
            user: 'service:all',
            relation: 'can_process_data',
            object: `${entityType}:${entityId}`,
        });
        return response.allowed ?? false;
    }
    catch (err) {
        observability_1.logger.warn(`[Privacy-Gate] FGA check failed for ${entityType}:${entityId}`, err);
        return false;
    }
}
async function syncFgaTuple(entityType, entityId, grant) {
    try {
        if (grant) {
            await fga_client_1.fgaClient.write({
                writes: [{ user: 'service:all', relation: 'can_process_data', object: `${entityType}:${entityId}` }],
            });
        }
        else {
            await fga_client_1.fgaClient.write({
                deletes: [{ user: 'service:all', relation: 'can_process_data', object: `${entityType}:${entityId}` }],
            });
        }
        return true;
    }
    catch (err) {
        observability_1.logger.error(`[Privacy-Gate] FGA sync failed for ${entityType}:${entityId}`, err);
        return false;
    }
}
async function recordQuarantineAction(tenantId, entityType, entityId, status, reason, dpiaId, actionType, metadata, fgaSynced = false) {
    const schema = (0, db_2.tenantSchema)(tenantId);
    try {
        if (status === 'quarantined') {
            const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".privacy_quarantine_ledger
           (entity_type, entity_id, quarantine_status, reason, dpia_id, fga_synced, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (entity_type, entity_id) WHERE quarantine_status = 'quarantined'
         DO UPDATE SET reason = $4, fga_synced = $6, updated_at = NOW(), metadata = $7::jsonb
         RETURNING *`, [entityType, entityId, status, reason, dpiaId, fgaSynced, JSON.stringify({ actionType, ...metadata })]);
            return (0, db_3.getFirstRow)(result);
        }
        const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".privacy_quarantine_ledger
       SET quarantine_status = $1, release_reason = $2, released_at = NOW(), fga_synced = $6,
         dpia_id = COALESCE($3, dpia_id), updated_at = NOW()
       WHERE entity_type = $4 AND entity_id = $5 AND quarantine_status = 'quarantined'
       RETURNING *`, [status, reason, dpiaId, entityType, entityId, fgaSynced]);
        return (0, db_3.getFirstRow)(result);
    }
    catch (err) {
        observability_1.logger.error(`[Privacy-Gate] Failed to record quarantine action`, err);
        return null;
    }
}
async function emitPrivacyEvent(tenantId, eventType, entityType, entityId, payload) {
    await events_1.eventBus.publish({
        eventType,
        tenantId,
        severity: eventType.includes('quarantine') ? 'warning' : 'info',
        entityType,
        entityId,
        payload,
    }).catch(() => { });
}
