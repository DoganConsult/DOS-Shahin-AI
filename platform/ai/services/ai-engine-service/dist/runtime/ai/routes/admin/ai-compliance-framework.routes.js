import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import * as ComplianceFrameworkService from '../../services/governance/compliance/ai-compliance-framework.service.js';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { systemsSystemIdFrameworksPostBody, frameworksMappingIdStatusPatchBody, frameworksMappingIdRiskClassificationPostBody } from "../../schemas/ai.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('compliance'));
// Map system to compliance framework
router.post('/systems/:systemId/frameworks', authenticate, requirePermission('compliance.assessment.write'), validate({ body: systemsSystemIdFrameworksPostBody }), async (req, res) => {
    try {
        const { systemId } = req.params;
        const { frameworkCode, frameworkVersion, ...mappingData } = req.body;
        const result = await ComplianceFrameworkService.mapSystemToFramework(req.tenantId, {
            system_id: systemId,
            framework_code: frameworkCode,
            framework_version: frameworkVersion,
            ...mappingData
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get compliance mappings
router.get('/systems/:systemId/frameworks', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req, res) => {
    try {
        const { systemId } = req.params;
        const { frameworkCode } = req.query;
        const result = await ComplianceFrameworkService.getComplianceMappings(req.tenantId, { system_id: systemId, framework_code: frameworkCode });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Update compliance status
router.patch('/frameworks/:mappingId/status', authenticate, requirePermission('compliance.assessment.write'), validate({ body: frameworksMappingIdStatusPatchBody }), async (req, res) => {
    try {
        const { mappingId } = req.params;
        const { complianceStatus, assessmentDate: _assessmentDate, nextAssessmentDue: _nextAssessmentDue, complianceNotes } = req.body;
        const result = await ComplianceFrameworkService.updateComplianceStatus(req.tenantId, mappingId, complianceStatus, req.userId, complianceNotes);
        res.json({ updated: result });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Classify framework risk
router.post('/frameworks/:mappingId/risk-classification', authenticate, requirePermission('compliance.assessment.write'), validate({ body: frameworksMappingIdRiskClassificationPostBody }), async (req, res) => {
    try {
        const { mappingId } = req.params;
        const { riskLevel, riskFactors, classificationNotes, frameworkCode, riskCategory, classificationAnswers } = req.body;
        const result = await ComplianceFrameworkService.classifyFrameworkRisk(req.tenantId, {
            system_id: mappingId,
            risk_level: riskLevel,
            risk_factors: riskFactors,
            classification_notes: classificationNotes,
            framework_code: frameworkCode || 'default',
            risk_category: riskCategory || riskLevel || 'unclassified',
            classification_answers: classificationAnswers || {},
            classified_by: req.user.userId,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get compliance dashboard
router.get('/compliance/dashboard', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req, res) => {
    try {
        const { frameworkCode } = req.query;
        const result = await ComplianceFrameworkService.getComplianceDashboard(req.tenantId, '', frameworkCode || '');
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get systems requiring assessment
router.get('/systems/requiring-assessment', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req, res) => {
    try {
        const { frameworkCode } = req.query;
        const result = await ComplianceFrameworkService.getSystemsRequiringAssessment(req.tenantId, frameworkCode);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-compliance-framework.routes.js.map