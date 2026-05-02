"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapConnectorOutputToEvidence = mapConnectorOutputToEvidence;
exports.getConnectorEvidenceMappings = getConnectorEvidenceMappings;
exports.createConnectorEvidenceMapping = createConnectorEvidenceMapping;
const resilience_1 = require("@dos/platform-core/resilience");
const logger_port_1 = require("../ports/logger.port");
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const module_sdk_1 = require("@dos/module-sdk");
const db_1 = require("@dos/db");
async function mapConnectorOutputToEvidence(tenantId, syncPayload) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let matched = 0, submitted = 0, errors = 0;
    try {
        // Get enabled mappings for this connector type
        const mappings = await (0, database_port_1.safeQuery)(`SELECT mapping_id, connector_type, output_type, evidence_type, control_id_pattern, submit_status
       FROM "${schema}".connector_evidence_mappings
       WHERE connector_type = $1 AND enabled = TRUE AND auto_submit = TRUE`, [syncPayload.connectorType]);
        if (mappings.rows.length === 0)
            return { matched: 0, submitted: 0, errors: 0 };
        for (const mapping of mappings.rows) {
            // Find pending evidence tasks that match this evidence type
            const controlFilter = mapping.control_id_pattern
                ? ` AND et.control_id LIKE '${mapping.control_id_pattern.replace(/'/g, "''")}'`
                : '';
            const pendingTasks = await (0, database_port_1.safeQuery)(`SELECT et.task_id, et.control_id, et.evidence_requirement_id
         FROM "${schema}".evidence_tasks et
         WHERE et.status IN ('pending', 'Open', 'overdue')${controlFilter}
         LIMIT 50`, []);
            matched += pendingTasks.rows.length;
            for (const task of pendingTasks.rows) {
                try {
                    // Create evidence submission linked to the connector sync
                    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".evidence (
               title, description, status, evidence_type, source_type, source_id,
               linked_entity_type, linked_entity_id, created_by, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`, [
                        `[Auto] ${mapping.evidence_type} from ${syncPayload.connectorType}`,
                        `Automatically collected via ${syncPayload.connectorType} connector sync (connection: ${syncPayload.connectionId}). Records: ${syncPayload.recordsFetched} fetched, ${syncPayload.recordsNew} new.`,
                        mapping.submit_status || 'pending_review',
                        mapping.evidence_type,
                        `connector_${syncPayload.connectorType}`,
                        syncPayload.connectionId,
                        'control',
                        task.control_id,
                        'agrc-os-connector',
                    ]);
                    // Update evidence task status
                    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".evidence_tasks SET status = 'In Progress', updated_at = NOW()
             WHERE task_id = $1 AND status IN ('pending', 'Open', 'overdue')`, [task.task_id]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
                    submitted++;
                    // Publish evidence submitted and auto-collected events
                    await events_port_1.eventBus.publish({
                        eventType: 'evidence.submitted',
                        tenantId,
                        sourceService: 'connector-evidence-mapper',
                        severity: 'info',
                        entityType: 'evidence',
                        entityId: task.control_id,
                        payload: {
                            connectorType: syncPayload.connectorType,
                            connectionId: syncPayload.connectionId,
                            evidenceType: mapping.evidence_type,
                            controlId: task.control_id,
                            taskId: task.task_id,
                            autoCollected: true,
                        },
                    });
                    await events_port_1.eventBus.publish({
                        eventType: 'evidence.auto_collected',
                        tenantId,
                        sourceService: 'connector-evidence-mapper',
                        severity: 'info',
                        entityType: 'evidence',
                        entityId: task.control_id,
                        payload: {
                            connectorType: syncPayload.connectorType,
                            connectionId: syncPayload.connectionId,
                            evidenceType: mapping.evidence_type,
                            controlId: task.control_id,
                            taskId: task.task_id,
                        },
                    });
                }
                catch (err) {
                    errors++;
                    logger_port_1.logger.warn(`[ConnectorEvidence] Failed to submit evidence for task ${task.task_id}: ${(0, module_sdk_1.toErrorMessage)(err)}`);
                }
            }
        }
        if (submitted > 0) {
            logger_port_1.logger.info(`[ConnectorEvidence] Auto-collected ${submitted} evidence items from ${syncPayload.connectorType} sync`);
        }
    }
    catch (err) {
        logger_port_1.logger.warn(`[ConnectorEvidence] mapConnectorOutputToEvidence failed: ${(0, module_sdk_1.toErrorMessage)(err)}`);
    }
    return { matched, submitted, errors };
}
async function getConnectorEvidenceMappings(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT mapping_id, connector_type, output_type, evidence_type, control_id_pattern, auto_submit, enabled
     FROM "${schema}".connector_evidence_mappings ORDER BY connector_type, output_type`, []);
    return result.rows;
}
async function createConnectorEvidenceMapping(tenantId, input) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".connector_evidence_mappings
         (connector_type, output_type, evidence_type, control_id_pattern)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (connector_type, output_type, evidence_type) DO UPDATE
         SET control_id_pattern = COALESCE($4, connector_evidence_mappings.control_id_pattern),
             updated_at = NOW()
       RETURNING *`, [input.connectorType, input.outputType, input.evidenceType, input.controlIdPattern || null]);
        return (0, db_1.getFirstRow)(result) || null;
    }
    catch (err) {
        logger_port_1.logger.warn(`[ConnectorEvidence] createMapping failed: ${(0, module_sdk_1.toErrorMessage)(err)}`);
        return null;
    }
}
//# sourceMappingURL=connector-evidence-mapper.service.js.map