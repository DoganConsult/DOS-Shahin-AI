import { logger } from '../../../ports/logger.port';
// ============================================================
// Agent Lessons Learned Tracker
// Tracks what agents learn from their experiences, patterns, and outcomes
// ============================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';

export interface LessonLearned {
  lessonId: string;
  tenantId: string;
  agentId: string;
  category: 'success' | 'failure' | 'optimization' | 'pattern' | 'insight';
  title: string;
  description: string;
  context: Record<string, unknown>;
  outcome: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  applicableScenarios: string[];
  confidence: number; // 0-1, how confident we are this lesson is valid
  learnedAt: string;
  appliedCount: number;
  lastAppliedAt?: string;
  verified: boolean; // Has this lesson been verified through multiple applications?
}

export interface LessonApplication {
  applicationId: string;
  lessonId: string;
  agentId: string;
  runId: string;
  scenario: string;
  outcome: 'success' | 'failure' | 'partial';
  appliedAt: string;
  notes?: string;
}

/**
 * Record a lesson learned from an agent experience
 */
export async function recordLessonLearned(
  tenantId: string,
  agentId: string,
  lesson: {
    category: LessonLearned['category'];
    title: string;
    description: string;
    context: Record<string, unknown>;
    outcome: LessonLearned['outcome'];
    impact: LessonLearned['impact'];
    applicableScenarios: string[];
    confidence?: number;
  },
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const lessonId = `lesson_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_lessons_learned (
        lesson_id, tenant_id, agent_id, category, title, description, context,
        outcome, impact, applicable_scenarios, confidence, learned_at, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), false)`,
      [
        lessonId,
        tenantId,
        agentId,
        lesson.category,
        lesson.title,
        lesson.description,
        JSON.stringify(lesson.context),
        lesson.outcome,
        lesson.impact,
        lesson.applicableScenarios,
        lesson.confidence || 0.5,
      ],
    );

    return lessonId;
  } catch (err: unknown) {
    logger.error(`[AgentLessonsLearned] Failed to record lesson: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Get lessons learned for an agent
 */
export async function getAgentLessons(
  tenantId: string,
  agentId: string,
  options?: {
    category?: LessonLearned['category'];
    verified?: boolean;
    limit?: number;
  },
): Promise<LessonLearned[]> {
  const schema = tenantSchema(tenantId);

  try {
    let query = `SELECT lesson_id, tenant_id, agent_id, category, title, description, context,
                        outcome, impact, applicable_scenarios, confidence, learned_at,
                        verified, applied_count, last_applied_at
                 FROM "${schema}".agent_lessons_learned
                 WHERE agent_id = $1`;
    const params: unknown[] = [agentId];
    let paramIndex = 2;

    if (options?.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(options.category);
      paramIndex++;
    }

    if (options?.verified !== undefined) {
      query += ` AND verified = $${paramIndex}`;
      params.push(options.verified);
      paramIndex++;
    }

    query += ` ORDER BY learned_at DESC`;

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }

    const result = await safeQuery(query, params);

    return result.rows.map((row) => ({
      lessonId: row.lesson_id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      category: row.category,
      title: row.title,
      description: row.description,
      context: row.context ? JSON.parse(row.context) : {},
      outcome: row.outcome,
      impact: row.impact,
      applicableScenarios: row.applicable_scenarios || [],
      confidence: row.confidence || 0,
      learnedAt: row.learned_at,
      appliedCount: row.applied_count || 0,
      lastAppliedAt: row.last_applied_at || undefined,
      verified: row.verified || false,
    }));
  } catch (err: unknown) {
    logger.error(`[AgentLessonsLearned] Failed to get lessons: ${toErrorMessage(err)}`);
    return [];
  }
}

/**
 * Apply a lesson learned to a new scenario
 */
export async function applyLesson(
  tenantId: string,
  agentId: string,
  runId: string,
  lessonId: string,
  scenario: string,
  outcome: 'success' | 'failure' | 'partial',
  notes?: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const applicationId = `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_lesson_applications (
        application_id, lesson_id, agent_id, run_id, scenario, outcome, notes, applied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [applicationId, lessonId, agentId, runId, scenario, outcome, notes || null],
    );

    // Update lesson's applied count and last applied date
    await safeQuery(
      `UPDATE "${schema}".agent_lessons_learned
       SET applied_count = applied_count + 1, last_applied_at = NOW()
       WHERE lesson_id = $1`,
      [lessonId],
    );

    // If lesson has been applied successfully 3+ times, mark as verified
    const lessonResult = await safeQuery(
      `SELECT applied_count FROM "${schema}".agent_lessons_learned WHERE lesson_id = $1`,
      [lessonId],
    );
    if (lessonResult.rows[0]?.applied_count >= 3 && outcome === 'success') {
      await safeQuery(
        `UPDATE "${schema}".agent_lessons_learned SET verified = true WHERE lesson_id = $1`,
        [lessonId],
      );
    }

    return applicationId;
  } catch (err: unknown) {
    logger.error(`[AgentLessonsLearned] Failed to apply lesson: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Get relevant lessons for a scenario
 */
export async function getRelevantLessons(
  tenantId: string,
  agentId: string,
  scenario: string,
  limit: number = 5,
): Promise<LessonLearned[]> {
  const schema = tenantSchema(tenantId);

  try {
    // Find lessons where the scenario matches applicable scenarios
    const result = await safeQuery(
      `SELECT lesson_id, tenant_id, agent_id, category, title, description, context,
              outcome, impact, applicable_scenarios, confidence, learned_at,
              verified, applied_count, last_applied_at
       FROM "${schema}".agent_lessons_learned
       WHERE agent_id = $1 AND ($2 = ANY(applicable_scenarios) OR applicable_scenarios = '{}')
       ORDER BY verified DESC, confidence DESC, applied_count DESC
       LIMIT $3`,
      [agentId, scenario, limit],
    );

    return result.rows.map((row) => ({
      lessonId: row.lesson_id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      category: row.category,
      title: row.title,
      description: row.description,
      context: row.context ? JSON.parse(row.context) : {},
      outcome: row.outcome,
      impact: row.impact,
      applicableScenarios: row.applicable_scenarios || [],
      confidence: row.confidence || 0,
      learnedAt: row.learned_at,
      appliedCount: row.applied_count || 0,
      lastAppliedAt: row.last_applied_at || undefined,
      verified: row.verified || false,
    }));
  } catch (err: unknown) {
    logger.error(`[AgentLessonsLearned] Failed to get relevant lessons: ${toErrorMessage(err)}`);
    return [];
  }
}

/**
 * Extract lessons from agent execution results
 */
export async function extractLessonsFromExecution(
  tenantId: string,
  agentId: string,
  runId: string,
  executionResult: {
    actionsExecuted: number;
    actionsVerified: number;
    actionsFailed: number;
    discoveries: Array<{ type: string; summary: string; severity: string }>;
    durationMs: number;
  },
): Promise<void> {
  try {
    // Extract success lessons
    if (executionResult.actionsVerified > 0 && executionResult.actionsExecuted > 0) {
      const successRate = executionResult.actionsVerified / executionResult.actionsExecuted;
      if (successRate >= 0.9) {
        await recordLessonLearned(tenantId, agentId, {
          category: 'success',
          title: `High verification rate achieved (${Math.round(successRate * 100)}%)`,
          description: `Agent achieved ${executionResult.actionsVerified} verified actions out of ${executionResult.actionsExecuted} executed`,
          context: { runId, successRate, actionsExecuted: executionResult.actionsExecuted },
          outcome: 'positive',
          impact: 'high',
          applicableScenarios: ['action_execution', 'verification'],
          confidence: 0.8,
        });
      }
    }

    // Extract failure lessons
    if (executionResult.actionsFailed > 0) {
      await recordLessonLearned(tenantId, agentId, {
        category: 'failure',
        title: `Action execution failures detected (${executionResult.actionsFailed} failed)`,
        description: `Agent encountered ${executionResult.actionsFailed} failed actions in this run`,
        context: { runId, actionsFailed: executionResult.actionsFailed, totalActions: executionResult.actionsExecuted },
        outcome: 'negative',
        impact: 'medium',
        applicableScenarios: ['action_execution', 'error_handling'],
        confidence: 0.7,
      });
    }

    // Extract pattern lessons from discoveries
    for (const discovery of executionResult.discoveries) {
      if (discovery.severity === 'critical' || discovery.severity === 'high') {
        await recordLessonLearned(tenantId, agentId, {
          category: 'pattern',
          title: `Critical discovery pattern: ${discovery.type}`,
          description: discovery.summary,
          context: { runId, discoveryType: discovery.type, severity: discovery.severity },
          outcome: 'neutral',
          impact: discovery.severity === 'critical' ? 'high' : 'medium',
          applicableScenarios: [discovery.type, 'discovery'],
          confidence: 0.6,
        });
      }
    }

    // Extract optimization lessons
    if (executionResult.durationMs > 0) {
      const avgActionTime = executionResult.durationMs / executionResult.actionsExecuted;
      if (avgActionTime < 1000) {
        await recordLessonLearned(tenantId, agentId, {
          category: 'optimization',
          title: 'Fast execution pattern identified',
          description: `Average action execution time: ${Math.round(avgActionTime)}ms`,
          context: { runId, avgActionTime, totalDuration: executionResult.durationMs },
          outcome: 'positive',
          impact: 'low',
          applicableScenarios: ['performance', 'optimization'],
          confidence: 0.5,
        });
      }
    }
  } catch (err: unknown) {
    logger.error(`[AgentLessonsLearned] Failed to extract lessons: ${toErrorMessage(err)}`);
  }
}
