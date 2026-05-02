/**
 * ClickHouse Analytics Service
 *
 * Write and query functions for the three ClickHouse analytics tables:
 *   - audit_events
 *   - agent_metrics
 *   - api_request_logs
 *
 * Includes a batch buffer for high-throughput inserts that flushes
 * periodically to avoid per-row HTTP round-trips.
 */
export interface AuditEventRow {
    event_id: string;
    tenant_id: string;
    timestamp: string;
    user_id: string;
    module: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: string;
}
export interface AgentMetricRow {
    run_id: string;
    tenant_id: string;
    agent_id: string;
    timestamp: string;
    duration_ms: number;
    tool_call_count: number;
    discovery_count: number;
    actions_proposed: number;
    actions_executed: number;
    token_count: number;
    status: string;
    error: string;
}
export interface ApiRequestLogRow {
    request_id: string;
    tenant_id: string;
    timestamp: string;
    method: string;
    path: string;
    status_code: number;
    duration_ms: number;
    user_id: string;
    ip_address: string;
}
export declare function startFlushTimer(): void;
export declare function flushAll(): Promise<void>;
export declare function insertAuditEvent(row: AuditEventRow): void;
export declare function insertAgentMetrics(row: AgentMetricRow): void;
export declare function insertApiRequestLog(row: ApiRequestLogRow): void;
export interface AuditTimelineEntry {
    period: string;
    event_count: number;
    module: string;
}
export declare function getAuditTimeline(tenantId: string, days?: number, granularity?: 'hour' | 'day'): Promise<AuditTimelineEntry[]>;
export interface AgentPerformanceAggregate {
    agent_id: string;
    total_runs: number;
    avg_duration_ms: number;
    total_discoveries: number;
    total_actions_executed: number;
    success_rate: number;
}
export declare function getAgentPerformanceAggregates(tenantId: string, days?: number): Promise<AgentPerformanceAggregate[]>;
export interface ApiLatencyPercentile {
    path: string;
    p50: number;
    p90: number;
    p99: number;
    request_count: number;
}
export declare function getApiLatencyPercentiles(tenantId: string, days?: number): Promise<ApiLatencyPercentile[]>;
