/**
 * OpenFGA object-id helpers. Every tuple written to OpenFGA must flow through
 * these builders so that (a) the identifier shape matches the committed model,
 * and (b) writes are idempotent across replays of the sync pipeline.
 */

import type { ModuleCode, ProductCode, RoleCode, TenantId, UserId } from './ids.js';
import { buildResourceUrn, type ResourceUrnParts } from './urn.js';

export const FGA_MODEL_VERSION = '2026.05.01.0';

export type FgaObject = `${string}:${string}`;

/**
 * Branded id aliases for the standardized object planes added in
 * model.v2.fga (services, user profiles, UI surfaces, role + permission
 * catalogues). Kept as `string` aliases so callers can build them from
 * the registry rows without extra adapters.
 */
export type ServiceCode    = string;
export type PageId         = string;
export type ComponentId    = string;
export type PermissionCode = string;
export type OrgUnitId      = string;
export type SodRuleCode    = string;
export type TeamCode       = string;
export type ModuleLifecyclePhase =
  | 'requested'
  | 'provisioning'
  | 'onboarded'
  | 'active'
  | 'suspended'
  | 'archived'
  | 'deprovisioning'
  | 'purged';

/**
 * Per-phase verb catalogue for `module_lifecycle`. Every transition writer
 * MUST check the corresponding verb instead of a role string. The codes
 * also seed the `permission:` object catalogue (granted_to_role).
 */
export const MODULE_LIFECYCLE_VERBS = {
  request:        'can_request',
  cancelRequest:  'can_cancel_request',
  provision:      'can_provision',
  onboard:        'can_onboard',
  configure:      'can_configure',
  activate:       'can_activate',
  suspend:        'can_suspend',
  resume:         'can_resume',
  archive:        'can_archive',
  unarchive:      'can_unarchive',
  deprovision:    'can_deprovision',
  purge:          'can_purge',
  migrate:        'can_migrate',
  audit:          'can_audit',
  view:           'can_view',
} as const;
export type ModuleLifecycleVerb =
  (typeof MODULE_LIFECYCLE_VERBS)[keyof typeof MODULE_LIFECYCLE_VERBS];

/**
 * Permission codes registered under `permission:<code>`. Roles are bound
 * to these via `granted_to_role`; user-level grants only via break-glass.
 */
export const MODULE_LIFECYCLE_PERMISSION_CODES = {
  request:       'lifecycle.module.request',
  cancelRequest: 'lifecycle.module.cancel_request',
  provision:     'lifecycle.module.provision',
  onboard:       'lifecycle.module.onboard',
  configure:     'lifecycle.module.configure',
  activate:      'lifecycle.module.activate',
  suspend:       'lifecycle.module.suspend',
  resume:        'lifecycle.module.resume',
  archive:       'lifecycle.module.archive',
  unarchive:     'lifecycle.module.unarchive',
  deprovision:   'lifecycle.module.deprovision',
  purge:         'lifecycle.module.purge',
  migrate:       'lifecycle.module.migrate',
  audit:         'lifecycle.module.audit',
} as const;
export type ModuleLifecyclePermissionCode =
  (typeof MODULE_LIFECYCLE_PERMISSION_CODES)[keyof typeof MODULE_LIFECYCLE_PERMISSION_CODES];

/**
 * Authoritative role → permission grants for module-lifecycle verbs.
 * Mirrors the rules encoded in model.v2.fga `module_lifecycle` and is the
 * source the dauth-openfga-reconcile script feeds to OpenFGA writes.
 */
export const MODULE_LIFECYCLE_ROLE_GRANTS = {
  tenant_owner:      ['request', 'cancelRequest'],
  tenant_admin:      ['request', 'cancelRequest', 'onboard', 'configure',
                      'activate', 'suspend', 'resume', 'archive', 'unarchive'],
  module_owner:      ['onboard', 'configure'],
  billing_admin:     ['suspend', 'resume'],
  platform_operator: ['provision', 'deprovision', 'migrate'],
  platform_admin:    ['provision', 'deprovision', 'migrate', 'activate',
                      'suspend', 'resume', 'archive', 'unarchive', 'purge', 'audit'],
  dsoc_auditor:      ['audit'],
} as const satisfies Record<string, readonly (keyof typeof MODULE_LIFECYCLE_VERBS)[]>;

export const fgaUser = (userId: UserId): FgaObject => `user:${userId}`;
export const fgaTenant = (tenantId: TenantId): FgaObject => `tenant:${tenantId}`;
export const fgaProduct = (code: ProductCode): FgaObject => `product:${code}`;
export const fgaModule = (code: ModuleCode): FgaObject => `module:${code}`;
export const fgaResource = (parts: ResourceUrnParts): FgaObject =>
  `resource:${buildResourceUrn(parts)}`;

// ── Standardized object-id builders (Phase E / R) ───────────────────────────
export const fgaService     = (code: ServiceCode): FgaObject     => `service:${code}`;
export const fgaUserProfile = (userId: UserId): FgaObject        => `user_profile:${userId}`;
export const fgaPage        = (pageId: PageId): FgaObject        => `page:${pageId}`;
export const fgaComponent   = (cmpId: ComponentId): FgaObject    => `component:${cmpId}`;
export const fgaRole        = (code: RoleCode): FgaObject        => `role:${code}`;
export const fgaPermission  = (code: PermissionCode): FgaObject  => `permission:${code}`;

// ── DNA / AI / Settings / Lifecycle / SoD / Org structure ───────────────────
export const fgaFoundationDna   = (dnaCode: string): FgaObject =>
  `foundation_dna:${dnaCode}`;
export const fgaAiWorkspace     = (tenantId: TenantId, userId: UserId): FgaObject =>
  `ai_workspace:${tenantId}:${userId}`;
export const fgaTenantSetting   = (tenantId: TenantId): FgaObject =>
  `tenant_setting:${tenantId}`;
export const fgaProfileSetting  = (userId: UserId): FgaObject =>
  `profile_setting:${userId}`;
export const fgaModuleLifecycle = (tenantId: TenantId, moduleCode: ModuleCode): FgaObject =>
  `module_lifecycle:${tenantId}:${moduleCode}`;
export const fgaSodRule         = (tenantId: TenantId, ruleCode: SodRuleCode): FgaObject =>
  `sod_rule:${tenantId}:${ruleCode}`;
export const fgaOrgUnit         = (orgUnitId: OrgUnitId): FgaObject =>
  `org_unit:${orgUnitId}`;
export const fgaTeam            = (tenantId: TenantId, teamCode: TeamCode): FgaObject =>
  `team:${tenantId}:${teamCode}`;

/**
 * Canonical 16-team enterprise org chart. Mirrored to `dos.org_teams`
 * by migration `20260502_0134_org_chart_hierarchy_teams_roster.sql`.
 * Each team carries a head + optional deputy + roster.
 */
export const ORG_TEAM_CODES = [
  'executive',
  'finance',
  'legal',
  'people_ops',
  'engineering',
  'product',
  'design',
  'data_analytics',
  'security',
  'risk_management',
  'compliance',
  'internal_audit',
  'it_operations',
  'customer_success',
  'sales',
  'marketing',
] as const;
export type OrgTeamCode = (typeof ORG_TEAM_CODES)[number];

export const FGA_RELATIONS = {
  // tenant
  tenantMember:     'member',
  tenantAdmin:      'admin',
  tenantOwner:      'owner',
  tenantAuditor:    'auditor',

  // product / module
  productOwner:     'owner',
  productAdmin:     'admin',
  moduleViewer:     'viewer',
  moduleEditor:     'editor',
  moduleAdmin:      'admin',
  moduleApprover:   'approver',

  // resource (generic)
  resourceOwner:    'owner',
  resourceEditor:   'editor',
  resourceViewer:   'viewer',
  resourceApprover: 'approver',

  // service
  serviceOperator:    'operator',
  serviceConsumer:    'consumer',
  serviceAdmin:       'admin',
  serviceCanInvoke:   'can_invoke',
  serviceCanAdminister: 'can_administer',

  // user_profile
  profileSubject:        'subject',
  profileDelegate:       'delegate',
  profileAuditor:        'auditor',
  profileCanView:        'can_view',
  profileCanEdit:        'can_edit',
  profileCanAdminister:  'can_administer',

  // page / component (DOM-render gating used by *dosCanRender)
  pageViewer:            'viewer',
  pageEditor:            'editor',
  pageAdmin:             'admin',
  pageCanRender:         'can_render',
  componentViewer:       'viewer',
  componentOperator:     'operator',
  componentAdmin:        'admin',
  componentCanRender:    'can_render',
  componentCanInvoke:    'can_invoke',

  // role / permission catalogue
  roleMember:            'member',
  roleManager:           'manager',
  roleCanAssume:         'can_assume',
  roleCanAssign:         'can_assign',
  permissionGrantedToRole: 'granted_to_role',
  permissionGrantedToUser: 'granted_to_user',
  permissionCanExercise: 'can_exercise',

  // foundation DNA
  dnaConsumer:        'consumer',
  dnaAdministrator:   'administrator',
  dnaCanConsume:      'can_consume',
  dnaCanAdminister:   'can_administer',

  // ai_workspace
  aiOwner:            'owner',
  aiCollaborator:     'collaborator',
  aiAuditor:          'auditor',
  aiAdmin:            'ai_admin',
  aiCanView:          'can_view',
  aiCanInvokeTool:    'can_invoke_tool',
  aiCanAudit:         'can_audit',
  aiCanAdminister:    'can_administer',

  // settings (tenant + profile)
  tenantSettingViewer:        'viewer',
  tenantSettingAdministrator: 'administrator',
  tenantSettingCanView:       'can_view',
  tenantSettingCanEdit:       'can_edit',
  profileSettingSubject:      'subject',
  profileSettingDelegate:     'delegate',
  profileSettingCanView:      'can_view',
  profileSettingCanEdit:      'can_edit',

  // module lifecycle
  lifecycleOperator:        'operator',
  lifecyclePlatformAdmin:   'platform_admin',
  lifecycleCanTransition:   'can_transition',
  lifecycleCanView:         'can_view',

  // SoD rule
  sodForbidsRole:   'forbids_role',
  sodExemptsUser:   'exempts_user',
  sodManager:       'manager',
  sodCanManage:     'can_manage',
  sodCanAudit:      'can_audit',

  // org team (org chart node)
  teamParentOrgUnit:      'parent_org_unit',
  teamHead:               'head',
  teamDeputy:             'deputy',
  teamRoster:             'roster',
  teamMember:             'member',
  teamAdmin:              'admin',
  teamAuditor:            'auditor',
  teamCanView:            'can_view',
  teamCanEdit:            'can_edit',
  teamCanManageRoster:    'can_manage_roster',
  teamCanAdminister:      'can_administer',

  // org unit
  orgUnitParent:        'parent',
  orgUnitHead:          'head',
  orgUnitMember:        'member',
  orgUnitEditor:        'editor',
  orgUnitAdmin:         'admin',
  orgUnitCanView:       'can_view',
  orgUnitCanEdit:       'can_edit',
  orgUnitCanAdminister: 'can_administer',
} as const;

export type FgaRelation = (typeof FGA_RELATIONS)[keyof typeof FGA_RELATIONS];

export interface FgaTuple {
  readonly user: FgaObject;
  readonly relation: FgaRelation;
  readonly object: FgaObject;
  readonly condition?: {
    readonly name: string;
    readonly context: Record<string, unknown>;
  };
}
