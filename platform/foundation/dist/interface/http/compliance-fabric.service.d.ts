export interface PolicyAck {
    id: string;
    tenant_id: string;
    user_id: string;
    policy_id: string;
    policy_version: string;
    required: boolean;
    due_at: string | null;
    acknowledged_at: string | null;
    evidence_ref: string | null;
}
export declare function listPolicyAcks(tenantId: string, filter?: {
    userId?: string;
    policyId?: string;
    status?: 'pending' | 'completed' | 'overdue';
}): Promise<PolicyAck[]>;
export declare function assignPolicyAck(tenantId: string, input: {
    user_id: string;
    policy_id: string;
    policy_version: string;
    due_at?: string | null;
    required?: boolean;
}): Promise<PolicyAck>;
export declare function recordPolicyAck(tenantId: string, ackId: string, meta: {
    evidence_ref?: string;
    ip_address?: string;
    user_agent?: string;
}): Promise<PolicyAck | null>;
export declare function getPolicyAckCoverage(tenantId: string): Promise<{
    policy_id: string;
    total: number;
    acked: number;
    coverage_pct: number;
    overdue: number;
}[]>;
export interface TrainingCourse {
    course_code: string;
    tenant_id: string | null;
    name_en: string;
    name_ar: string | null;
    category: string | null;
    duration_minutes: number | null;
    is_mandatory: boolean;
    renewal_months: number | null;
    is_active: boolean;
}
export interface TrainingAssignment {
    id: string;
    tenant_id: string;
    user_id: string;
    course_code: string;
    assigned_at: string;
    due_at: string | null;
    completed_at: string | null;
    score: number | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'overdue' | 'exempted';
}
export declare function listTrainingCourses(tenantId: string): Promise<TrainingCourse[]>;
export declare function assignTraining(tenantId: string, input: {
    user_id: string;
    course_code: string;
    due_at?: string | null;
    reason?: string;
    pass_threshold?: number;
}, actorId: string): Promise<TrainingAssignment>;
export declare function listTrainingAssignments(tenantId: string, filter?: {
    userId?: string;
    status?: string;
    courseCode?: string;
}): Promise<TrainingAssignment[]>;
export declare function completeTraining(tenantId: string, id: string, input: {
    score?: number;
    evidence_ref?: string;
}, actorId: string): Promise<TrainingAssignment | null>;
export declare function getTrainingComplianceMetrics(tenantId: string): Promise<any[]>;
export interface CoiDeclaration {
    id: string;
    tenant_id: string;
    user_id: string;
    declaration_period: string;
    has_conflicts: boolean;
    disclosures: any[];
    declared_at: string;
    reviewed_at: string | null;
    review_decision: string | null;
}
export declare function submitCoiDeclaration(tenantId: string, input: {
    user_id: string;
    declaration_period: string;
    has_conflicts: boolean;
    disclosures?: any[];
    evidence_ref?: string;
}): Promise<CoiDeclaration>;
export declare function listCoiDeclarations(tenantId: string, filter?: {
    period?: string;
    userId?: string;
    pendingReview?: boolean;
}): Promise<CoiDeclaration[]>;
export declare function reviewCoiDeclaration(tenantId: string, id: string, input: {
    decision: 'cleared' | 'mitigation_required' | 'blocked';
    note?: string;
}, actorId: string): Promise<CoiDeclaration | null>;
