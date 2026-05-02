/**
 * OpenFGA object-id helpers. Every tuple written to OpenFGA must flow through
 * these builders so that (a) the identifier shape matches the committed model,
 * and (b) writes are idempotent across replays of the sync pipeline.
 */
import type { ModuleCode, ProductCode, RoleCode, TenantId, UserId } from './ids.js';
import { type ResourceUrnParts } from './urn.js';
export declare const FGA_MODEL_VERSION = "2026.05.01.0";
export type FgaObject = `${string}:${string}`;
/**
 * Branded id aliases for the standardized object planes added in
 * model.v2.fga (services, user profiles, UI surfaces, role + permission
 * catalogues). Kept as `string` aliases so callers can build them from
 * the registry rows without extra adapters.
 */
export type ServiceCode = string;
export type PageId = string;
export type ComponentId = string;
export type PermissionCode = string;
export type OrgUnitId = string;
export type SodRuleCode = string;
export type TeamCode = string;
export type ModuleLifecyclePhase = 'requested' | 'provisioning' | 'onboarded' | 'active' | 'suspended' | 'archived' | 'deprovisioning' | 'purged';
/**
 * Per-phase verb catalogue for `module_lifecycle`. Every transition writer
 * MUST check the corresponding verb instead of a role string. The codes
 * also seed the `permission:` object catalogue (granted_to_role).
 */
export declare const MODULE_LIFECYCLE_VERBS: {
    readonly request: "can_request";
    readonly cancelRequest: "can_cancel_request";
    readonly provision: "can_provision";
    readonly onboard: "can_onboard";
    readonly configure: "can_configure";
    readonly activate: "can_activate";
    readonly suspend: "can_suspend";
    readonly resume: "can_resume";
    readonly archive: "can_archive";
    readonly unarchive: "can_unarchive";
    readonly deprovision: "can_deprovision";
    readonly purge: "can_purge";
    readonly migrate: "can_migrate";
    readonly audit: "can_audit";
    readonly view: "can_view";
};
export type ModuleLifecycleVerb = (typeof MODULE_LIFECYCLE_VERBS)[keyof typeof MODULE_LIFECYCLE_VERBS];
/**
 * Permission codes registered under `permission:<code>`. Roles are bound
 * to these via `granted_to_role`; user-level grants only via break-glass.
 */
export declare const MODULE_LIFECYCLE_PERMISSION_CODES: {
    readonly request: "lifecycle.module.request";
    readonly cancelRequest: "lifecycle.module.cancel_request";
    readonly provision: "lifecycle.module.provision";
    readonly onboard: "lifecycle.module.onboard";
    readonly configure: "lifecycle.module.configure";
    readonly activate: "lifecycle.module.activate";
    readonly suspend: "lifecycle.module.suspend";
    readonly resume: "lifecycle.module.resume";
    readonly archive: "lifecycle.module.archive";
    readonly unarchive: "lifecycle.module.unarchive";
    readonly deprovision: "lifecycle.module.deprovision";
    readonly purge: "lifecycle.module.purge";
    readonly migrate: "lifecycle.module.migrate";
    readonly audit: "lifecycle.module.audit";
};
export type ModuleLifecyclePermissionCode = (typeof MODULE_LIFECYCLE_PERMISSION_CODES)[keyof typeof MODULE_LIFECYCLE_PERMISSION_CODES];
/**
 * Authoritative role → permission grants for module-lifecycle verbs.
 * Mirrors the rules encoded in model.v2.fga `module_lifecycle` and is the
 * source the dauth-openfga-reconcile script feeds to OpenFGA writes.
 */
export declare const MODULE_LIFECYCLE_ROLE_GRANTS: {
    readonly tenant_owner: readonly ["request", "cancelRequest"];
    readonly tenant_admin: readonly ["request", "cancelRequest", "onboard", "configure", "activate", "suspend", "resume", "archive", "unarchive"];
    readonly module_owner: readonly ["onboard", "configure"];
    readonly billing_admin: readonly ["suspend", "resume"];
    readonly platform_operator: readonly ["provision", "deprovision", "migrate"];
    readonly platform_admin: readonly ["provision", "deprovision", "migrate", "activate", "suspend", "resume", "archive", "unarchive", "purge", "audit"];
    readonly dsoc_auditor: readonly ["audit"];
};
export declare const fgaUser: (userId: UserId) => FgaObject;
export declare const fgaTenant: (tenantId: TenantId) => FgaObject;
export declare const fgaProduct: (code: ProductCode) => FgaObject;
export declare const fgaModule: (code: ModuleCode) => FgaObject;
export declare const fgaResource: (parts: ResourceUrnParts) => FgaObject;
export declare const fgaService: (code: ServiceCode) => FgaObject;
export declare const fgaUserProfile: (userId: UserId) => FgaObject;
export declare const fgaPage: (pageId: PageId) => FgaObject;
export declare const fgaComponent: (cmpId: ComponentId) => FgaObject;
export declare const fgaRole: (code: RoleCode) => FgaObject;
export declare const fgaPermission: (code: PermissionCode) => FgaObject;
export declare const fgaFoundationDna: (dnaCode: string) => FgaObject;
export declare const fgaAiWorkspace: (tenantId: TenantId, userId: UserId) => FgaObject;
export declare const fgaTenantSetting: (tenantId: TenantId) => FgaObject;
export declare const fgaProfileSetting: (userId: UserId) => FgaObject;
export declare const fgaModuleLifecycle: (tenantId: TenantId, moduleCode: ModuleCode) => FgaObject;
export declare const fgaSodRule: (tenantId: TenantId, ruleCode: SodRuleCode) => FgaObject;
export declare const fgaOrgUnit: (orgUnitId: OrgUnitId) => FgaObject;
export declare const fgaTeam: (tenantId: TenantId, teamCode: TeamCode) => FgaObject;
/**
 * Canonical 16-team enterprise org chart. Mirrored to `dos.org_teams`
 * by migration `20260502_0134_org_chart_hierarchy_teams_roster.sql`.
 * Each team carries a head + optional deputy + roster.
 */
export declare const ORG_TEAM_CODES: readonly ["executive", "finance", "legal", "people_ops", "engineering", "product", "design", "data_analytics", "security", "risk_management", "compliance", "internal_audit", "it_operations", "customer_success", "sales", "marketing"];
export type OrgTeamCode = (typeof ORG_TEAM_CODES)[number];
export declare const FGA_RELATIONS: {
    readonly tenantMember: "member";
    readonly tenantAdmin: "admin";
    readonly tenantOwner: "owner";
    readonly tenantAuditor: "auditor";
    readonly productOwner: "owner";
    readonly productAdmin: "admin";
    readonly moduleViewer: "viewer";
    readonly moduleEditor: "editor";
    readonly moduleAdmin: "admin";
    readonly moduleApprover: "approver";
    readonly resourceOwner: "owner";
    readonly resourceEditor: "editor";
    readonly resourceViewer: "viewer";
    readonly resourceApprover: "approver";
    readonly serviceOperator: "operator";
    readonly serviceConsumer: "consumer";
    readonly serviceAdmin: "admin";
    readonly serviceCanInvoke: "can_invoke";
    readonly serviceCanAdminister: "can_administer";
    readonly profileSubject: "subject";
    readonly profileDelegate: "delegate";
    readonly profileAuditor: "auditor";
    readonly profileCanView: "can_view";
    readonly profileCanEdit: "can_edit";
    readonly profileCanAdminister: "can_administer";
    readonly pageViewer: "viewer";
    readonly pageEditor: "editor";
    readonly pageAdmin: "admin";
    readonly pageCanRender: "can_render";
    readonly componentViewer: "viewer";
    readonly componentOperator: "operator";
    readonly componentAdmin: "admin";
    readonly componentCanRender: "can_render";
    readonly componentCanInvoke: "can_invoke";
    readonly roleMember: "member";
    readonly roleManager: "manager";
    readonly roleCanAssume: "can_assume";
    readonly roleCanAssign: "can_assign";
    readonly permissionGrantedToRole: "granted_to_role";
    readonly permissionGrantedToUser: "granted_to_user";
    readonly permissionCanExercise: "can_exercise";
    readonly dnaConsumer: "consumer";
    readonly dnaAdministrator: "administrator";
    readonly dnaCanConsume: "can_consume";
    readonly dnaCanAdminister: "can_administer";
    readonly aiOwner: "owner";
    readonly aiCollaborator: "collaborator";
    readonly aiAuditor: "auditor";
    readonly aiAdmin: "ai_admin";
    readonly aiCanView: "can_view";
    readonly aiCanInvokeTool: "can_invoke_tool";
    readonly aiCanAudit: "can_audit";
    readonly aiCanAdminister: "can_administer";
    readonly tenantSettingViewer: "viewer";
    readonly tenantSettingAdministrator: "administrator";
    readonly tenantSettingCanView: "can_view";
    readonly tenantSettingCanEdit: "can_edit";
    readonly profileSettingSubject: "subject";
    readonly profileSettingDelegate: "delegate";
    readonly profileSettingCanView: "can_view";
    readonly profileSettingCanEdit: "can_edit";
    readonly lifecycleOperator: "operator";
    readonly lifecyclePlatformAdmin: "platform_admin";
    readonly lifecycleCanTransition: "can_transition";
    readonly lifecycleCanView: "can_view";
    readonly sodForbidsRole: "forbids_role";
    readonly sodExemptsUser: "exempts_user";
    readonly sodManager: "manager";
    readonly sodCanManage: "can_manage";
    readonly sodCanAudit: "can_audit";
    readonly teamParentOrgUnit: "parent_org_unit";
    readonly teamHead: "head";
    readonly teamDeputy: "deputy";
    readonly teamRoster: "roster";
    readonly teamMember: "member";
    readonly teamAdmin: "admin";
    readonly teamAuditor: "auditor";
    readonly teamCanView: "can_view";
    readonly teamCanEdit: "can_edit";
    readonly teamCanManageRoster: "can_manage_roster";
    readonly teamCanAdminister: "can_administer";
    readonly orgUnitParent: "parent";
    readonly orgUnitHead: "head";
    readonly orgUnitMember: "member";
    readonly orgUnitEditor: "editor";
    readonly orgUnitAdmin: "admin";
    readonly orgUnitCanView: "can_view";
    readonly orgUnitCanEdit: "can_edit";
    readonly orgUnitCanAdminister: "can_administer";
};
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
