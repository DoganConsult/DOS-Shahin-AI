import { logger } from '../../../ports/logger.port';
// ============================================================
// Agent Learning Curve Tracker
// Tracks agent performance improvements over time, learning patterns, and skill development
// ============================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getAgentTaskMetrics } from '../../activity/agent-task-tracker.service';

export interface LearningPoint {
  timestamp: string;
  metric: string;
  value: number;
  context?: Record<string, unknown>;
}

export interface LearningCurve {
  agentId: string;
  tenantId: string;
  period: 'day' | 'week' | 'month';
  points: LearningPoint[];
  trend: 'improving' | 'declining' | 'stable';
  improvementRate: number; // percentage change over period
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number; // 0-1, how confident we are in the skill level
}

export interface AgentSkill {
  skillName: string;
  currentLevel: number; // 0-100
  maxLevel: number; // 0-100
  experiencePoints: number;
  lastImprovedAt?: string;
  improvementRate: number; // points per day
}

export interface AgentLearningProfile {
  agentId: string;
  tenantId: string;
  overallSkillLevel: number; // 0-100
  skills: AgentSkill[];
  learningVelocity: number; // rate of improvement
  lessonsLearned: number;
  successfulPatterns: string[];
  failedPatterns: string[];
  lastLearningEvent?: string;
}

/**
 * Record a learning event (successful pattern, failed pattern, or skill improvement)
 */
export async function recordLearningEvent(
  tenantId: string,
  agentId: string,
  eventType: 'success' | 'failure' | 'skill_improvement' | 'pattern_discovered',
  data: {
    metric?: string;
    value?: number;
    pattern?: string;
    skillName?: string;
    skillLevel?: number;
    context?: Record<string, unknown>;
  },
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_learning_events (
        tenant_id, agent_id, event_type, metric, value, pattern, skill_name, skill_level, context, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        tenantId,
        agentId,
        eventType,
        data.metric || null,
        data.value || null,
        data.pattern || null,
        data.skillName || null,
        data.skillLevel || null,
        data.context ? JSON.stringify(data.context) : null,
      ],
    );
  } catch (err: unknown) {
    logger.error(`[AgentLearningCurve] Failed to record learning event: ${toErrorMessage(err)}`);
  }
}

/**
 * Calculate learning curve for an agent over a time period
 */
export async function calculateLearningCurve(
  tenantId: string,
  agentId: string,
  period: 'day' | 'week' | 'month' = 'week',
  metric: 'success_rate' | 'verification_rate' | 'average_duration' | 'task_count' = 'success_rate',
): Promise<LearningCurve> {
  const schema = tenantSchema(tenantId);

  try {
    // Get task metrics over time
    const interval = period === 'day' ? '1 day' : period === 'week' ? '7 days' : '30 days';
    const result = await safeQuery(
      `SELECT 
        DATE_TRUNC($1, started_at) as period_start,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms
       FROM "${schema}".agent_tasks
       WHERE agent_id = $2 AND started_at > NOW() - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC($1, started_at)
       ORDER BY period_start ASC`,
      [period === 'day' ? 'day' : period === 'week' ? 'week' : 'month', agentId],
    );

    const points: LearningPoint[] = [];

    for (const row of result.rows) {
      let value = 0;
      if (metric === 'success_rate') {
        const total = parseInt(row.total_tasks || '0', 10);
        const completed = parseInt(row.completed_tasks || '0', 10);
        value = total > 0 ? completed / total : 0;
      } else if (metric === 'verification_rate') {
        const completed = parseInt(row.completed_tasks || '0', 10);
        const verified = parseInt(row.verified_tasks || '0', 10);
        value = completed > 0 ? verified / completed : 0;
      } else if (metric === 'average_duration') {
        value = row.avg_duration_ms ? row.avg_duration_ms / 1000 : 0; // Convert to seconds
      } else {
        value = parseInt(row.total_tasks || '0', 10);
      }

      points.push({
        timestamp: row.period_start,
        metric,
        value,
        context: {
          totalTasks: parseInt(row.total_tasks || '0', 10),
          completedTasks: parseInt(row.completed_tasks || '0', 10),
          verifiedTasks: parseInt(row.verified_tasks || '0', 10),
        },
      });
    }

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let improvementRate = 0;

    if (points.length >= 2) {
      const firstValue = points[0].value;
      const lastValue = points[points.length - 1].value;
      const change = lastValue - firstValue;
      improvementRate = firstValue > 0 ? (change / firstValue) * 100 : 0;

      if (improvementRate > 5) {
        trend = 'improving';
      } else if (improvementRate < -5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    // Determine skill level based on current performance
    const currentMetrics = await getAgentTaskMetrics(tenantId, agentId, 7);
    const skillLevel = determineSkillLevel(currentMetrics);
    const confidence = calculateConfidence(points.length, currentMetrics.totalTasks);

    return {
      agentId,
      tenantId,
      period,
      points,
      trend,
      improvementRate,
      skillLevel,
      confidence,
    };
  } catch (err: unknown) {
    logger.error(`[AgentLearningCurve] Failed to calculate learning curve: ${toErrorMessage(err)}`);
    return {
      agentId,
      tenantId,
      period,
      points: [],
      trend: 'stable',
      improvementRate: 0,
      skillLevel: 'beginner',
      confidence: 0,
    };
  }
}

/**
 * Determine agent skill level based on performance metrics
 */
function determineSkillLevel(metrics: {
  successRate: number;
  verificationRate: number;
  totalTasks: number;
}): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (metrics.totalTasks < 10) return 'beginner';

  const score = metrics.successRate * 0.5 + metrics.verificationRate * 0.5;

  if (score >= 0.95 && metrics.totalTasks >= 100) return 'expert';
  if (score >= 0.85 && metrics.totalTasks >= 50) return 'advanced';
  if (score >= 0.70 && metrics.totalTasks >= 20) return 'intermediate';
  return 'beginner';
}

/**
 * Calculate confidence in skill level assessment
 */
function calculateConfidence(dataPoints: number, totalTasks: number): number {
  // More data = higher confidence
  const dataConfidence = Math.min(dataPoints / 10, 1.0);
  const taskConfidence = Math.min(totalTasks / 50, 1.0);
  return (dataConfidence + taskConfidence) / 2;
}

/**
 * Get comprehensive learning profile for an agent
 */
export async function getAgentLearningProfile(
  tenantId: string,
  agentId: string,
): Promise<AgentLearningProfile> {
  const schema = tenantSchema(tenantId);

  try {
    // Get skills from learning events
    const skillsResult = await safeQuery(
      `SELECT skill_name, MAX(skill_level) as max_level, COUNT(*) as experience_points,
              MAX(created_at) as last_improved_at
       FROM "${schema}".agent_learning_events
       WHERE agent_id = $1 AND skill_name IS NOT NULL
       GROUP BY skill_name`,
      [agentId],
    );

    // Calculate improvement rate for each skill from historical data
    const skills: AgentSkill[] = await Promise.all(
      skillsResult.rows.map(async (row) => {
        const skillName = row.skill_name;
        const currentLevel = row.max_level || 0;

        // Get historical skill levels over the last 30 days to calculate improvement rate
        const historyResult = await safeQuery(
          `SELECT skill_level, created_at
           FROM "${schema}".agent_learning_events
           WHERE agent_id = $1 AND skill_name = $2 AND skill_level IS NOT NULL
           AND created_at >= NOW() - INTERVAL '30 days'
           ORDER BY created_at ASC`,
          [agentId, skillName],
        );

        let improvementRate = 0;
        if (historyResult.rows.length >= 2) {
          // Calculate rate of improvement over time
          const firstLevel = historyResult.rows[0].skill_level;
          const lastLevel = historyResult.rows[historyResult.rows.length - 1].skill_level;
          const firstDate = new Date(historyResult.rows[0].created_at);
          const lastDate = new Date(historyResult.rows[historyResult.rows.length - 1].created_at);
          
          const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          const levelChange = lastLevel - firstLevel;
          
          // Improvement rate: levels per day (can be negative if skill decreased)
          improvementRate = levelChange / daysDiff;
        } else if (historyResult.rows.length === 1) {
          // Only one data point - use a conservative estimate based on experience points
          // More experience points suggest faster learning
          const experiencePoints = parseInt(row.experience_points || '0', 10);
          improvementRate = experiencePoints > 10 ? 0.1 : 0; // Small positive rate if experienced
        }

        return {
          skillName,
          currentLevel,
          maxLevel: 100,
          experiencePoints: parseInt(row.experience_points || '0', 10),
          lastImprovedAt: row.last_improved_at || undefined,
          improvementRate: Math.round(improvementRate * 100) / 100, // Round to 2 decimal places
        };
      }),
    );

    // Get successful and failed patterns
    const patternsResult = await safeQuery(
      `SELECT pattern, event_type, COUNT(*) as count
       FROM "${schema}".agent_learning_events
       WHERE agent_id = $1 AND pattern IS NOT NULL
       GROUP BY pattern, event_type`,
      [agentId],
    );

    const successfulPatterns: string[] = [];
    const failedPatterns: string[] = [];

    for (const row of patternsResult.rows) {
      if (row.event_type === 'success' || row.event_type === 'pattern_discovered') {
        successfulPatterns.push(row.pattern);
      } else if (row.event_type === 'failure') {
        failedPatterns.push(row.pattern);
      }
    }

    // Get overall metrics
    const metrics = await getAgentTaskMetrics(tenantId, agentId, 30);
    const overallSkillLevel = Math.round(
      metrics.successRate * 50 + metrics.verificationRate * 50,
    );

    // Calculate learning velocity (improvement rate over last 7 days)
    const weekCurve = await calculateLearningCurve(tenantId, agentId, 'week', 'success_rate');
    const learningVelocity = weekCurve.improvementRate;

    // Get lessons learned count
    const lessonsResult = await safeQuery(
      `SELECT COUNT(*) as count FROM "${schema}".agent_lessons_learned WHERE agent_id = $1`,
      [agentId],
    );
    const lessonsLearned = parseInt(lessonsResult.rows[0]?.count || '0', 10);

    // Get last learning event
    const lastEventResult = await safeQuery(
      `SELECT MAX(created_at) as last_event FROM "${schema}".agent_learning_events WHERE agent_id = $1`,
      [agentId],
    );
    const lastLearningEvent = lastEventResult.rows[0]?.last_event || undefined;

    return {
      agentId,
      tenantId,
      overallSkillLevel,
      skills,
      learningVelocity,
      lessonsLearned,
      successfulPatterns: [...new Set(successfulPatterns)],
      failedPatterns: [...new Set(failedPatterns)],
      lastLearningEvent,
    };
  } catch (err: unknown) {
    logger.error(`[AgentLearningCurve] Failed to get learning profile: ${toErrorMessage(err)}`);
    return {
      agentId,
      tenantId,
      overallSkillLevel: 0,
      skills: [],
      learningVelocity: 0,
      lessonsLearned: 0,
      successfulPatterns: [],
      failedPatterns: [],
    };
  }
}

/**
 * Get learning curves for all agents in a tenant
 */
export async function getAllAgentLearningCurves(
  tenantId: string,
  period: 'day' | 'week' | 'month' = 'week',
): Promise<Record<string, LearningCurve>> {
  const schema = tenantSchema(tenantId);

  try {
    const agentsResult = await safeQuery(
      `SELECT DISTINCT agent_id FROM "${schema}".agent_tasks WHERE tenant_id = $1`,
      [tenantId],
    );

    const curves: Record<string, LearningCurve> = {};

    for (const row of agentsResult.rows) {
      curves[row.agent_id] = await calculateLearningCurve(tenantId, row.agent_id, period);
    }

    return curves;
  } catch (err: unknown) {
    logger.error(`[AgentLearningCurve] Failed to get all learning curves: ${toErrorMessage(err)}`);
    return {};
  }
}
