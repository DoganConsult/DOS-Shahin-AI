import { Router } from 'express';
import { logger } from '../../ports/logger.port';
// ============================================================
// Agent Health Visualization Routes
// Provides endpoints for viewing agent health, learning curves, and lessons learned
// ============================================================
import { getAgentHealthDashboard, getAgentHealthStatus } from '../../services/agents/lifecycle/agent-health-visualization.service';
import { getAgentLearningProfile, calculateLearningCurve } from '../../services/agents/lifecycle/agent-learning-curve.service';
import { getAgentLessons, getRelevantLessons } from '../../services/agents/lifecycle/agent-lessons-learned.service';
import { getAgentTasks, getAgentTaskMetrics } from '../../services/activity/agent-task-tracker.service';
import { toErrorMessage } from '@dos/module-sdk';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";
const router = Router();
router.use(authenticate);
/**
 * GET /api/agents/health/dashboard
 * Get comprehensive health dashboard for all agents
 */
router.get('/dashboard', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days) || 30;
        const dashboard = await getAgentHealthDashboard(tenantId, days);
        res.json({
            success: true,
            data: dashboard,
        });
    }
    catch (err) {
        logger.error('[AgentHealthRoutes] Dashboard error:', toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId
 * Get health status for a specific agent
 */
router.get('/:agentId', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const health = await getAgentHealthStatus(tenantId, agentId);
        res.json({
            success: true,
            data: health,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Health status error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/learning-curve
 * Get learning curve for an agent
 */
router.get('/:agentId/learning-curve', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const period = req.query.period || 'week';
        const metric = req.query.metric || 'success_rate';
        const curve = await calculateLearningCurve(tenantId, agentId, period, metric);
        res.json({
            success: true,
            data: curve,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Learning curve error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/learning-profile
 * Get comprehensive learning profile for an agent
 */
router.get('/:agentId/learning-profile', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const profile = await getAgentLearningProfile(tenantId, agentId);
        res.json({
            success: true,
            data: profile,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Learning profile error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/lessons
 * Get lessons learned for an agent
 */
router.get('/:agentId/lessons', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const category = req.query.category;
        const verified = req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined;
        const limit = parseInt(req.query.limit) || undefined;
        const lessons = await getAgentLessons(tenantId, agentId, {
            category: category,
            verified,
            limit,
        });
        res.json({
            success: true,
            data: lessons,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Lessons error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/lessons/relevant
 * Get relevant lessons for a scenario
 */
router.get('/:agentId/lessons/relevant', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const scenario = req.query.scenario;
        const limit = parseInt(req.query.limit) || 5;
        if (!scenario) {
            return res.status(400).json({
                success: false,
                error: 'scenario query parameter is required',
            });
        }
        const lessons = await getRelevantLessons(tenantId, agentId, scenario, limit);
        res.json({
            success: true,
            data: lessons,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Relevant lessons error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/tasks
 * Get tasks for an agent
 */
router.get('/:agentId/tasks', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const status = req.query.status;
        const limit = parseInt(req.query.limit) || undefined;
        const offset = parseInt(req.query.offset) || undefined;
        const tasks = await getAgentTasks(tenantId, agentId, {
            status: status,
            limit,
            offset,
        });
        res.json({
            success: true,
            data: tasks,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Tasks error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/health/:agentId/metrics
 * Get task metrics for an agent
 */
router.get('/:agentId/metrics', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentId } = req.params;
        const days = parseInt(req.query.days) || 30;
        const metrics = await getAgentTaskMetrics(tenantId, agentId, days);
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (err) {
        logger.error(`[AgentHealthRoutes] Metrics error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
export default router;
//# sourceMappingURL=agent-health.routes.js.map