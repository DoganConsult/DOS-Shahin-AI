/**
 * AI OS Kernel — Type Definitions
 * DB row interfaces, kernel log events, and response view models.
 */
import type { AiProcess, KernelStatus, SchedulerEntry, IpcMessage, MemoryPartition } from './ai-os-kernel.service';
export interface ProcessRow {
    pid: string;
    agent_id: string;
    state: string;
    priority: string;
    started_at: Date | null;
    completed_at: Date | null;
    duration_ms: number | null;
    memory_used: number;
    cpu_time: number;
    parent_pid: string | null;
    exit_code: number | null;
}
export interface SchedulerRow {
    agent_id: string;
    enabled: boolean;
    circuit_state: string | null;
    last_run_at: Date | null;
    last_status: string | null;
}
export interface IpcRow {
    message_id: string;
    from_agent: string;
    to_agent: string;
    message_type: string;
    payload: string | Record<string, unknown>;
    status: string;
    created_at: Date;
}
export interface MemoryRow {
    agent_id: string;
    memory_count: number;
    total_tokens: number;
    oldest: Date | null;
    newest: Date | null;
    avg_importance: number;
    stale_count: number;
}
export interface LogRow {
    source: string;
    agent_id: string | null;
    event: string;
    entity_id: string;
    created_at: Date;
    detail: string | null;
}
export interface KernelLogEvent {
    timestamp: string;
    source: 'agent_run' | 'handoff' | 'signal';
    agentId: string | null;
    event: string;
    entityId: string;
    detail: string | null;
}
export interface KernelProcessView {
    processes: AiProcess[];
    summary: {
        running: number;
        queued: number;
        blocked: number;
        total: number;
    };
}
export interface KernelSchedulerView {
    entries: SchedulerEntry[];
    summary: {
        total: number;
        active: number;
        backpressure: number;
    };
}
export interface KernelIpcView {
    messages: IpcMessage[];
    summary: {
        total: number;
        pending: number;
    };
}
export interface KernelMemoryView {
    partitions: MemoryPartition[];
    summary: {
        agents: number;
        totalMemories: number;
        totalTokens: number;
        staleMemories: number;
    };
}
export interface KernelLogView {
    events: KernelLogEvent[];
    total: number;
}
export interface AgentStep {
    stepId: string;
    runId: string;
    nodeId: string;
    agentId: string;
    stepType: string;
    label: string | null;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
}
export interface KernelProcessDetailView {
    process: AiProcess;
    steps: AgentStep[];
    childProcesses: AiProcess[];
}
export interface KernelAgentDetailView {
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
export type KernelHealthStatus = 'UP' | 'DEGRADED' | 'DOWN';
export interface KernelHealthView {
    status: KernelHealthStatus;
    checks: {
        enabledAgents: number;
        circuitOpenCount: number;
        stuckRunCount: number;
        failedRuns24h: number;
        ipcPendingCount: number;
    };
    timestamp: string;
}
export interface KernelSnapshotView {
    snapshotId: string;
    createdAt: string;
    data: KernelOverviewView;
}
export interface KernelOverviewView {
    kernel: KernelStatus;
    processes: {
        recent: AiProcess[];
        summary: {
            running: number;
            queued: number;
            failed24h: number;
            total24h: number;
        };
    };
    scheduler: {
        entries: SchedulerEntry[];
        active: number;
        backpressure: number;
    };
    ipc: {
        recentMessages: IpcMessage[];
        pendingCount: number;
    };
    memory: {
        partitions: MemoryPartition[];
        totalTokens: number;
        totalMemories: number;
        staleMemories: number;
    };
}
