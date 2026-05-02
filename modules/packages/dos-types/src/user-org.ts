/**
 * @dos/types — user, organization, and profile management types
 * Covers users, teams, org hierarchy, roles, permissions
 */

// ── User Types ────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification' | 'locked';
export type UserType = 'internal' | 'external' | 'service' | 'api';

export interface UserProfile {
  userId: string;
  tenantId: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  displayNameAr?: string;
  avatarUrl?: string;
  title?: string;
  department?: string;
  jobCode?: string;
  employeeId?: string;
  timezone: string;
  locale: string;
  language: 'en' | 'ar';
  status: UserStatus;
  type: UserType;
  roles: string[];
  permissions?: string[];
  teamIds?: string[];
  managerId?: string;
  delegateIds?: string[];
  workspaceAccess?: WorkspaceAccess[];
  lastLoginAt?: string;
  lastActiveAt?: string;
  passwordChangedAt?: string;
  mfaEnabled: boolean;
  mfaMethods?: MFAMethod[];
  preferences?: UserPreferences;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type MFAMethod = 'totp' | 'sms' | 'email' | 'hardware_key';

export interface WorkspaceAccess {
  workspaceId: string;
  role: string;
  permissions?: string[];
  grantedAt: string;
  grantedBy?: string;
  expiresAt?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'ar';
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  notifications?: UserNotificationPrefs;
  dashboardLayout?: string;
  sidebarCollapsed?: boolean;
  defaultView?: Record<string, string>;
}

export interface UserNotificationPrefs {
  email: boolean;
  inApp: boolean;
  push: boolean;
  smsAlerts: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  channels?: Partial<Record<string, boolean>>;
}

export interface UserInvitation {
  invitationId: string;
  tenantId: string;
  email: string;
  roles: string[];
  teamIds?: string[];
  workspaceIds?: string[];
  invitedBy: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  acceptedAt?: string;
  token: string;
  createdAt: string;
}

export interface UserAuditLog {
  logId: string;
  tenantId: string;
  userId: string;
  actorId: string;
  action: 'login' | 'logout' | 'role_change' | 'password_change' | 'mfa_toggle' | 'suspension' | 'activation' | 'invite' | 'delete';
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

// ── Team Types ────────────────────────────────────────────────────────────

export type TeamType = 'department' | 'cross_functional' | 'project' | 'grc' | 'audit' | 'security' | 'custom';

export interface Team {
  teamId: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  code?: string;
  type: TeamType;
  description?: string;
  leaderId?: string;
  memberIds: string[];
  parentTeamId?: string;
  childTeamIds?: string[];
  workspaceIds?: string[];
  moduleAccess?: string[];
  permissions?: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMembership {
  membershipId: string;
  teamId: string;
  userId: string;
  role: 'lead' | 'member' | 'observer';
  joinedAt: string;
  addedBy?: string;
  expiresAt?: string;
}

// ── Organization Types ─────────────────────────────────────────────────────

export type OrgUnitType = 'group' | 'company' | 'division' | 'business_unit' | 'department' | 'subsidiary';

export interface OrgUnit {
  unitId: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  type: OrgUnitType;
  parentUnitId?: string;
  childUnitIds?: string[];
  headUserId?: string;
  address?: OrgAddress;
  industry?: string;
  countryCode?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgAddress {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  countryAr?: string;
  latitude?: number;
  longitude?: number;
}

export interface OrgHierarchy {
  tenantId: string;
  rootUnitId: string;
  nodes: OrgHierarchyNode[];
  depth: number;
  totalUnits: number;
}

export interface OrgHierarchyNode {
  unitId: string;
  name: string;
  nameAr?: string;
  type: OrgUnitType;
  parentId?: string;
  childIds: string[];
  depth: number;
  path: string;
}

// ── Role and Permission Types ─────────────────────────────────────────────

export type RoleScope = 'global' | 'tenant' | 'workspace' | 'module';

export interface Role {
  roleId: string;
  tenantId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  scope: RoleScope;
  permissions: string[];
  moduleAccess?: string[];
  isBuiltIn: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  permissionId: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve' | 'export' | 'admin';
  scope?: string;
  description?: string;
  moduleCode?: string;
  isDeprecated?: boolean;
}

export interface PermissionPolicy {
  policyId: string;
  tenantId: string;
  name: string;
  description?: string;
  effect: 'allow' | 'deny';
  principals: string[];
  resources: string[];
  actions: string[];
  conditions?: PolicyCondition[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface RoleAssignment {
  assignmentId: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scope: RoleScope;
  scopeId?: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// ── Delegation Types ──────────────────────────────────────────────────────

export interface Delegation {
  delegationId: string;
  tenantId: string;
  delegatorId: string;
  delegateeId: string;
  startDate: string;
  endDate?: string;
  scope: 'full' | 'partial';
  permissions?: string[];
  moduleAccess?: string[];
  reason?: string;
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
}

// ── User Stats Types ──────────────────────────────────────────────────────

export interface TenantUserStats {
  tenantId: string;
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  externalUsers: number;
  lastCalculatedAt: string;
  byRole?: Record<string, number>;
  byDepartment?: Record<string, number>;
  mfaAdoptionPercent?: number;
  avgLoginFrequencyDays?: number;
}
