/**
 * AI Enhanced API DTOs — AGRC-OS
 * Typed interfaces for ai-enhanced-api.service.ts responses.
 */

/** Model config update request */
export interface ModelConfigUpdateRequest {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  [key: string]: unknown;
}

/** Budget update response */
export interface BudgetUpdateResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/** Prompt version list response */
export interface PromptVersionListDto {
  versions?: Array<{
    id: string;
    version?: number;
    systemPrompt?: string;
    template_text?: string;
    description?: string;
    isActive?: boolean;
    createdAt?: string;
  }>;
  [key: string]: unknown;
}

/** Prompt version creation response */
export interface PromptVersionCreateResponse {
  id?: string;
  version?: number;
  message?: string;
  [key: string]: unknown;
}

/** Prompt activation response */
export interface PromptActivateResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/** Streaming chat response */
export interface StreamChatResponse {
  message?: string;
  tokens?: number;
  [key: string]: unknown;
}

/** Trace list response */
export interface TraceListResponse {
  traces?: Array<Record<string, unknown>>;
  total?: number;
  [key: string]: unknown;
}

/** Trace stats */
export interface TraceStatsDto {
  totalTraces?: number;
  avgLatency?: number;
  errorRate?: number;
  byAgent?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Eval summary */
export interface EvalSummaryDto {
  totalEvals?: number;
  passRate?: number;
  byAgent?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Eval run response */
export interface EvalRunResponse {
  runId?: string;
  sampleSize?: number;
  results?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Eval SLO status */
export interface EvalSloItemDto {
  agentId?: string;
  type?: string;
  breach?: boolean;
  metric?: string;
  target?: number;
  actual?: number;
  met?: boolean;
}

export interface EvalSloStatusDto {
  items?: EvalSloItemDto[];
  agents?: EvalSloItemDto[];
  sloStatus?: EvalSloItemDto[];
  sloBreaches?: EvalSloItemDto[];
  slos?: EvalSloItemDto[];
  [key: string]: unknown;
}

/** Injection stats */
export interface InjectionStatsDto {
  totalAttempts?: number;
  blocked?: number;
  allowed?: number;
  byType?: Record<string, number>;
  [key: string]: unknown;
}

/** Memory health */
export interface MemoryHealthDto {
  status?: string;
  totalEntries?: number;
  lastCompacted?: string;
  [key: string]: unknown;
}

/** Memory compaction response */
export interface MemoryCompactResponse {
  compacted?: number;
  message?: string;
  [key: string]: unknown;
}

/** Cycle memory IDs */
export interface CycleMemoryIdsDto {
  cycles?: string[];
  total?: number;
  [key: string]: unknown;
}

/** Cycle memory detail */
export interface CycleMemoryDto {
  cycleId?: string;
  entries?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Shared memory */
export interface SharedMemoryDto {
  entries?: Array<Record<string, unknown>>;
  total?: number;
  [key: string]: unknown;
}

/** Self-improvement response */
export interface SelfImproveResponse {
  improvements?: Array<Record<string, unknown>>;
  message?: string;
  [key: string]: unknown;
}

/** Bilingual prompts */
export interface BilingualPromptsDto {
  prompts?: Array<{ agentId: string; promptEn?: string; promptAr?: string }>;
  [key: string]: unknown;
}

/** Feedback submission response */
export interface FeedbackSubmitResponse {
  id?: string;
  success?: boolean;
  [key: string]: unknown;
}

/** Feedback summary */
export interface FeedbackSummaryDto {
  averageRating?: number;
  avgRating?: number;
  totalFeedback?: number;
  totalSubmissions?: number;
  totalCount?: number;
  total?: number;
  trend?: string;
  byAgent?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Feedback correlation */
export interface FeedbackCorrelationDto {
  correlations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Gateway health */
export interface GatewayHealthDto {
  status?: string;
  uptime?: number;
  latency?: number;
  [key: string]: unknown;
}

/** Guard decision stats */
export interface GuardDecisionStatsDto {
  totalDecisions?: number;
  approved?: number;
  blocked?: number;
  byReason?: Record<string, number>;
  [key: string]: unknown;
}
