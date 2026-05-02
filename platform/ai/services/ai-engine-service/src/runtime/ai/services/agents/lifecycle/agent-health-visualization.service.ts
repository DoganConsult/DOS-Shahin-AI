import { logger } from '../../../ports/logger.port';
// ============================================================
// Agent Health Visualization Service
// Provides comprehensive health metrics and visualizations for all agents
// ============================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getAllAgentTaskMetrics as _getAllAgentTaskMetrics, getAgentTaskMetrics } from '../../activity/agent-task-tracker.service';
import { getAllAgentLearningCurves, getAgentLearningProfile } from './agent-learning-curve.service';
import { getAgentLessons } from './agent-lessons-learned.service';

export interface AgentHealthStatus {
  agentId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'any';
  overallScore: number; // 0-100
  metrics: {
    taskExecution: {
      successRate: number;
      verificationRate: number;
      averageDurationMs: number;
      totalTasks: number;
    };
    learning: {
      skillLevel: string;
      learningVelocity: number;
      lessonsLearned: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    reliability: {
      uptime: number; // percentage
      errorRate: number;
      lastError?: string;
      lastErrorAt?: string;
    };
  };
  lastActivity?: string;
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

export interface AgentHealthDashboard {
  tenantId: string;
  overallHealth: number; // 0-100, average across all agents
  agents: AgentHealthStatus[];
  summary: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    averageSkillLevel: number;
    totalLessonsLearned: number;
    totalTasksExecuted: number;
  };
  trends: {
    healthOverTime: Array<{ date: string; score: number }>;
    taskVolumeOverTime: Array<{ date: string; count: number }>;
    learningVelocityOverTime: Array<{ date: string; velocity: number }>;
  };
}

/**
 * Get comprehensive health status for a single agent
 */
export async function getAgentHealthStatus(
  tenantId: string,
  agentId: string,
  agentName?: string,
): Promise<AgentHealthStatus> {
  try {
    const schema = tenantSchema(tenantId);

    // Get task metrics
    const taskMetrics = await getAgentTaskMetrics(tenantId, agentId, 7);

    // Get learning profile
    const learningProfile = await getAgentLearningProfile(tenantId, agentId);

    // Get learning curve
    const learningCurve = await getAllAgentLearningCurves(tenantId, 'week');
    const curve = learningCurve[agentId];

    // Get recent errors
    const errorsResult = await safeQuery(
      `SELECT error, started_at FROM "${schema}".agent_tasks
       WHERE agent_id = $1 AND status = 'failed' AND started_at > NOW() - INTERVAL '7 days'
       ORDER BY started_at DESC LIMIT 1`,
      [agentId],
    );
    const lastError = errorsResult.rows[0]?.error || undefined;
    const lastErrorAt = errorsResult.rows[0]?.started_at || undefined;

    // Calculate error rate
    const errorRate = taskMetrics.totalTasks > 0 ? taskMetrics.failedTasks / taskMetrics.totalTasks : 0;

    // Calculate uptime (percentage of successful runs)
    const uptime = 1 - errorRate;

    // Get last activity
    const lastActivityResult = await safeQuery(
      `SELECT MAX(started_at) as last_activity FROM "${schema}".agent_tasks WHERE agent_id = $1`,
      [agentId],
    );
    const lastActivity = lastActivityResult.rows[0]?.last_activity || undefined;

    // Calculate overall score
    const executionScore = taskMetrics.successRate * 40;
    const verificationScore = taskMetrics.verificationRate * 30;
    const learningScore = (learningProfile.overallSkillLevel / 100) * 20;
    const reliabilityScore = uptime * 10;
    const overallScore = Math.round(executionScore + verificationScore + learningScore + reliabilityScore);

    // Determine status
    let status: AgentHealthStatus['status'] = 'any';
    if (overallScore >= 80) {
      status = 'healthy';
    } else if (overallScore >= 60) {
      status = 'degraded';
    } else if (overallScore < 60) {
      status = 'unhealthy';
    }

    // Generate alerts
    const alerts: AgentHealthStatus['alerts'] = [];

    if (taskMetrics.successRate < 0.7) {
      alerts.push({
        severity: 'critical',
        message: `Low success rate: ${Math.round(taskMetrics.successRate * 100)}%`,
        timestamp: new Date().toISOString(),
      });
    }

    if (taskMetrics.verificationRate < 0.8) {
      alerts.push({
        severity: 'warning',
        message: `Low verification rate: ${Math.round(taskMetrics.verificationRate * 100)}%`,
        timestamp: new Date().toISOString(),
      });
    }

    if (errorRate > 0.1) {
      alerts.push({
        severity: 'critical',
        message: `High error rate: ${Math.round(errorRate * 100)}%`,
        timestamp: new Date().toISOString(),
      });
    }

    if (curve && curve.trend === 'declining') {
      alerts.push({
        severity: 'warning',
        message: `Learning curve declining: ${curve.improvementRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      });
    }

    if (!lastActivity || new Date(lastActivity) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      alerts.push({
        severity: 'warning',
        message: 'No activity in last 24 hours',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      agentId,
      name: agentName || agentId,
      status,
      overallScore,
      metrics: {
        taskExecution: {
          successRate: taskMetrics.successRate,
          verificationRate: taskMetrics.verificationRate,
          averageDurationMs: taskMetrics.averageDurationMs,
          totalTasks: taskMetrics.totalTasks,
        },
        learning: {
          skillLevel: curve?.skillLevel || learningProfile.overallSkillLevel > 80 ? 'expert' : learningProfile.overallSkillLevel > 60 ? 'advanced' : learningProfile.overallSkillLevel > 40 ? 'intermediate' : 'beginner',
          learningVelocity: learningProfile.learningVelocity,
          lessonsLearned: learningProfile.lessonsLearned,
          trend: curve?.trend || 'stable',
        },
        reliability: {
          uptime,
          errorRate,
          lastError,
          lastErrorAt,
        },
      },
      lastActivity,
      alerts,
    };
  } catch (err: unknown) {
    logger.error(`[AgentHealthVisualization] Failed to get health status: ${toErrorMessage(err)}`);
    return {
      agentId,
      name: agentName || agentId,
      status: 'any',
      overallScore: 0,
      metrics: {
        taskExecution: { successRate: 0, verificationRate: 0, averageDurationMs: 0, totalTasks: 0 },
        learning: { skillLevel: 'beginner', learningVelocity: 0, lessonsLearned: 0, trend: 'stable' },
        reliability: { uptime: 0, errorRate: 0 },
      },
      alerts: [],
    };
  }
}

/**
 * Get comprehensive health dashboard for all agents in a tenant
 */
export async function getAgentHealthDashboard(
  tenantId: string,
  days: number = 30,
): Promise<AgentHealthDashboard> {
  try {
    const schema = tenantSchema(tenantId);

    // Get all agent IDs
    const agentsResult = await safeQuery(
      `SELECT DISTINCT agent_id FROM "${schema}".agent_tasks WHERE tenant_id = $1`,
      [tenantId],
    );

    // Load agent names from JSON files
    const { loadAgentDef } = require('../../../config/claude-client');
    const agentNames: Record<string, string> = {};
    for (const row of agentsResult.rows) {
      const def = loadAgentDef(row.agent_id);
      if (def) {
        agentNames[row.agent_id] = def.name || row.agent_id;
      }
    }

    // Get health status for all agents
    const agents: AgentHealthStatus[] = [];
    for (const row of agentsResult.rows) {
      const health = await getAgentHealthStatus(tenantId, row.agent_id, agentNames[row.agent_id]);
      agents.push(health);
    }

    // Calculate summary
    const totalAgents = agents.length;
    const healthyAgents = agents.filter((a) => a.status === 'healthy').length;
    const degradedAgents = agents.filter((a) => a.status === 'degraded').length;
    const unhealthyAgents = agents.filter((a) => a.status === 'unhealthy').length;
    const averageSkillLevel = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.metrics.learning.skillLevel === 'expert' ? 100 : a.metrics.learning.skillLevel === 'advanced' ? 75 : a.metrics.learning.skillLevel === 'intermediate' ? 50 : 25, 0) / agents.length
      : 0;

    // Get total lessons learned
    let totalLessonsLearned = 0;
    for (const agent of agents) {
      const lessons = await getAgentLessons(tenantId, agent.agentId);
      totalLessonsLearned += lessons.length;
    }

    const totalTasksExecuted = agents.reduce((sum, a) => sum + a.metrics.taskExecution.totalTasks, 0);
    const overallHealth = agents.length > 0
      ? Math.round(agents.reduce((sum, a) => sum + a.overallScore, 0) / agents.length)
      : 0;

    // Get trends over time
    const trends = await getHealthTrends(tenantId, days);

    return {
      tenantId,
      overallHealth,
      agents,
      summary: {
        totalAgents,
        healthyAgents,
        degradedAgents,
        unhealthyAgents,
        averageSkillLevel: Math.round(averageSkillLevel),
        totalLessonsLearned,
        totalTasksExecuted,
      },
      trends,
    };
  } catch (err: unknown) {
    logger.error(`[AgentHealthVisualization] Failed to get dashboard: ${toErrorMessage(err)}`);
    return {
      tenantId,
      overallHealth: 0,
      agents: [],
      summary: {
        totalAgents: 0,
        healthyAgents: 0,
        degradedAgents: 0,
        unhealthyAgents: 0,
        averageSkillLevel: 0,
        totalLessonsLearned: 0,
        totalTasksExecuted: 0,
      },
      trends: {
        healthOverTime: [],
        taskVolumeOverTime: [],
        learningVelocityOverTime: [],
      },
    };
  }
}

/**
 * Get health trends over time
 */
async function getHealthTrends(
  tenantId: string,
  days: number,
): Promise<AgentHealthDashboard['trends']> {
  const schema = tenantSchema(tenantId);

  try {
    // Health over time (daily averages)
    const healthResult = await safeQuery(
      `SELECT 
        DATE_TRUNC('day', started_at) as date,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks
       FROM "${schema}".agent_tasks
       WHERE started_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', started_at)
       ORDER BY date ASC`,
      [],
    );

    const healthOverTime = healthResult.rows.map((row) => {
      const total = parseInt(row.total_tasks || '0', 10);
      const completed = parseInt(row.completed_tasks || '0', 10);
      const verified = parseInt(row.verified_tasks || '0', 10);
      const successRate = total > 0 ? completed / total : 0;
      const verificationRate = completed > 0 ? verified / completed : 0;
      const score = Math.round(successRate * 50 + verificationRate * 50);
      return {
        date: row.date,
        score,
      };
    });

    // Task volume over time
    const taskVolumeOverTime = healthResult.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.total_tasks || '0', 10),
    }));

    // Learning velocity over time (simplified - using task success rate improvement)
    const learningVelocityOverTime = healthOverTime.map((point, index) => {
      if (index === 0) return { date: point.date, velocity: 0 };
      const prevScore = healthOverTime[index - 1].score;
      const velocity = point.score - prevScore;
      return { date: point.date, velocity };
    });

    return {
      healthOverTime,
      taskVolumeOverTime,
      learningVelocityOverTime,
    };
  } catch (err: unknown) {
    logger.error(`[AgentHealthVisualization] Failed to get trends: ${toErrorMessage(err)}`);
    return {
      healthOverTime: [],
      taskVolumeOverTime: [],
      learningVelocityOverTime: [],
    };
  }
}
