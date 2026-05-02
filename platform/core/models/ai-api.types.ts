/**
 * Typed DTOs for AI OS / AI Enhanced / AI Governance API responses.
 *
 * @deprecated These types should migrate to the AI module's own type definitions.
 * @removal-date 2026-06-30
 * @removal-version 2.0.0
 * @owner DOS
 * @replacement frontend/src/app/features/ai-governance/models/ (to be created during AI module type migration)
 */

// ─── AI OS Decisions & Trace ─────────────────────────────────────────────────

export interface DecisionApiRow {
  decision_id: string;
  tenant_id: string;
  run_id: string | null;
  agent_id: string;
  decision_type: string;
  entity_type: string | null;
  entity_id: string | null;
  confidence: number | null;
  explanation: string | null;
  outcome: Record<string, unknown>;
  input_summary: Record<string, unknown>;
  created_by: string;
  created_at: string;
  signals: unknown[];
  rule_ids: string[];
  trace_id: string | null;
}

export interface DecisionsListResponse {
  decisions: DecisionApiRow[];
  total: number;
}

export interface TraceResponse {
  trace_id: string;
  run_id: string;
  items: DecisionApiRow[];
}

export interface ExplainabilityResponse {
  decision: DecisionApiRow | null;
  relatedDecisions: DecisionApiRow[];
  signals: unknown[];
}

// ─── AI Enhanced (model config, usage, budget, etc.) ───────────────────────────

export interface ModelConfigItem {
  agentId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export interface UsageSummary {
  totalTokens?: number;
  totalCost?: number;
  byAgent?: Record<string, { tokens?: number; cost?: number }>;
  periodDays?: number;
  [key: string]: unknown;
}

export interface BudgetStatus {
  monthlyTokenLimit?: number;
  monthlyCostLimit?: number;
  usedTokens?: number;
  usedCost?: number;
  softLimitPct?: number;
  hardLimitAction?: string;
  [key: string]: unknown;
}

export interface CacheStats {
  hits?: number;
  misses?: number;
  size?: number;
  [key: string]: unknown;
}

// ─── AI Governance (assets, model registry) ───────────────────────────────────

export interface AssetListItem {
  id: string;
  asset_type: string;
  asset_key: string;
  display_name: string;
  scope_type?: string;
  lifecycle_status?: string;
  status?: string;
  [key: string]: unknown;
}

export interface AssetsListResponse {
  items: AssetListItem[];
  total?: number;
  [key: string]: unknown;
}

export interface ApiErrorWithCorrelation {
  error?: string;
  message?: string;
  correlationId?: string;
  correlation_id?: string;
  [key: string]: unknown;
}
