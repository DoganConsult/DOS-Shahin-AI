"use strict";
// ============================================
// DAuth — Canonical Role Definitions
// Data-driven security (Law 3). Owner: DAuth
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_ROLES = void 0;
// ── Canonical role definitions ─────────────────────────────────────
exports.CANONICAL_ROLES = [
    { code: 'platform_super_admin', name: 'Platform Super Admin', description: 'Full platform control — provisioning, tenancy, global config', tier: 'platform', isSystem: true },
    { code: 'tenant_admin', name: 'Tenant Admin', description: 'Full tenant control — users, roles, modules, settings', tier: 'tenant', isSystem: true },
    { code: 'security_admin', name: 'Security Admin', description: 'Auth config, access profiles, SoD rules, audit log access', tier: 'tenant', isSystem: true },
    { code: 'compliance_officer', name: 'Compliance Officer', description: 'Compliance module — controls, evidence, attestations', tier: 'module', isSystem: false },
    { code: 'risk_manager', name: 'Risk Manager', description: 'Risk module — risk register, assessments, treatment plans', tier: 'module', isSystem: false },
    { code: 'auditor', name: 'Auditor', description: 'Audit module — audit plans, findings, follow-ups (read-heavy)', tier: 'module', isSystem: false },
    { code: 'policy_owner', name: 'Policy Owner', description: 'Policy module — draft, review, publish, retire policies', tier: 'module', isSystem: false },
    { code: 'incident_manager', name: 'Incident Manager', description: 'Incident module — triage, assign, resolve incidents', tier: 'module', isSystem: false },
    { code: 'vendor_manager', name: 'Vendor Manager', description: 'Vendor module — onboard, assess, monitor vendors', tier: 'module', isSystem: false },
    { code: 'standard_user', name: 'Standard User', description: 'Default role — read access to assigned modules', tier: 'tenant', isSystem: true },
    { code: 'viewer', name: 'Viewer', description: 'Read-only access across enabled modules', tier: 'tenant', isSystem: true },
    { code: 'workflow_admin', name: 'Workflow Admin', description: 'Workflow module — design, deploy, manage workflows', tier: 'module', isSystem: false },
];
//# sourceMappingURL=canonical-roles.js.map