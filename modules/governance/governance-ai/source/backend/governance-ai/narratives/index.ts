export { submitFeedback, getFeedbackStats, generateNarrativeSummary } from '../services/intelligence/narrative-engine.service';
export { runEscalationScan, getBoardAttentionSummary, getExecutiveAttentionSummary, escalateItem, deescalateItem } from '../services/intelligence/escalation-engine.service';
export type { EscalationScanResult, EscalationLevel, BoardAttentionSummary, ExecutiveAttentionSummary } from '../services/intelligence/escalation-engine.service';
