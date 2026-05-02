"use strict";
// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A04 — Control Authoring & Lifecycle
// Tools: list controls needing docs, check control health, draft implementation notes
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildA04Tools = buildA04Tools;
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const module_sdk_1 = require("@dos/module-sdk");
function buildA04Tools() {
    return [
        {
            name: 'list_controls_needing_attention',
            description: 'List controls missing documentation, implementation notes, or with stale evidence.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const noDocs = await (0, module_sdk_1.safeRows)(`SELECT control_id, code, title FROM "${schema}".ucf_controls WHERE (implementation_notes IS NULL OR implementation_notes = '') LIMIT 30`);
                const noOwner = await (0, module_sdk_1.safeRows)(`SELECT control_id, code, title FROM "${schema}".ucf_controls WHERE owner IS NULL LIMIT 30`);
                const failed = await (0, module_sdk_1.safeRows)(`SELECT control_id, code, title, test_status FROM "${schema}".ucf_controls WHERE test_status = 'failed' LIMIT 30`);
                return { controlsWithoutDocs: noDocs, controlsWithoutOwner: noOwner, failedControls: failed };
            },
        },
        {
            name: 'get_control_details',
            description: 'Get full details of a specific control including evidence links and test results.',
            input_schema: {
                type: 'object',
                properties: { controlId: { type: 'string', description: 'Control ID to inspect' } },
                required: ['controlId'],
            },
            handler: async (tenantId, input) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const ctrl = await (0, module_sdk_1.safeRows)(`SELECT * FROM "${schema}".ucf_controls WHERE control_id = $1`, [input.controlId]);
                const evidence = await (0, module_sdk_1.safeRows)(`SELECT evidence_id, title, status, expires_at FROM "${schema}".evidence WHERE linked_entity_id = $1 LIMIT 20`, [input.controlId]);
                return { control: ctrl[0] || null, linkedEvidence: evidence };
            },
        },
        {
            name: 'update_control_notes',
            description: 'Update implementation notes or test steps for a control.',
            input_schema: {
                type: 'object',
                properties: {
                    controlId: { type: 'string' },
                    implementationNotes: { type: 'string', description: 'New implementation notes' },
                    testSteps: { type: 'string', description: 'New test steps as JSON array string' },
                },
                required: ['controlId'],
            },
            handler: async (tenantId, input) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const updates = [];
                const params = [];
                let i = 1;
                if (input.implementationNotes) {
                    updates.push(`implementation_notes = $${i++}`);
                    params.push(input.implementationNotes);
                }
                if (input.testSteps) {
                    updates.push(`test_steps = $${i++}::jsonb`);
                    params.push(input.testSteps);
                }
                if (updates.length === 0)
                    return { updated: false, reason: 'No fields to update' };
                updates.push(`updated_at = NOW()`);
                params.push(input.controlId);
                const rows = await (0, module_sdk_1.safeRows)(`UPDATE "${schema}".ucf_controls SET ${updates.join(', ')} WHERE control_id = $${i} RETURNING control_id`, params);
                if (rows.length === 0)
                    return { updated: false, reason: 'Control not found' };
                await (0, observability_1.recordAudit)({ tenantId, userId: 'agent-A04', module: 'controls', action: 'update', entityType: 'control', entityId: input.controlId, afterState: input });
                return { updated: true, controlId: input.controlId };
            },
        },
    ];
}
//# sourceMappingURL=a04-control-tools.js.map