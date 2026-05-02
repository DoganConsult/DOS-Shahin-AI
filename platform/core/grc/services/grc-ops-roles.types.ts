/**
 * GRC Operations — Automation, Notifications, Messaging, Profiles, Roles,
 * Users, Activities, Invitations & Member Lifecycle DTOs
 */
import { BaseEntityDto } from '../../models/shared.types';

// ── Automation Rules ──

export interface AutomationRuleDto extends BaseEntityDto {
  name?: string;
  module?: string;
  trigger?: string;
  condition?: string;
  action?: string;
  enabled?: boolean;
}

export interface CreateAutomationRuleRequest {
  name: string;
  trigger: string;
  condition: string;
  action: string;
  module?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  trigger?: string;
  condition?: string;
  action?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface AutomationLogDto {
  entries: Array<{ id: string; ruleId: string; status: string; executedAt: string; module?: string; error?: string }>;
  total?: number;
}

// ── Notifications ──

export interface NotificationListDto {
  notifications: NotificationDto[];
  total?: number;
}

export interface NotificationDto extends BaseEntityDto {
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  entityType?: string;
  entityId?: string;
}

export interface NotificationPreferencesDto {
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
  channels?: Record<string, boolean>;
  [key: string]: unknown;
}

// ── Messaging ──

export interface ChannelListDto {
  channels: ChannelDto[];
  total?: number;
}

export interface ChannelDto extends BaseEntityDto {
  name?: string;
  type?: string;
  memberCount?: number;
}

export interface CreateChannelRequest {
  name: string;
  type?: string;
  memberIds?: string[];
  [key: string]: unknown;
}

export interface ChannelMessageDto {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  content: string;
  sentAt: string;
}

export interface SendChannelMessageRequest {
  content: string;
  [key: string]: unknown;
}

export interface SendDirectMessageRequest {
  recipientId: string;
  content: string;
  [key: string]: unknown;
}

export interface UnreadCountDto {
  count: number;
  byChannel?: Record<string, number>;
}

// ── Profiles ──

export interface UserProfileDto {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  avatar?: string;
  preferences?: Record<string, unknown>;
}

export interface TenantProfileDto {
  tenantId: string;
  name?: string;
  plan?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface UserPermissionsDto {
  permissions: string[];
  roles: string[];
}

// ── Roles ──

export interface RoleListDto {
  roles: RoleDto[];
  total?: number;
}

export interface RoleDto extends BaseEntityDto {
  code?: string;
  name?: string;
  description?: string;
  permissions?: string[];
  userCount?: number;
}

export interface RoleStatsDto {
  totalRoles: number;
  totalAssignments: number;
  byRole: Record<string, number>;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface RoleProfileDto {
  role: string;
  displayName?: string;
  description?: string;
  defaultDashboard?: string;
  navItems?: string[];
  permissions?: string[];
}

export interface RoleMatrixDto {
  assignments: Array<{
    userId: string;
    roleId: string;
    roleName?: string;
    scopeType?: string;
    scopeId?: string;
    isPrimary?: boolean;
  }>;
}

export interface AssignRoleMatrixRoleRequest {
  userId: string;
  roleId: string;
  scopeType?: string;
  scopeId?: string | null;
  isPrimary?: boolean;
  reason?: string;
}

export interface RoleFunctionMappingDto {
  mappings: Array<{ roleId: string; functionId: string; level?: string }>;
}

export interface FunctionAuthorityDto {
  authorities: Array<{ functionId: string; authorityId: string; level?: string }>;
}

export interface RoleDetailDto {
  code: string;
  name: string;
  description?: string;
  permissions?: string[];
  userCount?: number;
  teamCount?: number;
}

export interface RoleUsersDto {
  users: Array<{ userId: string; name: string; email: string; assignedAt: string }>;
  total: number;
  page: number;
  limit: number;
}

export interface RolePermissionsDto {
  permissions: Array<{ key: string; label: string; granted: boolean }>;
}

export interface RoleTeamsDto {
  teams: Array<{ teamId: string; teamName: string; role: string }>;
}

export interface RoleDashboardsDto {
  dashboards: Array<{ id: string; name: string; default: boolean }>;
}

export interface RoleExperienceDto {
  navItems: string[];
  features: string[];
  restrictions?: string[];
}

export interface AssignRoleToUserRequest {
  userId: string;
  scopeType?: string;
  scopeId?: string;
  [key: string]: unknown;
}

// ── Role Staffing ──

export interface RoleStaffingDto {
  roles: Array<{
    roleCode: string;
    roleTitle: string;
    recommended: number;
    current: number;
    gap: number;
  }>;
}

// ── Users ──

export interface UserDetailDto {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  status?: string;
  lastLoginAt?: string;
}

export interface UserTeamsDto {
  teams: Array<{ teamId: string; teamName: string; role: string }>;
}

export interface UserTasksDto {
  tasks: Array<{ taskId: string; title: string; status: string; dueDate?: string }>;
}

// ── Activities ──

export interface ActivityListDto {
  activities: ActivityDto[];
  total?: number;
}

export interface ActivityDto {
  id: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  userId?: string;
  createdAt: string;
}

export interface RecordActivityRequest {
  action: string;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
}

// ── Invitations ──

export interface InvitationListDto {
  invitations: InvitationDto[];
  total?: number;
}

export interface InvitationDto {
  id: string;
  email: string;
  role?: string;
  status: string;
  token?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SendRoleInvitationRequest {
  email: string;
  name: string;
  roleCode: string;
  orgTitle: string;
  shahinTitle: string;
}

// ── Member Lifecycle ──

export interface MemberDirectoryDto {
  members: Array<{ userId: string; name: string; email: string; role: string; status: string; teams: string[] }>;
  total?: number;
}

export interface MemberLifecycleDto {
  userId: string;
  status: string;
  teams: Array<{ teamId: string; teamName: string; role: string; status: string }>;
  activationMode?: string;
  lastActivityAt?: string;
}

export interface MemberProfileDto {
  id: string;
  userId: string;
  profileType: string;
  name?: string;
  active: boolean;
}

export interface CreateMemberProfileRequest {
  profileType: string;
  name?: string;
  [key: string]: unknown;
}

export interface AgentShadowDto {
  id: string;
  userId: string;
  teamId?: string;
  agentConfig?: Record<string, unknown>;
  active: boolean;
}

export interface UpsertAgentShadowRequest {
  teamId?: string;
  agentConfig?: Record<string, unknown>;
  active?: boolean;
  [key: string]: unknown;
}

export interface AgentActivationRuleDto {
  id: string;
  shadowId: string;
  condition: string;
  action: string;
  active: boolean;
}

export interface CreateAgentActivationRuleRequest {
  condition: string;
  action: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface UpdateAgentActivationRuleRequest {
  condition?: string;
  action?: string;
  active?: boolean;
  [key: string]: unknown;
}
