import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { z } from "zod";

import { logger } from '../../../ports/logger.port';
/**
 * Qiyas Module Controller (module-scoped router)
 *
 * Saudi GRC measurement/assessment engine -- provides tenant-scoped endpoints
 * for assessment lifecycle, compliance scoring, AI-powered summaries, and
 * checklist generation from framework controls.
 *
 * Mounted via routes/qiyas.routes.ts shim into the main route manifest.
 * All queries operate within the tenant schema (`tenant_<tenantId>`).
 */
import { Router, Response } from 'express';
import { authenticate } from '../../../ports/auth.port';
import { auditMiddleware, validate, asyncHandler } from '../../../ports/middleware.port';
import { emptyResult, safeQuery, query as _query } from '../../../ports/database.port';
import { claudeJSON } from '../../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import { AuthenticatedRequest } from '@dos/types';
import type { GenericRow as _GenericRow } from '@dos/types';

import { swallow as _swallow, EC, swallowDefault, catchHandler } from '@dos/platform-core/resilience';

const router = Router();
router.use(auditMiddleware('qiyas'));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Derive the tenant schema name from the authenticated request. */
function schema(req: AuthenticatedRequest): string {
  const tenantId = req.tenantId || req.user?.tenantId || '';
  return `tenant_${tenantId}`;
}

/** Clamp a numeric query param to a safe integer range. */
function clampInt(raw: unknown, defaultVal: number, min = 1, max = 200): number {
  const n = parseInt(String(raw || defaultVal), 10);
  if (isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

// ── Zod Validation Schemas ───────────────────────────────────────────────────

const createAssessmentBody = z.object({
  framework_code: z.string().min(1).max(100),
  title_en: z.string().min(1).max(500),
  title_ar: z.string().max(500).optional(),
  description_en: z.string().max(4000).optional(),
  scope: z.string().max(2000).optional(),
  assessor_name: z.string().max(200).optional(),
  assessor_email: z.string().email().optional(),
  target_date: z.string().datetime({ offset: true }).optional(),
});

const submitAssessmentBody = z.object({
  notes: z.string().max(4000).optional(),
});

const listAssessmentsQuery = z.object({
  framework: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

// ═════════════════════════════════════════════════════════════════════════════
// GET / — Assessment overview for the tenant
// ═════════════════════════════════════════════════════════════════════════════

router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const s = schema(req);

  // Fetch aggregate assessment data in parallel
  const [assessmentsResult, scoresResult, latestResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT a.qiyas_assessment_id, a.title_en, a.status, a.overall_score, a.maturity_level,
              a.created_at, a.updated_at,
              m.name_en AS model_name, m.code AS model_code
       FROM "${s}".qiyas_assessments a
       LEFT JOIN "${s}".qiyas_models m ON m.model_id = a.model_id
       ORDER BY a.updated_at DESC NULLS LAST
       LIMIT 50`
    ), {  operation: 'query qiyas_assessments' }),

    // Per-domain average scores across all non-draft assessments
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT d.name_en AS domain_name, d.domain_id,
              ROUND(AVG(sr.raw_score)::numeric, 2) AS avg_score,
              ROUND(AVG(sr.weighted_score)::numeric, 2) AS avg_weighted_score,
              COUNT(DISTINCT sr.qiyas_assessment_id) AS assessment_count
       FROM "${s}".qiyas_score_results sr
       JOIN "${s}".qiyas_domains d ON d.domain_id = sr.domain_id
       GROUP BY d.domain_id, d.name_en
       ORDER BY avg_weighted_score DESC`
    ), {  operation: 'query qiyas_score_results' }),

    // Most recent completed assessment date
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ last_assessment_date: null }]), safeQuery(
      `SELECT MAX(updated_at) AS last_assessment_date
       FROM "${s}".qiyas_assessments
       WHERE status IN ('submitted', 'finalized', 'completed')`
    ), {  operation: 'query qiyas_score_results' }),
  ]);

  // Compute overall score as weighted average of domain averages
  const domainScores = scoresResult.rows;
  let overallScore = 0;
  if (domainScores.length > 0) {
    const totalWeighted = domainScores.reduce(
      (acc: number, d: any) => acc + parseFloat(d.avg_weighted_score || '0'), 0,
    );
    overallScore = Math.round((totalWeighted / domainScores.length) * 100) / 100;
  }

  res.json({
    assessments: assessmentsResult.rows,
    domainScores,
    overallScore,
    lastAssessmentDate: latestResult.rows[0]?.last_assessment_date ?? null,
    totalAssessments: assessmentsResult.rows.length,
  });
}));

// ═════════════════════════════════════════════════════════════════════════════
// GET /assessments — Paginated list with filters
// ═════════════════════════════════════════════════════════════════════════════

router.get('/assessments', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const s = schema(req);
  const filters = listAssessmentsQuery.parse(req.query);

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  if (filters.framework) {
    params.push(`%${filters.framework}%`);
    conditions.push(`(m.code ILIKE $${params.length} OR a.title_en ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`a.created_at >= $${params.length}::timestamptz`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`a.created_at <= $${params.length}::timestamptz`);
  }

  const offset = (filters.page - 1) * filters.limit;
  params.push(filters.limit, offset);

  const where = conditions.join(' AND ');

  const [dataResult, countResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT a.*, m.name_en AS model_name, m.code AS model_code
       FROM "${s}".qiyas_assessments a
       LEFT JOIN "${s}".qiyas_models m ON m.model_id = a.model_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    ), {  operation: 'query qiyas_assessments' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(
      `SELECT COUNT(*) AS total
       FROM "${s}".qiyas_assessments a
       LEFT JOIN "${s}".qiyas_models m ON m.model_id = a.model_id
       WHERE ${where}`,
      params.slice(0, -2),
    ), {  operation: 'query qiyas_assessments' }),
  ]);

  res.json({
    assessments: dataResult.rows,
    total: parseInt((countResult as any).rows[0]?.total || '0', 10),
    page: filters.page,
    limit: filters.limit,
  });
}));

// ═════════════════════════════════════════════════════════════════════════════
// GET /assessments/:id — Single assessment detail
// ═════════════════════════════════════════════════════════════════════════════

router.get('/assessments/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const s = schema(req);
  const id = req.params.id;

  const [assessment, scores, responses, checklist] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT a.*, m.name_en AS model_name, m.code AS model_code
       FROM "${s}".qiyas_assessments a
       LEFT JOIN "${s}".qiyas_models m ON m.model_id = a.model_id
       WHERE a.qiyas_assessment_id = $1::uuid`,
      [id],
    ), {  operation: 'query qiyas_assessments' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT sr.domain_id, d.name_en AS domain_name,
              sr.raw_score, sr.weighted_score, sr.maturity_level, sr.computed_at
       FROM "${s}".qiyas_score_results sr
       JOIN "${s}".qiyas_domains d ON d.domain_id = sr.domain_id
       WHERE sr.qiyas_assessment_id = $1::uuid
       ORDER BY sr.weighted_score DESC`,
      [id],
    ), {  operation: 'query qiyas_score_results' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, answered: 0 }]), safeQuery(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE score IS NOT NULL) AS answered
       FROM "${s}".qiyas_responses
       WHERE qiyas_assessment_id = $1::uuid`,
      [id],
    ), {  operation: 'query qiyas_score_results' }),

    // Checklist items linked to this assessment via auto-tasks
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT auto_task_id, task_title, task_description, priority, status, due_date, gap_severity
       FROM "${s}".qiyas_auto_tasks
       WHERE qiyas_assessment_id = $1
       ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
      [id],
    ), {  operation: 'query qiyas_auto_tasks' }),
  ]);

  if (!assessment.rows.length) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const row = assessment.rows[0];
  res.json({
    ...row,
    domainScores: scores.rows,
    responseProgress: {
      total: parseInt((responses as any).rows[0]?.total || '0', 10),
      answered: parseInt((responses as any).rows[0]?.answered || '0', 10),
    },
    checklistItems: checklist.rows,
  });
}));

// ═════════════════════════════════════════════════════════════════════════════
// POST /assessments — Create new assessment + generate checklist from controls
// ═════════════════════════════════════════════════════════════════════════════

router.post('/assessments', authenticate, validate({ body: createAssessmentBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const s = schema(req);
    const userId = req.user!.userId!;
    const body = req.body;

    // 1. Resolve model_id for the framework (if a qiyas model exists for it)
    const modelResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT model_id FROM "${s}".qiyas_models WHERE code ILIKE $1 LIMIT 1`,
      [body.framework_code],
    ), {  operation: 'query qiyas_models' });
    const modelId = modelResult.rows[0]?.model_id ?? null;

    // 2. Create the assessment record
    const assessmentResult = await safeQuery(
      `INSERT INTO "${s}".qiyas_assessments
         (model_id, title_en, title_ar, description_en, assessment_type, status, target_date, created_by)
       VALUES ($1, $2, $3, $4, 'self_assessment', 'draft', $5, $6)
       RETURNING *`,
      [
        modelId, body.title_en, body.title_ar || null,
        body.description_en || null, body.target_date || null, userId,
      ],
    );
    const assessment = assessmentResult.rows[0];
    const assessmentId = assessment.qiyas_assessment_id;

    // 3. Generate checklist items from framework controls
    //    Query regulatory controls matching the framework code from the public catalog
    //    and also from the tenant's own controls table.
    const controlsResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT c.control_id, c.control_code, c.title_en AS control_title, c.implementation_status
       FROM "${s}".controls c
       WHERE c.framework_id ILIKE '%' || $1 || '%'
         AND c.deleted_at IS NULL
       ORDER BY c.control_code
       LIMIT 500`,
      [body.framework_code],
    ), {  operation: 'query controls' });

    const checklistItems: unknown[] = [];
    for (const ctrl of controlsResult.rows) {
      // Determine priority based on implementation status
      const priority = ctrl.implementation_status === 'not_implemented' ? 'high'
        : ctrl.implementation_status === 'partial' ? 'medium' : 'low';

      const taskResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `INSERT INTO "${s}".qiyas_auto_tasks
           (qiyas_assessment_id, grc_control_id, task_title, task_description, priority, status)
         VALUES ($1, $2, $3, $4, $5, 'created')
         RETURNING auto_task_id, task_title, priority, status`,
        [
          assessmentId,
          ctrl.control_id,
          `Assess: ${ctrl.control_code} - ${ctrl.control_title || 'Control'}`,
          `Evaluate compliance status for control ${ctrl.control_code} under framework ${body.framework_code}. `
            + `Current implementation status: ${ctrl.implementation_status || 'any'}.`,
          priority,
        ],
      ), {  operation: 'fallback query' });

      if (taskResult.rows[0]) {
        checklistItems.push(taskResult.rows[0]);
      }
    }

    // 4. Log the trigger event
    await safeQuery(
      `INSERT INTO "${s}".qiyas_grc_trigger_log
         (trigger_type, source_module, source_entity, source_id, target_module, target_action, payload, status)
       VALUES ('assessment_finalized', 'qiyas', 'assessment', $1, 'grc', 'generate_checklist', $2, 'completed')`,
      [assessmentId, JSON.stringify({
        framework_code: body.framework_code,
        controlCount: controlsResult.rows.length,
        checklistCount: checklistItems.length,
      })],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    res.status(201).json({
      assessmentId,
      assessment,
      checklistItems,
      controlsEvaluated: controlsResult.rows.length,
    });
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// GET /scores — Compliance scores by domain/framework
// ═════════════════════════════════════════════════════════════════════════════

router.get('/scores', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const s = schema(req);
  const framework = req.query.framework as string | undefined;
  const limit = clampInt(req.query.limit, 50);

  // Domain-level scores across all assessments (optionally filtered by framework)
  let domainSql = `
    SELECT d.domain_id, d.name_en AS domain_name,
           ROUND(AVG(sr.raw_score)::numeric, 2) AS avg_score,
           ROUND(AVG(sr.weighted_score)::numeric, 2) AS avg_weighted_score,
           MAX(sr.maturity_level) AS maturity_level,
           COUNT(DISTINCT sr.qiyas_assessment_id) AS assessment_count,
           MAX(sr.computed_at) AS last_computed
    FROM "${s}".qiyas_score_results sr
    JOIN "${s}".qiyas_domains d ON d.domain_id = sr.domain_id
  `;
  const params: unknown[] = [];

  if (framework) {
    domainSql += `
    JOIN "${s}".qiyas_assessments a ON a.qiyas_assessment_id = sr.qiyas_assessment_id
    JOIN "${s}".qiyas_models m ON m.model_id = a.model_id AND m.code ILIKE '%' || $1 || '%'
    `;
    params.push(framework);
  }

  domainSql += `
    GROUP BY d.domain_id, d.name_en
    ORDER BY avg_weighted_score DESC
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const domainScores = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(domainSql, params), {  operation: 'fallback query' });

  // Compute overall score
  let overallScore = 0;
  if (domainScores.rows.length > 0) {
    const sum = domainScores.rows.reduce(
      (acc: number, r: Record<string, unknown>) => acc + parseFloat((r as any).avg_weighted_score || '0'), 0,
    );
    overallScore = Math.round((sum / domainScores.rows.length) * 100) / 100;
  }

  // Maturity level from overall score
  const maturityLevel = overallScore >= 4.5 ? 'Optimised'
    : overallScore >= 3.5 ? 'Managed'
    : overallScore >= 2.5 ? 'Defined'
    : overallScore >= 1.5 ? 'Developing'
    : 'Initial';

  res.json({
    overallScore,
    maturityLevel,
    domainScores: domainScores.rows,
    framework: framework || 'all',
  });
}));

// ═════════════════════════════════════════════════════════════════════════════
// POST /assessments/:id/submit — Submit assessment with AI summary
// ═════════════════════════════════════════════════════════════════════════════

router.post('/assessments/:id/submit', authenticate, validate({ body: submitAssessmentBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const s = schema(req);
    const assessmentId = req.params.id;
    const tenantId = req.tenantId || req.user?.tenantId || '';

    // 1. Verify assessment exists and is in a submittable state
    const assessmentResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT a.*, m.code AS model_code, m.name_en AS model_name
       FROM "${s}".qiyas_assessments a
       LEFT JOIN "${s}".qiyas_models m ON m.model_id = a.model_id
       WHERE a.qiyas_assessment_id = $1::uuid`,
      [assessmentId],
    ), {  operation: 'query qiyas_assessments' });

    if (!assessmentResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    if (assessment.status === 'submitted' || assessment.status === 'finalized') {
      return res.status(409).json({ error: `Assessment already ${assessment.status}` });
    }

    // 2. Compute final scores using the scoring engine
    const responses = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT r.question_id, r.score, q.weight, q.domain_id,
              d.name_en AS domain_name, d.weight AS domain_weight
       FROM "${s}".qiyas_responses r
       JOIN "${s}".qiyas_questions q ON q.question_id = r.question_id
       JOIN "${s}".qiyas_domains d ON d.domain_id = q.domain_id
       WHERE r.qiyas_assessment_id = $1::uuid AND r.score IS NOT NULL`,
      [assessmentId],
    ), {  operation: 'query qiyas_responses' });

    // Compute weighted domain scores
    const domainMap = new Map<string, {
      name: string; weight: number; scores: { s: number; w: number }[];
    }>();
    for (const row of responses.rows) {
      if (!domainMap.has((row as any).domain_id)) {
        domainMap.set((row as any).domain_id, {

          name: row.domain_name,
          weight: parseFloat((row as any).domain_weight) || 1,
          scores: [],
        });
      }
      domainMap.get((row as any).domain_id)!.scores.push({
        s: parseFloat((row as any).score),
        w: parseFloat((row as any).weight) || 1,
      });
    }

    let totalWeight = 0;
    let weightedSum = 0;
    const domainScores: {
      domainId: string; domainName: string; score: number; weight: number; weightedScore: number;
    }[] = [];

    for (const [domainId, d] of domainMap) {
      const totalQ = d.scores.reduce((acc, x) => acc + x.w, 0);
      const rawScore = totalQ > 0
        ? d.scores.reduce((acc, x) => acc + x.s * x.w, 0) / totalQ : 0;
      const ws = rawScore * d.weight;
      weightedSum += ws;
      totalWeight += d.weight;
      domainScores.push({
        domainId,
        domainName: d.name,
        score: Math.round(rawScore * 100) / 100,
        weight: d.weight,
        weightedScore: Math.round(ws * 100) / 100,
      });
    }

    const overallScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
    const maturityLevel = overallScore >= 4.5 ? 'Optimised'
      : overallScore >= 3.5 ? 'Managed'
      : overallScore >= 2.5 ? 'Defined'
      : overallScore >= 1.5 ? 'Developing'
      : 'Initial';

    // 3. Use Claude AI to generate assessment summary and recommendations
    let aiSummary: {
      executive_summary: string;
      key_findings: string[];
      recommendations: { area: string; action: string; priority: string }[];
      risk_areas: string[];
      maturity_assessment: string;
    } | null = null;

    try {
      aiSummary = await claudeJSON<{
        executive_summary: string;
        key_findings: string[];
        recommendations: { area: string; action: string; priority: string }[];
        risk_areas: string[];
        maturity_assessment: string;
      }>({
        systemPrompt: `You are a Saudi GRC assessment expert specializing in NCA ECC, SAMA CSF, PDPL, and SDAIA frameworks.
Analyze the Qiyas assessment results and provide a professional summary.
Respond with JSON:
{
  "executive_summary": "2-3 sentence overview of assessment results",
  "key_findings": ["finding1", "finding2", ...],
  "recommendations": [{"area": "domain name", "action": "specific action", "priority": "critical|high|medium|low"}],
  "risk_areas": ["area1", "area2", ...],
  "maturity_assessment": "detailed maturity level commentary"
}`,
        userMessage: `Assessment: ${assessment.title_en}
Model: ${assessment.model_name || 'General'}
Overall Score: ${overallScore}/5
Maturity Level: ${maturityLevel}
Domain Scores: ${JSON.stringify(domainScores)}
Total Responses: ${responses.rows.length}
Submission Notes: ${req.body.notes || 'None'}`,
        maxTokens: 1536,
        temperature: 0.3,
      });
    } catch (aiErr) {
      // AI enhancement is best-effort; continue without it
      logger.warn('[Qiyas] AI summary generation failed:', toErrorMessage(aiErr));
    }

    // 4. Update assessment status and persist scores
    await safeQuery(
      `UPDATE "${s}".qiyas_assessments
       SET status = 'submitted', overall_score = $2, maturity_level = $3, updated_at = NOW()
       WHERE qiyas_assessment_id = $1::uuid`,
      [assessmentId, overallScore, maturityLevel],
    );

    // Upsert domain scores
    for (const ds of domainScores) {
      await safeQuery(
        `INSERT INTO "${s}".qiyas_score_results
           (qiyas_assessment_id, domain_id, raw_score, weighted_score, maturity_level, computed_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, NOW())
         ON CONFLICT (qiyas_assessment_id, domain_id)
         DO UPDATE SET raw_score = $3, weighted_score = $4, maturity_level = $5, computed_at = NOW()`,
        [assessmentId, ds.domainId, ds.score, ds.weightedScore, maturityLevel],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    // 5. Sync maturity to GRC dashboard
    await safeQuery(
      `INSERT INTO "${s}".grc_maturity_sync
         (qiyas_assessment_id, sync_type, overall_maturity, domain_scores, compliance_impact, synced_by, is_current)
       VALUES ($1, 'full', $2, $3, '{}', $4, TRUE)
       ON CONFLICT (qiyas_assessment_id) WHERE is_current = TRUE
       DO UPDATE SET overall_maturity = $2, domain_scores = $3, synced_at = NOW(), version = grc_maturity_sync.version + 1`,
      [assessmentId, overallScore, JSON.stringify(domainScores), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    // 6. Log the submission trigger
    await safeQuery(
      `INSERT INTO "${s}".qiyas_grc_trigger_log
         (trigger_type, source_module, source_entity, source_id, target_module, target_action, payload, status)
       VALUES ('assessment_finalized', 'qiyas', 'assessment', $1, 'grc', 'sync_maturity_to_grc_dashboard', $2, 'completed')`,
      [assessmentId, JSON.stringify({
        overallScore, maturityLevel, domainCount: domainScores.length,
        hasAiSummary: !!aiSummary,
      })],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    res.json({
      assessmentId,
      status: 'submitted',
      overallScore,
      maturityLevel,
      domainScores,
      aiSummary,
      submittedAt: new Date().toISOString(),
    });
  }),
);

export default router;
