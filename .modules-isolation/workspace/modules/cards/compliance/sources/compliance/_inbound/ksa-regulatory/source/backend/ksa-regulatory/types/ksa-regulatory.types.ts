export interface RegulatoryObligation {
  id: string;
  tenant_id: string;
  title: string;
  title_ar?: string;
  description?: string;
  regulatory_authority: string;
  framework_code?: string;
  due_date?: string;
  status: ObligationStatus;
  priority?: ObligationPriority;
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at?: string | null;
}

export type ObligationStatus = 'draft' | 'active' | 'compliant' | 'non_compliant' | 'waived' | 'archived';
export const OBLIGATION_STATUSES: readonly ObligationStatus[] = ['draft', 'active', 'compliant', 'non_compliant', 'waived', 'archived'] as const;

export type ObligationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RegulatoryChange {
  id: string;
  title: string;
  authority: string;
  change_type: 'new_regulation' | 'amendment' | 'guidance' | 'circular' | 'enforcement';
  effective_date: string;
  impact_assessment?: string;
  summary?: string;
  status: string;
  created_at: string;
}

export interface ReadinessSnapshot {
  id: string;
  tenant_id: string;
  snapshot_data: Record<string, unknown>;
  overall_score: number;
  scored_at: string;
  created_at: string;
}

export interface FrameworkMapping {
  id: string;
  source_framework: string;
  target_framework: string;
  control_id: string;
  mapped_control_id: string;
  mapping_strength: 'exact' | 'partial' | 'related';
}

export interface SectorMaturityResult {
  dimensions: MaturityDimension[];
  overallScore: number;
  overallLevel: number;
  assessedAt: string;
}

export interface MaturityDimension {
  key: string;
  name: string;
  nameAr: string;
  score: number;
  level: 1 | 2 | 3 | 4 | 5;
  levelLabel: string;
  indicators: Record<string, number>;
  maxScore: number;
}

export interface KsaRegulatoryEventPayload {
  tenantId: string;
  entityType: 'obligation' | 'regulatory_change' | 'readiness_snapshot' | 'framework_mapping';
  entityId: string;
  moduleCode: 'ksa-regulatory';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: string;
  newState?: string;
  data: Record<string, unknown>;
}
