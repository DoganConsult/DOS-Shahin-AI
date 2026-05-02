/**
 * @dos/types — document, evidence, and file management types
 * Covers document lifecycle, evidence collection, and file storage
 */
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived' | 'obsolete';
export type DocumentCategory = 'policy' | 'procedure' | 'standard' | 'guideline' | 'template' | 'evidence' | 'report' | 'contract' | 'certificate' | 'audit_plan' | 'risk_register' | 'other';
export type DocumentAccessLevel = 'public' | 'internal' | 'confidential' | 'restricted';
export interface DocumentRecord {
    documentId: string;
    tenantId: string;
    workspaceId?: string;
    title: string;
    titleAr?: string;
    description?: string;
    category: DocumentCategory;
    status: DocumentStatus;
    accessLevel: DocumentAccessLevel;
    language: string;
    version: string;
    revision: number;
    ownerId: string;
    authorIds: string[];
    reviewerIds: string[];
    approverIds: string[];
    entityType?: string;
    entityId?: string;
    moduleCode?: string;
    tags?: string[];
    expiresAt?: string;
    effectiveDate?: string;
    reviewDueDate?: string;
    publishedAt?: string;
    archivedAt?: string;
    files: DocumentFile[];
    latestFileId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface DocumentFile {
    fileId: string;
    documentId: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storageProvider: 'azure_blob' | 's3' | 'local' | 'sharepoint';
    storageUrl: string;
    checksum: string;
    checksumAlgorithm: 'sha256' | 'md5';
    isLatest: boolean;
    uploadedBy: string;
    uploadedAt: string;
    metadata?: Record<string, unknown>;
}
export interface DocumentVersion {
    versionId: string;
    documentId: string;
    version: string;
    revision: number;
    changeSummary?: string;
    changedBy: string;
    changedAt: string;
    fileId: string;
    previousVersionId?: string;
    diffUrl?: string;
}
export interface DocumentReviewCycle {
    cycleId: string;
    documentId: string;
    tenantId: string;
    reviewers: DocumentReviewer[];
    dueDate: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
    completedAt?: string;
    nextReviewDate?: string;
    outcome?: 'no_change' | 'minor_revision' | 'major_revision' | 'obsolete';
    notes?: string;
}
export interface DocumentReviewer {
    userId: string;
    role: 'reviewer' | 'approver' | 'owner';
    status: 'pending' | 'reviewed' | 'approved' | 'rejected';
    reviewedAt?: string;
    comment?: string;
}
export type EvidenceStatus = 'requested' | 'pending' | 'submitted' | 'accepted' | 'rejected' | 'expired';
export type EvidenceType = 'screenshot' | 'log_export' | 'configuration_file' | 'policy_document' | 'audit_report' | 'certificate' | 'ticket_reference' | 'email_chain' | 'interview_notes' | 'test_result' | 'other';
export interface EvidenceItem {
    evidenceId: string;
    tenantId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    type: EvidenceType;
    status: EvidenceStatus;
    controlId?: string;
    requirementId?: string;
    auditId?: string;
    entityType?: string;
    entityId?: string;
    requestedBy?: string;
    requestedAt?: string;
    dueDate?: string;
    submittedBy?: string;
    submittedAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    files: EvidenceFile[];
    expiresAt?: string;
    collectionPeriodStart?: string;
    collectionPeriodEnd?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface EvidenceFile {
    fileId: string;
    evidenceId: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storageUrl: string;
    checksum: string;
    uploadedBy: string;
    uploadedAt: string;
    isRedacted?: boolean;
    redactedBy?: string;
    redactedAt?: string;
}
export interface EvidenceRequest {
    requestId: string;
    tenantId: string;
    auditId?: string;
    controlIds?: string[];
    requestedBy: string;
    requestedFrom?: string;
    subject: string;
    instructions?: string;
    dueDate: string;
    items: EvidenceRequestItem[];
    status: 'draft' | 'sent' | 'partially_fulfilled' | 'fulfilled' | 'overdue';
    sentAt?: string;
    reminders?: EvidenceReminder[];
    createdAt: string;
    updatedAt: string;
}
export interface EvidenceRequestItem {
    itemId: string;
    controlId?: string;
    description: string;
    evidenceType?: EvidenceType;
    required: boolean;
    evidenceId?: string;
    status: EvidenceStatus;
}
export interface EvidenceReminder {
    reminderId: string;
    sentAt: string;
    sentBy: string;
    channel: 'email' | 'in_app';
}
export type FileStorageProvider = 'azure_blob' | 'aws_s3' | 'local' | 'sharepoint_online';
export interface FileUploadRequest {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    tenantId: string;
    entityType?: string;
    entityId?: string;
    category?: DocumentCategory;
    accessLevel?: DocumentAccessLevel;
}
export interface FileUploadResult {
    fileId: string;
    storageProvider: FileStorageProvider;
    storageUrl: string;
    checksum: string;
    uploadedAt: string;
    presignedUrl?: string;
    presignedUrlExpiresAt?: string;
}
export interface FileMetadata {
    fileId: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storageProvider: FileStorageProvider;
    storageUrl: string;
    checksum: string;
    accessLevel: DocumentAccessLevel;
    entityType?: string;
    entityId?: string;
    uploadedBy: string;
    uploadedAt: string;
    lastAccessedAt?: string;
    downloadCount?: number;
    isEncrypted: boolean;
    retentionDays?: number;
    expiresAt?: string;
}
export interface StorageQuota {
    tenantId: string;
    usedBytes: number;
    allocatedBytes: number;
    usagePercent: number;
    fileCount: number;
    lastCalculatedAt: string;
    breakdown: StorageBreakdown[];
}
export interface StorageBreakdown {
    category: string;
    usedBytes: number;
    fileCount: number;
}
export interface DocumentFilter {
    status?: DocumentStatus[];
    category?: DocumentCategory[];
    accessLevel?: DocumentAccessLevel[];
    ownerId?: string;
    entityType?: string;
    entityId?: string;
    moduleCode?: string;
    tags?: string[];
    expiresBefore?: string;
    reviewDueBefore?: string;
    workspaceId?: string;
}
export interface ContentTemplate {
    templateId: string;
    tenantId?: string;
    name: string;
    nameAr?: string;
    category: DocumentCategory;
    description?: string;
    language: string;
    content: string;
    variables?: TemplateVariable[];
    tags?: string[];
    isGlobal: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface TemplateVariable {
    key: string;
    label: string;
    labelAr?: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'list';
    required: boolean;
    defaultValue?: unknown;
    validationRules?: string[];
}
