/**
 * RBAC display constants — UI display names for roles.
 * Canonical authority definitions are in DAuth, not here.
 */

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
    admin: 'Administrator',
    auditor: 'Auditor',
    compliance_officer: 'Compliance Officer',
    risk_manager: 'Risk Manager',
    viewer: 'Viewer',
    contributor: 'Contributor',
};

export const MODULE_ACCESS_LEVELS = ['read', 'write', 'admin'] as const;
export type ModuleAccessLevel = typeof MODULE_ACCESS_LEVELS[number];
