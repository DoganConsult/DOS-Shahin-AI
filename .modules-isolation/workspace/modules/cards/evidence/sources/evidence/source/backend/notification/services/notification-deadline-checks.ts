// Phase 11 (M5) — deadline-check shim for the cross-module notification
// copy. Wave-1 evidence workflow hooks do not run deadline-based
// escalation; that logic is owned by the notification-service proper.

export interface DeadlineCheckResult {
  dueIn?: number;
  overdue?: boolean;
  remindersSent?: number;
}

export async function checkEvidenceDeadlines(
  _tenantId: string,
): Promise<DeadlineCheckResult[]> {
  return [];
}

export async function scheduleReminder(
  _tenantId: string,
  _target: Record<string, unknown>,
): Promise<void> {
  return;
}
