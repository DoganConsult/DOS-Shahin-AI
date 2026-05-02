/**
 * GRC Operations — Admin, Workspaces, Scopes, Home, Mappings, Relationships,
 * Assets, Comments, Activity Feed, Entity Links, Search, Audit Trail,
 * Explainability, Digital Twin, Red Team, Agent Performance, Reports,
 * Tenant Config, Tiers, Cadence, Connectors, Integrations, OpenClaw,
 * Content Packs, Timeline, Task Board, Action Items, KPI, Public Content,
 * AI Triggers, Training, Foundation & Bulk Import DTOs
 */
import { BaseEntityDto, MessageResponse } from '../../models/shared.types';

// ── Admin ──

export interface AdminTenantListDto {
  tenants: Array<{ id: string; name: string; status: string; plan: string; createdAt: string }>;
  total?: number;
}

export interface AdminHealthDto {
  status: string;
  uptime: number;
  dbConnected: boolean;
  services: Record<string, string>;
}

export interface CreateAdminTenantRequest {
  name: string;
  plan?: string;
  adminEmail?: string;
  [key: string]: unknown;
}

export interface AdminUserListDto {
  users: Array<{ userId: string; email: string; role: string; status: string; tenantId: string }>;
  total?: number;
}

// ── Workspaces ──

export interface WorkspaceListDto {
  workspaces: WorkspaceDto[];
  total?: number;
}

export interface WorkspaceDto extends BaseEntityDto {
  name?: string;
  status?: string;
  description?: string;
  tenantId?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

// ── Scopes ──

export interface ScopeListDto {
  scopes: ScopeDto[];
  total?: number;
}

export interface ScopeDto extends BaseEntityDto {
  name?: string;
  type?: string;
  workspaceId?: string;
}

export interface CreateScopeRequest {
  name: string;
  type: string;
  [key: string]: unknown;
}

// ── Tenant Home ──

export interface HomeOverviewDto {
  summary: Record<string, unknown>;
  quickStats: Array<{ key: string; value: number; trend?: string }>;
  context?: Record<string, unknown>;
  kpis?: Record<string, unknown>;
  kpiTrends?: Record<string, unknown>;
  actionCenter?: Record<string, unknown>;
  programHealth?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  activity?: Record<string, unknown>;
}

export interface HomeActivityDto {
  activities: Array<{ id: string; action: string; module: string; description: string; createdAt: string }>;
  total?: number;
}

// ── Mappings ──

export interface CreateMappingRequest {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
}

export interface MappingDto extends BaseEntityDto {
  sourceType?: string;
  sourceId?: string;
  targetType?: string;
  targetId?: string;
}

// ── Relationships ──

export interface RelationshipListDto {
  relationships: Array<{ id: string; type: string; targetType: string; targetId: string; targetName: string }>;
}

// ── Assets ──

export interface AssetListDto {
  assets: AssetDto[];
  total?: number;
}

export interface AssetDto extends BaseEntityDto {
  name?: string;
  type?: string;
  status?: string;
  criticality?: string;
  workspaceId?: string;
}

export interface CreateAssetRequest {
  name: string;
  type: string;
  criticality?: string;
  [key: string]: unknown;
}

export interface UpdateAssetRequest {
  name?: string;
  type?: string;
  status?: string;
  criticality?: string;
  [key: string]: unknown;
}

// ── Comments ──

export interface CommentListDto {
  comments: CommentDto[];
  total?: number;
}

export interface CommentDto extends BaseEntityDto {
  entityType?: string;
  entityId?: string;
  authorId?: string;
  authorName?: string;
  content?: string;
}

export interface CreateCommentRequest {
  entityType: string;
  entityId: string;
  content: string;
  [key: string]: unknown;
}

export interface UpdateCommentRequest {
  content: string;
  [key: string]: unknown;
}

// ── Activity Feed ──

export interface ActivityFeedDto {
  entries: Array<{ id: string; action: string; module: string; description: string; userId: string; createdAt: string }>;
  total?: number;
}

// ── Entity Links ──

export interface EntityLinkListDto {
  links: EntityLinkDto[];
  total?: number;
}

export interface EntityLinkDto extends BaseEntityDto {
  sourceType?: string;
  sourceId?: string;
  targetType?: string;
  targetId?: string;
  linkType?: string;
}

export interface CreateEntityLinkRequest {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType?: string;
  [key: string]: unknown;
}

// ── Global Search ──

export interface GlobalSearchResultDto {
  results: Array<{ id: string; type: string; title: string; module: string; score: number }>;
  total: number;
}

// ── Audit Trail ──

export interface AuditTrailDto {
  entries: Array<{
    id: string;
    action: string;
    module: string;
    entityType: string;
    entityId: string;
    userId: string;
    changedAt: string;
    details?: Record<string, unknown>;
  }>;
  total?: number;
}

export interface AuditTrailFilters {
  module?: string;
  userId?: string;
  entityType?: string;
  action?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditModulesDto {
  modules: string[];
}

// ── Explainability ──

export interface ExplainabilityPackDto extends BaseEntityDto {
  title?: string;
  model?: string;
  content?: Record<string, unknown>;
}

// ── Digital Twin ──

export interface SimulationDto extends BaseEntityDto {
  status?: string;
  results?: Record<string, unknown>;
}

// ── Red Team ──

export interface RedTeamRunDto extends BaseEntityDto {
  status?: string;
  startedAt?: string;
  findings?: number;
}

export interface RedTeamSummaryDto {
  totalRuns: number;
  totalFindings: number;
  criticalFindings: number;
  lastRunAt?: string;
}

// ── Agent Performance ──

export interface AgentPerformanceDto {
  agentId: string;
  agentName?: string;
  accuracy?: number;
  avgResponseTime?: number;
  tasksCompleted?: number;
  taskCount?: number;
  successRate?: number;
  period?: string;
}

// ── Reports ──

export interface ReportScenarioDto extends BaseEntityDto {
  type?: string;
  title?: string;
  description?: string;
}

export interface GenerateReportParams {
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  format?: string;
  [key: string]: unknown;
}

export interface ReportScheduleDto extends BaseEntityDto {
  type?: string;
  frequency?: string;
  nextRunAt?: string;
}

export interface CreateReportScheduleRequest {
  templateId?: string;
  frequency: string;
  recipients?: string[];
  [key: string]: unknown;
}

export interface ReportTemplateDto extends BaseEntityDto {
  name?: string;
  type?: string;
  description?: string;
}

// ── Tenant Config ──

export interface TenantConfigDto {
  config: Record<string, unknown>;
}

export interface TenantRaciDto {
  raci: Record<string, unknown>;
}

// ── Tier Management ──

export interface TierConfigDto {
  tier: string;
  features: string[];
  limits: Record<string, number>;
}

export interface TierLimitsDto {
  limits: Record<string, number>;
  usage: Record<string, number>;
}

export interface UpdateTierRequest {
  tier?: string;
  [key: string]: unknown;
}

// ── Cadence Calendar ──

export interface CadenceTaskDto extends BaseEntityDto {
  title?: string;
  frequency?: string;
  nextDueDate?: string;
  status?: string;
}

export interface CadenceOverrideDto extends BaseEntityDto {
  taskId?: string;
  overrideDate?: string;
  reason?: string;
}

// ── Connectors ──

export interface ConnectorDto extends BaseEntityDto {
  name?: string;
  type?: string;
  status?: string;
  config?: Record<string, unknown>;
}

export interface CreateConnectorRequest {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Integrations Hub ──

export interface WebhookDto extends BaseEntityDto {
  url?: string;
  events?: string[];
  active?: boolean;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface IntegrationConfigDto extends BaseEntityDto {
  name?: string;
  type?: string;
  config?: Record<string, unknown>;
  active?: boolean;
}

export interface CreateIntegrationConfigRequest {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UpdateIntegrationConfigRequest {
  name?: string;
  config?: Record<string, unknown>;
  active?: boolean;
  [key: string]: unknown;
}

// ── OpenClaw Integration ──

export interface OpenClawStatusDto {
  connected: boolean;
  version?: string;
  lastHeartbeat?: string;
}

export interface OpenClawToolDto {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface OpenClawResourceDto {
  uri: string;
  name: string;
  type: string;
  content?: Record<string, unknown>;
}

export interface ExecuteOpenClawToolResultDto {
  result: Record<string, unknown>;
  executionTime?: number;
}

// ── Content Packs ──

export interface ContentPackDto extends BaseEntityDto {
  name?: string;
  version?: string;
  status?: string;
  installedAt?: string;
}

export interface ContentPackManifestDto {
  packId: string;
  version: string;
  modules: string[];
  config?: Record<string, unknown>;
}

// ── Timeline ──

export interface TimelineDto {
  events: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    module?: string;
    createdAt: string;
    entityType?: string;
    entityId?: string;
  }>;
  total?: number;
}

// ── Task Board ──

export interface TaskBoardDto {
  columns: Array<{
    status: string;
    tasks: Array<{ id: string; title: string; priority: string; assignedTo?: string; dueDate?: string }>;
  }>;
}

export interface CreateTaskRequest {
  title: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface TaskProgressDto {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  percent: number;
}

// ── Action Items ──

export interface ActionItemListDto {
  items: ActionItemDto[];
  total?: number;
}

export interface ActionItemDto extends BaseEntityDto {
  title?: string;
  status?: string;
  priority?: string;
  sourceType?: string;
  sourceId?: string;
  dueDate?: string;
  assignedTo?: string;
}

export interface CreateActionItemRequest {
  title: string;
  priority?: string;
  sourceType?: string;
  sourceId?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface UpdateActionItemRequest {
  title?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface ActionItemDigestDto {
  total: number;
  overdue: number;
  dueSoon: number;
  items: ActionItemDto[];
}

// ── Quote of the Day ──

export interface DailyQuoteDto {
  quote: string;
  author?: string;
  source?: string;
}

// ── Next Actions ──

export interface NextActionsDto {
  actions: Array<{
    id: string;
    title: string;
    titleAr?: string;
    priority: string;
    dueDate?: string;
    entityType?: string;
    entityId?: string;
  }>;
}

// ── KPI Detail ──

export interface KpiDetailDto {
  key: string;
  title: string;
  value: number;
  trend: string;
  items: Array<{ id: string; label: string; value: number; status: string }>;
}

export interface KpiCardIndicatorDto {
  key: string;
  title: string;
  value: number;
  icon: string;
  trend: string;
}

export interface KpiItemRequest {
  label: string;
  value: number;
  status?: string;
  [key: string]: unknown;
}

// ── Public Content ──

export interface PublicAgentsDto {
  agents: Array<{ id: string; name: string; description: string }>;
}

export interface PublicReportTemplatesDto {
  templates: Array<{ id: string; name: string; description: string }>;
}

export interface PublicLandingContentDto {
  agents: Array<{ id: string; name: string; description: string }>;
  painPoints: Array<{ titleEn: string; titleAr: string; descEn: string; descAr: string }>;
  chartData: Record<string, unknown>;
  capabilities: Array<{ icon: string; titleEn: string; titleAr: string; descEn: string; descAr: string }>;
}

export interface PublicCategoryLabelsDto {
  labels: Array<{ key: string; labelEn: string; labelAr: string }>;
}

export interface PublicDPIAConfigDto {
  mitigations: Array<{ controlId: string; code: string; titleEn: string; titleAr: string }>;
  lawfulBases: Array<{ value: string; labelEn: string; labelAr: string }>;
}

// ── AI Triggers ──

export interface AITriggerConfigDto {
  triggers: Array<{ id: string; event: string; action: string; enabled: boolean; config?: Record<string, unknown> }>;
}

export interface UpdateAITriggerConfigRequest {
  triggers?: Array<{ id: string; enabled: boolean; config?: Record<string, unknown> }>;
  [key: string]: unknown;
}

// ── Training Data ──

export interface TrainingStatusDto {
  status: string;
  loaded: boolean;
  recordCount: number;
}

// ── Foundation Governance ──

export interface FoundationHealthDto {
  overall: string;
  modules: Record<string, string>;
  coverage: number;
}

export interface BulkImportResultDto {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export interface BulkImportRecord {
  [key: string]: unknown;
}

export { MessageResponse };
