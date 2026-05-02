export interface GovernancePolicy {
    policy_id: string;
    tenant_id: string;
    title_en: string;
    title_ar: string | null;
    code: string | null;
    category: string | null;
    scope: string | null;
    description: string | null;
    effective_date: string | null;
    review_date: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreatePolicyInput {
    title_en: string;
    title_ar?: string;
    code?: string;
    category?: string;
    scope?: string;
    description?: string;
    effective_date?: string;
    review_date?: string;
    status?: string;
}
export type UpdatePolicyInput = Partial<CreatePolicyInput>;
export interface GovernanceDashboard {
    policy_counts: Array<{
        status: string;
        count: string;
    }>;
    total_organizations: number;
    total_business_units: number;
    total_committees: number;
}
export declare function listPolicies(tenantId: string, opts?: {
    page?: number;
    pageSize?: number;
    category?: string;
}): Promise<{
    data: GovernancePolicy[];
    total: number;
}>;
export declare function getPolicy(tenantId: string, id: string): Promise<GovernancePolicy | null>;
export declare function createPolicy(tenantId: string, input: CreatePolicyInput, actorId: string): Promise<GovernancePolicy>;
export declare function updatePolicy(tenantId: string, id: string, input: UpdatePolicyInput): Promise<GovernancePolicy | null>;
export declare function approvePolicy(tenantId: string, id: string, actorId: string): Promise<GovernancePolicy | null>;
export declare function deletePolicy(tenantId: string, id: string): Promise<boolean>;
export interface PdplConsentRow {
    id: string;
    tenant_id: string;
    user_id: string;
    consent_type: string;
    granted: boolean;
    recorded_at: string;
    /** Set when the persistence table is missing — clients must surface a degraded warning. */
    degraded?: boolean;
    /** Reason code for degraded state (e.g. 'storage_unavailable'). */
    degradedReason?: string;
}
/**
 * Records a PDPL consent decision. Writes to public.privacy_consent_log when the
 * table exists. If the table is missing the response is explicitly marked
 * `degraded: true` so the UI never treats a synthetic row as a successful
 * persistence. Real DB errors (other than "table missing") propagate.
 */
export declare function recordPdplConsent(tenantId: string, userId: string, consentType: string, granted: boolean): Promise<PdplConsentRow>;
export declare function getDashboard(tenantId: string): Promise<GovernanceDashboard>;
