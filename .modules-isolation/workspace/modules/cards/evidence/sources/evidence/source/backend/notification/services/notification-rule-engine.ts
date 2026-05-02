// Phase 11 (M5) — notification rule-engine shim for the cross-module
// notification service copy. Wave-1 evidence routes trigger basic
// notifications only; rule-based escalation lives in notification-
// service proper.

export interface NotificationRuleMatch {
  matched: boolean;
  ruleId?: string;
}

export async function evaluateNotificationRules(
  _tenantId: string,
  _event: Record<string, unknown>,
): Promise<NotificationRuleMatch[]> {
  return [];
}

export async function loadActiveRules(_tenantId: string): Promise<unknown[]> {
  return [];
}
