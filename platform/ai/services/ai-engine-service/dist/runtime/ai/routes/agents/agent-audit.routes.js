import { Router } from 'express';
import { logger } from '../../ports/logger.port.js';
// ============================================================
// Agent Audit Routes
// Provides endpoints for viewing agent audit history, actions, predictions, and tool calls
// ============================================================
import { toErrorMessage } from '@dos/module-sdk';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(authenticate);
/**
 * GET /api/agents/audit/history
 * Get audit history for all agents or a specific agent
 */
router.get('/history', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const agentId = req.query.agentId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const action = req.query.action;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [`module = 'agent_runner'`, `action LIKE 'agent.%'`];
        const params = [];
        let idx = 1;
        if (agentId) {
            conditions.push(`user_id = $${idx++}`);
            params.push(`agent-${agentId}`);
        }
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        if (action) {
            conditions.push(`action = $${idx++}`);
            params.push(`agent.${action}`);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        user_id,
        module,
        action,
        entity_type,
        entity_id,
        before_state,
        after_state,
        entry_hash
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const entries = result.rows.map((row) => ({
            entryId: row.entry_id,
            timestamp: row.timestamp?.toISOString?.() || row.timestamp,
            agentId: row.user_id?.replace('agent-', '') || undefined,
            module: row.module,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            beforeState: row.before_state ? (typeof row.before_state === 'string' ? JSON.parse(row.before_state) : row.before_state) : undefined,
            afterState: row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : undefined,
            entryHash: row.entry_hash,
        }));
        res.json({
            success: true,
            data: {
                entries,
                total: entries.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error('[AgentAuditRoutes] History error:', toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/actions
 * Get action audit entries for an agent (proposed, executed, verified)
 */
router.get('/:agentId/actions', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const actionType = req.query.actionType;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action IN ('agent.action_proposed', 'agent.action_executed', 'agent.action_verified')`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (actionType) {
            conditions.push(`action = $${idx++}`);
            params.push(`agent.action_${actionType}`);
        }
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        action,
        entity_type,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const actions = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                actionType: row.action.replace('agent.action_', ''),
                action: afterState.actionType,
                entityType: afterState.entityType,
                entityId: afterState.entityId,
                payload: afterState.payload,
                result: afterState.result,
                error: afterState.error,
                verificationResult: afterState.verificationResult,
                evidence: afterState.evidence,
                runId: afterState.runId,
            };
        });
        res.json({
            success: true,
            data: {
                actions,
                total: actions.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Actions error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/predictions
 * Get prediction audit entries for an agent
 */
router.get('/:agentId/predictions', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action = 'agent.prediction_made'`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const predictions = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                signalType: afterState.signalType,
                predictedValue: afterState.predictedValue,
                confidence: afterState.confidence,
                actualValue: afterState.actualValue,
                accuracy: afterState.accuracy,
                runId: afterState.runId,
            };
        });
        res.json({
            success: true,
            data: {
                predictions,
                total: predictions.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Predictions error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/tool-calls
 * Get tool call audit entries for an agent
 */
router.get('/:agentId/tool-calls', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const toolName = req.query.toolName;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action = 'agent.tool_called'`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (toolName) {
            conditions.push(`after_state->>'toolName' = $${idx++}`);
            params.push(toolName);
        }
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const toolCalls = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                toolName: afterState.toolName,
                params: afterState.params,
                result: afterState.result,
                durationMs: afterState.durationMs,
                error: afterState.error,
                runId: afterState.runId,
                langsmithRunId: afterState.langsmithRunId,
            };
        });
        res.json({
            success: true,
            data: {
                toolCalls,
                total: toolCalls.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Tool calls error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/decisions
 * Get decision audit entries for an agent (LLM reasoning)
 */
router.get('/:agentId/decisions', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action = 'agent.decision_made'`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const decisions = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                reasoning: afterState.reasoning,
                alternativesConsidered: afterState.alternativesConsidered,
                chosenAction: afterState.chosenAction,
                confidence: afterState.confidence,
                runId: afterState.runId,
                langsmithRunId: afterState.langsmithRunId,
            };
        });
        res.json({
            success: true,
            data: {
                decisions,
                total: decisions.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Decisions error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/handoffs
 * Get handoff audit entries for an agent
 */
router.get('/:agentId/handoffs', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const direction = req.query.direction;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action IN ('agent.handoff_sent', 'agent.handoff_received')`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (direction) {
            conditions.push(`action = $${idx++}`);
            params.push(`agent.handoff_${direction}`);
        }
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        action,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const handoffs = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                direction: row.action.replace('agent.handoff_', ''),
                toAgent: afterState.toAgent,
                fromAgent: afterState.fromAgent,
                payload: afterState.payload,
                processed: afterState.processed,
                result: afterState.result,
                runId: afterState.runId,
            };
        });
        res.json({
            success: true,
            data: {
                handoffs,
                total: handoffs.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Handoffs error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/:agentId/memory
 * Get memory audit entries for an agent
 */
router.get('/:agentId/memory', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { agentId } = req.params;
        const memoryType = req.query.memoryType;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const conditions = [
            `module = 'agent_runner'`,
            `user_id = $1`,
            `action = 'agent.memory_committed'`,
        ];
        const params = [`agent-${agentId}`];
        let idx = 2;
        if (memoryType) {
            conditions.push(`after_state->>'memoryType' = $${idx++}`);
            params.push(memoryType);
        }
        if (startDate) {
            conditions.push(`timestamp >= $${idx++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`timestamp <= $${idx++}`);
            params.push(endDate);
        }
        params.push(limit, offset);
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        entity_id,
        after_state
      FROM "${schema}".audit_trail
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}`, params);
        const memories = result.rows.map((row) => {
            const afterState = row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : {};
            return {
                entryId: row.entry_id,
                timestamp: row.timestamp?.toISOString?.() || row.timestamp,
                memoryType: afterState.memoryType,
                content: afterState.content,
                importance: afterState.importance,
                relatedEntityType: afterState.relatedEntityType,
                relatedEntityId: afterState.relatedEntityId,
                runId: afterState.runId,
            };
        });
        res.json({
            success: true,
            data: {
                memories,
                total: memories.length,
                limit,
                offset,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Memory error for ${req.params.agentId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
/**
 * GET /api/agents/audit/run/:runId
 * Get all audit entries for a specific agent run
 */
router.get('/run/:runId', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const schema = tenantSchema(tenantId);
        const { runId } = req.params;
        const result = await safeQuery(`SELECT 
        entry_id,
        timestamp,
        user_id,
        action,
        entity_type,
        entity_id,
        before_state,
        after_state
      FROM "${schema}".audit_trail
      WHERE module = 'agent_runner'
        AND action LIKE 'agent.%'
        AND (after_state->>'runId' = $1 OR entity_id = $1)
      ORDER BY timestamp ASC`, [runId]);
        const entries = result.rows.map((row) => ({
            entryId: row.entry_id,
            timestamp: row.timestamp?.toISOString?.() || row.timestamp,
            agentId: row.user_id?.replace('agent-', '') || undefined,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            beforeState: row.before_state ? (typeof row.before_state === 'string' ? JSON.parse(row.before_state) : row.before_state) : undefined,
            afterState: row.after_state ? (typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state) : undefined,
        }));
        res.json({
            success: true,
            data: {
                runId,
                entries,
                total: entries.length,
            },
        });
    }
    catch (err) {
        logger.error(`[AgentAuditRoutes] Run audit error for ${req.params.runId}:`, toErrorMessage(err));
        res.status(500).json({
            success: false,
            error: toErrorMessage(err),
        });
    }
});
export default router;
//# sourceMappingURL=agent-audit.routes.js.map