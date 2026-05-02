"use strict";
/**
 * OpenFGA object-id helpers. Every tuple written to OpenFGA must flow through
 * these builders so that (a) the identifier shape matches the committed model,
 * and (b) writes are idempotent across replays of the sync pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FGA_RELATIONS = exports.ORG_TEAM_CODES = exports.fgaTeam = exports.fgaOrgUnit = exports.fgaSodRule = exports.fgaModuleLifecycle = exports.fgaProfileSetting = exports.fgaTenantSetting = exports.fgaAiWorkspace = exports.fgaFoundationDna = exports.fgaPermission = exports.fgaRole = exports.fgaComponent = exports.fgaPage = exports.fgaUserProfile = exports.fgaService = exports.fgaResource = exports.fgaModule = exports.fgaProduct = exports.fgaTenant = exports.fgaUser = exports.MODULE_LIFECYCLE_ROLE_GRANTS = exports.MODULE_LIFECYCLE_PERMISSION_CODES = exports.MODULE_LIFECYCLE_VERBS = exports.FGA_MODEL_VERSION = void 0;
const urn_js_1 = require("./urn.js");
exports.FGA_MODEL_VERSION = '2026.05.01.0';
/**
 * Per-phase verb catalogue for `module_lifecycle`. Every transition writer
 * MUST check the corresponding verb instead of a role string. The codes
 * also seed the `permission:` object catalogue (granted_to_role).
 */
exports.MODULE_LIFECYCLE_VERBS = {
    request: 'can_request',
    cancelRequest: 'can_cancel_request',
    provision: 'can_provision',
    onboard: 'can_onboard',
    configure: 'can_configure',
    activate: 'can_activate',
    suspend: 'can_suspend',
    resume: 'can_resume',
    archive: 'can_archive',
    unarchive: 'can_unarchive',
    deprovision: 'can_deprovision',
    purge: 'can_purge',
    migrate: 'can_migrate',
    audit: 'can_audit',
    view: 'can_view',
};
/**
 * Permission codes registered under `permission:<code>`. Roles are bound
 * to these via `granted_to_role`; user-level grants only via break-glass.
 */
exports.MODULE_LIFECYCLE_PERMISSION_CODES = {
    request: 'lifecycle.module.request',
    cancelRequest: 'lifecycle.module.cancel_request',
    provision: 'lifecycle.module.provision',
    onboard: 'lifecycle.module.onboard',
    configure: 'lifecycle.module.configure',
    activate: 'lifecycle.module.activate',
    suspend: 'lifecycle.module.suspend',
    resume: 'lifecycle.module.resume',
    archive: 'lifecycle.module.archive',
    unarchive: 'lifecycle.module.unarchive',
    deprovision: 'lifecycle.module.deprovision',
    purge: 'lifecycle.module.purge',
    migrate: 'lifecycle.module.migrate',
    audit: 'lifecycle.module.audit',
};
/**
 * Authoritative role → permission grants for module-lifecycle verbs.
 * Mirrors the rules encoded in model.v2.fga `module_lifecycle` and is the
 * source the dauth-openfga-reconcile script feeds to OpenFGA writes.
 */
exports.MODULE_LIFECYCLE_ROLE_GRANTS = {
    tenant_owner: ['request', 'cancelRequest'],
    tenant_admin: ['request', 'cancelRequest', 'onboard', 'configure',
        'activate', 'suspend', 'resume', 'archive', 'unarchive'],
    module_owner: ['onboard', 'configure'],
    billing_admin: ['suspend', 'resume'],
    platform_operator: ['provision', 'deprovision', 'migrate'],
    platform_admin: ['provision', 'deprovision', 'migrate', 'activate',
        'suspend', 'resume', 'archive', 'unarchive', 'purge', 'audit'],
    dsoc_auditor: ['audit'],
};
const fgaUser = (userId) => `user:${userId}`;
exports.fgaUser = fgaUser;
const fgaTenant = (tenantId) => `tenant:${tenantId}`;
exports.fgaTenant = fgaTenant;
const fgaProduct = (code) => `product:${code}`;
exports.fgaProduct = fgaProduct;
const fgaModule = (code) => `module:${code}`;
exports.fgaModule = fgaModule;
const fgaResource = (parts) => `resource:${(0, urn_js_1.buildResourceUrn)(parts)}`;
exports.fgaResource = fgaResource;
// ── Standardized object-id builders (Phase E / R) ───────────────────────────
const fgaService = (code) => `service:${code}`;
exports.fgaService = fgaService;
const fgaUserProfile = (userId) => `user_profile:${userId}`;
exports.fgaUserProfile = fgaUserProfile;
const fgaPage = (pageId) => `page:${pageId}`;
exports.fgaPage = fgaPage;
const fgaComponent = (cmpId) => `component:${cmpId}`;
exports.fgaComponent = fgaComponent;
const fgaRole = (code) => `role:${code}`;
exports.fgaRole = fgaRole;
const fgaPermission = (code) => `permission:${code}`;
exports.fgaPermission = fgaPermission;
// ── DNA / AI / Settings / Lifecycle / SoD / Org structure ───────────────────
const fgaFoundationDna = (dnaCode) => `foundation_dna:${dnaCode}`;
exports.fgaFoundationDna = fgaFoundationDna;
const fgaAiWorkspace = (tenantId, userId) => `ai_workspace:${tenantId}:${userId}`;
exports.fgaAiWorkspace = fgaAiWorkspace;
const fgaTenantSetting = (tenantId) => `tenant_setting:${tenantId}`;
exports.fgaTenantSetting = fgaTenantSetting;
const fgaProfileSetting = (userId) => `profile_setting:${userId}`;
exports.fgaProfileSetting = fgaProfileSetting;
const fgaModuleLifecycle = (tenantId, moduleCode) => `module_lifecycle:${tenantId}:${moduleCode}`;
exports.fgaModuleLifecycle = fgaModuleLifecycle;
const fgaSodRule = (tenantId, ruleCode) => `sod_rule:${tenantId}:${ruleCode}`;
exports.fgaSodRule = fgaSodRule;
const fgaOrgUnit = (orgUnitId) => `org_unit:${orgUnitId}`;
exports.fgaOrgUnit = fgaOrgUnit;
const fgaTeam = (tenantId, teamCode) => `team:${tenantId}:${teamCode}`;
exports.fgaTeam = fgaTeam;
/**
 * Canonical 16-team enterprise org chart. Mirrored to `dos.org_teams`
 * by migration `20260502_0134_org_chart_hierarchy_teams_roster.sql`.
 * Each team carries a head + optional deputy + roster.
 */
exports.ORG_TEAM_CODES = [
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
];
exports.FGA_RELATIONS = {
    // tenant
    tenantMember: 'member',
    tenantAdmin: 'admin',
    tenantOwner: 'owner',
    tenantAuditor: 'auditor',
    // product / module
    productOwner: 'owner',
    productAdmin: 'admin',
    moduleViewer: 'viewer',
    moduleEditor: 'editor',
    moduleAdmin: 'admin',
    moduleApprover: 'approver',
    // resource (generic)
    resourceOwner: 'owner',
    resourceEditor: 'editor',
    resourceViewer: 'viewer',
    resourceApprover: 'approver',
    // service
    serviceOperator: 'operator',
    serviceConsumer: 'consumer',
    serviceAdmin: 'admin',
    serviceCanInvoke: 'can_invoke',
    serviceCanAdminister: 'can_administer',
    // user_profile
    profileSubject: 'subject',
    profileDelegate: 'delegate',
    profileAuditor: 'auditor',
    profileCanView: 'can_view',
    profileCanEdit: 'can_edit',
    profileCanAdminister: 'can_administer',
    // page / component (DOM-render gating used by *dosCanRender)
    pageViewer: 'viewer',
    pageEditor: 'editor',
    pageAdmin: 'admin',
    pageCanRender: 'can_render',
    componentViewer: 'viewer',
    componentOperator: 'operator',
    componentAdmin: 'admin',
    componentCanRender: 'can_render',
    componentCanInvoke: 'can_invoke',
    // role / permission catalogue
    roleMember: 'member',
    roleManager: 'manager',
    roleCanAssume: 'can_assume',
    roleCanAssign: 'can_assign',
    permissionGrantedToRole: 'granted_to_role',
    permissionGrantedToUser: 'granted_to_user',
    permissionCanExercise: 'can_exercise',
    // foundation DNA
    dnaConsumer: 'consumer',
    dnaAdministrator: 'administrator',
    dnaCanConsume: 'can_consume',
    dnaCanAdminister: 'can_administer',
    // ai_workspace
    aiOwner: 'owner',
    aiCollaborator: 'collaborator',
    aiAuditor: 'auditor',
    aiAdmin: 'ai_admin',
    aiCanView: 'can_view',
    aiCanInvokeTool: 'can_invoke_tool',
    aiCanAudit: 'can_audit',
    aiCanAdminister: 'can_administer',
    // settings (tenant + profile)
    tenantSettingViewer: 'viewer',
    tenantSettingAdministrator: 'administrator',
    tenantSettingCanView: 'can_view',
    tenantSettingCanEdit: 'can_edit',
    profileSettingSubject: 'subject',
    profileSettingDelegate: 'delegate',
    profileSettingCanView: 'can_view',
    profileSettingCanEdit: 'can_edit',
    // module lifecycle
    lifecycleOperator: 'operator',
    lifecyclePlatformAdmin: 'platform_admin',
    lifecycleCanTransition: 'can_transition',
    lifecycleCanView: 'can_view',
    // SoD rule
    sodForbidsRole: 'forbids_role',
    sodExemptsUser: 'exempts_user',
    sodManager: 'manager',
    sodCanManage: 'can_manage',
    sodCanAudit: 'can_audit',
    // org team (org chart node)
    teamParentOrgUnit: 'parent_org_unit',
    teamHead: 'head',
    teamDeputy: 'deputy',
    teamRoster: 'roster',
    teamMember: 'member',
    teamAdmin: 'admin',
    teamAuditor: 'auditor',
    teamCanView: 'can_view',
    teamCanEdit: 'can_edit',
    teamCanManageRoster: 'can_manage_roster',
    teamCanAdminister: 'can_administer',
    // org unit
    orgUnitParent: 'parent',
    orgUnitHead: 'head',
    orgUnitMember: 'member',
    orgUnitEditor: 'editor',
    orgUnitAdmin: 'admin',
    orgUnitCanView: 'can_view',
    orgUnitCanEdit: 'can_edit',
    orgUnitCanAdminister: 'can_administer',
};
//# sourceMappingURL=fga.js.map