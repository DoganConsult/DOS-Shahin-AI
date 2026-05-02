/**
 * AI Engine types — kernel, agent execution, MCP, code search.
 */

// ── Kernel Types ──

export interface KernelStatus {
  state: 'running' | 'degraded' | 'stopped' | 'booting';
  uptime: number;
  version: string;
  agentCount: number;
  processCount: number;
}

export interface KernelHealth {
  healthy: boolean;
  checks: Record<string, { status: 'ok' | 'warn' | 'fail'; latencyMs?: number }>;
  timestamp: string;
}

export interface AiProcess {
  pid: string;
  agentId: string;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  cpuPercent: number;
  memoryMb: number;
  startedAt: string;
}

export interface ProcessRow {
  pid: string;
  agent_id: string;
  status: string;
  cpu_percent: number;
  memory_mb: number;
  started_at: string;
}

export interface ProcessDetail extends AiProcess {
  logs: string[];
  metrics: Record<string, number>;
}

export interface MemoryPartition {
  partitionId: string;
  agentId: string;
  sizeBytes: number;
  entryCount: number;
  lastAccessed: string;
}

export interface MemoryRow {
  partition_id: string;
  agent_id: string;
  size_bytes: number;
  entry_count: number;
  last_accessed: string;
}

export interface LogRow {
  log_id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  agent_id?: string;
  timestamp: string;
}

export interface SchedulerRow {
  entry_id: string;
  job_name: string;
  cron_expr: string;
  next_run_at: string;
  last_run_at?: string;
  status: string;
}

export interface SchedulerEntry {
  entryId: string;
  jobName: string;
  cronExpr: string;
  nextRunAt: string;
  lastRunAt?: string;
  status: 'active' | 'paused' | 'disabled';
}

export interface IpcRow {
  message_id: string;
  from_agent: string;
  to_agent: string;
  payload: Record<string, unknown>;
  sent_at: string;
  acked_at?: string;
}

export interface IpcMessage {
  messageId: string;
  fromAgent: string;
  toAgent: string;
  payload: Record<string, unknown>;
  sentAt: string;
  ackedAt?: string;
}

// ── Kernel View Types ──

export interface KernelOverviewView {
  status: KernelStatus;
  health: KernelHealth;
  processCount: number;
  agentCount: number;
}

export interface KernelHealthView extends KernelHealth {}

export interface KernelProcessView {
  processes: AiProcess[];
  total: number;
}

export interface KernelProcessDetailView extends ProcessDetail {}

export interface KernelMemoryView {
  partitions: MemoryPartition[];
  totalSizeBytes: number;
}

export interface KernelLogView {
  logs: LogRow[];
  total: number;
}

export interface KernelLogEvent extends LogRow {}

export interface KernelSchedulerView {
  entries: SchedulerEntry[];
  total: number;
}

export interface KernelIpcView {
  messages: IpcMessage[];
  total: number;
}

export interface KernelSnapshotView {
  snapshotId: string;
  createdAt: string;
  status: KernelStatus;
  processSnapshot: AiProcess[];
}

export interface KernelAgentDetailView {
  agentId: string;
  name: string;
  status: string;
  processes: AiProcess[];
  memoryUsage: MemoryPartition[];
}

// ── Agent Execution Types ──

export interface AgentDetail {
  agentId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'suspended' | 'decommissioned';
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecution {
  executionId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AgentExecutionCreateInput {
  agentId: string;
  input: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
}

export interface AgentHandoff {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  context: Record<string, unknown>;
  timestamp: string;
}

export interface AgentStep {
  stepId: string;
  executionId: string;
  type: 'tool_call' | 'llm_call' | 'decision' | 'handoff';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}

export interface WorkflowAgentResult {
  success: boolean;
  agentId: string;
  output: Record<string, unknown>;
  steps: AgentStep[];
  tokenUsage: { input: number; output: number; total: number };
}

export interface WorkflowTriggerRequest {
  workflowId: string;
  triggeredBy: string;
  input: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

// ── Engine Types ──

export interface EngineRun {
  runId: string;
  runType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  config: Record<string, unknown>;
  result?: EngineResult;
}

export interface EngineResult {
  success: boolean;
  summary: string;
  metrics: Record<string, number>;
  errors?: string[];
  artifacts?: string[];
}

// ── MCP Types ──

export interface McpServerInfo {
  serverId: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  lastPing?: string;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}

export interface McpToolOverride {
  toolName: string;
  enabled: boolean;
  rateLimitPerMinute?: number;
  allowedRoles?: string[];
}

export interface ToolListFilter {
  serverId?: string;
  enabled?: boolean;
  search?: string;
}

export interface ToolListResult {
  tools: McpToolDef[];
  total: number;
  filtered: number;
}

// ── Code Search Types ──

export interface CodeSearchEngineRecord {
  engineId: string;
  name: string;
  status: 'active' | 'indexing' | 'disabled';
  indexedAt?: string;
  documentCount: number;
}

export interface CodeSearchEngineCreateDTO {
  name: string;
  config: Record<string, unknown>;
}

export interface CodeSearchEngineUpdateDTO {
  name?: string;
  config?: Record<string, unknown>;
  status?: string;
}

export interface CodeSearchHealthResponse {
  healthy: boolean;
  engines: Array<{ name: string; status: string }>;
}

export interface CodeSearchQueryInput {
  query: string;
  engine?: string;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface CodeSearchQueryResponse {
  results: Array<{ path: string; snippet: string; score: number }>;
  total: number;
  searchTimeMs: number;
}

export interface CodeSearchSurfaceRecord {
  surfaceId: string;
  name: string;
  type: string;
  engineId: string;
}

export interface CodeSearchSurfaceCreateDTO {
  name: string;
  type: string;
  engineId: string;
  config?: Record<string, unknown>;
}

// ── AI Governance Types ──

export interface AiSystem {
  systemId: string;
  name: string;
  description?: string;
  riskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable';
  status: 'draft' | 'active' | 'suspended' | 'decommissioned';
  owner: string;
  createdAt: string;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  type: string;
  owner: string;
  metadata?: Record<string, unknown>;
}

// ── Circuit Breaker (re-exported for convenience) ──

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreaker {
  name: string;
  state: CircuitState;
  failureCount: number;
  lastFailure?: string;
  cooldownMs: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
