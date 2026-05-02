/**
 * @dos/types — training, learning, and certification types
 * Covers training programs, courses, learner progress, certifications
 */
export type TrainingStatus = 'active' | 'archived' | 'completed' | 'draft' | 'expired' | 'in_progress' | 'published' | 'retired';
export type TrainingDelivery = 'online_self_paced' | 'virtual_instructor' | 'in_person' | 'blended' | 'on_the_job';
export type TrainingCategory = 'security_awareness' | 'compliance' | 'privacy' | 'grc' | 'technical' | 'leadership' | 'onboarding' | 'social_engineering' | 'custom';
export interface TrainingProgram {
    programId: string;
    tenantId?: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: TrainingCategory;
    status: TrainingStatus;
    delivery: TrainingDelivery;
    language?: 'en' | 'ar' | 'both';
    courses?: TrainingCourse[];
    targetAudience?: string[];
    targetRoles?: string[];
    targetDepartments?: string[];
    requiredBy?: string;
    mandatoryForRoles?: string[];
    completionCriteria?: CompletionCriteria;
    certificateTemplateId?: string;
    duration?: TrainingDuration;
    thumbnailUrl?: string;
    tags?: string[];
    isGlobal: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface TrainingCourse {
    courseId: string;
    programId?: string;
    tenantId?: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: TrainingCategory;
    status: TrainingStatus;
    language: string;
    modules?: CourseModule[];
    order?: number;
    passingScore?: number;
    maxAttempts?: number;
    duration?: TrainingDuration;
    externalUrl?: string;
    lmsId?: string;
    scormPackageId?: string;
    isStandalone: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CourseModule {
    moduleId: string;
    courseId: string;
    title: string;
    titleAr?: string;
    type: 'video' | 'document' | 'quiz' | 'simulation' | 'scenario' | 'interactive';
    order: number;
    durationMinutes?: number;
    contentUrl?: string;
    fileId?: string;
    passingScore?: number;
    questions?: QuizQuestion[];
    isRequired: boolean;
}
export interface QuizQuestion {
    questionId: string;
    type: 'single_choice' | 'multiple_choice' | 'true_false' | 'open_ended';
    question: string;
    questionAr?: string;
    options?: QuizOption[];
    correctAnswers?: string[];
    points?: number;
    explanation?: string;
    explanationAr?: string;
}
export interface QuizOption {
    optionId: string;
    text: string;
    textAr?: string;
    isCorrect?: boolean;
}
export interface TrainingDuration {
    minutes?: number;
    hours?: number;
    days?: number;
}
export interface CompletionCriteria {
    requiredPercent?: number;
    requiredCourseIds?: string[];
    minPassingScore?: number;
    requireAllModules?: boolean;
}
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'expired' | 'withdrawn';
export type EnrollmentType = 'mandatory' | 'voluntary' | 'assigned';
export interface TrainingEnrollment {
    enrollmentId: string;
    tenantId: string;
    userId: string;
    programId?: string;
    courseId: string;
    type: EnrollmentType;
    status: EnrollmentStatus;
    enrolledAt: string;
    enrolledBy?: string;
    dueDate?: string;
    startedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    score?: number;
    passingScore?: number;
    passed?: boolean;
    attempts?: number;
    progress?: EnrollmentProgress;
    certificateId?: string;
    moduleProgress?: ModuleProgress[];
    reminderSentAt?: string;
    metadata?: Record<string, unknown>;
}
export interface EnrollmentProgress {
    percent: number;
    completedModules: number;
    totalModules: number;
    timeSpentMinutes?: number;
    lastActivityAt?: string;
}
export interface ModuleProgress {
    moduleId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'failed';
    score?: number;
    completedAt?: string;
    attempts?: number;
    timeSpentMinutes?: number;
    lastActivityAt?: string;
}
export type PhishingStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
export type PhishingTemplate = 'credential_phishing' | 'invoice' | 'it_support' | 'hr_policy' | 'executive' | 'package_delivery';
export interface PhishingCampaign {
    campaignId: string;
    tenantId: string;
    name: string;
    description?: string;
    templateType: PhishingTemplate;
    emailTemplateId?: string;
    status: PhishingStatus;
    targetUserIds?: string[];
    targetGroupIds?: string[];
    targetCount?: number;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    trackingDays?: number;
    sendTrainingOnFail?: boolean;
    trainingProgramId?: string;
    stats?: PhishingStats;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface PhishingStats {
    totalSent: number;
    opened: number;
    clicked: number;
    reported: number;
    submitted: number;
    clickRate: number;
    reportRate: number;
    enrolledInTraining: number;
    lastCalculatedAt: string;
}
export interface PhishingUserRecord {
    recordId: string;
    campaignId: string;
    tenantId: string;
    userId: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
    reportedAt?: string;
    submittedAt?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
}
export type CertificateStatus = 'valid' | 'expired' | 'revoked' | 'draft';
export interface TrainingCertificate {
    certificateId: string;
    tenantId: string;
    userId: string;
    programId?: string;
    courseId?: string;
    enrollmentId: string;
    name: string;
    status: CertificateStatus;
    issuedAt: string;
    expiresAt?: string;
    revokedAt?: string;
    revocationReason?: string;
    score?: number;
    fileId?: string;
    fileUrl?: string;
    verificationCode?: string;
    verificationUrl?: string;
    metadata?: Record<string, unknown>;
}
export interface TrainingPlan {
    planId: string;
    tenantId: string;
    name: string;
    description?: string;
    period: string;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    targetUserIds?: string[];
    targetRoles?: string[];
    targetDepartments?: string[];
    programs: TrainingPlanItem[];
    totalHours?: number;
    budget?: number;
    currency?: string;
    ownerId: string;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface TrainingPlanItem {
    itemId: string;
    planId: string;
    programId?: string;
    courseId?: string;
    name: string;
    type: EnrollmentType;
    dueDate?: string;
    targetUserIds?: string[];
    targetRoles?: string[];
    enrollmentCount?: number;
    completionCount?: number;
    completionPercent?: number;
}
export interface TrainingComplianceStats {
    tenantId: string;
    period?: string;
    totalEnrollments: number;
    completed: number;
    inProgress: number;
    overdue: number;
    notStarted: number;
    completionRate: number;
    avgScore?: number;
    avgTimeToCompleteHours?: number;
    phishingClickRate?: number;
    phishingReportRate?: number;
    byCategory?: Record<TrainingCategory, TrainingCategoryStats>;
    lastCalculatedAt: string;
}
export interface TrainingCategoryStats {
    enrollments: number;
    completions: number;
    completionRate: number;
    avgScore?: number;
}
export interface TrainingCampaign {
    campaign_id: string;
    tenant_id: string;
    title: string;
    description?: string;
    campaign_type: string;
    status: string;
    target_audience?: string;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface TrainingCampaignCreateInput {
    tenant_id: string;
    title: string;
    description?: string;
    campaign_type: string;
    status: string;
    target_audience?: string;
    start_date?: string;
    end_date?: string;
    created_by: string;
}
export interface TrainingCampaignUpdateInput {
    title: string;
    description?: string;
    campaign_type: string;
    status: string;
    target_audience?: string;
    start_date?: string;
    end_date?: string;
    updated_by: string;
}
export interface TrainingCampaignListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface TrainingCampaignListResult {
    rows: TrainingCampaign[];
    total: number;
}
export declare const TRAINING_STATUSES: readonly TrainingStatus[];
export type TrainingSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const TRAINING_SOURCES: readonly TrainingSource[];
export type TrainingStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface TrainingEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'training';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: TrainingStatus;
    newState?: TrainingStatus;
    data: Record<string, unknown>;
}
