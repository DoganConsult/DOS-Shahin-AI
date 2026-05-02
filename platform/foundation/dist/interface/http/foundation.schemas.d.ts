import { z } from 'zod';
export declare const createOrganizationBody: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    parent_id: z.ZodOptional<z.ZodString>;
    org_type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    org_type?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    org_type?: string;
}>;
export declare const updateOrganizationBody: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parent_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    org_type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    org_type?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    org_type?: string;
}>;
export declare const lifecycleStateValues: readonly ["candidate", "hired", "onboarding", "active", "probation", "confirmed", "on_leave", "under_review", "pip", "transfer_pending", "promoted", "exiting", "alumni"];
export declare const lifecycleTransitionBody: z.ZodObject<{
    to_state: z.ZodEnum<["candidate", "hired", "onboarding", "active", "probation", "confirmed", "on_leave", "under_review", "pip", "transfer_pending", "promoted", "exiting", "alumni"]>;
    reason: z.ZodOptional<z.ZodString>;
    evidence_refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    approved_by: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    to_state?: "active" | "onboarding" | "candidate" | "hired" | "probation" | "confirmed" | "on_leave" | "under_review" | "pip" | "transfer_pending" | "promoted" | "exiting" | "alumni";
    evidence_refs?: string[];
    approved_by?: string[];
    meta?: Record<string, unknown>;
}, {
    reason?: string;
    to_state?: "active" | "onboarding" | "candidate" | "hired" | "probation" | "confirmed" | "on_leave" | "under_review" | "pip" | "transfer_pending" | "promoted" | "exiting" | "alumni";
    evidence_refs?: string[];
    approved_by?: string[];
    meta?: Record<string, unknown>;
}>;
export declare const lifecycleTaskCompleteBody: z.ZodObject<{
    evidence_refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    evidence_refs?: string[];
}, {
    evidence_refs?: string[];
}>;
export declare const lifecycleTaskBlockBody: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason?: string;
}, {
    reason?: string;
}>;
export declare const createBusinessUnitBody: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    organization_id: z.ZodOptional<z.ZodString>;
    parent_bu_id: z.ZodOptional<z.ZodString>;
    bu_type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    organization_id?: string;
    parent_bu_id?: string;
    bu_type?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    organization_id?: string;
    parent_bu_id?: string;
    bu_type?: string;
}>;
export declare const updateBusinessUnitBody: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    organization_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parent_bu_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bu_type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    organization_id?: string;
    parent_bu_id?: string;
    bu_type?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    organization_id?: string;
    parent_bu_id?: string;
    bu_type?: string;
}>;
export declare const createPositionBody: z.ZodObject<{
    title_en: z.ZodString;
    title_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    bu_id: z.ZodOptional<z.ZodString>;
    grade: z.ZodOptional<z.ZodString>;
    level: z.ZodOptional<z.ZodNumber>;
    reports_to: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    code?: string;
    bu_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    level?: number;
    reports_to?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    code?: string;
    bu_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    level?: number;
    reports_to?: string;
}>;
export declare const updatePositionBody: z.ZodObject<{
    title_en: z.ZodOptional<z.ZodString>;
    title_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bu_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    grade: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    level: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    reports_to: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    code?: string;
    bu_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    level?: number;
    reports_to?: string;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    code?: string;
    bu_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    level?: number;
    reports_to?: string;
}>;
export declare const createLocationBody: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    location_type: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    parent_location_id: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    location_type?: string;
    country?: string;
    city?: string;
    address?: string;
    parent_location_id?: string;
    latitude?: number;
    longitude?: number;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    location_type?: string;
    country?: string;
    city?: string;
    address?: string;
    parent_location_id?: string;
    latitude?: number;
    longitude?: number;
}>;
export declare const updateLocationBody: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    location_type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parent_location_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    latitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "inactive", "archived"]>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    location_type?: string;
    country?: string;
    city?: string;
    address?: string;
    parent_location_id?: string;
    latitude?: number;
    longitude?: number;
}, {
    description?: string;
    status?: "active" | "archived" | "inactive";
    name_en?: string;
    name_ar?: string;
    code?: string;
    location_type?: string;
    country?: string;
    city?: string;
    address?: string;
    parent_location_id?: string;
    latitude?: number;
    longitude?: number;
}>;
export declare const assignLocationBuBody: z.ZodObject<{
    bu_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    bu_id?: string;
}, {
    bu_id?: string;
}>;
export declare const createCommitteeBody: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    committee_type: z.ZodOptional<z.ZodString>;
    charter: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "dissolved"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "inactive" | "dissolved";
    name_en?: string;
    name_ar?: string;
    code?: string;
    committee_type?: string;
    charter?: string;
}, {
    description?: string;
    status?: "active" | "inactive" | "dissolved";
    name_en?: string;
    name_ar?: string;
    code?: string;
    committee_type?: string;
    charter?: string;
}>;
export declare const addCommitteeMemberBody: z.ZodObject<{
    user_id: z.ZodString;
    role_in_committee: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    role_in_committee?: string;
}, {
    user_id?: string;
    role_in_committee?: string;
}>;
export declare const createOwnershipMappingBody: z.ZodObject<{
    entity_type: z.ZodString;
    entity_id: z.ZodString;
    owner_id: z.ZodString;
    ownership_type: z.ZodOptional<z.ZodString>;
    effective_from: z.ZodOptional<z.ZodString>;
    effective_to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    owner_id?: string;
    entity_type?: string;
    entity_id?: string;
    ownership_type?: string;
    effective_from?: string;
    effective_to?: string;
}, {
    owner_id?: string;
    entity_type?: string;
    entity_id?: string;
    ownership_type?: string;
    effective_from?: string;
    effective_to?: string;
}>;
export declare const sodCheckBody: z.ZodObject<{
    user_id: z.ZodString;
    proposed_role: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    proposed_role?: string;
}, {
    user_id?: string;
    proposed_role?: string;
}>;
export declare const createSodRuleBody: z.ZodObject<{
    role_a: z.ZodString;
    role_b: z.ZodString;
    severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "active" | "inactive";
    role_a?: string;
    role_b?: string;
    severity?: "critical" | "medium" | "low" | "high";
}, {
    description?: string;
    status?: "active" | "inactive";
    role_a?: string;
    role_b?: string;
    severity?: "critical" | "medium" | "low" | "high";
}>;
export declare const createPolicyBody: z.ZodObject<{
    title_en: z.ZodString;
    title_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    effective_date: z.ZodOptional<z.ZodString>;
    review_date: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "under_review", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "draft" | "active" | "archived" | "under_review";
    code?: string;
    title_en?: string;
    title_ar?: string;
    category?: string;
    scope?: string;
    effective_date?: string;
    review_date?: string;
}, {
    description?: string;
    status?: "draft" | "active" | "archived" | "under_review";
    code?: string;
    title_en?: string;
    title_ar?: string;
    category?: string;
    scope?: string;
    effective_date?: string;
    review_date?: string;
}>;
export declare const updatePolicyBody: z.ZodObject<{
    title_en: z.ZodOptional<z.ZodString>;
    title_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    scope: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    effective_date: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    review_date: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["draft", "active", "under_review", "archived"]>>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: "draft" | "active" | "archived" | "under_review";
    code?: string;
    title_en?: string;
    title_ar?: string;
    category?: string;
    scope?: string;
    effective_date?: string;
    review_date?: string;
}, {
    description?: string;
    status?: "draft" | "active" | "archived" | "under_review";
    code?: string;
    title_en?: string;
    title_ar?: string;
    category?: string;
    scope?: string;
    effective_date?: string;
    review_date?: string;
}>;
export declare const offboardBody: z.ZodObject<{
    reason: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
}, {
    reason?: string;
}>;
export declare const suspendBody: z.ZodObject<{
    reason: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
}, {
    reason?: string;
}>;
export declare const bulkInviteBody: z.ZodObject<{
    invites: z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        department_id: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        role?: string;
        email?: string;
        department_id?: string;
        display_name?: string;
    }, {
        role?: string;
        email?: string;
        department_id?: string;
        display_name?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    invites?: {
        role?: string;
        email?: string;
        department_id?: string;
        display_name?: string;
    }[];
}, {
    invites?: {
        role?: string;
        email?: string;
        department_id?: string;
        display_name?: string;
    }[];
}>;
export declare const createAccessReviewBody: z.ZodEffects<z.ZodObject<{
    campaign_name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    reviewer_id: z.ZodOptional<z.ZodString>;
    due_date: z.ZodOptional<z.ZodString>;
    review_type: z.ZodOptional<z.ZodEnum<["periodic", "event_triggered", "ad_hoc"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    campaign_name?: string;
    title?: string;
    scope?: string | Record<string, unknown>;
    due_date?: string;
    review_type?: "periodic" | "event_triggered" | "ad_hoc";
    reviewer_id?: string;
}, {
    description?: string;
    campaign_name?: string;
    title?: string;
    scope?: string | Record<string, unknown>;
    due_date?: string;
    review_type?: "periodic" | "event_triggered" | "ad_hoc";
    reviewer_id?: string;
}>, {
    description?: string;
    campaign_name?: string;
    title?: string;
    scope?: string | Record<string, unknown>;
    due_date?: string;
    review_type?: "periodic" | "event_triggered" | "ad_hoc";
    reviewer_id?: string;
}, {
    description?: string;
    campaign_name?: string;
    title?: string;
    scope?: string | Record<string, unknown>;
    due_date?: string;
    review_type?: "periodic" | "event_triggered" | "ad_hoc";
    reviewer_id?: string;
}>;
export declare const decideAccessReviewItemBody: z.ZodObject<{
    decision: z.ZodEnum<["approve", "revoke", "flag"]>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision?: "approve" | "revoke" | "flag";
    comment?: string;
}, {
    decision?: "approve" | "revoke" | "flag";
    comment?: string;
}>;
export declare const createDelegationBody: z.ZodObject<{
    delegator_id: z.ZodOptional<z.ZodString>;
    delegate_id: z.ZodString;
    scope: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    effective_from: z.ZodOptional<z.ZodString>;
    effective_to: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    permissions?: string[];
    scope?: string;
    effective_from?: string;
    effective_to?: string;
    delegator_id?: string;
    delegate_id?: string;
}, {
    reason?: string;
    permissions?: string[];
    scope?: string;
    effective_from?: string;
    effective_to?: string;
    delegator_id?: string;
    delegate_id?: string;
}>;
