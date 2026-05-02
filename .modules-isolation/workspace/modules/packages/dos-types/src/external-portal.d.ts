/**
 * @dos/types — third-party and external portal types
 * Covers external user portals, submissions, verification, partner management
 */
export type PortalType = 'vendor_portal' | 'customer_portal' | 'regulator_portal' | 'partner_portal' | 'dsar_portal' | 'whistleblower_portal' | 'auditor_portal' | 'custom';
export type PortalStatus = 'active' | 'inactive' | 'maintenance' | 'suspended';
export type PortalTheme = 'default' | 'government' | 'corporate' | 'minimal' | 'custom';
export interface ExternalPortal {
    portalId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    type: PortalType;
    status: PortalStatus;
    description?: string;
    theme?: PortalTheme;
    subdomain?: string;
    customUrl?: string;
    logoUrl?: string;
    primaryColor?: string;
    language?: 'en' | 'ar' | 'both';
    features?: PortalFeatures;
    mfaRequired?: boolean;
    allowGuestAccess?: boolean;
    invitationOnly?: boolean;
    ssoEnabled?: boolean;
    ssoProvider?: string;
    termsUrl?: string;
    privacyUrl?: string;
    contactEmail?: string;
    createdBy?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface PortalFeatures {
    assessmentSubmission?: boolean;
    documentUpload?: boolean;
    messaging?: boolean;
    ticketTracking?: boolean;
    calendarView?: boolean;
    profileManagement?: boolean;
    kycVerification?: boolean;
    reporting?: boolean;
}
export type ExternalUserStatus = 'pending_verification' | 'active' | 'inactive' | 'blocked' | 'pending_invite';
export interface ExternalUser {
    externalUserId: string;
    tenantId: string;
    portalId?: string;
    email: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    organization?: string;
    role?: string;
    status: ExternalUserStatus;
    type: 'vendor' | 'customer' | 'auditor' | 'regulator' | 'partner' | 'other';
    linkedVendorId?: string;
    linkedEntityType?: string;
    linkedEntityId?: string;
    invitedBy?: string;
    invitedAt?: string;
    verifiedAt?: string;
    lastLoginAt?: string;
    accessExpiry?: string;
    mfaEnabled?: boolean;
    language?: 'en' | 'ar';
    preferences?: ExternalUserPreferences;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ExternalUserPreferences {
    language?: 'en' | 'ar';
    notificationsEmail?: boolean;
    notificationsInApp?: boolean;
}
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_clarification';
export type SubmissionType = 'assessment_response' | 'document_upload' | 'issue_report' | 'certification_upload' | 'clarification_response' | 'renewal_request' | 'custom';
export interface PortalSubmission {
    submissionId: string;
    tenantId: string;
    portalId: string;
    submittedBy: string;
    type: SubmissionType;
    status: SubmissionStatus;
    title?: string;
    description?: string;
    referenceId?: string;
    referenceType?: string;
    formData?: Record<string, unknown>;
    files?: string[];
    score?: number;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewComments?: string;
    rejectionReason?: string;
    clarificationRequest?: string;
    clarificationDue?: string;
    submittedAt?: string;
    approvedAt?: string;
    nextAction?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type VerificationStatus = 'not_started' | 'pending' | 'under_review' | 'verified' | 'rejected' | 'expired';
export type VerificationType = 'identity' | 'business' | 'address' | 'document' | 'bank_account' | 'sanctions';
export interface VerificationRequest {
    verificationId: string;
    tenantId: string;
    entityType: 'external_user' | 'vendor' | 'supplier' | 'customer';
    entityId?: string;
    type: VerificationType;
    status: VerificationStatus;
    provider?: string;
    initiatedBy?: string;
    initiatedAt: string;
    completedAt?: string;
    result?: 'pass' | 'fail' | 'manual_review';
    score?: number;
    riskLevel?: 'high' | 'medium' | 'low';
    documents?: VerificationDocument[];
    providerRef?: string;
    providerData?: Record<string, unknown>;
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    expiresAt?: string;
    retryCount?: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface VerificationDocument {
    docId?: string;
    type: 'passport' | 'national_id' | 'driving_license' | 'company_registration' | 'utility_bill' | 'bank_statement' | 'other';
    fileId?: string;
    status?: 'pending' | 'accepted' | 'rejected';
    expiresAt?: string;
    uploadedAt?: string;
    notes?: string;
}
export type ThreadStatus = 'open' | 'pending_response' | 'resolved' | 'closed' | 'archived';
export interface CommunicationThread {
    threadId: string;
    tenantId: string;
    portalId?: string;
    participants: string[];
    externalParticipants?: string[];
    subject?: string;
    status: ThreadStatus;
    entityType?: string;
    entityId?: string;
    category?: string;
    priority?: 'high' | 'medium' | 'low';
    unresolvedCount?: number;
    lastMessageAt?: string;
    messages?: ThreadMessage[];
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ThreadMessage {
    messageId: string;
    threadId: string;
    senderId: string;
    senderType?: 'internal' | 'external';
    body: string;
    isHtml?: boolean;
    attachments?: string[];
    isRead?: boolean;
    readAt?: string;
    sentAt: string;
    editedAt?: string;
    deletedAt?: string;
}
export type WhistleblowerStatus = 'received' | 'review' | 'investigating' | 'closed' | 'escalated';
export type WhistleblowerCategory = 'fraud' | 'corruption' | 'bribery' | 'harassment' | 'discrimination' | 'safety_violation' | 'data_misuse' | 'conflict_of_interest' | 'other';
export interface WhistleblowerReport {
    reportId: string;
    tenantId: string;
    reference: string;
    category: WhistleblowerCategory;
    status: WhistleblowerStatus;
    reportedAt: string;
    isAnonymous: boolean;
    reporterContact?: string;
    description: string;
    allegation?: string;
    involvedParties?: string;
    evidence?: string[];
    assignedTo?: string;
    investigatedBy?: string;
    closedAt?: string;
    outcome?: 'substantiated' | 'unsubstantiated' | 'inconclusive' | 'referred';
    outcomeNotes?: string;
    regulatoryNotified?: boolean;
    followUp?: string;
    acknowledgedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type PartnerStatus = 'active' | 'inactive' | 'suspended' | 'onboarding';
export type PartnerType = 'reseller' | 'implementation' | 'technology' | 'distribution' | 'referral' | 'strategic';
export interface Partner {
    partnerId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    type: PartnerType;
    status: PartnerStatus;
    tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
    countryCode?: string;
    website?: string;
    contact?: PartnerContact;
    contractId?: string;
    commissionRate?: number;
    revenueShare?: number;
    accreditedAt?: string;
    accreditationExpiry?: string;
    certificationLevel?: string;
    ownerId?: string;
    tags?: string[];
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface PartnerContact {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
}
