// @ts-nocheck
import { Router } from 'express';
import { logger } from '../../ports/logger.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow, getFirstRowOrThrow } from '@dos/db';
import { toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../ports/platform.port';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { fairnessScanPostBody, euAiActClassifyPostBody, redTeamSchedulesPostBody, redTeamSchedulesIdPutBody, ethicsReviewsPostBody, ethicsReviewsIdVotePostBody, ethicsReviewsIdDecidePostBody, impactAssessmentsPostBody, impactAssessmentsIdPutBody, regulatoryChangesPostBody, regulatoryChangesIdReviewPutBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
function sq(tenantId, sql, params) {
    const s = tenantSchema(tenantId);
    return safeQuery(sql.replace(/\bFROM\s+(\w+)/gi, `FROM "${s}".$1`)
        .replace(/\bINTO\s+(\w+)/gi, `INTO "${s}".$1`)
        .replace(/\bUPDATE\s+(\w+)/gi, `UPDATE "${s}".$1`)
        .replace(/\bDELETE\s+FROM\s+(\w+)/gi, `DELETE FROM "${s}".$1`)
        .replace(/\bJOIN\s+(\w+)/gi, `JOIN "${s}".$1`), params);
}
// ═════════════════════════════════════════════════════════════
// W2.1 — BIAS & FAIRNESS SCANNER
// ═════════════════════════════════════════════════════════════
router.get("/fairness/metrics", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { model_asset_id, limit = 100 } = req.query;
        let sql = `SELECT * FROM ai_fairness_metrics WHERE tenant_id = $1`;
        const params = [tenantId];
        if (model_asset_id) {
            params.push(model_asset_id);
            sql += ` AND model_asset_id = $${params.length}`;
        }
        sql += ` ORDER BY scanned_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const { rows } = await sq(tenantId, sql, params);
        return res.json({ metrics: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load fairness metrics" });
    }
});
router.get("/fairness/scans", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { rows } = await sq(tenantId, `SELECT * FROM ai_fairness_scans WHERE tenant_id=$1 ORDER BY started_at DESC LIMIT 20`, [tenantId]);
        return res.json({ scans: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load fairness scans" });
    }
});
router.post("/fairness/scan", authenticate, requirePermission("ai_governance.manage"), validate({ body: fairnessScanPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { model_asset_id, model_name } = req.body;
        if (!model_asset_id)
            return res.status(400).json({ error: "model_asset_id required" });
        // Create scan record
        const { rows: scanRows } = await sq(tenantId, `INSERT INTO ai_fairness_scans (tenant_id, model_asset_id, model_name, status, triggered_by)
       VALUES ($1,$2,$3,'completed',$4) RETURNING *`, [tenantId, model_asset_id, model_name || 'Unknown', userId]);
        const scan = scanRows[0];
        // Generate fairness metrics (computed from available data patterns)
        const metricDefs = [
            { name: 'demographic_parity_ratio', threshold: 0.8 },
            { name: 'equalized_odds_ratio', threshold: 0.8 },
            { name: 'disparate_impact_ratio', threshold: 0.8 },
            { name: 'calibration_score', threshold: 0.7 },
        ];
        const metrics = [];
        for (const def of metricDefs) {
            // Check if real metrics exist from model_metrics for this asset
            const existing = await sq(tenantId, `SELECT value FROM ai_model_metrics WHERE tenant_id=$1 AND asset_id=$2 AND metric_type=$3 ORDER BY recorded_at DESC LIMIT 1`, [tenantId, model_asset_id, def.name]);
            const existingRow = getFirstRow(existing);
            const value = existingRow ? parseFloat(existingRow.value) : null;
            const status = value === null ? 'no_data' : (value >= def.threshold ? 'pass' : (value >= def.threshold * 0.8 ? 'warn' : 'fail'));
            const { rows } = await sq(tenantId, `INSERT INTO ai_fairness_metrics (tenant_id, model_asset_id, model_name, metric_name, value, threshold, status, scan_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, model_asset_id, model_name || 'Unknown', def.name, value ?? 0, def.threshold, status, scan.scan_id]);
            metrics.push(getFirstRowOrThrow({ rows }, 'Fairness metric insert failed'));
        }
        // Update scan summary
        const passCount = metrics.filter(m => m.status === 'pass').length;
        const failCount = metrics.filter(m => m.status === 'fail').length;
        await sq(tenantId, `UPDATE ai_fairness_scans SET completed_at=NOW(), summary=$2 WHERE scan_id=$1 AND tenant_id=$3`, [scan.scan_id, JSON.stringify({ total: metrics.length, pass: passCount, fail: failCount }), tenantId]);
        // Emit event if any metric failed
        if (failCount > 0) {
            try {
                await sq(tenantId, `INSERT INTO agrc_event_log (tenant_id, event_type, severity, details, created_at)
           VALUES ($1, 'bias.threshold_breached', 'warning', $2, NOW())`, [tenantId, JSON.stringify({ model_asset_id, model_name, failed_metrics: failCount })]);
            }
            catch { /* event log may not exist */ }
        }
        setAuditData(res, { action: "create", entityType: "ai_fairness_scan", entityId: scan.scan_id, afterState: { metrics_count: metrics.length, fail_count: failCount } });
        return res.json({ scan, metrics });
    }
    catch (err) {
        logger.error("[ai-gov-wave2] fairness scan:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to run fairness scan" });
    }
});
// ═════════════════════════════════════════════════════════════
// W2.2 — EU AI ACT RISK CLASSIFICATION
// ═════════════════════════════════════════════════════════════
const EU_AI_ACT_QUESTIONS = [
    { id: 'biometric', question_en: 'Does this system perform real-time biometric identification in public spaces?', question_ar: 'هل يقوم هذا النظام بتحديد الهوية البيومترية في الوقت الفعلي في الأماكن العامة؟', unacceptable: true },
    { id: 'social_scoring', question_en: 'Does this system perform social scoring by public authorities?', question_ar: 'هل يقوم هذا النظام بالتقييم الاجتماعي من قبل السلطات العامة؟', unacceptable: true },
    { id: 'subliminal', question_en: 'Does this system deploy subliminal techniques to distort behavior?', question_ar: 'هل يستخدم هذا النظام تقنيات خفية لتشويه السلوك؟', unacceptable: true },
    { id: 'critical_infra', question_en: 'Is this system a safety component of critical infrastructure?', question_ar: 'هل هذا النظام مكون أمان للبنية التحتية الحرجة؟', high_risk: true },
    { id: 'education', question_en: 'Is this system used for educational or vocational training access decisions?', question_ar: 'هل يستخدم هذا النظام لقرارات الوصول إلى التعليم أو التدريب المهني؟', high_risk: true },
    { id: 'employment', question_en: 'Is this system used for recruitment, employment decisions, or worker management?', question_ar: 'هل يستخدم هذا النظام للتوظيف أو قرارات العمل أو إدارة العمال؟', high_risk: true },
    { id: 'essential_services', question_en: 'Does this system affect access to essential services (credit, insurance, welfare)?', question_ar: 'هل يؤثر هذا النظام على الوصول إلى الخدمات الأساسية (الائتمان، التأمين، الرعاية الاجتماعية)؟', high_risk: true },
    { id: 'law_enforcement', question_en: 'Is this system used by law enforcement or border control authorities?', question_ar: 'هل يستخدم هذا النظام من قبل سلطات إنفاذ القانون أو مراقبة الحدود؟', high_risk: true },
];
router.get("/eu-ai-act/questions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (_req, res) => {
    return res.json({ questions: EU_AI_ACT_QUESTIONS });
});
router.get("/eu-ai-act/classifications", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { model_id } = req.query;
        let sql = `SELECT * FROM ai_eu_classifications WHERE tenant_id=$1`;
        const params = [tenantId];
        if (model_id) {
            params.push(model_id);
            sql += ` AND model_id=$${params.length}`;
        }
        sql += ` ORDER BY classified_at DESC`;
        const { rows } = await sq(tenantId, sql, params);
        return res.json({ classifications: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load classifications" });
    }
});
router.post("/eu-ai-act/classify", authenticate, requirePermission("ai_governance.manage"), validate({ body: euAiActClassifyPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { model_id, model_name, answers } = req.body;
        if (!model_id || !answers)
            return res.status(400).json({ error: "model_id and answers required" });
        // Determine risk category
        let risk_category = 'minimal';
        const requirements = [];
        const answerObj = answers;
        // Check unacceptable
        for (const q of EU_AI_ACT_QUESTIONS) {
            if (q.unacceptable && answerObj[q.id] === true) {
                risk_category = 'unacceptable';
                requirements.push(`Prohibited under EU AI Act Article 5: ${q.question_en}`);
            }
        }
        // Check high-risk (only if not unacceptable)
        if (risk_category !== 'unacceptable') {
            for (const q of EU_AI_ACT_QUESTIONS) {
                if (q.high_risk && answerObj[q.id] === true) {
                    risk_category = 'high_risk';
                    requirements.push(`High-risk requirement: Conformity assessment required`);
                    requirements.push(`Technical documentation (Article 11)`);
                    requirements.push(`Human oversight mechanism (Article 14)`);
                    requirements.push(`Record-keeping and logging (Article 12)`);
                    requirements.push(`Transparency obligations (Article 13)`);
                    break;
                }
            }
        }
        // Limited risk: has any transparency need
        if (risk_category === 'minimal') {
            const hasAny = Object.values(answerObj).some(v => v === true);
            if (hasAny) {
                risk_category = 'limited';
                requirements.push('Transparency obligation: Users must be informed they are interacting with AI');
            }
        }
        const { rows } = await sq(tenantId, `INSERT INTO ai_eu_classifications (tenant_id, model_id, model_name, risk_category, answers, requirements, classified_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [tenantId, model_id, model_name || 'Unknown', risk_category, JSON.stringify(answers), JSON.stringify(requirements), userId]);
        const classification = getFirstRowOrThrow({ rows }, 'Classification insert failed');
        setAuditData(res, { action: "create", entityType: "ai_eu_classification", entityId: classification.classification_id, afterState: { risk_category } });
        return res.json(classification);
    }
    catch (err) {
        logger.error("[ai-gov-wave2] eu-ai-act classify:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to classify" });
    }
});
// ═════════════════════════════════════════════════════════════
// W2.3 — RED TEAM SCHEDULING
// ═════════════════════════════════════════════════════════════
router.get("/red-team/schedules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { rows } = await sq(tenantId, `SELECT * FROM ai_red_team_schedules WHERE tenant_id=$1 ORDER BY created_at DESC`, [tenantId]);
        return res.json({ schedules: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load schedules" });
    }
});
router.post("/red-team/schedules", authenticate, requirePermission("ai_governance.manage"), validate({ body: redTeamSchedulesPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { name, model_id, prompt_template, frequency, enabled } = req.body;
        if (!name)
            return res.status(400).json({ error: "name required" });
        const freqHours = { daily: 24, weekly: 168, monthly: 720 };
        const nextRun = new Date(Date.now() + (freqHours[frequency || 'weekly'] || 168) * 3600000);
        const { rows } = await sq(tenantId, `INSERT INTO ai_red_team_schedules (tenant_id, name, model_id, prompt_template, frequency, enabled, next_run_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, name, model_id || null, prompt_template || 'all', frequency || 'weekly', enabled !== false, nextRun, userId]);
        const schedule = getFirstRowOrThrow({ rows }, 'Schedule creation failed');
        setAuditData(res, { action: "create", entityType: "ai_red_team_schedule", entityId: schedule.schedule_id });
        return res.status(201).json(schedule);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to create schedule" });
    }
});
router.put("/red-team/schedules/:id", authenticate, requirePermission("ai_governance.manage"), validate({ body: redTeamSchedulesIdPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { name, model_id, prompt_template, frequency, enabled } = req.body;
        const { rows } = await sq(tenantId, `UPDATE ai_red_team_schedules SET name=COALESCE($2,name), model_id=COALESCE($3,model_id),
       prompt_template=COALESCE($4,prompt_template), frequency=COALESCE($5,frequency), enabled=COALESCE($6,enabled)
       WHERE schedule_id=$1 AND tenant_id=$7 RETURNING *`, [id, name, model_id, prompt_template, frequency, enabled, tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Schedule not found" });
        return res.json(getFirstRowOrThrow({ rows }, 'Schedule not found'));
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to update schedule" });
    }
});
router.delete("/red-team/schedules/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("ai_governance.manage"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        await sq(tenantId, `DELETE FROM ai_red_team_schedules WHERE schedule_id=$1 AND tenant_id=$2`, [req.params.id, tenantId]);
        return res.json({ deleted: true });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to delete schedule" });
    }
});
// ═════════════════════════════════════════════════════════════
// W2.4 — ETHICS REVIEW BOARD
// ═════════════════════════════════════════════════════════════
router.get("/ethics-reviews", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, limit = 50 } = req.query;
        let sql = `SELECT r.*, (SELECT COUNT(*)::int FROM ai_ethics_votes v WHERE v.review_id=r.review_id) as vote_count,
      (SELECT COUNT(*)::int FROM ai_ethics_votes v WHERE v.review_id=r.review_id AND v.vote='approve') as approve_count,
      (SELECT COUNT(*)::int FROM ai_ethics_votes v WHERE v.review_id=r.review_id AND v.vote='reject') as reject_count
      FROM ai_ethics_reviews r WHERE r.tenant_id=$1`;
        const params = [tenantId];
        if (status) {
            params.push(status);
            sql += ` AND r.decision=$${params.length}`;
        }
        sql += ` ORDER BY r.submitted_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const { rows } = await sq(tenantId, sql, params);
        return res.json({ reviews: rows });
    }
    catch (err) {
        logger.error("[ai-gov-wave2] ethics-reviews:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to load ethics reviews" });
    }
});
router.post("/ethics-reviews", authenticate, requirePermission("ai_governance.manage"), validate({ body: ethicsReviewsPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { system_name, system_type, description, risk_category, assessment_data } = req.body;
        if (!system_name)
            return res.status(400).json({ error: "system_name required" });
        const { rows } = await sq(tenantId, `INSERT INTO ai_ethics_reviews (tenant_id, system_name, system_type, description, risk_category, assessment_data, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [tenantId, system_name, system_type || null, description || null, risk_category || null, JSON.stringify(assessment_data || {}), userId]);
        const review = getFirstRowOrThrow({ rows }, 'Ethics review creation failed');
        setAuditData(res, { action: "create", entityType: "ai_ethics_review", entityId: review.review_id });
        return res.status(201).json(review);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to create ethics review" });
    }
});
router.post("/ethics-reviews/:id/vote", authenticate, requirePermission("ai_governance.manage"), validate({ body: ethicsReviewsIdVotePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { id } = req.params;
        const { vote, notes } = req.body;
        if (!vote || !['approve', 'conditional', 'reject'].includes(vote)) {
            return res.status(400).json({ error: "vote must be approve, conditional, or reject" });
        }
        // Check if already voted
        const existing = await sq(tenantId, `SELECT vote_id FROM ai_ethics_votes WHERE review_id=$1 AND voter_id=$2 AND tenant_id=$3`, [id, userId, tenantId]);
        if (existing.rows.length > 0)
            return res.status(409).json({ error: "Already voted on this review" });
        const { rows } = await sq(tenantId, `INSERT INTO ai_ethics_votes (tenant_id, review_id, voter_id, vote, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [tenantId, id, userId, vote, notes || null]);
        const voteRow = getFirstRowOrThrow({ rows }, 'Vote creation failed');
        setAuditData(res, { action: "create", entityType: "ai_ethics_vote", entityId: voteRow.vote_id, afterState: { review_id: id, vote } });
        return res.status(201).json(voteRow);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to submit vote" });
    }
});
router.post("/ethics-reviews/:id/decide", authenticate, requirePermission("ai_governance.manage"), validate({ body: ethicsReviewsIdDecidePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { decision, conditions } = req.body;
        if (!decision || !['approved', 'conditional', 'rejected'].includes(decision)) {
            return res.status(400).json({ error: "decision must be approved, conditional, or rejected" });
        }
        const { rows } = await sq(tenantId, `UPDATE ai_ethics_reviews SET decision=$2, conditions=$3, decided_at=NOW() WHERE review_id=$1 AND tenant_id=$4 RETURNING *`, [id, decision, JSON.stringify(conditions || []), tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Review not found" });
        setAuditData(res, { action: "update", entityType: "ai_ethics_review", entityId: id, afterState: { decision } });
        return res.json(getFirstRowOrThrow({ rows }, 'Review not found'));
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to record decision" });
    }
});
// ═════════════════════════════════════════════════════════════
// W2.5 — AI IMPACT ASSESSMENT
// ═════════════════════════════════════════════════════════════
router.get("/impact-assessments", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, limit = 50 } = req.query;
        let sql = `SELECT * FROM ai_impact_assessments WHERE tenant_id=$1`;
        const params = [tenantId];
        if (status) {
            params.push(status);
            sql += ` AND status=$${params.length}`;
        }
        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const { rows } = await sq(tenantId, sql, params);
        return res.json({ assessments: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load impact assessments" });
    }
});
router.post("/impact-assessments", authenticate, requirePermission("ai_governance.manage"), validate({ body: impactAssessmentsPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { system_name, model_asset_id, steps_data } = req.body;
        if (!system_name)
            return res.status(400).json({ error: "system_name required" });
        const { rows } = await sq(tenantId, `INSERT INTO ai_impact_assessments (tenant_id, system_name, model_asset_id, assessor_id, steps_data, status)
       VALUES ($1,$2,$3,$4,$5,'draft') RETURNING *`, [tenantId, system_name, model_asset_id || null, userId, JSON.stringify(steps_data || {})]);
        const assessment = getFirstRowOrThrow({ rows }, 'Impact assessment creation failed');
        setAuditData(res, { action: "create", entityType: "ai_impact_assessment", entityId: assessment.assessment_id });
        return res.status(201).json(assessment);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to create assessment" });
    }
});
router.put("/impact-assessments/:id", authenticate, requirePermission("ai_governance.manage"), validate({ body: impactAssessmentsIdPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { steps_data, status, impact_score, recommendation } = req.body;
        const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
        const { rows } = await sq(tenantId, `UPDATE ai_impact_assessments SET
       steps_data=COALESCE($2,steps_data), status=COALESCE($3,status),
       impact_score=COALESCE($4,impact_score), recommendation=COALESCE($5,recommendation),
       updated_at=NOW(), completed_at=${completedAt}
       WHERE assessment_id=$1 AND tenant_id=$6 RETURNING *`, [id, steps_data ? JSON.stringify(steps_data) : null, status, impact_score, recommendation, tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Assessment not found" });
        return res.json(getFirstRowOrThrow({ rows }, 'Assessment not found'));
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to update assessment" });
    }
});
router.delete("/impact-assessments/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("ai_governance.manage"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        await sq(tenantId, `DELETE FROM ai_impact_assessments WHERE assessment_id=$1 AND tenant_id=$2`, [req.params.id, tenantId]);
        return res.json({ deleted: true });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to delete assessment" });
    }
});
// ═════════════════════════════════════════════════════════════
// W2.6 — REGULATORY CHANGE INTELLIGENCE
// ═════════════════════════════════════════════════════════════
router.get("/regulatory-changes", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, severity, limit = 50 } = req.query;
        let sql = `SELECT * FROM ai_regulatory_changes WHERE tenant_id=$1`;
        const params = [tenantId];
        if (status) {
            params.push(status);
            sql += ` AND status=$${params.length}`;
        }
        if (severity) {
            params.push(severity);
            sql += ` AND severity=$${params.length}`;
        }
        sql += ` ORDER BY detected_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const { rows } = await sq(tenantId, sql, params);
        return res.json({ changes: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load regulatory changes" });
    }
});
router.post("/regulatory-changes", authenticate, requirePermission("ai_governance.manage"), validate({ body: regulatoryChangesPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { source, title, description, framework_code, severity, affected_controls, recommended_action } = req.body;
        if (!source || !title)
            return res.status(400).json({ error: "source and title required" });
        const { rows } = await sq(tenantId, `INSERT INTO ai_regulatory_changes (tenant_id, source, title, description, framework_code, severity, affected_controls, recommended_action)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, source, title, description || null, framework_code || null, severity || 'medium',
            JSON.stringify(affected_controls || []), recommended_action || null]);
        const change = getFirstRowOrThrow({ rows }, 'Regulatory change creation failed');
        setAuditData(res, { action: "create", entityType: "ai_regulatory_change", entityId: change.change_id });
        return res.status(201).json(change);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to create regulatory change" });
    }
});
router.put("/regulatory-changes/:id/review", authenticate, requirePermission("ai_governance.manage"), validate({ body: regulatoryChangesIdReviewPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['acknowledged', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: "status must be acknowledged, in_progress, resolved, or dismissed" });
        }
        const enforcement = await enforceStatusTransition(tenantId, {
            moduleCode: 'ai-governance', table: 'ai_regulatory_changes', idColumn: 'change_id',
            entityId: id, toStatus: status, actorUserId: userId,
            extraSets: `reviewed_by = $2, reviewed_at = NOW()`,
            extraParams: [userId],
        });
        if (enforcement.blocked)
            return res.status(403).json({ error: 'Transition denied', reason: enforcement.reason });
        if (enforcement.pendingApproval)
            return res.status(202).json({ pendingApproval: true, approvalId: enforcement.approvalId, reason: enforcement.reason });
        let rows;
        if (!enforcement.success) {
            const r = await sq(tenantId, `UPDATE ai_regulatory_changes SET status=$2, reviewed_by=$3, reviewed_at=NOW()
         WHERE change_id=$1 AND tenant_id=$4 RETURNING *`, [id, status, userId, tenantId]);
            rows = r.rows;
        }
        else {
            const r = await sq(tenantId, `SELECT * FROM ai_regulatory_changes WHERE change_id=$1 AND tenant_id=$2`, [id, tenantId]);
            rows = r.rows;
        }
        if (!rows.length)
            return res.status(404).json({ error: "Change not found" });
        setAuditData(res, { action: "update", entityType: "ai_regulatory_change", entityId: id, afterState: { status } });
        return res.json(getFirstRowOrThrow({ rows }, 'Change not found'));
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to review change" });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-governance-wave2.routes.js.map