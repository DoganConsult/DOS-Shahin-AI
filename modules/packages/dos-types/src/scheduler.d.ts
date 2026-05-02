/**
 * @dos/types — scheduler, cadence, and periodic job types
 * Covers scheduling, cadence definitions, recurring tasks
 */
export type CadenceUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'quarters' | 'years';
export type CadenceType = 'recurring' | 'one_time' | 'event_driven' | 'conditional';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type Month = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';
export interface CadenceDefinition {
    cadenceId: string;
    tenantId?: string;
    name: string;
    description?: string;
    type: CadenceType;
    cronExpression?: string;
    interval?: number;
    unit?: CadenceUnit;
    dayOfWeek?: DayOfWeek[];
    dayOfMonth?: number[];
    month?: Month[];
    hour?: number;
    minute?: number;
    timezone: string;
    businessDaysOnly?: boolean;
    startDate?: string;
    endDate?: string;
    maxOccurrences?: number;
    isActive: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type ScheduledJobType = 'control_testing' | 'risk_review' | 'compliance_assessment' | 'evidence_collection' | 'report_generation' | 'data_sync' | 'notification_digest' | 'audit_task' | 'custom';
export type ScheduledJobStatus = 'active' | 'paused' | 'expired' | 'error' | 'disabled';
export interface ScheduledJob {
    jobId: string;
    tenantId: string;
    name: string;
    description?: string;
    type: ScheduledJobType;
    status: ScheduledJobStatus;
    cadenceId?: string;
    cronExpression?: string;
    timezone: string;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    ownerId?: string;
    assignTo?: string[];
    notifyOnComplete?: string[];
    notifyOnFailure?: string[];
    lastRunAt?: string;
    nextRunAt?: string;
    runCount?: number;
    failureCount?: number;
    consecutiveFailures?: number;
    maxConsecutiveFailures?: number;
    autoDisableOnFailure?: boolean;
    timeout?: number;
    retryPolicy?: JobRetryPolicy;
    metadata?: Record<string, unknown>;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface JobRetryPolicy {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
    retryOn?: string[];
}
export type JobRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timed_out' | 'cancelled' | 'skipped';
export interface JobRun {
    runId: string;
    jobId: string;
    tenantId: string;
    status: JobRunStatus;
    scheduledAt: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    result?: JobRunResult;
    errorMessage?: string;
    errorCode?: string;
    stackTrace?: string;
    retryAttempt?: number;
    triggeredBy?: 'schedule' | 'manual' | 'api' | 'event';
    triggeredByUserId?: string;
    workerNode?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface JobRunResult {
    success: boolean;
    count?: number;
    itemsProcessed?: number;
    itemsSkipped?: number;
    itemsFailed?: number;
    artifacts?: string[];
    summary?: string;
    data?: Record<string, unknown>;
}
export type ReminderType = 'review_due' | 'task_due' | 'attestation' | 'evidence' | 'training' | 'certificate_expiry' | 'custom';
export type ReminderChannel = 'email' | 'in_app' | 'push' | 'sms';
export interface Reminder {
    reminderId: string;
    tenantId: string;
    type: ReminderType;
    entityType?: string;
    entityId?: string;
    recipients: string[];
    channels?: ReminderChannel[];
    subject?: string;
    message?: string;
    scheduledAt: string;
    sentAt?: string;
    status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
    failureReason?: string;
    isRecurring?: boolean;
    cadenceId?: string;
    templateId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export type PeriodicReviewStatus = 'upcoming' | 'due' | 'overdue' | 'in_progress' | 'completed' | 'skipped';
export interface PeriodicReview {
    reviewId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    reviewType: string;
    status: PeriodicReviewStatus;
    cadenceId?: string;
    frequency: ReviewFrequency;
    scheduledDate: string;
    dueDate: string;
    completedAt?: string;
    completedBy?: string;
    assignedTo?: string;
    outcome?: string;
    notes?: string;
    nextReviewDate?: string;
    reminderSentAt?: string;
    escalatedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type ReviewFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'ad_hoc';
export interface CalendarEvent {
    eventId: string;
    tenantId: string;
    title: string;
    titleAr?: string;
    description?: string;
    type: ScheduledJobType | 'meeting' | 'milestone' | 'deadline' | 'holiday';
    startDate: string;
    endDate?: string;
    allDay?: boolean;
    timezone?: string;
    entityType?: string;
    entityId?: string;
    attendees?: string[];
    location?: string;
    recurrenceRule?: string;
    isRecurring?: boolean;
    color?: string;
    priority?: 'high' | 'medium' | 'low';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface SchedulerStats {
    tenantId: string;
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
    runningNow: number;
    dueInNextHour: number;
    dueToday: number;
    failedLast24h: number;
    successRate24h: number;
    avgDurationMs?: number;
    lastCalculatedAt: string;
}
