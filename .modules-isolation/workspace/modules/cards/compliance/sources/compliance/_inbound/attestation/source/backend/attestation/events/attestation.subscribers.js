"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAttestationEventSubscribers = registerAttestationEventSubscribers;
exports.handleControlUpdated = handleControlUpdated;
exports.handleEvidenceCollected = handleEvidenceCollected;
const module_sdk_1 = require("@dos/module-sdk");
/**
 * Attestation event subscribers — handle cross-module events.
 */
function registerAttestationEventSubscribers() {
    module_sdk_1.logger.info('[Attestation] Event subscribers registered');
}
async function handleControlUpdated(payload) {
    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
    try {
        const schema = tenantSchema(payload.tenantId);
        // Find active campaigns linked to updated control and flag for re-attestation
        await safeQuery(`UPDATE "${schema}".attestation_records
       SET needs_reattestation = TRUE, updated_at = NOW()
       WHERE campaign_id IN (
         SELECT id FROM "${schema}".attestation_campaigns WHERE status = 'active' AND deleted_at IS NULL
       )
       AND control_id = $1 AND status = 'approved' AND deleted_at IS NULL`, [payload.controlId]);
        module_sdk_1.logger.info(`[Attestation] Control ${payload.controlId} updated — flagged linked records for re-attestation`);
    }
    catch (err) {
        module_sdk_1.logger.error(`[Attestation] handleControlUpdated failed: ${(0, module_sdk_1.toErrorMessage)(err)}`);
    }
}
async function handleEvidenceCollected(payload) {
    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
    try {
        if (payload.entityType !== 'attestation_record')
            return;
        const schema = tenantSchema(payload.tenantId);
        // Link evidence to attestation record
        await safeQuery(`INSERT INTO "${schema}".attestation_evidence_links (record_id, evidence_id, linked_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (record_id, evidence_id) DO NOTHING`, [payload.entityId, payload.evidenceId]);
        module_sdk_1.logger.info(`[Attestation] Evidence ${payload.evidenceId} linked to record ${payload.entityId}`);
    }
    catch (err) {
        module_sdk_1.logger.error(`[Attestation] handleEvidenceCollected failed: ${(0, module_sdk_1.toErrorMessage)(err)}`);
    }
}
//# sourceMappingURL=attestation.subscribers.js.map