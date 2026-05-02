import { z } from 'zod';

export const aiOsRecommendationsDecisionIdAcceptPostBody = z.object({});
export const aiOsRecommendationsDecisionIdRejectPostBody = z.object({
  reason: z.string().optional(),
});
export const aiOsRecommendationsBatchAcceptPostBody = z.object({
  decisionIds: z.string().optional(),
});
export const aiOsRecommendationsBatchRejectPostBody = z.object({
  decisionIds: z.string().optional(),
  reason: z.string().optional(),
});
export const aiOsPolicyRulesPostBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  module: z.string().min(1),
  condition: z.string().min(1),
  action: z.string().min(1),
  severity: z.enum(['info', 'warning', 'blocker']).optional(),
  enabled: z.boolean().optional(),
});
export const aiOsPolicyRulesRuleIdPutBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  condition: z.string().optional(),
  action: z.string().optional(),
  severity: z.enum(['info', 'warning', 'blocker']).optional(),
  enabled: z.boolean().optional(),
});
export const aiOsPolicyRulesRuleIdTogglePatchBody = z.object({
  enabled: z.boolean().optional(),
});
export const aiOsEventTriggersPostBody = z.object({
  event_type: z.string().min(1),
  module: z.string().min(1),
  action_type: z.string().min(1),
  enabled: z.boolean().optional(),
  config: z.unknown().optional(),
});
export const aiOsEventTriggersBindingIdTogglePatchBody = z.object({
  enabled: z.boolean().optional(),
});
export const aiOsEventTriggersBindingIdTestFirePostBody = z.object({});
export const aiOsRouteRulesPostBody = z.object({
  name: z.string().min(1),
  source_queue: z.string().min(1),
  target_agent: z.string().min(1),
  priority: z.number().optional(),
  conditions: z.unknown().optional(),
});
export const aiOsAgentsAgentIdRuntimePutBody = z.object({
  max_concurrent: z.number().min(1).max(50).optional(),
  timeout_ms: z.number().min(1000).max(300000).optional(),
  retry_count: z.number().min(0).max(5).optional(),
  cooldown_ms: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});
export const aiOsAgentsAgentIdEnablePatchBody = z.object({
  enabled: z.boolean().optional(),
});
export const aiOsAgentsAgentIdCircuitResetPostBody = z.object({});
export const aiOsStuckRunsRunIdCancelPostBody = z.object({});
export const aiOsMaintenancePruneSignalsPostBody = z.object({
  retentionDays: z.string().optional(),
});
export const aiOsMaintenancePruneDecisionsPostBody = z.object({
  retentionDays: z.string().optional(),
});
export const aiOsEventTriggersBindingIdPutBody = z.object({});
export const aiOsRouteRulesRuleIdTogglePatchBody = z.object({
  enabled: z.boolean().optional(),
});
export const aiOsRouteRulesRuleIdPutBody = z.object({});
export const aiOsAgentsAgentIdDisableReasonPostBody = z.object({
  reason: z.string().optional(),
});
export const aiOsWebhookTestPostBody = z.object({
  url: z.string(),
});
export const aiOsObservationsIdAcknowledgePostBody = z.object({});
export const aiOsObservationsIdResolvePostBody = z.object({});
export const aiOsObservationsIdDismissPostBody = z.object({});
export const aiOsAlertsIdAcknowledgePostBody = z.object({});
export const aiOsAlertsIdResolvePostBody = z.object({});
export const aiOsAlertsIdEscalatePostBody = z.object({});
export const aiOsAlertsIdDismissPostBody = z.object({});
export const aiOsRegressionsDetectPostBody = z.object({});
export const aiOsRegressionsAlertIdAcknowledgePostBody = z.object({});
export const aiOsAbTestsPostBody = z.object({});
export const aiOsAbTestsTestIdAssignPostBody = z.object({
  sessionId: z.string().optional(),
});
export const aiOsAbTestsTestIdResultPostBody = z.object({
  variant: z.string().optional(),
  result: z.string().optional(),
});
export const aiOsActivityAlertsEvaluatePostBody = z.object({});
export const aiOsActivityAlertsRulesPostBody = z.object({});
export const aiOsActivityAlertsAlertIdAcknowledgePostBody = z.object({});
export const aiOsObservationsPostBody = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  observation_type: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  details: z.unknown().optional(),
});
export const aiOsToolsPostBody = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  input_schema: z.unknown(),
  handler_module: z.string().min(1),
  version: z.string().optional(),
});
export const aiOsToolsToolIdVersionsVersionDeprecatePostBody = z.object({
  replacedBy: z.string().optional(),
});
export const aiOsCircuitBreakersAgentIdResetPostBody = z.object({});
export const aiOsCostAttributionCentersPostBody = z.object({});
export const aiOsCostAttributionProjectsPostBody = z.object({});
