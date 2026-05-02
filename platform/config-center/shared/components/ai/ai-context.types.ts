export interface AiObservation {
  observation_id: string;
  agent_id: string | null;
  observation_type: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  confidence: number | null;
  run_id?: string | null;
  created_at: string;
}

export interface AiRecommendation {
  decision_id: string;
  agent_id: string | null;
  explanation: string;
  outcome: any;
  run_id?: string | null;
  created_at: string;
}

export interface ReasoningStep {
  step_id: string;
  step_type: string;
  step_order: number;
  node_name: string | null;
  reasoning_text: string | null;
  tool_name: string | null;
  llm_prompt: string | null;
  llm_response: string | null;
  llm_tokens_input: number | null;
  llm_tokens_output: number | null;
  guard_result: string | null;
  guard_reason: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
}

export interface ReasoningChainData {
  run_id: string;
  steps: ReasoningStep[];
  loadedSteps: number;
  totalSteps: number;
  loading: boolean;
  expanded: boolean;
  summary?: ReasoningChainSummary;
}

export interface ReasoningChainSummary {
  total_steps: number;
  total_duration_ms: number;
  total_tokens_input: number;
  total_tokens_output: number;
  final_confidence: number | null;
  final_reasoning: string | null;
}

export interface AgentMetadata {
  id: string;
  name: string;
  nameAr?: string;
  icon: string;
  color: string;
}

export interface RelatedEntity {
  entityType: string;
  entityId: string;
  title: string;
}
