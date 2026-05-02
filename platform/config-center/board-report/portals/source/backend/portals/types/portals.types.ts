export interface Portal {
  portal_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  portal_type: string;
  theme?: string;
  domain?: string;
  logo_url?: string;
  enabled: boolean;
  allowed_modules?: string[];
  branding?: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at?: string | null;
}

export interface PortalCreateInput {
  tenant_id: string;
  name: string;
  description?: string;
  portal_type: string;
  theme?: string;
  domain?: string;
  logo_url?: string;
  enabled: boolean;
  allowed_modules?: string[];
  branding?: Record<string, unknown>;
  created_by: string;
}

export interface PortalUpdateInput {
  name?: string;
  description?: string;
  portal_type?: string;
  theme?: string;
  domain?: string;
  logo_url?: string;
  enabled?: boolean;
  allowed_modules?: string[];
  branding?: Record<string, unknown>;
  updated_by: string;
}

export interface PortalListFilter {
  portal_type?: string;
  enabled?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface PortalListResult {
  rows: Portal[];
  total: number;
}

export type PortalsStatus = 'draft' | 'published' | 'active' | 'suspended' | 'archived';

export const PORTALS_STATUSES: readonly PortalsStatus[] = ['draft', 'published', 'active', 'suspended', 'archived'] as const;



export type PortalsSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const PORTALS_SOURCES: readonly PortalsSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type PortalsStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface PortalsEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'portals';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: PortalsStatus;
  newState?: PortalsStatus;
  data: Record<string, unknown>;
}
