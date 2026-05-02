export interface Obligation {
    obligationId: string;
    frameworkId: string;
    requirementRef: string;
    titleEn: string;
    titleAr?: string;
    descriptionEn?: string;
    descriptionAr?: string;
    applicability?: string;
    ownerId?: string;
    status: 'draft' | 'active' | 'suspended' | 'archived';
    mappedControls: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    evidenceTypes: string[];
    reviewFrequency?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}
export interface ObligationInput {
    frameworkId: string;
    requirementRef: string;
    titleEn: string;
    titleAr?: string;
    descriptionEn?: string;
    descriptionAr?: string;
    applicability?: string;
    ownerId?: string;
    status?: 'draft' | 'active' | 'suspended' | 'archived';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    evidenceTypes?: string[];
    reviewFrequency?: string;
}
export interface ObligationControlMapping {
    mappingId: string;
    obligationId: string;
    controlId: string;
    mappingType: 'direct' | 'partial' | 'compensating';
    coveragePercent: number;
}
/**
 * Create a new obligation
 */
export declare function createObligation(tenantId: string, input: ObligationInput, userId: string): Promise<Obligation>;
/**
 * Get obligation by ID
 */
export declare function getObligationById(tenantId: string, obligationId: string): Promise<Obligation>;
/**
 * List obligations with optional filters
 */
export declare function listObligations(tenantId: string, filters?: {
    frameworkId?: string;
    status?: string;
    ownerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    obligations: Obligation[];
    total: number;
}>;
/**
 * Update obligation
 */
export declare function updateObligation(tenantId: string, obligationId: string, updates: Partial<ObligationInput>, userId: string): Promise<Obligation>;
/**
 * Delete obligation (soft delete)
 */
export declare function deleteObligation(tenantId: string, obligationId: string, userId: string): Promise<void>;
/**
 * Seed obligations from instrument_structure (regulatory controls) for a framework
 * This is called during workspace provisioning
 */
export declare function seedObligationsFromFramework(tenantId: string, frameworkId: string, userId?: string): Promise<{
    created: number;
    errors: string[];
}>;
/**
 * Auto-map obligations to controls using framework→control entity_links
 * This discovers controls that are mapped to the same framework as the obligation
 */
export declare function autoMapObligationToControls(tenantId: string, obligationId: string, userId?: string): Promise<{
    mapped: number;
    errors: string[];
}>;
/**
 * Auto-map all obligations for a framework to their controls
 */
export declare function autoMapAllObligationsForFramework(tenantId: string, frameworkId: string, userId?: string): Promise<{
    totalObligations: number;
    totalMapped: number;
    errors: string[];
}>;
/**
 * Get controls mapped to an obligation
 */
export declare function getObligationControls(tenantId: string, obligationId: string): Promise<Array<{
    controlId: string;
    title: string;
    mappingType: string;
    coveragePercent: number;
}>>;
/**
 * Manually map a control to an obligation
 */
export declare function mapControlToObligation(tenantId: string, obligationId: string, controlId: string, mappingType: "direct" | "partial" | "compensating" | undefined, coveragePercent: number | undefined, userId: string): Promise<ObligationControlMapping>;
/**
 * Remove a control mapping from an obligation
 */
export declare function unmapControlFromObligation(tenantId: string, obligationId: string, controlId: string, userId: string): Promise<void>;
export interface ObligationPolicyLink {
    linkId: string;
    obligationId: string;
    policyId: string;
    linkType: 'implements' | 'supports' | 'references';
    relevanceScore: number;
    notes?: string;
    policyTitle?: string;
    policyStatus?: string;
}
/**
 * Get policies linked to an obligation
 */
export declare function getObligationPolicies(tenantId: string, obligationId: string): Promise<ObligationPolicyLink[]>;
/**
 * Link a policy to an obligation (upsert)
 */
export declare function linkPolicyToObligation(tenantId: string, obligationId: string, policyId: string, linkType: "implements" | "supports" | "references" | undefined, relevanceScore: number | undefined, notes: string | null, userId: string): Promise<ObligationPolicyLink>;
/**
 * Remove a policy link from an obligation
 */
export declare function unlinkPolicyFromObligation(tenantId: string, obligationId: string, policyId: string, userId: string): Promise<void>;
