import { z } from 'zod';

const uuidOrString = z.string().min(1).max(255);

// ── organizations ───────────────────────────────────────────────────────────
export const createOrganizationBody = z.object({
  name_en:     z.string().min(1).max(255).describe('English display name'),
  name_ar:     z.string().max(255).optional(),
  code:        z.string().max(64).optional(),
  parent_id:   uuidOrString.optional(),
  org_type:    z.string().max(50).optional(),
  status:      z.enum(['active', 'inactive', 'archived']).optional(),
  description: z.string().max(2000).optional(),
});
export const updateOrganizationBody = createOrganizationBody.partial();

// ── employee lifecycle (G1) ──────────────────────────────────────────────────
export const lifecycleStateValues = [
  'candidate','hired','onboarding','active','probation','confirmed',
  'on_leave','under_review','pip','transfer_pending','promoted','exiting','alumni',
] as const;

export const lifecycleTransitionBody = z.object({
  to_state:      z.enum(lifecycleStateValues),
  reason:        z.string().max(1000).optional(),
  evidence_refs: z.array(z.string().min(1).max(500)).max(50).optional(),
  approved_by:   z.array(z.string().min(1).max(255)).max(20).optional(),
  meta:          z.record(z.unknown()).optional(),
});

export const lifecycleTaskCompleteBody = z.object({
  evidence_refs: z.array(z.string().min(1).max(500)).max(50).optional(),
});

export const lifecycleTaskBlockBody = z.object({
  reason: z.string().min(1).max(2000),
});

// ── business units ──────────────────────────────────────────────────────────
export const createBusinessUnitBody = z.object({
  name_en:         z.string().min(1).max(255),
  name_ar:         z.string().max(255).optional(),
  code:            z.string().max(64).optional(),
  organization_id: uuidOrString.optional(),
  parent_bu_id:    uuidOrString.optional(),
  bu_type:         z.string().max(50).optional(),
  status:          z.enum(['active', 'inactive', 'archived']).optional(),
  description:     z.string().max(2000).optional(),
});
export const updateBusinessUnitBody = createBusinessUnitBody.partial();

// ── positions ───────────────────────────────────────────────────────────────
export const createPositionBody = z.object({
  title_en:    z.string().min(1).max(255),
  title_ar:    z.string().max(255).optional(),
  code:        z.string().max(64).optional(),
  bu_id:       uuidOrString.optional(),
  grade:       z.string().max(50).optional(),
  level:       z.number().int().min(0).optional(),
  reports_to:  uuidOrString.optional(),
  status:      z.enum(['active', 'inactive', 'archived']).optional(),
  description: z.string().max(2000).optional(),
});
export const updatePositionBody = createPositionBody.partial();

// ── locations ───────────────────────────────────────────────────────────────
export const createLocationBody = z.object({
  name_en:            z.string().min(1).max(255),
  name_ar:            z.string().max(255).optional(),
  code:               z.string().max(64).optional(),
  location_type:      z.string().max(50).optional(),
  country:            z.string().max(2).optional(),
  city:               z.string().max(100).optional(),
  address:            z.string().max(500).optional(),
  parent_location_id: uuidOrString.optional(),
  latitude:           z.number().min(-90).max(90).optional(),
  longitude:          z.number().min(-180).max(180).optional(),
  status:             z.enum(['active', 'inactive', 'archived']).optional(),
  description:        z.string().max(2000).optional(),
});
export const updateLocationBody = createLocationBody.partial();
export const assignLocationBuBody = z.object({ bu_id: uuidOrString });

// ── committees ──────────────────────────────────────────────────────────────
export const createCommitteeBody = z.object({
  name_en:        z.string().min(1).max(255),
  name_ar:        z.string().max(255).optional(),
  code:           z.string().max(64).optional(),
  committee_type: z.string().max(50).optional(),
  charter:        z.string().max(4000).optional(),
  status:         z.enum(['active', 'inactive', 'dissolved']).optional(),
  description:    z.string().max(2000).optional(),
});
export const addCommitteeMemberBody = z.object({
  user_id:            uuidOrString,
  role_in_committee:  z.string().max(50).optional(),
});

// ── ownership mappings ─────────────────────────────────────────────────────
export const createOwnershipMappingBody = z.object({
  entity_type:    z.string().min(1).max(100),
  entity_id:      uuidOrString,
  owner_id:       uuidOrString,
  ownership_type: z.string().max(50).optional(),
  effective_from: z.string().datetime().optional(),
  effective_to:   z.string().datetime().optional(),
});

// ── SoD ─────────────────────────────────────────────────────────────────────
export const sodCheckBody = z.object({
  user_id:       uuidOrString,
  proposed_role: z.string().min(1).max(100),
});
export const createSodRuleBody = z.object({
  role_a:      z.string().min(1).max(100),
  role_b:      z.string().min(1).max(100),
  severity:    z.enum(['low', 'medium', 'high', 'critical']).optional(),
  description: z.string().max(2000).optional(),
  status:      z.enum(['active', 'inactive']).optional(),
});

// ── governance policies ─────────────────────────────────────────────────────
export const createPolicyBody = z.object({
  title_en:       z.string().min(1).max(255),
  title_ar:       z.string().max(255).optional(),
  code:           z.string().max(64).optional(),
  category:       z.string().max(100).optional(),
  scope:          z.string().max(100).optional(),
  description:    z.string().max(4000).optional(),
  effective_date: z.string().date().optional(),
  review_date:    z.string().date().optional(),
  status:         z.enum(['draft', 'active', 'under_review', 'archived']).optional(),
});
export const updatePolicyBody = createPolicyBody.partial();

// ── user lifecycle ──────────────────────────────────────────────────────────
export const offboardBody = z.object({ reason: z.string().max(500).optional() }).partial();
export const suspendBody   = z.object({ reason: z.string().max(500).optional() }).partial();

// ── bulk invite ─────────────────────────────────────────────────────────────
export const bulkInviteBody = z.object({
  invites: z.array(z.object({
    email:         z.string().email().max(255),
    role:          z.string().max(50).optional(),
    department_id: uuidOrString.optional(),
    display_name:  z.string().max(255).optional(),
  })).min(1).max(500),
});

// ── access review ───────────────────────────────────────────────────────────
export const createAccessReviewBody = z.object({
  campaign_name: z.string().min(1).max(255).optional(),
  title:         z.string().min(1).max(255).optional(),
  description:   z.string().max(2000).optional(),
  scope:         z.union([z.string().max(2000), z.record(z.string(), z.unknown())]).optional(),
  reviewer_id:   uuidOrString.optional(),
  due_date:      z.string().optional(),
  review_type:   z.enum(['periodic', 'event_triggered', 'ad_hoc']).optional(),
}).refine(d => !!(d.campaign_name || d.title), { message: 'campaign_name or title required' });
export const decideAccessReviewItemBody = z.object({
  decision: z.enum(['approve', 'revoke', 'flag']),
  comment:  z.string().max(2000).optional(),
});

// ── delegation ──────────────────────────────────────────────────────────────
export const createDelegationBody = z.object({
  delegator_id:   uuidOrString.optional(),
  delegate_id:    uuidOrString,
  scope:          z.string().max(255).optional(),
  permissions:    z.array(z.string().max(100)).optional(),
  effective_from: z.string().datetime().optional(),
  effective_to:   z.string().datetime().optional(),
  reason:         z.string().max(500).optional(),
});
