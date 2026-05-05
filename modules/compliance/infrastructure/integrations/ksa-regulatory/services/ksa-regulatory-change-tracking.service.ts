// ============================================
// KSA Regulatory Change Tracking Service (Module Facade)
// Detects, classifies, and tracks regulatory changes
// with AI-powered impact analysis and remediation plans.
// Delegates to global ksa-regulatory-change-tracking.service
// and enriches with tenant-scoped analysis.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/db';
import { logger } from '../ports/logger.port';
import { eventBus } from '../ports/events.port';

import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

export interface RegulatoryChange {
  id: string;
  changeType: string;
  frameworkCode: string;
  title: string;
  description: string;
  severity: string;
  effectiveDate: string | null;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ChangeTrackingResult {
  changes: DetectedChange[];
  impactSummary: ImpactSummary;
  recommendedActions: RecommendedAction[];
  detectedAt: string;
}

export interface DetectedChange {
  changeId: string;
  frameworkCode: string;
  regulatorId: string;
  changeType: string;
  title: string;
  summary: string;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  affectedControlsCount: number;
  complianceGapDelta: number;
  effectiveDate: string | null;
  status: string;
  detectedAt: string;
}

export interface ImpactSummary {
  totalChanges: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalAffectedControls: number;
  estimatedComplianceImpact: number; // percentage point change in score
  aiSummaryEn: string;
  aiSummaryAr: string;
}

export interface RecommendedAction {
  priority: number;
  actionType: 'review_controls' | 'update_policy' | 'conduct_assessment' | 'train_staff' | 'engage_regulator' | 'remediate_gap';
  descriptionEn: string;
  descriptionAr: string;
  relatedChangeId: string;
  estimatedEffortDays: number;
  dueDate: string | null;
}

export interface ChangeHistoryFilters {
  frameworkCode?: string;
  impactLevel?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ChangeHistoryResult {
  changes: DetectedChange[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ChangeImpactAssessment {
  changeId: string;
  affectedControls: AffectedControl[];
  scoreBefore: number;
  scoreAfter: number;
  riskIncrease: number;
  remediationPlan: RemediationPlanItem[];
  aiReportEn: string;
  aiReportAr: string;
  assessedAt: string;
}

export interface AffectedControl {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  frameworkCode: string;
  currentStatus: string;
  impactType: 'new_requirement' | 'modified_requirement' | 'removed_requirement' | 'stricter_enforcement';
  gapIntroduced: boolean;
}

export interface RemediationPlanItem {
  step: number;
  actionEn: string;
  actionAr: string;
  controlId: string | null;
  owner: string | null;
  estimatedDays: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// 1. Track Regulatory Changes
// ---------------------------------------------------------------------------

/**
 * Detect and track regulatory changes for a tenant.
 * Queries both global (public.regulatory_changes) and tenant-scoped tables,
 * classifies impact based on affected controls, and uses Claude AI for
 * plain-language summaries and action recommendations.
 */
export async function trackRegulatoryChanges(tenantId: string): Promise<ChangeTrackingResult> {
  const schema = tenantSchema(tenantId);
  const detectedAt = new Date().toISOString();

  try {
    // 1. Get tenant's active frameworks to scope the search
    const frameworksRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_id, framework_code, framework_name FROM "${schema}".frameworks WHERE status = 'active' OR status IS NULL`,
      []
    ), { tenantId: tenantId, operation: 'query frameworks' });

    const activeFrameworks = frameworksRes.rows.map((r: GenericRow) => r.framework_code || r.framework_id);

    // 2. Query global regulatory changes that affect tenant's frameworks
    //    Also check tenant-scoped regulatory_changes table
    const globalChangesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, regulator_id, framework_code, regulation_name, change_type,
              change_summary, impact_level, affected_domains, affected_controls,
              published_date, effective_date, compliance_deadline, response_status, detected_at
       FROM public.regulatory_changes
       WHERE (framework_code = ANY($1::text[]) OR affected_domains && $1::text[])
         AND response_status IN ('pending_review', 'impact_assessed', 'implementation_planned')
       ORDER BY detected_at DESC
       LIMIT 50`,
      [activeFrameworks]
    ), { tenantId: tenantId, operation: 'fallback query' });

    const tenantChangesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, source_regulator AS regulator_id, title, change_type,
              description AS change_summary, impact_level,
              affected_frameworks, affected_controls,
              effective_date, status, created_at AS detected_at
       FROM "${schema}".regulatory_changes
       WHERE status NOT IN ('closed', 'verified')
       ORDER BY created_at DESC
       LIMIT 50`,
      []
    ), { tenantId: tenantId, operation: 'query regulatory_changes' });

    // 3. Merge and deduplicate changes
    const seenIds = new Set<string>();
    const allChanges: DetectedChange[] = [];

    for (const row of globalChangesRes.rows) {
      if (seenIds.has((row as any).change_id)) continue;
      seenIds.add((row as any).change_id);

      const affectedControls = Array.isArray(row.affected_controls) ? row.affected_controls : [];
      allChanges.push({

        changeId: row.change_id as string,

        frameworkCode: (row.framework_code as string) || '',

        regulatorId: (row.regulator_id as string) || '',

        changeType: (row.change_type as string) || 'amendment',

        title: (row.regulation_name as string) || ((row.change_summary as string)?.slice(0, 80) || 'Regulatory Change'),

        summary: (row.change_summary as string) || '',

        impactLevel: (row.impact_level as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        affectedControlsCount: affectedControls.length,
        complianceGapDelta: estimateGapDelta((row as any).impact_level, affectedControls.length),

        effectiveDate: row.effective_date || null,

        status: (row.response_status as string) || 'pending_review',

        detectedAt: row.detected_at || detectedAt,
      });
    }

    for (const row of tenantChangesRes.rows) {
      if (seenIds.has((row as any).change_id)) continue;
      seenIds.add((row as any).change_id);

      const affectedControls = parseJsonArraySafe(row.affected_controls);
      const affectedFrameworks = parseJsonArraySafe(row.affected_frameworks);
      allChanges.push({

        changeId: row.change_id as string,
        frameworkCode: affectedFrameworks[0] || '',

        regulatorId: (row.regulator_id as string) || '',

        changeType: (row.change_type as string) || 'amendment',

        title: (row.title as string) || 'Regulatory Change',

        summary: (row.change_summary as string) || '',
        impactLevel: classifyImpactLevel(affectedControls.length),
        affectedControlsCount: affectedControls.length,
        complianceGapDelta: estimateGapDelta(classifyImpactLevel(affectedControls.length), affectedControls.length),

        effectiveDate: row.effective_date || null,

        status: (row.status as string) || 'identified',

        detectedAt: row.detected_at || detectedAt,
      });
    }

    // 4. Compare framework versions to detect untracked changes
    const versionChanges = await detectFrameworkVersionChanges(tenantId, schema, activeFrameworks);
    for (const vc of versionChanges) {
      if (!seenIds.has(vc.changeId)) {
        allChanges.push(vc);
        seenIds.add(vc.changeId);
      }
    }

    // 5. Build impact summary
    const impactSummary = buildImpactSummary(allChanges);

    // 6. Use Claude AI for plain-language summary and action recommendations
    let recommendedActions: RecommendedAction[] = [];
    try {
      const aiResult = await generateAiSummaryAndActions(tenantId, allChanges, impactSummary);
      impactSummary.aiSummaryEn = aiResult.summaryEn;
      impactSummary.aiSummaryAr = aiResult.summaryAr;
      recommendedActions = aiResult.actions;
    } catch (aiErr) {
      // AI enrichment is best-effort; fall back to rule-based recommendations
      logger.warn('[KSA Change Tracking] AI enrichment failed, using rule-based fallback', {
        tenantId, error: toErrorMessage(aiErr),
      });
      recommendedActions = generateRuleBasedActions(allChanges);
    }

    // 7. Persist tracking run metadata to tenant schema
    await safeQuery(
      `INSERT INTO "${schema}".regulatory_change_notifications (
        tenant_id, change_id, notification_type, priority, message_en, action_required
      ) SELECT $1, unnest($2::text[]), 'change_detected', 'medium', 'Regulatory change tracked by system', true
      ON CONFLICT DO NOTHING`,
      [tenantId, allChanges.map(c => c.changeId)]
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return {
      changes: allChanges,
      impactSummary,
      recommendedActions,
      detectedAt,
    };
  } catch (err) {
    logger.error('[KSA Change Tracking] trackRegulatoryChanges failed', {
      tenantId, error: toErrorMessage(err),
    });
    return {
      changes: [],
      impactSummary: buildImpactSummary([]),
      recommendedActions: [],
      detectedAt,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Get Regulatory Change History
// ---------------------------------------------------------------------------

/**
 * Paginated query of past regulatory changes with filters.
 * Combines global and tenant-scoped change records.
 */
export async function getRegulatoryChangeHistory(
  tenantId: string,
  filters?: ChangeHistoryFilters
): Promise<ChangeHistoryResult> {
  const schema = tenantSchema(tenantId);
  const page = filters?.page ?? 1;
  const pageSize = Math.min(filters?.pageSize ?? 25, 100);
  const offset = (page - 1) * pageSize;

  try {
    // Build dynamic WHERE clause for tenant-scoped changes
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters?.frameworkCode) {
      conditions.push(`(affected_frameworks::text ILIKE $${paramIdx} OR source_regulator = $${paramIdx})`);
      params.push(`%${filters.frameworkCode}%`);
      paramIdx++;
    }
    if (filters?.impactLevel) {
      conditions.push(`impact_level = $${paramIdx}`);
      params.push(filters.impactLevel);
      paramIdx++;
    }
    if (filters?.status) {
      conditions.push(`status = $${paramIdx}`);
      params.push(filters.status);
      paramIdx++;
    }
    if (filters?.fromDate) {
      conditions.push(`created_at >= $${paramIdx}::timestamptz`);
      params.push(filters.fromDate);
      paramIdx++;
    }
    if (filters?.toDate) {
      conditions.push(`created_at <= $${paramIdx}::timestamptz`);
      params.push(filters.toDate);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(
      `SELECT COUNT(*) AS total FROM "${schema}".regulatory_changes ${where}`,
      params
    ), { tenantId: tenantId, operation: 'query regulatory_changes' });
    const totalCount = parseInt((countRes as any).rows[0]?.total || '0', 10);

    // Fetch page
    const dataRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, title, description AS change_summary, source_regulator AS regulator_id,
              change_type, impact_level, affected_frameworks, affected_controls,
              effective_date, status, created_at AS detected_at,
              owner, assigned_to, implementation_plan
       FROM "${schema}".regulatory_changes
       ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, pageSize, offset]
    ), { tenantId: tenantId, operation: 'query regulatory_changes' });

    const changes: DetectedChange[] = dataRes.rows.map((row: GenericRow) => {
      const affectedControls = parseJsonArraySafe(row.affected_controls);
      const affectedFrameworks = parseJsonArraySafe(row.affected_frameworks);
      return {
        changeId: row.change_id,
        frameworkCode: affectedFrameworks[0] || '',
        regulatorId: row.regulator_id || '',
        changeType: row.change_type || 'amendment',
        title: row.title || 'Regulatory Change',
        summary: row.change_summary || '',
        impactLevel: row.impact_level || 'medium',
        affectedControlsCount: affectedControls.length,
        complianceGapDelta: estimateGapDelta(row.impact_level, affectedControls.length),
        effectiveDate: row.effective_date || null,
        status: row.status || 'identified',
        detectedAt: row.detected_at,
      };
    });

    return {
      changes,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (err) {
    logger.error('[KSA Change Tracking] getRegulatoryChangeHistory failed', {
      tenantId, error: toErrorMessage(err),
    });
    return {
      changes: [],
      pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Acknowledge Change
// ---------------------------------------------------------------------------

/**
 * Mark a regulatory change as acknowledged by a user.
 * Optionally stores a response plan. Publishes audit trail event.
 */
export async function acknowledgeChange(
  tenantId: string,
  changeId: string,
  userId: string,
  response?: { plan?: string; notes?: string; targetDate?: string }
): Promise<{ acknowledged: boolean; acknowledgedAt: string }> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    // 1. Update tenant-scoped regulatory_changes status
    await safeQuery(
      `UPDATE "${schema}".regulatory_changes
       SET status = CASE
             WHEN status IN ('identified', 'under_review') THEN 'impact_assessed'
             ELSE status
           END,
           assigned_to = COALESCE(assigned_to, $2),
           implementation_plan = COALESCE($3, implementation_plan),
           updated_at = NOW()
       WHERE change_id = $1`,
      [changeId, userId, response?.plan || null]
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    // 2. Update tenant notification acknowledged_at
    await safeQuery(
      `UPDATE "${schema}".regulatory_change_notifications
       SET acknowledged_at = NOW()
       WHERE change_id = $1 AND tenant_id = $2 AND acknowledged_at IS NULL`,
      [changeId, tenantId]
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    // 3. Store response details if provided
    if (response?.plan || response?.notes) {
      await safeQuery(
        `INSERT INTO "${schema}".regulatory_change_responses (
          change_id, tenant_id, responded_by, response_plan, response_notes,
          target_completion_date, responded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (change_id, tenant_id) DO UPDATE SET
          responded_by = $3, response_plan = COALESCE($4, regulatory_change_responses.response_plan),
          response_notes = COALESCE($5, regulatory_change_responses.response_notes),
          target_completion_date = COALESCE($6, regulatory_change_responses.target_completion_date),
          responded_at = NOW()`,
        [changeId, tenantId, userId, response.plan || null, response.notes || null, response.targetDate || null]
      ).catch(() => {
        // Table may not exist yet; gracefully skip
        logger.debug('[KSA Change Tracking] regulatory_change_responses table not available', { tenantId });
      });
    }

    // 4. Publish audit trail event
    await eventBus.publish(({
          eventType: 'regulatory_change_acknowledged',
          tenantId,
          sourceService: 'ksa_regulatory_change_tracking',
          entityType: 'regulatory_change',
          entityId: changeId,
          severity: 'info',
          payload: {
            changeId,
            acknowledgedBy: userId,
            acknowledgedAt: now,
            hasResponsePlan: !!(response?.plan),
          },
        } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

    logger.info('[KSA Change Tracking] Change acknowledged', {
      tenantId, changeId, userId,
    });

    return { acknowledged: true, acknowledgedAt: now };
  } catch (err) {
    logger.error('[KSA Change Tracking] acknowledgeChange failed', {
      tenantId, changeId, error: toErrorMessage(err),
    });
    return { acknowledged: false, acknowledgedAt: now };
  }
}

// ---------------------------------------------------------------------------
// 4. Assess Change Impact
// ---------------------------------------------------------------------------

/**
 * Detailed impact assessment for a specific regulatory change.
 * Identifies affected tenant controls, calculates compliance score delta,
 * and uses Claude AI to generate a detailed impact report with remediation plan.
 */
export async function assessChangeImpact(
  tenantId: string,
  changeId: string
): Promise<ChangeImpactAssessment> {
  const schema = tenantSchema(tenantId);
  const assessedAt = new Date().toISOString();

  try {
    // 1. Load the change record (try tenant-scoped first, then global)
    let changeRecord: any = null;

    const tenantChangeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, title, description, source_regulator, change_type, impact_level,
              affected_frameworks, affected_controls, affected_policies, effective_date
       FROM "${schema}".regulatory_changes
       WHERE change_id = $1`,
      [changeId]
    ), { tenantId: tenantId, operation: 'query regulatory_changes' });

    if (tenantChangeRes.rows.length > 0) {
      changeRecord = tenantChangeRes.rows[0];
    } else {
      const globalRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT change_id, regulation_name AS title, change_summary AS description,
                regulator_id AS source_regulator, change_type, impact_level,
                affected_domains AS affected_frameworks, affected_controls,
                effective_date
         FROM public.regulatory_changes WHERE change_id = $1`,
        [changeId]
      ), { tenantId: tenantId, operation: 'fallback query' });
      changeRecord = globalRes.rows[0] || null;
    }

    if (!changeRecord) {
      return {
        changeId,
        affectedControls: [],
        scoreBefore: 0,
        scoreAfter: 0,
        riskIncrease: 0,
        remediationPlan: [],
        aiReportEn: 'Change record not found.',
        aiReportAr: 'لم يتم العثور على سجل التغيير.',
        assessedAt,
      };
    }

    // 2. Find all tenant controls affected by the change
    const affectedFrameworks = parseJsonArraySafe(changeRecord.affected_frameworks);
    const affectedControlIds = parseJsonArraySafe(changeRecord.affected_controls);

    let affectedControls: AffectedControl[] = [];

    // Query controls that match affected frameworks or explicit control IDs
    if (affectedFrameworks.length > 0 || affectedControlIds.length > 0) {
      const controlsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT control_id, control_code, control_title, framework_id, implementation_status
         FROM "${schema}".controls
         WHERE (framework_id = ANY($1::text[]) OR control_id = ANY($2::text[]))
         ORDER BY control_code`,
        [affectedFrameworks, affectedControlIds]
      ), { tenantId: tenantId, operation: 'query controls' });

      affectedControls = controlsRes.rows.map((row: GenericRow) => ({
        controlId: row.control_id,
        controlCode: row.control_code || row.control_id,
        controlTitle: row.control_title || '',
        frameworkCode: row.framework_id || '',
        currentStatus: row.implementation_status || 'not_started',
        impactType: determineImpactType(changeRecord.change_type),
        gapIntroduced: row.implementation_status !== 'implemented' && row.implementation_status !== 'effective',
      }));
    }

    // 3. Calculate compliance score before/after
    const scoreRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ implemented: 0, total: 0 }]), safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(*) AS total
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()`,
      []
    ), { tenantId: tenantId, operation: 'query controls' });

    const implemented = parseInt((scoreRes as any).rows[0]?.implemented || '0', 10);
    const total = parseInt((scoreRes as any).rows[0]?.total || '0', 10);
    const scoreBefore = total > 0 ? Math.round((implemented / total) * 100) : 0;

    // Score after: assume gaps introduced reduce the implemented count
    const gapsIntroduced = affectedControls.filter(c => c.gapIntroduced).length;
    const adjustedImplemented = Math.max(0, implemented - gapsIntroduced);
    const scoreAfter = total > 0 ? Math.round((adjustedImplemented / total) * 100) : 0;
    const riskIncrease = Math.max(0, scoreBefore - scoreAfter);

    // 4. Use Claude AI for detailed impact report and remediation plan
    let aiReportEn = '';
    let aiReportAr = '';
    let remediationPlan: RemediationPlanItem[] = [];

    try {
      const { claudeJSON } = await import('../../../../ports/ai.port.js');
      const aiResult = await claudeJSON<{
        report_en: string;
        report_ar: string;
        remediation_steps: Array<{
          step: number;
          action_en: string;
          action_ar: string;
          control_id: string | null;
          estimated_days: number;
          priority: string;
        }>;
      }>({
        systemPrompt: `You are a KSA regulatory compliance expert analyzing the impact of a regulatory change on an organization's compliance posture.
Provide a detailed impact report in both English and Arabic, and a prioritized remediation plan.
Respond with JSON: {
  "report_en": "Detailed English impact report (2-3 paragraphs)",
  "report_ar": "Arabic impact report (2-3 paragraphs)",
  "remediation_steps": [{"step": 1, "action_en": "...", "action_ar": "...", "control_id": null, "estimated_days": 5, "priority": "high"}]
}`,
        userMessage: JSON.stringify({
          change: {
            title: changeRecord.title,
            description: changeRecord.description,
            type: changeRecord.change_type,
            impactLevel: changeRecord.impact_level,
            effectiveDate: changeRecord.effective_date,
            regulator: changeRecord.source_regulator,
          },
          impact: {
            affectedControlsCount: affectedControls.length,
            gapsIntroduced,
            scoreBefore,
            scoreAfter,
            riskIncrease,
            affectedControlSummary: affectedControls.slice(0, 20).map(c => ({
              code: c.controlCode,
              status: c.currentStatus,
              gapIntroduced: c.gapIntroduced,
            })),
          },
        }),
        maxTokens: 2048,
        temperature: 0.3,
        tenantId,
        agentId: 'ksa-regulatory-change-tracking',
        decisionType: 'change_impact_assessment',
      });

      if (!aiResult) throw new Error('AI response was null');

      aiReportEn = typeof aiResult.report_en === 'string' ? aiResult.report_en : '';
      aiReportAr = typeof aiResult.report_ar === 'string' ? aiResult.report_ar : '';
      const remediationSteps = Array.isArray(aiResult.remediation_steps) ? aiResult.remediation_steps : [];
      remediationPlan = remediationSteps.map((s) => ({
        step: typeof s?.step === 'number' ? s.step : 1,
        actionEn: typeof s?.action_en === 'string' ? s.action_en : '',
        actionAr: typeof s?.action_ar === 'string' ? s.action_ar : '',
        controlId: typeof s?.control_id === 'string' ? s.control_id : null,
        owner: null,
        estimatedDays: typeof s?.estimated_days === 'number' ? s.estimated_days : 5,
        priority: (s?.priority as RemediationPlanItem['priority']) || 'medium',
      }));
      if (aiReportEn.trim().length === 0) {
        aiReportEn = `Regulatory change "${changeRecord.title}" affects ${affectedControls.length} controls. Score impact: ${scoreBefore}% -> ${scoreAfter}%. ${gapsIntroduced} new gaps introduced.`;
      }
      if (aiReportAr.trim().length === 0) {
        aiReportAr = `التغيير التنظيمي "${changeRecord.title}" يؤثر على ${affectedControls.length} ضوابط. تأثير النتيجة: ${scoreBefore}% -> ${scoreAfter}%. تم إدخال ${gapsIntroduced} ثغرات جديدة.`;
      }
      if (remediationPlan.length === 0) {
        remediationPlan = generateRuleBasedRemediationPlan(affectedControls);
      }
    } catch (aiErr) {
      logger.warn('[KSA Change Tracking] AI impact assessment failed', {
        tenantId, changeId, error: toErrorMessage(aiErr),
      });
      aiReportEn = `Regulatory change "${changeRecord.title}" affects ${affectedControls.length} controls. Score impact: ${scoreBefore}% -> ${scoreAfter}%. ${gapsIntroduced} new gaps introduced.`;
      aiReportAr = `التغيير التنظيمي "${changeRecord.title}" يؤثر على ${affectedControls.length} ضوابط. تأثير النتيجة: ${scoreBefore}% -> ${scoreAfter}%. تم إدخال ${gapsIntroduced} ثغرات جديدة.`;
      remediationPlan = generateRuleBasedRemediationPlan(affectedControls);
    }

    // 5. Persist the assessment to the change record
    await safeQuery(
      `UPDATE "${schema}".regulatory_changes
       SET impact_assessment = $1,
           status = CASE WHEN status = 'identified' THEN 'impact_assessed' ELSE status END,
           updated_at = NOW()
       WHERE change_id = $2`,
      [JSON.stringify({ scoreBefore, scoreAfter, riskIncrease, gapsIntroduced, affectedControlsCount: affectedControls.length }), changeId]
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    // 6. Publish event for audit trail
    await eventBus.publish(({
          eventType: 'regulatory_change_assessed',
          tenantId,
          sourceService: 'ksa_regulatory_change_tracking',
          entityType: 'regulatory_change',
          entityId: changeId,
          severity: riskIncrease > 10 ? 'warning' : 'info',
          payload: { changeId, scoreBefore, scoreAfter, riskIncrease, affectedControlsCount: affectedControls.length },
        } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

    return {
      changeId,
      affectedControls,
      scoreBefore,
      scoreAfter,
      riskIncrease,
      remediationPlan,
      aiReportEn,
      aiReportAr,
      assessedAt,
    };
  } catch (err) {
    logger.error('[KSA Change Tracking] assessChangeImpact failed', {
      tenantId, changeId, error: toErrorMessage(err),
    });
    return {
      changeId,
      affectedControls: [],
      scoreBefore: 0,
      scoreAfter: 0,
      riskIncrease: 0,
      remediationPlan: [],
      aiReportEn: `Impact assessment failed: ${toErrorMessage(err)}`,
      aiReportAr: 'فشل تقييم الأثر.',
      assessedAt,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/** Parse a JSON string or array safely; returns empty array on failure. */
function parseJsonArraySafe(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

/** Classify impact level based on affected controls count. */
function classifyImpactLevel(affectedCount: number): 'critical' | 'high' | 'medium' | 'low' {
  if (affectedCount >= 50) return 'critical';
  if (affectedCount >= 20) return 'high';
  if (affectedCount >= 5) return 'medium';
  return 'low';
}

/** Estimate the compliance gap delta introduced by a change. */
function estimateGapDelta(impactLevel: string, affectedControlsCount: number): number {
  const multiplier: Record<string, number> = { critical: 0.8, high: 0.5, medium: 0.3, low: 0.1 };
  return Math.round(affectedControlsCount * (multiplier[impactLevel] || 0.2));
}

/** Determine the impact type on controls based on the change type. */
function determineImpactType(changeType: string): AffectedControl['impactType'] {
  switch (changeType) {
    case 'new':
    case 'new_regulation':
      return 'new_requirement';
    case 'amendment':
    case 'clarification':
      return 'modified_requirement';
    case 'repeal':
      return 'removed_requirement';
    case 'enforcement_update':
      return 'stricter_enforcement';
    default:
      return 'modified_requirement';
  }
}

/** Detect framework version changes by comparing current vs last-known versions. */
async function detectFrameworkVersionChanges(
  tenantId: string,
  schema: string,
  activeFrameworks: string[]
): Promise<DetectedChange[]> {
  const changes: DetectedChange[] = [];

  try {
    // Check if public.regulatory_frameworks has a version column
    const fwRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_code, version, last_updated
       FROM public.regulatory_frameworks
       WHERE framework_code = ANY($1::text[]) AND last_updated > NOW() - INTERVAL '90 days'`,
      [activeFrameworks]
    ), { tenantId: tenantId, operation: 'fallback query' });

    for (const row of fwRes.rows) {
      // Check if tenant already has this version tracked
      const existingRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT change_id FROM "${schema}".regulatory_changes
         WHERE affected_frameworks::text ILIKE $1 AND created_at > NOW() - INTERVAL '90 days'
         LIMIT 1`,
        [`%${row.framework_code}%`]
      ), { tenantId: tenantId, operation: 'query regulatory_changes' });

      if (existingRes.rows.length === 0 && row.last_updated) {
        changes.push({
          changeId: `auto-${row.framework_code as string}-${row.version as string || 'latest'}`,

          frameworkCode: row.framework_code as string,
          regulatorId: '',
          changeType: 'amendment',
          title: `Framework ${row.framework_code as string} updated to version ${row.version as string || 'latest'}`,
          summary: `Framework ${row.framework_code as string} has been updated. Review required.`,
          impactLevel: 'medium',
          affectedControlsCount: 0,
          complianceGapDelta: 0,

          effectiveDate: row.last_updated,
          status: 'pending_review',
          detectedAt: new Date().toISOString(),
        });
      }
    }
  } catch {
    // Framework version detection is best-effort
  }

  return changes;
}

/** Build an impact summary from a list of detected changes. */
function buildImpactSummary(changes: DetectedChange[]): ImpactSummary {
  const criticalCount = changes.filter(c => c.impactLevel === 'critical').length;
  const highCount = changes.filter(c => c.impactLevel === 'high').length;
  const mediumCount = changes.filter(c => c.impactLevel === 'medium').length;
  const lowCount = changes.filter(c => c.impactLevel === 'low').length;
  const totalAffectedControls = changes.reduce((sum, c) => sum + c.affectedControlsCount, 0);
  const totalGapDelta = changes.reduce((sum, c) => sum + c.complianceGapDelta, 0);

  return {
    totalChanges: changes.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalAffectedControls,
    estimatedComplianceImpact: totalGapDelta,
    aiSummaryEn: changes.length === 0
      ? 'No pending regulatory changes detected.'
      : `${changes.length} regulatory changes detected affecting ${totalAffectedControls} controls.`,
    aiSummaryAr: changes.length === 0
      ? 'لم يتم اكتشاف أي تغييرات تنظيمية معلقة.'
      : `تم اكتشاف ${changes.length} تغييرات تنظيمية تؤثر على ${totalAffectedControls} ضابط.`,
  };
}

/** Use Claude AI to generate a plain-language summary and recommended actions. */
async function generateAiSummaryAndActions(
  tenantId: string,
  changes: DetectedChange[],
  impact: ImpactSummary
): Promise<{ summaryEn: string; summaryAr: string; actions: RecommendedAction[] }> {
  if (changes.length === 0) {
    return {
      summaryEn: 'No pending regulatory changes detected.',
      summaryAr: 'لم يتم اكتشاف أي تغييرات تنظيمية معلقة.',
      actions: [],
    };
  }

  const { claudeJSON } = await import('../../../../ports/ai.port.js');

  const aiResult = await claudeJSON<{
    summary_en: string;
    summary_ar: string;
    actions: Array<{
      priority: number;
      action_type: string;
      description_en: string;
      description_ar: string;
      related_change_id: string;
      estimated_effort_days: number;
      due_date: string | null;
    }>;
  }>({
    systemPrompt: `You are a KSA regulatory compliance advisor. Analyze detected regulatory changes and provide:
1. An executive summary in English and Arabic
2. Prioritized recommended actions
Respond with JSON: {
  "summary_en": "Executive summary in English (2-3 sentences)",
  "summary_ar": "Executive summary in Arabic (2-3 sentences)",
  "actions": [{"priority": 1, "action_type": "review_controls|update_policy|conduct_assessment|train_staff|engage_regulator|remediate_gap", "description_en": "...", "description_ar": "...", "related_change_id": "...", "estimated_effort_days": 5, "due_date": null}]
}`,
    userMessage: JSON.stringify({
      changesCount: impact.totalChanges,
      criticalChanges: impact.criticalCount,
      highChanges: impact.highCount,
      totalAffectedControls: impact.totalAffectedControls,
      estimatedComplianceImpact: impact.estimatedComplianceImpact,
      topChanges: changes.slice(0, 10).map(c => ({
        id: c.changeId,
        title: c.title,
        type: c.changeType,
        impact: c.impactLevel,
        framework: c.frameworkCode,
        affectedControls: c.affectedControlsCount,
      })),
    }),
    maxTokens: 1536,
    temperature: 0.3,
    tenantId,
    agentId: 'ksa-regulatory-change-tracking',
    decisionType: 'change_tracking_summary',
  });

  if (!aiResult) {
    return {
      summaryEn: impact.aiSummaryEn,
      summaryAr: impact.aiSummaryAr,
      actions: generateRuleBasedActions(changes),
    };
  }

  const actions = Array.isArray(aiResult.actions) ? aiResult.actions : [];
  return {
    summaryEn: typeof aiResult.summary_en === 'string' && aiResult.summary_en ? aiResult.summary_en : impact.aiSummaryEn,
    summaryAr: typeof aiResult.summary_ar === 'string' && aiResult.summary_ar ? aiResult.summary_ar : impact.aiSummaryAr,
    actions: actions.map((a) => ({
      priority: typeof a?.priority === 'number' ? a.priority : 1,
      actionType: (a?.action_type as RecommendedAction['actionType']) || 'review_controls',
      descriptionEn: typeof a?.description_en === 'string' ? a.description_en : '',
      descriptionAr: typeof a?.description_ar === 'string' ? a.description_ar : '',
      relatedChangeId: typeof a?.related_change_id === 'string' && a.related_change_id
        ? a.related_change_id
        : (changes[0]?.changeId || ''),
      estimatedEffortDays: typeof a?.estimated_effort_days === 'number' ? a.estimated_effort_days : 5,
      dueDate: typeof a?.due_date === 'string' && a.due_date ? a.due_date : null,
    })),
  };
}

/** Rule-based fallback for action recommendations when AI is unavailable. */
function generateRuleBasedActions(changes: DetectedChange[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  let priority = 1;

  const critical = changes.filter(c => c.impactLevel === 'critical');
  if (critical.length > 0) {
    actions.push({
      priority: priority++,
      actionType: 'conduct_assessment',
      descriptionEn: `Urgently assess ${critical.length} critical regulatory change(s) and determine compliance gaps.`,
      descriptionAr: `تقييم عاجل لـ ${critical.length} تغيير(ات) تنظيمية حرجة وتحديد ثغرات الامتثال.`,
      relatedChangeId: critical[0]!.changeId,
      estimatedEffortDays: 3,
      dueDate: null,
    });
  }

  const withGaps = changes.filter(c => c.complianceGapDelta > 0);
  if (withGaps.length > 0) {
    actions.push({
      priority: priority++,
      actionType: 'remediate_gap',
      descriptionEn: `Remediate compliance gaps introduced by ${withGaps.length} regulatory change(s).`,
      descriptionAr: `معالجة ثغرات الامتثال الناتجة عن ${withGaps.length} تغيير(ات) تنظيمية.`,
      relatedChangeId: withGaps[0]!.changeId,
      estimatedEffortDays: 10,
      dueDate: null,
    });
  }

  if (changes.length > 0) {
    actions.push({
      priority: priority++,
      actionType: 'review_controls',
      descriptionEn: 'Review all affected controls and update implementation status.',
      descriptionAr: 'مراجعة جميع الضوابط المتأثرة وتحديث حالة التنفيذ.',
      relatedChangeId: changes[0]!.changeId,
      estimatedEffortDays: 5,
      dueDate: null,
    });
  }

  return actions;
}

/** Rule-based fallback remediation plan when AI is unavailable. */
function generateRuleBasedRemediationPlan(affectedControls: AffectedControl[]): RemediationPlanItem[] {
  const plan: RemediationPlanItem[] = [];
  let step = 1;

  const gapControls = affectedControls.filter(c => c.gapIntroduced);

  if (gapControls.length > 0) {
    plan.push({
      step: step++,
      actionEn: `Review and assess ${gapControls.length} controls with newly introduced gaps.`,
      actionAr: `مراجعة وتقييم ${gapControls.length} ضوابط بها ثغرات مستحدثة.`,
      controlId: gapControls[0]?.controlId || null,
      owner: null,
      estimatedDays: Math.max(3, gapControls.length),
      priority: gapControls.length > 10 ? 'critical' : 'high',
    });
  }

  plan.push({
    step: step++,
    actionEn: 'Update control implementations to align with new regulatory requirements.',
    actionAr: 'تحديث تطبيقات الضوابط لتتوافق مع المتطلبات التنظيمية الجديدة.',
    controlId: null,
    owner: null,
    estimatedDays: 10,
    priority: 'high',
  });

  plan.push({
    step: step++,
    actionEn: 'Collect and update evidence to demonstrate compliance with revised requirements.',
    actionAr: 'جمع وتحديث الأدلة لإثبات الامتثال للمتطلبات المعدلة.',
    controlId: null,
    owner: null,
    estimatedDays: 7,
    priority: 'medium',
  });

  return plan;
}
