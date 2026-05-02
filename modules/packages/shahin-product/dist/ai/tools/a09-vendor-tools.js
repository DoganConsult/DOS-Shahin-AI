"use strict";
// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A09 — Third-Party / Vendor Risk
// Tools: list vendors, assess vendor risk, check SLA compliance
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildA09Tools = buildA09Tools;
const db_1 = require("@dos/db");
const events_1 = require("@dos/platform-core/events");
const observability_1 = require("@dos/platform-core/observability");
const module_sdk_1 = require("@dos/module-sdk");
function buildA09Tools() {
    return [
        {
            name: 'list_vendors_with_risk',
            description: 'List all active vendors with risk ratings, assessment dates, and SLA status.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const vendors = await (0, module_sdk_1.safeRows)(`SELECT vendor_id, name, status, risk_rating, category, contract_end_date,
                  next_assessment_date, sla_compliance_pct, criticality, created_at
           FROM "${schema}".vendors WHERE status = 'active'
           ORDER BY CASE risk_rating WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`);
                const highRisk = vendors.filter((v) => v.risk_rating === 'high' || v.risk_rating === 'critical');
                const dueForAssessment = vendors.filter((v) => v.next_assessment_date && new Date(v.next_assessment_date) < new Date(Date.now() + 14 * 86400000));
                return { vendors, highRiskCount: highRisk.length, dueForAssessmentCount: dueForAssessment.length };
            },
        },
        {
            name: 'assess_vendor',
            description: 'Get detailed vendor assessment data including linked controls, SLA metrics, and risk history.',
            input_schema: {
                type: 'object',
                properties: { vendorId: { type: 'string' } },
                required: ['vendorId'],
            },
            handler: async (tenantId, input) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const vendor = await (0, module_sdk_1.safeRows)(`SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`, [input.vendorId]);
                const assessments = await (0, module_sdk_1.safeRows)(`SELECT * FROM "${schema}".vendor_assessments WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 5`, [input.vendorId]);
                return { vendor: vendor[0] || null, recentAssessments: assessments };
            },
        },
        {
            name: 'score_vendor',
            description: 'Update vendor risk rating based on assessment results.',
            input_schema: {
                type: 'object',
                properties: {
                    vendorId: { type: 'string' },
                    riskRating: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    rationale: { type: 'string' },
                },
                required: ['vendorId', 'riskRating', 'rationale'],
            },
            handler: async (tenantId, input) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const rows = await (0, module_sdk_1.safeRows)(`UPDATE "${schema}".vendors SET risk_rating = $1, updated_at = NOW() WHERE vendor_id = $2 RETURNING vendor_id`, [input.riskRating, input.vendorId]);
                if (rows.length === 0)
                    return { updated: false, reason: 'Vendor not found' };
                await (0, observability_1.recordAudit)({ tenantId, userId: 'agent-A09', module: 'vendors', action: 'update', entityType: 'vendor', entityId: input.vendorId, afterState: { riskRating: input.riskRating, rationale: input.rationale } });
                if (input.riskRating === 'critical' || input.riskRating === 'high') {
                    await events_1.eventBus.publish({ eventType: 'vendor.risk_changed', tenantId, sourceService: 'agent-A09', severity: 'warning', entityType: 'vendor', entityId: input.vendorId, payload: { riskRating: input.riskRating } });
                }
                return { updated: true };
            },
        },
    ];
}
//# sourceMappingURL=a09-vendor-tools.js.map