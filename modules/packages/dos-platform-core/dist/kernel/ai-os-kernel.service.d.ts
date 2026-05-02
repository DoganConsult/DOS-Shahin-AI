/**
 * AI OS Kernel Service — R0 Production
 *
 * Backed by real tenant schema tables:
 *   agent_runs            — process table, status, latency
 *   agent_runtime_config  — agent enable/disable
 *   agent_handoffs        — IPC message bus
 *   agent_memories        — memory partitions
 *   governance_signals    — signal log
 *   job_registry (public) — real scheduler cron/state
 *
 * Column references verified against:
 *   migrations/tenant/107_agent_orchestration_v1.sql
 *   migrations/tenant/350_ai_os_closure_tables.sql
 *   job-scheduler.service.ts (job_registry DDL)
 *
 * R1 columns (migration 700): agent_runs.tokens_used, agent_runs.parent_run_id — both live.
 * Circuit state: persisted in agent_circuit_breaker table; blocked count derived via JOIN.
 */
import type { KernelLogEvent } from './ai-os-kernel.types';
export interface AiProcess {
    pid: string;
    agentId: string;
    state: 'running' | 'queued' | 'blocked' | 'completed' | 'failed' | 'cancelled';
    priority: 'critical' | 'high' | 'medium' | 'low';
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    memoryUsed: number;
    cpuTime: number;
    parentPid: string | null;
    exitCode: number | null;
}
export interface KernelStatus {
    uptime: string;
    bootedAt: string;
    processCount: {
        running: number;
        queued: number;
        blocked: number;
        total: number;
    };
    agentCount: {
        enabled: number;
        disabled: number;
        circuitOpen: number;
    };
    memoryPressure: 'low' | 'medium' | 'high' | 'critical';
    schedulerLoad: number;
    ipcQueueDepth: number;
    resourceUsage: {
        tokensUsed24h: number;
        tokenBudget: number;
        tokenUtilization: number;
        avgLatencyMs: number;
        errorRate: number;
    };
}
export interface SchedulerEntry {
    jobId: string;
    agentId: string;
    schedule: string;
    nextRunAt: string | null;
    lastRunAt: string | null;
    lastResult: 'success' | 'failure' | 'timeout' | 'skipped' | null;
    priority: number;
    enabled: boolean;
    backpressure: boolean;
}
export interface IpcMessage {
    messageId: string;
    fromAgent: string;
    toAgent: string;
    messageType: string;
    payload: Record<string, unknown>;
    status: string;
    createdAt: string;
}
export interface MemoryPartition {
    agentId: string;
    memoryCount: number;
    totalTokens: number;
    oldestMemory: string | null;
    newestMemory: string | null;
    avgImportance: number;
    staleCount: number;
}
export declare function getProcessTable(tenantId: string): Promise<AiProcess[]>;
export declare function getKernelStatus(tenantId: string): Promise<KernelStatus>;
export declare function getSchedulerTable(tenantId: string): Promise<SchedulerEntry[]>;
export declare function getIpcMessages(tenantId: string, limit?: number): Promise<IpcMessage[]>;
export declare function getMemoryPartitions(tenantId: string): Promise<MemoryPartition[]>;
export declare function getKernelLog(tenantId: string, limit?: number): Promise<KernelLogEvent[]>;
export declare function killProcess(tenantId: string, runId: string): Promise<boolean>;
export declare function rebootAgent(tenantId: string, agentId: string): Promise<{
    reset: boolean;
    circuitCleared: boolean;
}>;
/**
 * Adjust an agent's autonomy level at runtime.
 * Levels: 'full_autonomous' | 'hybrid' | 'shadow_agent' | 'human'
 */
export declare function adjustAutonomyLevel(tenantId: string, agentId: string, level: string): Promise<{
    success: boolean;
    previousLevel: string;
    newLevel: string;
}>;
/**
 * Inject a priority directive into an agent's next cycle.
 * Stored in agent_runtime_config.priority_directive (JSON column).
 * One-shot: cleared after the agent reads it.
 */
export declare function injectPriority(tenantId: string, agentId: string, directive: {
    focus: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    context?: string;
}): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Abort a running agent action by marking the run as cancelled.
 */
export declare function killRunningAction(tenantId: string, runId: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Get real token usage statistics over a rolling window.
 */
export declare function getTokenUsage(tenantId: string, windowHours?: number): Promise<{
    totalTokens: number;
    byAgent: Record<string, number>;
    avgPerRun: number;
}>;
/**
 * Bulk command: set all agents to a specific autonomy level.
 */
export declare function setGlobalAutonomyLevel(tenantId: string, level: string): Promise<{
    success: boolean;
    agentsUpdated: number;
}>;
/**
 * Read an agent's current priority directive (if any).
 */
export declare function getPriorityDirective(tenantId: string, agentId: string): Promise<{
    focus: string;
    urgency: string;
    context?: string;
} | null>;
/**
 * Clear the priority directive after agent consumption (one-shot).
 */
export declare function clearPriorityDirective(tenantId: string, agentId: string): Promise<void>;
export interface AgentStep {
    stepId: string;
    nodeId: string;
    stepType: string;
    label: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
}
export interface ProcessDetail {
    process: AiProcess;
    steps: AgentStep[];
    childProcesses: AiProcess[];
}
export declare function getProcessDetail(tenantId: string, pid: string): Promise<ProcessDetail | null>;
export interface AgentDetail {
    agentId: string;
    config: {
        enabled: boolean;
        pausedAt: string | null;
        maxRetries: number;
        cooldownSeconds: number;
    };
    circuit: {
        state: string;
        failureCount: number;
        lastFailureAt: string | null;
    };
    runs24h: {
        total: number;
        completed: number;
        failed: number;
        avgDurationMs: number;
    };
    memory: MemoryPartition | null;
    recentRuns: AiProcess[];
}
export declare function getAgentDetail(tenantId: string, agentId: string): Promise<AgentDetail | null>;
export declare function pauseAgent(tenantId: string, agentId: string): Promise<boolean>;
export declare function resumeAgent(tenantId: string, agentId: string): Promise<boolean>;
export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN';
export interface KernelHealth {
    status: HealthStatus;
    checks: {
        enabledAgents: number;
        circuitOpenCount: number;
        stuckRunCount: number;
        failedRuns24h: number;
        ipcPendingCount: number;
    };
    timestamp: string;
}
export declare function getKernelHealth(tenantId: string): Promise<KernelHealth>;
export declare function saveKernelSnapshot(tenantId: string): Promise<string>;
export declare function listKernelSnapshots(tenantId: string, limit?: number): Promise<Array<{
    snapshotId: string;
    createdAt: string;
    data: Record<string, unknown>;
}>>;
