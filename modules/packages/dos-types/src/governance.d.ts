/**
 * @dos/types — governance structure, committee, and board types
 * Covers governance bodies, meetings, resolutions, charters
 */
export type GovBodyType = 'board_of_directors' | 'audit_committee' | 'risk_committee' | 'grc_committee' | 'security_committee' | 'executive_committee' | 'steering_committee' | 'advisory_board' | 'working_group' | 'taskforce' | 'custom';
export type GovBodyStatus = 'active' | 'inactive' | 'dissolved' | 'forming';
export interface GovBody {
    bodyId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    type: GovBodyType;
    status: GovBodyStatus;
    description?: string;
    charter?: string;
    mandate?: string;
    scope?: string;
    parentBodyId?: string;
    memberships?: GovBodyMembership[];
    meetingCadence?: string;
    minQuorum?: number;
    votingRules?: VotingRules;
    delegations?: GovDelegation[];
    reportingTo?: string;
    secretariatId?: string;
    modules?: string[];
    assets?: string[];
    frameworks?: string[];
    establishedDate?: string;
    dissolvedDate?: string;
    reviewDate?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface GovBodyMembership {
    membershipId: string;
    bodyId: string;
    userId: string;
    role: 'chairperson' | 'vice_chair' | 'member' | 'observer' | 'secretary' | 'advisor';
    votingMember: boolean;
    weightedVotes?: number;
    startDate: string;
    endDate?: string;
    status: 'active' | 'inactive' | 'on_leave' | 'resigned';
    addedBy?: string;
}
export interface VotingRules {
    type: 'simple_majority' | 'supermajority' | 'unanimous' | 'weighted' | 'consensus';
    requiredPercent?: number;
    tieBreaker?: 'chairperson' | 'casting_vote' | 'no_pass' | 'defer';
}
export interface GovDelegation {
    delegationId: string;
    delegatorBodyId: string;
    delegateeBodyId?: string;
    delegateeUserId?: string;
    authority: string;
    conditions?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
}
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | 'adjourned';
export type MeetingType = 'regular' | 'extraordinary' | 'emergency' | 'annual' | 'inaugural' | 'virtual';
export interface GovMeeting {
    meetingId: string;
    tenantId: string;
    bodyId: string;
    title: string;
    titleAr?: string;
    type: MeetingType;
    status: MeetingStatus;
    number?: number;
    scheduledDate: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    actualDate?: string;
    actualStartTime?: string;
    actualEndTime?: string;
    location?: string;
    virtualLink?: string;
    timezone?: string;
    invitedMembers?: string[];
    attendees?: MeetingAttendee[];
    quorumMet?: boolean;
    agenda?: AgendaItem[];
    minutesFileId?: string;
    minutesDraftDue?: string;
    minutesApprovedAt?: string;
    relatedMeetingId?: string;
    followUpActions?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface MeetingAttendee {
    attendeeId?: string;
    userId: string;
    role?: string;
    attended: boolean;
    attendanceType?: 'physical' | 'virtual' | 'apology';
    proxyUserId?: string;
    joinedAt?: string;
    leftAt?: string;
}
export interface AgendaItem {
    itemId: string;
    meetingId: string;
    order: number;
    title: string;
    titleAr?: string;
    description?: string;
    type: 'discussion' | 'decision' | 'information' | 'review' | 'approval' | 'other';
    duration?: number;
    presenter?: string;
    documents?: string[];
    resolution?: string;
    decision?: MeetingDecision;
    notes?: string;
    status?: 'pending' | 'presented' | 'deferred' | 'cancelled' | 'completed';
}
export interface MeetingDecision {
    decisionId: string;
    agendaItemId: string;
    description: string;
    decisionType: 'approved' | 'rejected' | 'deferred' | 'noted' | 'escalated';
    votingResult?: VotingResult;
    conditions?: string;
    effectiveDate?: string;
    implementation?: string;
    reviewDate?: string;
}
export interface VotingResult {
    totalVotes: number;
    inFavor: number;
    against: number;
    abstained: number;
    absent: number;
    passed: boolean;
    method?: string;
}
export type ResolutionStatus = 'draft' | 'approved' | 'superseded' | 'withdrawn' | 'expired';
export interface GovResolution {
    resolutionId: string;
    tenantId: string;
    bodyId: string;
    meetingId?: string;
    number: string;
    title: string;
    titleAr?: string;
    content: string;
    contentAr?: string;
    status: ResolutionStatus;
    approvedAt?: string;
    approvedBy?: string;
    signatories?: ResolutionSignatory[];
    effectiveDate?: string;
    expiryDate?: string;
    category?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    filesIds?: string[];
    supersededBy?: string;
    supersedes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ResolutionSignatory {
    userId: string;
    role?: string;
    signedAt?: string;
    signatureFileId?: string;
}
export interface GovBodyCharter {
    charterId: string;
    bodyId: string;
    tenantId: string;
    version: string;
    effectiveDate: string;
    sections?: CharterSection[];
    approvedBy?: string[];
    approvedAt?: string;
    reviewDate?: string;
    fileId?: string;
    status: 'draft' | 'approved' | 'superseded';
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface CharterSection {
    sectionId: string;
    title: string;
    titleAr?: string;
    content: string;
    contentAr?: string;
    order: number;
    subsections?: CharterSection[];
}
export interface GovernanceDashboard {
    tenantId: string;
    period?: string;
    bodies: number;
    activeBodies: number;
    meetingsDueNextMonth: number;
    overdueActions: number;
    openResolutions: number;
    approvedResolutions: number;
    charterReviewsDue: number;
    membershipsExpiring: number;
    resolutionImplementationRate?: number;
    byBodyType?: Record<GovBodyType, number>;
    lastUpdatedAt: string;
}
export interface GovernanceActionItem {
    actionId: string;
    tenantId: string;
    bodyId?: string;
    meetingId?: string;
    agendaItemId?: string;
    resolutionId?: string;
    title: string;
    description?: string;
    ownerId: string;
    dueDate?: string;
    status: 'open' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
    priority?: 'high' | 'medium' | 'low';
    completedAt?: string;
    taskId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface GovernanceCharter {
    charter_id: string;
    tenant_id: string;
    title: string;
    description?: string;
    charter_type: string;
    status: string;
    owner_id: string;
    effective_date?: string;
    review_date?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface GovernanceCharterCreateInput {
    tenant_id: string;
    title: string;
    description?: string;
    charter_type: string;
    status: string;
    owner_id: string;
    effective_date?: string;
    review_date?: string;
    created_by: string;
}
export interface GovernanceCharterUpdateInput {
    title: string;
    description?: string;
    charter_type: string;
    status: string;
    owner_id: string;
    effective_date?: string;
    review_date?: string;
    updated_by: string;
}
export interface GovernanceCharterListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface GovernanceCharterListResult {
    rows: GovernanceCharter[];
    total: number;
}
export type GovernanceStatus = 'draft' | 'proposed' | 'approved' | 'active' | 'review' | 'retired' | 'archived';
export declare const GOVERNANCE_STATUSES: readonly GovernanceStatus[];
export type GovernanceSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const GOVERNANCE_SOURCES: readonly GovernanceSource[];
export type GovernanceStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface GovernanceEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'governance';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: GovernanceStatus;
    newState?: GovernanceStatus;
    data: Record<string, unknown>;
}
