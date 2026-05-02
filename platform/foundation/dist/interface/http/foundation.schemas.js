"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDelegationBody = exports.decideAccessReviewItemBody = exports.createAccessReviewBody = exports.bulkInviteBody = exports.suspendBody = exports.offboardBody = exports.updatePolicyBody = exports.createPolicyBody = exports.createSodRuleBody = exports.sodCheckBody = exports.createOwnershipMappingBody = exports.addCommitteeMemberBody = exports.createCommitteeBody = exports.assignLocationBuBody = exports.updateLocationBody = exports.createLocationBody = exports.updatePositionBody = exports.createPositionBody = exports.updateBusinessUnitBody = exports.createBusinessUnitBody = exports.lifecycleTaskBlockBody = exports.lifecycleTaskCompleteBody = exports.lifecycleTransitionBody = exports.lifecycleStateValues = exports.updateOrganizationBody = exports.createOrganizationBody = void 0;
const zod_1 = require("zod");
const uuidOrString = zod_1.z.string().min(1).max(255);
// ── organizations ───────────────────────────────────────────────────────────
exports.createOrganizationBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255).describe('English display name'),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    parent_id: uuidOrString.optional(),
    org_type: zod_1.z.string().max(50).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
exports.updateOrganizationBody = exports.createOrganizationBody.partial();
// ── employee lifecycle (G1) ──────────────────────────────────────────────────
exports.lifecycleStateValues = [
    'candidate', 'hired', 'onboarding', 'active', 'probation', 'confirmed',
    'on_leave', 'under_review', 'pip', 'transfer_pending', 'promoted', 'exiting', 'alumni',
];
exports.lifecycleTransitionBody = zod_1.z.object({
    to_state: zod_1.z.enum(exports.lifecycleStateValues),
    reason: zod_1.z.string().max(1000).optional(),
    evidence_refs: zod_1.z.array(zod_1.z.string().min(1).max(500)).max(50).optional(),
    approved_by: zod_1.z.array(zod_1.z.string().min(1).max(255)).max(20).optional(),
    meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.lifecycleTaskCompleteBody = zod_1.z.object({
    evidence_refs: zod_1.z.array(zod_1.z.string().min(1).max(500)).max(50).optional(),
});
exports.lifecycleTaskBlockBody = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(2000),
});
// ── business units ──────────────────────────────────────────────────────────
exports.createBusinessUnitBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    organization_id: uuidOrString.optional(),
    parent_bu_id: uuidOrString.optional(),
    bu_type: zod_1.z.string().max(50).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
exports.updateBusinessUnitBody = exports.createBusinessUnitBody.partial();
// ── positions ───────────────────────────────────────────────────────────────
exports.createPositionBody = zod_1.z.object({
    title_en: zod_1.z.string().min(1).max(255),
    title_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    bu_id: uuidOrString.optional(),
    grade: zod_1.z.string().max(50).optional(),
    level: zod_1.z.number().int().min(0).optional(),
    reports_to: uuidOrString.optional(),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
exports.updatePositionBody = exports.createPositionBody.partial();
// ── locations ───────────────────────────────────────────────────────────────
exports.createLocationBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    location_type: zod_1.z.string().max(50).optional(),
    country: zod_1.z.string().max(2).optional(),
    city: zod_1.z.string().max(100).optional(),
    address: zod_1.z.string().max(500).optional(),
    parent_location_id: uuidOrString.optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
exports.updateLocationBody = exports.createLocationBody.partial();
exports.assignLocationBuBody = zod_1.z.object({ bu_id: uuidOrString });
// ── committees ──────────────────────────────────────────────────────────────
exports.createCommitteeBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    committee_type: zod_1.z.string().max(50).optional(),
    charter: zod_1.z.string().max(4000).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'dissolved']).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
exports.addCommitteeMemberBody = zod_1.z.object({
    user_id: uuidOrString,
    role_in_committee: zod_1.z.string().max(50).optional(),
});
// ── ownership mappings ─────────────────────────────────────────────────────
exports.createOwnershipMappingBody = zod_1.z.object({
    entity_type: zod_1.z.string().min(1).max(100),
    entity_id: uuidOrString,
    owner_id: uuidOrString,
    ownership_type: zod_1.z.string().max(50).optional(),
    effective_from: zod_1.z.string().datetime().optional(),
    effective_to: zod_1.z.string().datetime().optional(),
});
// ── SoD ─────────────────────────────────────────────────────────────────────
exports.sodCheckBody = zod_1.z.object({
    user_id: uuidOrString,
    proposed_role: zod_1.z.string().min(1).max(100),
});
exports.createSodRuleBody = zod_1.z.object({
    role_a: zod_1.z.string().min(1).max(100),
    role_b: zod_1.z.string().min(1).max(100),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    description: zod_1.z.string().max(2000).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
// ── governance policies ─────────────────────────────────────────────────────
exports.createPolicyBody = zod_1.z.object({
    title_en: zod_1.z.string().min(1).max(255),
    title_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(64).optional(),
    category: zod_1.z.string().max(100).optional(),
    scope: zod_1.z.string().max(100).optional(),
    description: zod_1.z.string().max(4000).optional(),
    effective_date: zod_1.z.string().date().optional(),
    review_date: zod_1.z.string().date().optional(),
    status: zod_1.z.enum(['draft', 'active', 'under_review', 'archived']).optional(),
});
exports.updatePolicyBody = exports.createPolicyBody.partial();
// ── user lifecycle ──────────────────────────────────────────────────────────
exports.offboardBody = zod_1.z.object({ reason: zod_1.z.string().max(500).optional() }).partial();
exports.suspendBody = zod_1.z.object({ reason: zod_1.z.string().max(500).optional() }).partial();
// ── bulk invite ─────────────────────────────────────────────────────────────
exports.bulkInviteBody = zod_1.z.object({
    invites: zod_1.z.array(zod_1.z.object({
        email: zod_1.z.string().email().max(255),
        role: zod_1.z.string().max(50).optional(),
        department_id: uuidOrString.optional(),
        display_name: zod_1.z.string().max(255).optional(),
    })).min(1).max(500),
});
// ── access review ───────────────────────────────────────────────────────────
exports.createAccessReviewBody = zod_1.z.object({
    campaign_name: zod_1.z.string().min(1).max(255).optional(),
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    scope: zod_1.z.union([zod_1.z.string().max(2000), zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())]).optional(),
    reviewer_id: uuidOrString.optional(),
    due_date: zod_1.z.string().optional(),
    review_type: zod_1.z.enum(['periodic', 'event_triggered', 'ad_hoc']).optional(),
}).refine(d => !!(d.campaign_name || d.title), { message: 'campaign_name or title required' });
exports.decideAccessReviewItemBody = zod_1.z.object({
    decision: zod_1.z.enum(['approve', 'revoke', 'flag']),
    comment: zod_1.z.string().max(2000).optional(),
});
// ── delegation ──────────────────────────────────────────────────────────────
exports.createDelegationBody = zod_1.z.object({
    delegator_id: uuidOrString.optional(),
    delegate_id: uuidOrString,
    scope: zod_1.z.string().max(255).optional(),
    permissions: zod_1.z.array(zod_1.z.string().max(100)).optional(),
    effective_from: zod_1.z.string().datetime().optional(),
    effective_to: zod_1.z.string().datetime().optional(),
    reason: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=foundation.schemas.js.map