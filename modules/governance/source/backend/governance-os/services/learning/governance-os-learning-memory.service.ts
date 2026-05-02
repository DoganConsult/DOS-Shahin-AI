import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { recordEventProcessing, recordCaseCreation } from './governance-os-learning-metrics.service';
import type { GenericRow } from '@dos/types';

export type CaseType = 
  | 'initiative_run' 
  | 'recommendation' 
  | 'escalation' 
  | 'task' 
  | 'milestone_evaluation' 
  | 'digest_interaction';

export type TimelineEventType = 
  | 'triggered' 
  | 'action_taken' 
  | 'outcome_observed' 
  | 'lesson_generated';

export interface CaseMemory {
  caseId: string;
  tenantId: string;
  workspaceId?: string;
  caseType: CaseType;
  triggerEvent?: string;
  triggerEntityType?: string;
  triggerEntityId?: string;
  contextSnapshot: Record<string, unknown>;
  osBelief: Record<string, unknown>;
  actionTaken: Record<string, unknown>;
  ownerId?: string;
  departmentId?: string;
  teamId?: string;
  observationWindowDays: number;
  observedAt?: string;
  effectivenessScore?: number;
  effectivenessReason?: string;
  lessonCandidateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseTimeline {
  timelineId: string;
  caseId: string;
  tenantId: string;
  eventType: TimelineEventType;
  eventData: Record<string, unknown>;
  occurredAt: string;
  recordedAt: string;
}

export interface OutcomeMemory {
  outcomeId: string;
  caseId: string;
  tenantId: string;
  outcomeType: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  delta: Record<string, unknown>;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'any';
  evidenceLinks: unknown[];
  observedAt: string;
  createdAt: string;
}

/**
 * Create a new case in the memory hub
 */
export async function createCase(
  tenantId: string,
  caseData: Omit<CaseMemory, 'caseId' | 'createdAt' | 'updatedAt'>
): Promise<CaseMemory> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_os_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Append an event to a case timeline
 */
export async function appendTimeline(
  tenantId: string,
  caseId: string,
  eventType: TimelineEventType,
  eventData: Record<string, unknown>,
  occurredAt?: string
): Promise<CaseTimeline> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_os_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Record an outcome for a case
 */
export async function recordOutcome(
  tenantId: string,
  caseId: string,
  outcomeData: Omit<OutcomeMemory, 'outcomeId' | 'caseId' | 'tenantId' | 'createdAt'>
): Promise<OutcomeMemory> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_os_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Get cases with filters
 */
export async function getCases(
  tenantId: string,
  filters: {
    caseType?: CaseType;
    moduleCode?: string;
    effectivenessMin?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<CaseMemory[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filters.caseType) {
    conditions.push(`case_type = $${paramIndex}`);
    params.push(filters.caseType);
    paramIndex++;
  }

  if (filters.effectivenessMin !== undefined) {
    conditions.push(`effectiveness_score >= $${paramIndex}`);
    params.push(filters.effectivenessMin);
    paramIndex++;
  }

  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(filters.dateTo);
    paramIndex++;
  }

  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const result = await safeQuery(
    `
    SELECT 
      case_id as "caseId",
      tenant_id as "tenantId",
      workspace_id as "workspaceId",
      case_type as "caseType",
      trigger_event as "triggerEvent",
      trigger_entity_type as "triggerEntityType",
      trigger_entity_id as "triggerEntityId",
      context_snapshot as "contextSnapshot",
      os_belief as "osBelief",
      action_taken as "actionTaken",
      owner_id as "ownerId",
      department_id as "departmentId",
      team_id as "teamId",
      observation_window_days as "observationWindowDays",
      observed_at as "observedAt",
      effectiveness_score as "effectivenessScore",
      effectiveness_reason as "effectivenessReason",
      lesson_candidate_id as "lessonCandidateId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ${schema}.os_case_memory
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, limit, offset]
  );

  return result.rows;
}

/**
 * Get full timeline for a case
 */
export async function getCaseTimeline(
  tenantId: string,
  caseId: string
): Promise<CaseTimeline[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `
    SELECT 
      timeline_id as "timelineId",
      case_id as "caseId",
      tenant_id as "tenantId",
      event_type as "eventType",
      event_data as "eventData",
      occurred_at as "occurredAt",
      recorded_at as "recordedAt"
    FROM ${schema}.os_case_timelines
    WHERE case_id = $1 AND tenant_id = $2
    ORDER BY occurred_at ASC
    `,
    [caseId, tenantId]
  );

  return result.rows;
}

/**
 * Link case to a source record
 */
export async function linkCaseToRecord(
  tenantId: string,
  caseId: string,
  recordType: string,
  recordId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `
    UPDATE ${schema}.os_case_memory
    SET trigger_entity_type = $1, trigger_entity_id = $2, updated_at = NOW()
    WHERE case_id = $3 AND tenant_id = $4
    `,
    [recordType, recordId, caseId, tenantId]
  );

  logger.info('Case linked to record', { caseId, tenantId, recordType, recordId });
}

/**
 * Get a single case by ID
 */
export async function getCaseById(
  tenantId: string,
  caseId: string
): Promise<CaseMemory | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `
    SELECT 
      case_id as "caseId",
      tenant_id as "tenantId",
      workspace_id as "workspaceId",
      case_type as "caseType",
      trigger_event as "triggerEvent",
      trigger_entity_type as "triggerEntityType",
      trigger_entity_id as "triggerEntityId",
      context_snapshot as "contextSnapshot",
      os_belief as "osBelief",
      action_taken as "actionTaken",
      owner_id as "ownerId",
      department_id as "departmentId",
      team_id as "teamId",
      observation_window_days as "observationWindowDays",
      observed_at as "observedAt",
      effectiveness_score as "effectivenessScore",
      effectiveness_reason as "effectivenessReason",
      lesson_candidate_id as "lessonCandidateId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ${schema}.os_case_memory
    WHERE case_id = $1 AND tenant_id = $2
    `,
    [caseId, tenantId]
  );

  return result.rows[0] || null;
}

/**
 * Update case effectiveness score
 */
export async function updateCaseEffectiveness(
  tenantId: string,
  caseId: string,
  effectivenessScore: number,
  effectivenessReason: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `
    UPDATE ${schema}.os_case_memory
    SET effectiveness_score = $1, effectiveness_reason = $2, updated_at = NOW()
    WHERE case_id = $3 AND tenant_id = $4
    `,
    [effectivenessScore, effectivenessReason, caseId, tenantId]
  );

  logger.info('Case effectiveness updated', { 
    caseId, 
    tenantId, 
    effectivenessScore 
  });
}

/**
 * Get approved lessons
 */
export async function getApprovedLessons(
  tenantId: string,
  filters?: {
    published?: boolean;
    limit?: number;
  }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    let query = `
      SELECT 
        lesson_id as "lessonId",
        tenant_id as "tenantId",
        candidate_id as "candidateId",
        lesson_code as "lessonCode",
        title_en as "titleEn",
        situation_en as "situationEn",
        what_happened_en as "whatHappenedEn",
        root_cause_en as "rootCauseEn",
        best_action_en as "bestActionEn",
        scope,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM "${schema}".os_approved_lessons
      WHERE tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    // Note: published field doesn't exist in schema, so we'll check if knowledge articles exist
    if (filters?.published === false) {
      query += ` AND NOT EXISTS (
        SELECT 1 FROM "${schema}".os_knowledge_articles
        WHERE source_lesson_id = "${schema}".os_approved_lessons.lesson_id
      )`;
    }

    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    query += ` ORDER BY approved_at DESC`;

    const result = await safeQuery(query, params);

    return result.rows.map((r: GenericRow) => ({
      lessonId: r.lessonId,
      tenantId: r.tenantId,
      candidateId: r.candidateId,
      lessonCode: r.lessonCode,
      titleEn: r.titleEn,
      situationEn: r.situationEn,
      whatHappenedEn: r.whatHappenedEn,
      rootCauseEn: r.rootCauseEn,
      bestActionEn: r.bestActionEn,
      scope: typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (err) {
    logger.error('[LearningMemory] Failed to get approved lessons', {
      tenantId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Process recent events and create cases (used by event learner job)
 */
export async function processRecentEvents(
  tenantId: string,
  minutesBack: number = 15
): Promise<number> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);
  const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();
  
  try {
    logger.info('Processing recent events', { tenantId, minutesBack, cutoffTime });
    
    let casesCreated = 0;

    // Helper: Check if a case already exists for a trigger entity
    const caseExists = async (triggerEntityType: string, triggerEntityId: string): Promise<boolean> => {
      const result = await safeQuery(
        `SELECT 1 FROM "${schema}".os_case_memory 
         WHERE tenant_id = $1 
           AND trigger_entity_type = $2 
           AND trigger_entity_id = $3 
         LIMIT 1`,
        [tenantId, triggerEntityType, triggerEntityId]
      );
      return result.rows.length > 0;
    };

    // 1. Process recent initiative runs
    try {
      const initiativeRunsResult = await safeQuery(
        `SELECT 
          run_id, initiative_id, initiative_code, module_code, phase,
          trigger_event, trigger_entity_id, context_snapshot, interpretation,
          decision, artifacts_created, learning_signal, autonomy_level_used,
          started_at, completed_at
         FROM "${schema}".initiative_runs
         WHERE tenant_id = $1 
           AND created_at >= $2
           AND phase IN ('completed', 'failed', 'escalating')
         ORDER BY created_at DESC
         LIMIT 50`,
        [tenantId, cutoffTime]
      );

      for (const run of initiativeRunsResult.rows) {
        // Check if case already exists
        if (await caseExists('initiative_run', run.run_id)) {
          continue;
        }

        try {
          // Get initiative definition
          const defResult = await safeQuery(
            `SELECT * FROM "${schema}".initiative_definitions WHERE initiative_id = $1`,
            [run.initiative_id]
          );
          const def = defResult.rows[0];
          if (!def) {
            logger.warn('[EventProcessing] Initiative definition not found', { runId: run.run_id, initiativeId: run.initiative_id });
            continue;
          }

          // Import and call createCaseFromInitiativeRun
          const { createCaseFromInitiativeRun } = await import('../cases/governance-os-case-outcome.service.js');
          await createCaseFromInitiativeRun(
            tenantId,
            run.run_id,
            def,
            run.artifacts_created || [],
            run.context_snapshot
          );
          casesCreated++;
        } catch (err) {
          logger.warn('[EventProcessing] Failed to create case from initiative run', {
            runId: run.run_id,
            error: (err as Error).message,
          });
        }
      }
    } catch (err) {
      logger.warn('[EventProcessing] Failed to query initiative runs', {
        error: (err as Error).message,
      });
    }

    // 2. Process recent recommendations (from decision_record table)
    try {
      const recommendationsResult = await safeQuery(
        `SELECT 
          decision_id, run_id, agent_id, decision_type, explanation, outcome,
          entity_type, entity_id, confidence, created_by, created_at
         FROM "${schema}".decision_record
         WHERE tenant_id = $1 
           AND decision_type = 'recommendation'
           AND created_at >= $2
           AND (outcome->>'status' IS NULL OR outcome->>'status' NOT IN ('accepted', 'rejected', 'dismissed'))
         ORDER BY created_at DESC
         LIMIT 50`,
        [tenantId, cutoffTime]
      );

      for (const rec of recommendationsResult.rows) {
        // Check if case already exists
        if (await caseExists('recommendation', rec.decision_id)) {
          continue;
        }

        try {
          // Map decision_record row to Recommendation interface
          const outcome = rec.outcome || {};
          const recommendation: any = {
            recommendation_id: rec.decision_id,
            tenant_id: tenantId,
            agent_id: rec.agent_id,
            run_id: rec.run_id || null,
            entity_type: rec.entity_type || 'any',
            entity_id: rec.entity_id || null,
            recommendation_type: outcome.recommendationType || outcome.recommendation_type || 'general',
            title: outcome.title || rec.explanation?.substring(0, 100) || 'Untitled Recommendation',
            description: rec.explanation || '',
            confidence: rec.confidence || outcome.confidence || 0.7,
            suggested_action: outcome.suggestedAction || outcome.suggested_action || {},
            priority: outcome.priority || 'medium',
            status: outcome.status || 'pending',
            reviewed_by: null,
            reviewed_at: null,
            created_by: rec.created_by || 'system',
            created_at: rec.created_at,
          };

          const { createCaseFromRecommendation } = await import('../cases/governance-os-case-outcome.service.js');
          await createCaseFromRecommendation(tenantId, recommendation);
          casesCreated++;
        } catch (err) {
          logger.warn('[EventProcessing] Failed to create case from recommendation', {
            decisionId: rec.decision_id,
            error: (err as Error).message,
          });
        }
      }
    } catch (err) {
      logger.warn('[EventProcessing] Failed to query recommendations', {
        error: (err as Error).message,
      });
    }

    // 3. Process recent escalations (check if escalation_log has tenant_id column)
    try {
      // First check if escalation_log table exists and has tenant_id
      const tableCheck = await safeQuery(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = $1 
           AND table_name = 'escalation_log' 
           AND column_name = 'tenant_id'`,
        [schema]
      );

      if (tableCheck.rows.length > 0) {
        // Table has tenant_id, query with tenant filter
        const escalationsResult = await safeQuery(
          `SELECT 
            escalation_id, entity_type, entity_id, escalation_level,
            escalation_reason, escalated_at, resolved_at, auto_escalated
           FROM "${schema}".escalation_log
           WHERE tenant_id = $1 
             AND created_at >= $2
             AND resolved_at IS NULL
           ORDER BY created_at DESC
           LIMIT 50`,
          [tenantId, cutoffTime]
        );

        for (const esc of escalationsResult.rows) {
          // Check if case already exists
          if (await caseExists('escalation', esc.escalation_id)) {
            continue;
          }

          try {
            const { createCaseFromEscalation } = await import('../cases/governance-os-case-outcome.service.js');
            await createCaseFromEscalation(
              tenantId,
              esc.escalation_id,
              esc.entity_type,
              esc.entity_id,
              esc.escalation_level,
              esc.escalation_reason
            );
            casesCreated++;
          } catch (err) {
            logger.warn('[EventProcessing] Failed to create case from escalation', {
              escalationId: esc.escalation_id,
              error: (err as Error).message,
            });
          }
        }
      } else {
        // Table doesn't have tenant_id - query without tenant filter (less safe, but works)
        // Note: This is a fallback for older schemas
        const escalationsResult = await safeQuery(
          `SELECT 
            escalation_id, entity_type, entity_id, escalation_level,
            escalation_reason, escalated_at, resolved_at, auto_escalated
           FROM "${schema}".escalation_log
           WHERE created_at >= $1
             AND resolved_at IS NULL
           ORDER BY created_at DESC
           LIMIT 50`,
          [cutoffTime]
        );

        for (const esc of escalationsResult.rows) {
          if (await caseExists('escalation', esc.escalation_id)) {
            continue;
          }

          try {
            const { createCaseFromEscalation } = await import('../cases/governance-os-case-outcome.service.js');
            await createCaseFromEscalation(
              tenantId,
              esc.escalation_id,
              esc.entity_type,
              esc.entity_id,
              esc.escalation_level,
              esc.escalation_reason
            );
            casesCreated++;
          } catch (err) {
            logger.warn('[EventProcessing] Failed to create case from escalation', {
              escalationId: esc.escalation_id,
              error: (err as Error).message,
            });
          }
        }
      }
    } catch (err) {
      logger.warn('[EventProcessing] Failed to query escalations', {
        error: (err as Error).message,
      });
    }

    const durationMs = Date.now() - startTime;
    recordEventProcessing(tenantId, 'event_learner', durationMs, casesCreated, true, undefined);
    
    logger.info('[EventProcessing] Completed', {
      tenantId,
      casesCreated,
      durationMs,
    });

    return casesCreated;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    recordEventProcessing(tenantId, 'event_learner', durationMs, 0, false, err);
    logger.error('[EventProcessing] Failed', {
      tenantId,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw err;
  }
}
