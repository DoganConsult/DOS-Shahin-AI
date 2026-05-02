export interface Evidence {
  evidence_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  evidence_type: string;
  status: string;
  source: string;
  collector_id?: string;
  collected_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface EvidenceCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  evidence_type: string;
  status: string;
  source: string;
  collector_id?: string;
  collected_at?: string;
  expires_at?: string;
  created_by: string;
}

export interface EvidenceUpdateInput {
  
  title: string;
  description?: string;
  evidence_type: string;
  status: string;
  source: string;
  collector_id?: string;
  collected_at?: string;
  expires_at?: string;
  updated_by: string;
}

export interface EvidenceListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface EvidenceListResult {
  rows: Evidence[];
  total: number;
}

export type EvidenceStatus =
  | 'requested' | 'collecting' | 'uploaded' | 'under_review' | 'verified'
  | 'locked' | 'released' | 'archived' | 'rejected_quality'
  | 'pending' | 'collected' | 'expired' | 'rejected';

export const EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  'requested', 'collecting', 'uploaded', 'under_review', 'verified',
  'locked', 'released', 'archived', 'rejected_quality',
  'pending', 'collected', 'expired', 'rejected',
] as const;



export type EvidenceSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const EVIDENCE_SOURCES: readonly EvidenceSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type EvidenceStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface EvidenceEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'evidence';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: EvidenceStatus;
  newState?: EvidenceStatus;
  data: Record<string, unknown>;
}
