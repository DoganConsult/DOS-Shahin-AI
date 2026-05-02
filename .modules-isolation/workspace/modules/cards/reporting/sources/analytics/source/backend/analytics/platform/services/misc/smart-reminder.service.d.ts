export type ReminderPriority = 'critical' | 'high' | 'medium' | 'low';
export type ReminderSource = 'process_task' | 'assessment' | 'evidence' | 'policy_review' | 'control_review';
export interface SmartReminder {
    id: string;
    source: ReminderSource;
    sourceId: string;
    title: string;
    description: string;
    priority: ReminderPriority;
    dueDate: string;
    daysUntilDue: number;
    isOverdue: boolean;
    assignedTo?: string;
    moduleCode: string;
    dismissed: boolean;
}
export interface ReminderSummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    overdue: number;
}
/**
 * Scan all deadline sources for a user/tenant and return
 * prioritized, de-duplicated reminders sorted by urgency.
 */
export declare function generateReminders(tenantId: string, userId?: string): Promise<SmartReminder[]>;
/**
 * Record a user dismissal for a specific reminder.
 * Stores in a dismissals table so the reminder is not re-surfaced.
 */
export declare function dismissReminder(tenantId: string, userId: string, reminderId: string): Promise<{
    dismissed: boolean;
}>;
/**
 * Return all deadlines within the next N days across all tracked sources.
 */
export declare function getUpcomingDeadlines(tenantId: string, days?: number): Promise<{
    deadlines: SmartReminder[];
    summary: ReminderSummary;
}>;
/** @deprecated Use generateReminders instead */
export declare const generateReminder: typeof generateReminders;
/** @deprecated @removal-date Phase 9 @owner Product @replacement Direct UI return. Reminders are not sent. */
export declare function sendReminder(..._args: unknown[]): void;
/** @deprecated @removal-date Phase 9 @owner DOS @replacement middleware-layer rate limiting. */
export declare function isRateLimited(..._args: unknown[]): boolean;
