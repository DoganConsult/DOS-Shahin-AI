/**
 * GRC Operations — Teams, RACI, Process Tasks, Work Items & Approvals DTOs
 */
import { BaseEntityDto } from '../../models/shared.types';

// ── Teams ──

export interface TeamListDto {
  teams: TeamDto[];
  total?: number;
}

export interface TeamDto extends BaseEntityDto {
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  memberCount?: number;
  leaderId?: string;
}

export interface CreateTeamRequest {
  name: string;
  code?: string;
  type?: string;
  [key: string]: unknown;
}

export interface UpdateTeamRequest {
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  [key: string]: unknown;
}

export interface TeamWorkloadDto {
  teamId: string;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  members: Array<{ userId: string; name: string; taskCount: number }>;
}

export interface TeamMemberDto {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  teamId?: string;
}

// ── Team RACI ──

export interface RACIMatrixDto {
  entries: Array<{
    id: string;
    raciRole: string;
    teamId?: string;
    teamName?: string;
    platformRole?: string;
    notes?: string;
  }>;
}

export interface SetRACIRoleRequest {
  raciRole: string;
  teamId?: string;
  platformRole?: string;
  notes?: string;
}

export interface TeamRACIScopeDto {
  scopes: Array<{ scopeType: string; scopeId: string; raciRole: string }>;
}

export interface TeamRACICountDto {
  total: number;
  byRole: Record<string, number>;
}

// ── GRC RACI Entity-Level ──

export interface RaciDashboardDto {
  totalAssignments: number;
  coverage: number;
  gaps: number;
  byEntityType: Record<string, { total: number; assigned: number }>;
}

export interface RaciMatrixEntryDto {
  entityType: string;
  entityId: string;
  entityTitle?: string;
  raciRole: string;
  teamId?: string;
  teamName?: string;
  userId?: string;
  deptId?: string;
}

export interface RaciGapDto {
  entityType: string;
  entityId: string;
  entityTitle?: string;
  missingRoles: string[];
}

export interface AssignRaciRequest {
  entityType: string;
  entityId: string;
  raciRole: string;
  teamId?: string;
  deptId?: string;
  userId?: string;
  notes?: string;
}

export interface AssignEntityOwnerRequest {
  entityType: string;
  entityId: string;
  userId: string;
  ownershipType?: string;
  isPrimary?: boolean;
}

export interface AssignEntityTeamRequest {
  entityType: string;
  entityId: string;
  teamId: string;
  isSecondary?: boolean;
  deptId?: string;
}

export interface RaciTeamDistributionDto {
  teams: Array<{ teamId: string; teamName: string; assignmentCount: number; byRole: Record<string, number> }>;
}

export interface CheckRaciGateRequest {
  entityType: string;
  entityId: string;
  targetState: string;
}

export interface CheckRaciGateResultDto {
  allowed: boolean;
  missingRoles?: string[];
  warnings?: string[];
}

export interface EvidenceActionDto extends BaseEntityDto {
  evidenceId?: string;
  actionType?: string;
  title?: string;
  description?: string;
  status?: string;
}

export interface CreateEvidenceActionRequest {
  actionType: string;
  title: string;
  description?: string;
}

// ── Process Tasks ──

export interface ProcessTaskFilters {
  status?: string;
  teamId?: string;
  assignedTo?: string;
  priority?: string;
  role?: string;
}

export interface ProcessTaskListDto {
  tasks: ProcessTaskDto[];
  total?: number;
}

export interface ProcessTaskDto extends BaseEntityDto {
  title?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  teamId?: string;
  entityType?: string;
  entityId?: string;
  dueDate?: string;
  breachedAt?: string;
  escalationLevel?: number;
}

export interface SlaByRoleDto {
  role: string;
  total: number;
  breached: number;
  at_risk: number;
}

// ── Work Items ──

export interface WorkItemFilters {
  status?: string;
  priority?: string;
  taskType?: string;
  overdue?: boolean;
  limit?: number;
}

export interface WorkItemListDto {
  tasks: WorkItemDto[];
  count: number;
}

export interface WorkItemDto {
  taskId: string;
  source: 'workflow_tasks' | 'process_tasks';
  title: string;
  description?: string;
  taskType?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  instanceStepId?: string;
  entityType?: string;
  entityId?: string;
}

export interface CompleteWorkItemRequest {
  outcome?: string;
  comment?: string;
  source?: 'workflow_tasks' | 'process_tasks';
}

// ── Approvals ──

export interface ApprovalListDto {
  approvals: ApprovalDto[];
  total?: number;
}

export interface ApprovalDto extends BaseEntityDto {
  entityType?: string;
  entityId?: string;
  action?: string;
  status?: string;
  requestedBy?: string;
  decidedBy?: string;
  decisionComment?: string;
}

export interface InitiateApprovalRequest {
  entityType: string;
  entityId: string;
  action: string;
  routeId: string;
  context?: Record<string, unknown>;
}
