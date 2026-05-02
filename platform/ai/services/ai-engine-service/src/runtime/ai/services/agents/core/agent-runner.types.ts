import { safeQuery } from "@dos/db";

// ── Action schema returned by each agent LLM call ──────────────────────────

export interface AgentAction {
  type:
    | 'create_task' | 'send_notification' | 'publish_event' | 'flag_risk' | 'request_evidence'
    | 'create_control' | 'update_risk_score' | 'create_finding' | 'close_incident'
    | 'update_control_status' | 'create_remediation' | 'escalate' | 'trigger_sync'
    // ── Vendor Cross-Agent Propagation Actions (A09) ──
    | 'propagate_vendor_risk'     // A09->A07: vendor risk -> enterprise risk register
    | 'propagate_vendor_gap'      // A09->A06: vendor compliance gap -> remediation
    | 'propagate_vendor_evidence' // A09->A05: vendor cert -> auto-satisfy control evidence
    | 'propagate_vendor_finding'; // A09->A10: vendor finding -> audit finding
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  assignToRole?: string;   // e.g. 'compliance_officer', 'risk_manager'
  dueInDays?: number;
  payload?: Record<string, unknown>;  // extra data for specific action types
  /** Law 6: Whether this action can be undone. Irreversible actions require higher approval. */
  reversible?: boolean;
  /** Appendix B: Force queue for human review (set by role agent interaction mode) */
  _forceQueue?: boolean;
}

export interface AgentRunResult {
  agentId: string;
  tenantId: string;
  actionsProposed: number;
  actionsExecuted: number;
  summary: string;
  durationMs: number;
  // Wave 1 G1 — explicit terminal status so smoke harness + Temporal
  // activity can verify success without inspecting durationMs.
  status?: 'completed' | 'failed' | 'rejected' | 'partial';
  costUsd?: number;
  output?: Record<string, unknown>;
  usedTools?: string[];
}

export interface AgentRunOpts {
  dryRun?: boolean;
  replayFromRunId?: string;
  query?: string;
  callerAgentId?: string;
  runId?: string;
  /** Wave 2: forwarded to Langfuse trace.userId for "who triggered this run" filtering. */
  userId?: string;
  /** Wave 2: forwarded to Langfuse trace.sessionId for multi-turn conversation grouping. */
  sessionId?: string;
}
