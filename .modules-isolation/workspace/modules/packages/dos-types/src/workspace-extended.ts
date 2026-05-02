/**
 * @dos/types — workspace, module, and project management types
 * Covers workspace config, project tracking, boards, milestones
 */

// ── Workspace Extended Types ──────────────────────────────────────────────

export type WorkspaceType =
  | 'grc'
  | 'risk'
  | 'compliance'
  | 'audit'
  | 'isms'
  | 'bcm'
  | 'privacy'
  | 'esg'
  | 'tprm'
  | 'custom';

export type WorkspaceStatus = 'active' | 'inactive' | 'setup' | 'archived' | 'suspended';

export interface WorkspaceConfig {
  workspaceId: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  code: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  description?: string;
  icon?: string;
  color?: string;
  logoUrl?: string;
  ownerId: string;
  adminIds?: string[];
  memberIds?: string[];
  teamIds?: string[];
  modules?: Record<string, WorkspaceModuleConfig>;
  settings?: WorkspaceSettings;
  frameworks?: string[];
  regulations?: string[];
  geographies?: string[];
  orgUnitIds?: string[];
  defaultView?: string;
  metadata?: Record<string, unknown>;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceModuleConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
  roles?: Record<string, string[]>;
  enabledAt?: string;
}

export interface WorkspaceSettings {
  language?: 'en' | 'ar' | 'both';
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  fiscalYearStart?: number;
  enableApprovals?: boolean;
  requireEvidenceForControls?: boolean;
  riskScoringMethod?: 'multiplication' | 'addition' | 'custom';
  defaultRiskMatrix?: string;
  complianceThreshold?: number;
  notificationsEnabled?: boolean;
  auditTrailEnabled?: boolean;
  customFields?: Record<string, CustomFieldDefinition>;
}

export interface CustomFieldDefinition {
  fieldId: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select' | 'url' | 'user';
  required?: boolean;
  options?: CustomFieldOption[];
  defaultValue?: unknown;
  validationRules?: string[];
  entityTypes?: string[];
  isActive: boolean;
}

export interface CustomFieldOption {
  value: string;
  label: string;
  labelAr?: string;
  color?: string;
}

// ── Project Types ─────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'overdue';
export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';
export type ProjectType = 'grc_initiative' | 'remediation' | 'compliance_drive' | 'risk_treatment' | 'audit_improvement' | 'system_implementation' | 'custom';

export interface Project {
  projectId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  nameAr?: string;
  code?: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  managerIds?: string[];
  teamIds?: string[];
  memberIds?: string[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budget?: number;
  currency?: string;
  budgetUsed?: number;
  progressPercent?: number;
  milestones?: ProjectMilestone[];
  relatedEntityType?: string;
  relatedEntityId?: string;
  tags?: string[];
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  milestoneId: string;
  projectId: string;
  title: string;
  titleAr?: string;
  description?: string;
  dueDate: string;
  completedAt?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  ownerId?: string;
  taskIds?: string[];
  dependsOnIds?: string[];
  deliverables?: string[];
  criteria?: string;
  order?: number;
}

// ── Board / Kanban Types ───────────────────────────────────────────────────

export interface KanbanBoard {
  boardId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  description?: string;
  entityType?: string;
  columns: KanbanColumn[];
  members?: string[];
  settings?: BoardSettings;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  columnId: string;
  boardId: string;
  name: string;
  nameAr?: string;
  position: number;
  color?: string;
  limit?: number;
  statusMapping?: string;
  isDefault?: boolean;
  isCompleted?: boolean;
  cardCount?: number;
}

export interface KanbanCard {
  cardId: string;
  boardId: string;
  columnId: string;
  tenantId: string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  assignees?: string[];
  labels?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: string;
  position: number;
  isBlocked?: boolean;
  blockReason?: string;
  comments?: number;
  attachments?: number;
  checklist?: KanbanChecklist;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanChecklist {
  total: number;
  completed: number;
  items: KanbanChecklistItem[];
}

export interface KanbanChecklistItem {
  itemId: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface BoardSettings {
  defaultColumn?: string;
  autoMoveOnComplete?: boolean;
  showDates?: boolean;
  showAssignees?: boolean;
  limitWIP?: boolean;
  wipLimits?: Record<string, number>;
}

// ── Objective / OKR Types ──────────────────────────────────────────────────

export type ObjectiveStatus = 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled' | 'not_achieved';

export interface StrategicObjective {
  objectiveId: string;
  tenantId: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: ObjectiveStatus;
  type: 'strategic' | 'operational' | 'compliance' | 'risk' | 'custom';
  priority?: 'high' | 'medium' | 'low';
  ownerId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  targetValue?: number;
  currentValue?: number;
  progressPercent?: number;
  keyResults?: KeyResult[];
  linkedProjectIds?: string[];
  linkedRiskIds?: string[];
  parentObjectiveId?: string;
  childObjectiveIds?: string[];
  orgUnitId?: string;
  frameworkRef?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  krId: string;
  objectiveId: string;
  title: string;
  type: 'metric' | 'milestone' | 'task';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  dueDate?: string;
  status: ObjectiveStatus;
  progressPercent?: number;
  ownerId?: string;
  updates?: KRUpdate[];
  linkedTaskIds?: string[];
}

export interface KRUpdate {
  updateId: string;
  value: number;
  note?: string;
  updatedBy: string;
  updatedAt: string;
}

// ── Label / Taxonomy Types ────────────────────────────────────────────────

export interface Label {
  labelId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  color?: string;
  description?: string;
  entityTypes?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Tag {
  tagId: string;
  tenantId?: string;
  name: string;
  category?: string;
  description?: string;
  isGlobal: boolean;
  createdAt: string;
}

// ── Module Registration ────────────────────────────────────────────────────

export interface ModuleRegistration {
  moduleId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  version?: string;
  tier?: 'starter' | 'professional' | 'enterprise' | 'government';
  category?: string;
  routes?: string[];
  permissions?: string[];
  dependencies?: string[];
  settings?: ModuleSetting[];
  icon?: string;
  color?: string;
  order?: number;
  isCore?: boolean;
  isActive: boolean;
  releaseDate?: string;
  deprecationDate?: string;
}

export interface ModuleSetting {
  settingId: string;
  key: string;
  label: string;
  labelAr?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi_select';
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  required?: boolean;
  description?: string;
}

// ── Workspace Statistics ──────────────────────────────────────────────────

export interface WorkspaceStats {
  workspaceId: string;
  tenantId: string;
  tasks: { total: number; open: number; overdue: number };
  risks: { total: number; open: number; critical: number };
  controls: { total: number; effective: number; testing: number };
  compliance: { score: number; frameworks: number };
  topAlerts: number;
  lastActivityAt?: string;
  lastCalculatedAt: string;
}
