/**
 * @dos/types — project management and roadmap types
 * Covers roadmaps, epics, sprints, milestones, time-tracking, resource planning
 */

// ── Project Portfolio Types ──────────────────────────────────────────

export type ProjectPortfolioStatus = 'active' | 'inactive' | 'archived';

export interface ProjectPortfolio {
  portfolioId: string;
  tenantId: string;
  name: string;
  description?: string;
  status?: ProjectPortfolioStatus;
  ownerId?: string;
  budget?: number;
  currency?: string;
  strategicAlignment?: string;
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Roadmap Types ────────────────────────────────────────────────────

export type RoadmapStatus = 'draft' | 'published' | 'archived';
export type RoadmapPeriod = 'monthly' | 'quarterly' | 'annual' | 'custom';

export interface Roadmap {
  roadmapId: string;
  tenantId: string;
  name: string;
  description?: string;
  status?: RoadmapStatus;
  period?: RoadmapPeriod;
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  portfolioId?: string;
  projectIds?: string[];
  goals?: string[];
  isPublic?: boolean;
  items?: RoadmapItem[];
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapItem {
  itemId: string;
  roadmapId?: string;
  title: string;
  type?: 'epic' | 'milestone' | 'release' | 'initiative' | 'feature';
  status?: 'planned' | 'in_progress' | 'shipped' | 'cancelled';
  color?: string;
  startDate?: string;
  endDate?: string;
  completionPct?: number;
  ownerId?: string;
  linkedItemIds?: string[];
  tags?: string[];
  notes?: string;
}

// ── Epic & Feature Types ─────────────────────────────────────────────

export type EpicStatus = 'backlog' | 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface Epic {
  epicId: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: EpicStatus;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  ownerId?: string;
  storyIds?: string[];
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  capacity?: number;
  spent?: number;
  progressPct?: number;
  label?: string;
  acceptanceCriteria?: string;
  businessValue?: string;
  references?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Sprint Types ─────────────────────────────────────────────────────

export type SprintStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Sprint {
  sprintId: string;
  tenantId: string;
  projectId?: string;
  name: string;
  goal?: string;
  status?: SprintStatus;
  number?: number;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  plannedPoints?: number;
  completedPoints?: number;
  addedDuringPoints?: number;
  removedPoints?: number;
  velocity?: number;
  itemIds?: string[];
  demoDate?: string;
  retroNote?: string;
  burndownData?: SprintBurndownPoint[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SprintBurndownPoint {
  date: string;
  remainingPoints?: number;
  completedPoints?: number;
  idealRemaining?: number;
}

// ── User Story / Task Item Types ─────────────────────────────────────

export type StoryType = 'user_story' | 'bug' | 'task' | 'sub_task' | 'spike' | 'chore' | 'improvement';
export type StoryStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export interface UserStory {
  storyId: string;
  tenantId: string;
  projectId?: string;
  epicId?: string;
  sprintId?: string;
  type?: StoryType;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  status?: StoryStatus;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  storyPoints?: number;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string;
  reviewerId?: string;
  reporterId?: string;
  parentStoryId?: string;
  subTaskIds?: string[];
  labels?: string[];
  linkedItems?: LinkedItem[];
  commentCount?: number;
  attachments?: string[];
  blockedBy?: string[];
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  rank?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedItem {
  linkedId: string;
  linkedType?: string;
  relation?: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'clones';
}

// ── Milestone Types ──────────────────────────────────────────────────

export type MilestoneStatus = 'planned' | 'at_risk' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface Milestone {
  milestoneId: string;
  tenantId: string;
  projectId?: string;
  name: string;
  description?: string;
  status?: MilestoneStatus;
  targetDate?: string;
  completedAt?: string;
  ownerId?: string;
  deliverables?: string[];
  criteria?: string;
  storyIds?: string[];
  progressPct?: number;
  riskNote?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Time Tracking Types ──────────────────────────────────────────────

export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TimeEntry {
  entryId: string;
  tenantId: string;
  userId?: string;
  projectId?: string;
  storyId?: string;
  taskId?: string;
  date: string;
  hours: number;
  description?: string;
  category?: 'development' | 'review' | 'meeting' | 'testing' | 'planning' | 'support' | 'other';
  billable?: boolean;
  status?: TimeEntryStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  loggedAt?: string;
  editedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface TimesheetEntry {
  timesheetId: string;
  tenantId?: string;
  userId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: TimeEntryStatus;
  totalHours?: number;
  billableHours?: number;
  entries?: TimeEntry[];
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
}

// ── Resource Planning Types ──────────────────────────────────────────

export type ResourceType = 'human' | 'contractor' | 'tool_license' | 'infrastructure' | 'budget';

export interface ResourcePlan {
  planId: string;
  tenantId: string;
  projectId?: string;
  sprintId?: string;
  periodStart?: string;
  periodEnd?: string;
  totalCapacityHours?: number;
  usedCapacityHours?: number;
  availableCapacityHours?: number;
  allocations?: ResourceAllocation[];
  notes?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  allocationId: string;
  resourceId?: string;
  resourceType?: ResourceType;
  resourceName?: string;
  projectId?: string;
  role?: string;
  allocationPct?: number;
  allocatedHours?: number;
  costRate?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: 'planned' | 'confirmed' | 'actual';
  notes?: string;
}

// ── Release & Deployment Planning Types ─────────────────────────────

export type ReleaseStatus = 'planned' | 'in_preparation' | 'in_testing' | 'approved' | 'released' | 'cancelled';

export interface Release {
  releaseId: string;
  tenantId: string;
  projectId?: string;
  name: string;
  version?: string;
  description?: string;
  status?: ReleaseStatus;
  plannedDate?: string;
  actualDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  sprintIds?: string[];
  storyIds?: string[];
  changelogUrl?: string;
  releaseNotes?: string;
  environment?: 'staging' | 'uat' | 'production';
  isHotfix?: boolean;
  riskLevel?: 'high' | 'medium' | 'low';
  rollbackPlan?: string;
  deploymentJobId?: string;
  piTestResults?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Project Dashboard Types ──────────────────────────────────────────

export interface ProjectDashboard {
  tenantId: string;
  asOf: string;
  totalProjects?: number;
  activeProjects?: number;
  completedProjects?: number;
  atRiskProjects?: number;
  overdueProjects?: number;
  totalEpics?: number;
  openEpics?: number;
  activeSprints?: number;
  totalStories?: number;
  openStories?: number;
  bugCount?: number;
  velocity?: number;
  avgCycleTimeDays?: number;
  avgLeadTimeDays?: number;
  resourceUtilization?: number;
  budgetUtilization?: number;
  upcomingMilestones?: Array<{ milestoneId: string; name: string; targetDate?: string; status?: MilestoneStatus }>;
  recentActivity?: Array<{ type: string; description: string; occurredAt: string }>;
}
