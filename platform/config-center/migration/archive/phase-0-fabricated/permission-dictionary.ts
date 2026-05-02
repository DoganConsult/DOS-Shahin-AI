/**
 * Permission Contract -- Permission Dictionary
 * Per DOS-AIO-Specs: Permission Contract is one of 5 mandatory contract layers.
 * Naming convention: <scope>:<resource>:<action>
 * Every route MUST reference a permission from this dictionary.
 * No `requireRole` drift -- only explicit permissions.
 */

export interface PermissionEntry {
  /** Permission code: <scope>:<resource>:<action> */
  code: string;
  displayName: string;
  description: string;
  ownerScope: 'platform' | 'product';
  moduleCode: string | null;
  resource: string;
  action: string;
  tenantMode: 'global' | 'tenant-scoped';
  /** Which guard uses this: 'api' | 'ui' | 'both' */
  guardType: 'api' | 'ui' | 'both';
  /** Does this require approval workflow to grant? */
  approvalRequired: boolean;
}

// --- Auth Service Permissions ---

export const AUTH_PERMISSIONS: PermissionEntry[] = [
  { code: 'auth:access_snapshot:read', displayName: 'Read Access Snapshot', description: 'View own access profile and permissions', ownerScope: 'platform', moduleCode: null, resource: 'access_snapshot', action: 'read', tenantMode: 'global', guardType: 'api', approvalRequired: false },
  { code: 'auth:invitations:create', displayName: 'Create Invitations', description: 'Invite new users to tenant', ownerScope: 'platform', moduleCode: null, resource: 'invitations', action: 'create', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'auth:rbac:seed', displayName: 'Seed RBAC', description: 'Register roles and permissions for a product (service-only)', ownerScope: 'platform', moduleCode: null, resource: 'rbac', action: 'seed', tenantMode: 'global', guardType: 'api', approvalRequired: false },
  { code: 'auth:roles:manage', displayName: 'Manage Roles', description: 'Create, update, delete roles', ownerScope: 'platform', moduleCode: null, resource: 'roles', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: true },
  { code: 'auth:users:manage', displayName: 'Manage Users', description: 'Create, update, deactivate users', ownerScope: 'platform', moduleCode: null, resource: 'users', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'auth:sod:manage', displayName: 'Manage SoD Rules', description: 'Create and modify separation of duties rules', ownerScope: 'platform', moduleCode: null, resource: 'sod', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: true },
  { code: 'auth:delegations:manage', displayName: 'Manage Delegations', description: 'Create and revoke delegations', ownerScope: 'platform', moduleCode: null, resource: 'delegations', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: true },
  { code: 'auth:access_review:manage', displayName: 'Manage Access Reviews', description: 'Start and complete access review campaigns', ownerScope: 'platform', moduleCode: null, resource: 'access_review', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
];

// --- Tenant Service Permissions ---

export const TENANT_PERMISSIONS: PermissionEntry[] = [
  { code: 'tenant:tenants:list', displayName: 'List Tenants', description: 'View all tenants', ownerScope: 'platform', moduleCode: null, resource: 'tenants', action: 'list', tenantMode: 'global', guardType: 'both', approvalRequired: false },
  { code: 'tenant:tenants:create', displayName: 'Create Tenant', description: 'Provision new tenant', ownerScope: 'platform', moduleCode: null, resource: 'tenants', action: 'create', tenantMode: 'global', guardType: 'both', approvalRequired: true },
  { code: 'tenant:tenants:read', displayName: 'Read Tenant', description: 'View tenant details', ownerScope: 'platform', moduleCode: null, resource: 'tenants', action: 'read', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'tenant:tenants:update', displayName: 'Update Tenant', description: 'Modify tenant details', ownerScope: 'platform', moduleCode: null, resource: 'tenants', action: 'update', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'tenant:config:read', displayName: 'Read Tenant Config', description: 'View tenant configuration', ownerScope: 'platform', moduleCode: null, resource: 'config', action: 'read', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'tenant:config:update', displayName: 'Update Tenant Config', description: 'Modify tenant configuration', ownerScope: 'platform', moduleCode: null, resource: 'config', action: 'update', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'tenant:workspaces:list', displayName: 'List Workspaces', description: 'View workspaces in tenant', ownerScope: 'platform', moduleCode: null, resource: 'workspaces', action: 'list', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'tenant:workspaces:create', displayName: 'Create Workspace', description: 'Provision new workspace', ownerScope: 'platform', moduleCode: null, resource: 'workspaces', action: 'create', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: true },
  { code: 'tenant:navigation:register', displayName: 'Register Navigation', description: 'Register product navigation entries (service-only)', ownerScope: 'platform', moduleCode: null, resource: 'navigation', action: 'register', tenantMode: 'global', guardType: 'api', approvalRequired: false },
];

// --- Workflow Service Permissions ---

export const WORKFLOW_PERMISSIONS: PermissionEntry[] = [
  { code: 'workflow:instances:create', displayName: 'Create Workflow', description: 'Initiate a workflow instance', ownerScope: 'platform', moduleCode: null, resource: 'instances', action: 'create', tenantMode: 'tenant-scoped', guardType: 'api', approvalRequired: false },
  { code: 'workflow:instances:read', displayName: 'Read Workflow', description: 'View workflow instance details', ownerScope: 'platform', moduleCode: null, resource: 'instances', action: 'read', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'workflow:instances:advance', displayName: 'Advance Workflow', description: 'Approve, reject, or skip a workflow step', ownerScope: 'platform', moduleCode: null, resource: 'instances', action: 'advance', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'workflow:instances:cancel', displayName: 'Cancel Workflow', description: 'Cancel a running workflow', ownerScope: 'platform', moduleCode: null, resource: 'instances', action: 'cancel', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'workflow:tasks:list', displayName: 'List Tasks', description: 'View assigned tasks', ownerScope: 'platform', moduleCode: null, resource: 'tasks', action: 'list', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'workflow:tasks:complete', displayName: 'Complete Task', description: 'Mark a task as completed', ownerScope: 'platform', moduleCode: null, resource: 'tasks', action: 'complete', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'workflow:approvals:create', displayName: 'Create Approval', description: 'Request an approval workflow', ownerScope: 'platform', moduleCode: null, resource: 'approvals', action: 'create', tenantMode: 'tenant-scoped', guardType: 'api', approvalRequired: false },
  { code: 'workflow:jobs:register', displayName: 'Register Job', description: 'Register a scheduled job (service-only)', ownerScope: 'platform', moduleCode: null, resource: 'jobs', action: 'register', tenantMode: 'global', guardType: 'api', approvalRequired: false },
];

// --- Compliance Module Permissions (Milestone 3) ---

export const COMPLIANCE_PERMISSIONS: PermissionEntry[] = [
  { code: 'compliance:frameworks:list', displayName: 'List Frameworks', description: 'View compliance frameworks', ownerScope: 'product', moduleCode: 'compliance', resource: 'frameworks', action: 'list', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'compliance:frameworks:create', displayName: 'Create Framework', description: 'Create compliance framework', ownerScope: 'product', moduleCode: 'compliance', resource: 'frameworks', action: 'create', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'compliance:frameworks:update', displayName: 'Update Framework', description: 'Modify compliance framework', ownerScope: 'product', moduleCode: 'compliance', resource: 'frameworks', action: 'update', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'compliance:controls:manage', displayName: 'Manage Controls', description: 'Create, map, and test controls', ownerScope: 'product', moduleCode: 'compliance', resource: 'controls', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'compliance:assessments:run', displayName: 'Run Assessment', description: 'Execute compliance assessment', ownerScope: 'product', moduleCode: 'compliance', resource: 'assessments', action: 'run', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'compliance:gaps:read', displayName: 'Read Gaps', description: 'View compliance gaps', ownerScope: 'product', moduleCode: 'compliance', resource: 'gaps', action: 'read', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
];

// --- Risk Module Permissions (Milestone 3) ---

export const RISK_PERMISSIONS: PermissionEntry[] = [
  { code: 'risk:registers:list', displayName: 'List Risk Registers', description: 'View risk registers', ownerScope: 'product', moduleCode: 'risk', resource: 'registers', action: 'list', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'risk:registers:create', displayName: 'Create Risk Register', description: 'Create a risk register', ownerScope: 'product', moduleCode: 'risk', resource: 'registers', action: 'create', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'risk:risks:create', displayName: 'Create Risk', description: 'Add a new risk', ownerScope: 'product', moduleCode: 'risk', resource: 'risks', action: 'create', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'risk:risks:update', displayName: 'Update Risk', description: 'Modify risk details', ownerScope: 'product', moduleCode: 'risk', resource: 'risks', action: 'update', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'risk:assessments:run', displayName: 'Run Risk Assessment', description: 'Execute risk assessment', ownerScope: 'product', moduleCode: 'risk', resource: 'assessments', action: 'run', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
  { code: 'risk:appetite:manage', displayName: 'Manage Risk Appetite', description: 'Set and modify risk appetite thresholds', ownerScope: 'product', moduleCode: 'risk', resource: 'appetite', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: true },
  { code: 'risk:treatments:manage', displayName: 'Manage Treatments', description: 'Create and update risk treatments', ownerScope: 'product', moduleCode: 'risk', resource: 'treatments', action: 'manage', tenantMode: 'tenant-scoped', guardType: 'both', approvalRequired: false },
];

// --- Aggregated Permission Dictionary ---

export const PERMISSION_DICTIONARY: PermissionEntry[] = [
  ...AUTH_PERMISSIONS,
  ...TENANT_PERMISSIONS,
  ...WORKFLOW_PERMISSIONS,
  ...COMPLIANCE_PERMISSIONS,
  ...RISK_PERMISSIONS,
];
