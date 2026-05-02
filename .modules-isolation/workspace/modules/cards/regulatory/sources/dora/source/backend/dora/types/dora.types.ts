export type DoraStatus = 'draft' | 'active' | 'under_review' | 'archived';

export interface DoraEventPayload {
  entityId: string;
  entityType: string;
  tenantId: string;
  action: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}

export type DoraSource = 'user' | 'system' | 'ai' | 'integration';
export type DoraStatusReason = 'created' | 'updated' | 'archived' | 'escalated' | 'resolved';
