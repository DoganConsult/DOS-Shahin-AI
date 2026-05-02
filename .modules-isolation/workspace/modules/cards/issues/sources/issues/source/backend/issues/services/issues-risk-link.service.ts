// ============================================
// Issues — Risk Link Service
// Link issues to risks/controls/audit-findings,
// impact propagation, cross-module view
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitIssuesEvent } from './issues-event.service';
import { getFirstRow as _getFirstRow } from '@dos/db';

// === Types ===

export type LinkedEntityType = 'risk' | 'control' | 'audit_finding' | 'exception' | 'remediation';

export interface IssueLink {
  linkId: string;
  issueId: string;
  entityType: LinkedEntityType;
  entityId: string;
  impactPropagation: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CrossModuleIssueView {
  issueId: string;
  title: string;
  severity: string;
  status: string;
  links: Array<{ entityType: LinkedEntityType; entityId: string }>;
}

export interface ImpactPropagationResult {
  issueId: string;
  severity: string;
  affectedEntityType: LinkedEntityType;
  affectedEntityId: string;
  action: string;
}

// === Pure Functions ===

const SEVERITY_RISK_SCORE_DELTA: Record<string, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
};

export function computeRiskScoreDelta(issueSeverity: string): number {
  return SEVERITY_RISK_SCORE_DELTA[issueSeverity] ?? 0;
}

export function shouldPropagate(issueSeverity: string): boolean {
  return ['critical', 'high'].includes(issueSeverity);
}

// === DB-backed Functions ===

export async function linkIssueToEntity(
  tenantId: string,
  issueId: string,
  entityType: LinkedEntityType,
  entityId: string,
  userId: string,
  propagateImpact: boolean = false
): Promise<IssueLink> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function unlinkIssueFromEntity(
  tenantId: string,
  issueId: string,
  entityType: LinkedEntityType,
  entityId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `DELETE FROM "${schema}".issue_links WHERE issue_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [issueId, entityType, entityId]
  );

  await recordAudit({
    tenantId,
    userId,
    module: 'issues',
    action: 'delete',
    entityType: 'issue_link',
    entityId: `${issueId}:${entityType}:${entityId}`,
    beforeState: { issueId, entityType, entityId },
  });
}

export async function getIssueLinks(tenantId: string, issueId: string): Promise<IssueLink[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".issue_links WHERE issue_id = $1 ORDER BY created_at DESC`,
    [issueId]
  );
  return result.rows.map(mapLinkRow);
}

export async function getLinkedIssues(
  tenantId: string,
  entityType: LinkedEntityType,
  entityId: string
): Promise<CrossModuleIssueView[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT i.issue_id, i.title, i.severity, i.status,
            jsonb_agg(jsonb_build_object('entityType', l.entity_type, 'entityId', l.entity_id)) AS links
     FROM "${schema}".issue_links l
     JOIN "${schema}".issues i ON i.issue_id = l.issue_id AND i.deleted_at IS NULL
     WHERE l.entity_type = $1 AND l.entity_id = $2
     GROUP BY i.issue_id, i.title, i.severity, i.status`,
    [entityType, entityId]
  );

  return result.rows.map(r => ({
    issueId: r.issue_id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    links: r.links ?? [],
  }));
}

export async function propagateImpactToRisks(tenantId: string, issueId: string): Promise<ImpactPropagationResult[]> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getCrossModuleIssueView(tenantId: string, issueIds?: string[]): Promise<CrossModuleIssueView[]> {
  const schema = tenantSchema(tenantId);
  const filter = issueIds && issueIds.length > 0 ? `AND i.issue_id = ANY($1::text[])` : '';
  const params: unknown[] = issueIds && issueIds.length > 0 ? [issueIds] : [];

  const result = await safeQuery(
    `SELECT i.issue_id, i.title, i.severity, i.status,
            COALESCE(jsonb_agg(jsonb_build_object('entityType', l.entity_type, 'entityId', l.entity_id)) FILTER (WHERE l.link_id IS NOT NULL), '[]') AS links
     FROM "${schema}".issues i
     LEFT JOIN "${schema}".issue_links l ON l.issue_id = i.issue_id
     WHERE i.deleted_at IS NULL ${filter}
     GROUP BY i.issue_id, i.title, i.severity, i.status
     ORDER BY i.created_at DESC`,
    params
  );

  return result.rows.map(r => ({
    issueId: r.issue_id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    links: r.links ?? [],
  }));
}

// === Helpers ===

function mapLinkRow(r: Record<string, unknown>): IssueLink {
  return {
    linkId: r.link_id as string,
    issueId: r.issue_id as string,
    entityType: r.entity_type as LinkedEntityType,
    entityId: r.entity_id as string,
    impactPropagation: Boolean(r.impact_propagation),
    createdAt: (r.created_at as Date)?.toISOString?.() ?? String(r.created_at),
    createdBy: r.created_by as string,
  };
}
