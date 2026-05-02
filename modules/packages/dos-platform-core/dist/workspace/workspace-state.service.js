"use strict";
/**
 * Workspace State Service — Manages workspace lifecycle state transitions.
 *
 * Valid states: initializing, provisioning, active, maintenance, suspended, archived, deleted
 * Transitions are validated against a canonical transition map before execution.
 * All state changes are recorded in the workspace_state_history audit table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceState = getWorkspaceState;
exports.transitionWorkspaceState = transitionWorkspaceState;
exports.getWorkspaceStateHistory = getWorkspaceStateHistory;
exports.canTransitionTo = canTransitionTo;
exports.getWorkspacesByState = getWorkspacesByState;
exports.isWorkspaceOperational = isWorkspaceOperational;
const db_1 = require("@dos/db");
const logger_1 = require("../observability/logger");
const crypto_1 = require("crypto");
// ── Canonical Transition Map ──
const ALLOWED_TRANSITIONS = {
    initializing: ['provisioning', 'deleted'],
    provisioning: ['active', 'suspended', 'deleted'],
    active: ['maintenance', 'suspended', 'archived'],
    maintenance: ['active', 'suspended'],
    suspended: ['active', 'archived', 'deleted'],
    archived: ['active', 'deleted'],
    deleted: [],
};
// ── Service Functions ──
/**
 * Retrieve the current state record for a workspace.
 */
async function getWorkspaceState(tenantId, workspaceId) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT workspace_id, tenant_id, current_state, previous_state,
              state_changed_at, state_changed_by, COALESCE(state_metadata, '{}'::jsonb) AS state_metadata
       FROM workspace_states
       WHERE workspace_id = $1 AND tenant_id = $2
       LIMIT 1`, [workspaceId, tenantId]);
        if (!rows[0])
            return null;
        const r = rows[0];
        return {
            workspaceId: r.workspace_id,
            tenantId: r.tenant_id,
            currentState: r.current_state,
            previousState: r.previous_state ?? null,
            stateChangedAt: r.state_changed_at?.toISOString?.() ?? r.state_changed_at ?? '',
            stateChangedBy: r.state_changed_by ?? null,
            metadata: r.state_metadata ?? {},
        };
    }
    catch (err) {
        logger_1.logger.error(`[WorkspaceState] Failed to get state for workspace ${workspaceId}: ${err.message}`);
        return null;
    }
}
/**
 * Transition a workspace to a new state with full validation and audit trail.
 * Returns the updated state record, or throws if the transition is not allowed.
 */
async function transitionWorkspaceState(tenantId, workspaceId, targetState, triggeredBy, reason) {
    const current = await getWorkspaceState(tenantId, workspaceId);
    // If no existing state record, initialize from 'initializing'
    const fromState = current?.currentState ?? 'initializing';
    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[fromState];
    if (!allowed || !allowed.includes(targetState)) {
        const err = new Error(`Invalid workspace state transition: ${fromState} -> ${targetState} is not allowed`);
        err.statusCode = 422;
        throw err;
    }
    const historyId = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    try {
        // Upsert the workspace state record
        await (0, db_1.safeQuery)(`INSERT INTO workspace_states
         (workspace_id, tenant_id, current_state, previous_state, state_changed_at, state_changed_by, state_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
       ON CONFLICT (workspace_id, tenant_id)
         DO UPDATE SET
           previous_state = workspace_states.current_state,
           current_state = EXCLUDED.current_state,
           state_changed_at = EXCLUDED.state_changed_at,
           state_changed_by = EXCLUDED.state_changed_by`, [workspaceId, tenantId, targetState, fromState, now, triggeredBy]);
        // Record audit trail in workspace_state_history
        await (0, db_1.safeQuery)(`INSERT INTO workspace_state_history
         (history_id, workspace_id, tenant_id, from_state, to_state, triggered_by, reason, metadata, transitioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8)`, [historyId, workspaceId, tenantId, fromState, targetState, triggeredBy, reason ?? null, now]);
        logger_1.logger.info(`[WorkspaceState] Workspace ${workspaceId} transitioned: ${fromState} -> ${targetState} by ${triggeredBy}`);
        return {
            workspaceId,
            tenantId,
            currentState: targetState,
            previousState: fromState,
            stateChangedAt: now,
            stateChangedBy: triggeredBy,
            metadata: {},
        };
    }
    catch (err) {
        if (err.statusCode)
            throw err;
        logger_1.logger.error(`[WorkspaceState] Failed to transition workspace ${workspaceId} from ${fromState} to ${targetState}: ${err.message}`);
        throw err;
    }
}
/**
 * Retrieve the full state history audit trail for a workspace.
 */
async function getWorkspaceStateHistory(tenantId, workspaceId) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT history_id, workspace_id, from_state, to_state, triggered_by,
              reason, COALESCE(metadata, '{}'::jsonb) AS metadata, transitioned_at
       FROM workspace_state_history
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY transitioned_at ASC`, [workspaceId, tenantId]);
        return rows.map((r) => ({
            historyId: r.history_id,
            workspaceId: r.workspace_id,
            fromState: r.from_state ?? null,
            toState: r.to_state,
            triggeredBy: r.triggered_by,
            reason: r.reason ?? null,
            metadata: r.metadata ?? {},
            transitionedAt: r.transitioned_at?.toISOString?.() ?? r.transitioned_at ?? '',
        }));
    }
    catch (err) {
        logger_1.logger.error(`[WorkspaceState] Failed to get state history for workspace ${workspaceId}: ${err.message}`);
        return [];
    }
}
/**
 * Check whether a workspace can transition to the specified target state.
 */
async function canTransitionTo(tenantId, workspaceId, targetState) {
    const current = await getWorkspaceState(tenantId, workspaceId);
    const fromState = current?.currentState ?? 'initializing';
    const allowed = ALLOWED_TRANSITIONS[fromState];
    return allowed.includes(targetState);
}
/**
 * List all workspaces in a given state for a tenant.
 */
async function getWorkspacesByState(tenantId, state) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT workspace_id, tenant_id, current_state, previous_state,
              state_changed_at, state_changed_by, COALESCE(state_metadata, '{}'::jsonb) AS state_metadata
       FROM workspace_states
       WHERE tenant_id = $1 AND current_state = $2
       ORDER BY state_changed_at DESC`, [tenantId, state]);
        return rows.map((r) => ({
            workspaceId: r.workspace_id,
            tenantId: r.tenant_id,
            currentState: r.current_state,
            previousState: r.previous_state ?? null,
            stateChangedAt: r.state_changed_at?.toISOString?.() ?? r.state_changed_at ?? '',
            stateChangedBy: r.state_changed_by ?? null,
            metadata: r.state_metadata ?? {},
        }));
    }
    catch (err) {
        logger_1.logger.error(`[WorkspaceState] Failed to get workspaces by state ${state} for tenant ${tenantId}: ${err.message}`);
        return [];
    }
}
/**
 * Check if a workspace is in an operational state (active and not suspended/archived/deleted).
 * Returns true only when the workspace is in 'active' state.
 */
async function isWorkspaceOperational(tenantId, workspaceId) {
    const current = await getWorkspaceState(tenantId, workspaceId);
    if (!current)
        return false;
    return current.currentState === 'active';
}
//# sourceMappingURL=workspace-state.service.js.map