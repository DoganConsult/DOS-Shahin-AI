export interface TriageProposal {
    id?: string;
    tenantId?: string;
    taskId?: string;
    taskTitle?: string;
    suggestedAssignee?: string;
    suggestedPriority?: string;
    suggestedCategory?: string;
    confidence?: number;
    confidenceScore?: number;
    reasoning?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'modified' | string;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt?: string;
    proposedAssigneeId?: string;
    proposedAssigneeName?: string;
    agentId?: string;
    workloadScore?: number;
    skillMatchScore?: number;
    proposalId?: string;
}
export interface CoDraftSession {
    id?: string;
    tenantId?: string;
    entityType: string;
    entityId: string;
    humanUserId: string;
    agentId?: string;
    status: 'active' | 'paused' | 'finalized' | 'drafting';
    draftContent?: Record<string, unknown> | string;
    questions?: CoDraftQuestion[];
    createdAt?: string;
    finalizedAt?: string;
    uncertainSections?: unknown[];
    humanResolutions?: unknown[];
    sessionId?: string;
}
export interface CoDraftQuestion {
    id?: string;
    sessionId?: string;
    question?: string;
    questionText?: string;
    source?: 'ai' | 'human';
    answer?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    sectionRef?: string;
    options?: string[];
    suggestedOptions?: string[];
    questionId?: string;
    resolved?: boolean;
}
export interface CoDraftResolution {
    questionId: string;
    answer: string;
    resolvedBy: string;
    freeText?: string;
    chosenOption?: string;
}
export interface EvidenceRelayItem {
    id?: string;
    relayId?: string;
    evidenceId?: string;
    tenantId?: string;
    controlId?: string;
    agentId?: string;
    sourceSystem?: string;
    stagedContent?: Record<string, unknown> | string;
    confidenceScore?: number;
    evidenceType?: string;
    aiCollectedData?: Record<string, unknown>;
    humanVerification?: Record<string, unknown>;
    status: 'staged' | 'pending_review' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewNote?: string;
    reviewedAt?: string;
    createdAt?: string;
    resolvedAt?: string;
}
export interface RiskPairReview {
    id?: string;
    reviewId?: string;
    tenantId?: string;
    riskId: string;
    agentId?: string;
    humanAnalystId?: string;
    agentAssessment?: Record<string, unknown>;
    humanAssessment?: Record<string, unknown>;
    agentScore?: number;
    agentReasoning?: string;
    humanScore?: number;
    humanReasoning?: string;
    dialogue?: DialogueEntry[];
    dialogueEntries?: DialogueEntry[];
    disagreementFlag?: boolean;
    finalMethod?: string;
    status: 'agent_review' | 'human_review' | 'dialogue' | 'finalized';
    finalScore?: number;
    finalizedBy?: string;
    finalizedAt?: string;
    createdAt?: string;
}
export interface DialogueEntry {
    id?: string;
    entryId?: string;
    reviewId?: string;
    source?: 'ai' | 'human';
    from?: 'agent' | 'human';
    message: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}
export interface ApprovalPreScreen {
    id?: string;
    tenantId?: string;
    approvalId?: string;
    agentId?: string;
    riskScore?: number;
    complianceCheck?: Record<string, unknown>;
    recommendation?: 'approve' | 'reject' | 'escalate' | 'needs_review' | string;
    confidence?: number;
    confidenceScore?: number;
    reasoning?: string;
    summary?: string;
    supportingEvidence?: unknown[];
    gapsFound?: unknown[];
    createdAt?: string;
    preScreenId?: string;
}
export interface WarRoom {
    id?: string;
    tenantId?: string;
    incidentId?: string;
    title?: string;
    severity?: string;
    status?: 'active' | 'contained' | 'resolved' | 'post_mortem' | string;
    raci?: WarRoomRaci[];
    containmentSteps?: ContainmentStep[];
    timeline?: WarRoomEvent[];
    createdAt?: string;
    resolvedAt?: string;
    agentId?: string;
    warRoomId?: string;
}
export interface WarRoomRaci {
    role: string;
    userId?: string;
    agentId?: string;
    responsibility: 'responsible' | 'accountable' | 'consulted' | 'informed';
    taskDescription?: string;
    claimed?: boolean;
}
export interface WarRoomEvent {
    id: string;
    warRoomId: string;
    eventType: string;
    description: string;
    source: 'ai' | 'human';
    timestamp: string;
    metadata?: Record<string, unknown>;
    authorId?: string;
    eventId?: string;
}
export interface ContainmentStep {
    id?: string;
    warRoomId?: string;
    description: string;
    assignee?: string;
    assignedTo?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completedBy?: string;
    completedAt?: string;
    stepId?: string;
    priority?: string;
}
export interface NudgeFeedback {
    id?: string;
    tenantId?: string;
    userId?: string;
    nudgeType?: string;
    response?: 'accepted' | 'deferred' | 'rejected' | 'modified';
    feedback?: string;
    originalSuggestion?: Record<string, unknown>;
    modifiedAction?: Record<string, unknown>;
    createdAt?: string;
    feedbackId?: string;
    nudgeId?: string;
    action?: string;
    reason?: string;
    freeText?: string;
    agentFollowUp?: string;
    followUpTaskId?: string;
}
export interface ScoreCalibration {
    id?: string;
    calibrationId?: string;
    tenantId?: string;
    vendorId: string;
    agentId?: string;
    agentRationale?: string;
    aiProposedScore?: number;
    humanCalibratedScore?: number;
    weights?: ScoreWeights;
    originalWeights?: ScoreWeights;
    calibratedWeights?: ScoreWeights;
    componentOverrides?: ComponentOverride[];
    overrides?: ComponentOverride[];
    status: 'proposed' | 'calibrated' | 'accepted' | 'rejected';
    calibratedBy?: string;
    calibratedAt?: string;
    quarterLabel?: string;
    createdAt?: string;
}
export interface ScoreWeights {
    [component: string]: number;
}
export interface ComponentOverride {
    component: string;
    originalScore: number;
    overrideScore: number;
    reason?: string;
}
export interface AuditPrepChecklist {
    id?: string;
    checklistId?: string;
    tenantId?: string;
    auditId?: string;
    frameworkId?: string;
    agentId?: string;
    title?: string;
    auditTeamLeadId?: string;
    status: 'draft' | 'in_progress' | 'ready' | 'submitted';
    items?: AuditPrepItem[];
    gapCount?: number;
    readyCount?: number;
    createdAt?: string;
    updatedAt?: string;
    submittedAt?: string;
}
export interface AuditPrepItem {
    id?: string;
    itemId?: string;
    checklistId?: string;
    controlRef?: string;
    controlTitle?: string;
    description?: string;
    source?: 'ai' | 'human';
    addedBy?: 'agent' | 'human';
    status?: 'pending' | 'ready' | 'not_applicable';
    evidenceStatus?: 'missing' | 'partial' | 'present' | 'stale';
    testResult?: 'pass' | 'fail' | 'not_tested';
    agentNotes?: string;
    humanNotes?: string;
    assignee?: string;
    evidence?: string[];
    notes?: string;
    markedReady?: boolean;
    markedReadyBy?: string;
    markedReadyAt?: string;
}
export interface AgentStandupEntry {
    agentId: string;
    tenantId?: string;
    cycleId?: string;
    status?: string;
    completedTasks?: number;
    pendingTasks?: number;
    blockers?: string[];
    highlights?: string[];
    recommendations?: string[];
    timestamp: string;
    agentName?: string;
    completedItems?: string[];
    findings?: unknown[];
    entryId?: string;
}
export interface StandupDigest {
    id?: string;
    tenantId: string;
    entries: AgentStandupEntry[];
    summary?: string;
    generatedAt: string;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    priorities?: string[];
    status?: string;
    teamLeadPriorities?: string[];
    digestId?: string;
}
