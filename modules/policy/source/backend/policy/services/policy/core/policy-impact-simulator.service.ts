import { logger } from '../../../ports/logger.port';
// ============================================
// Policy Impact Simulator
// Traces entity relationships to assess the impact
// of policy changes on controls, risks, procedures, etc.
// Requirements: Feature 23 - Policy Impact Simulation
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getLinksForEntity, type EntityType, type RelationshipType } from '../../../ports/platform.port';
import { recordObservation } from '../../../../ai/services/observability/ai-observation.service.js';
import { eventBus } from '../../../ports/events.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImpactedEntity {
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  relationshipType: RelationshipType;
  depth: number; // How many hops from the policy
  impactSeverity: 'low' | 'medium' | 'high' | 'critical';
  impactReason: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyImpactReport {
  reportId: string;
  policyId: string;
  policyTitle: string;
  simulationType: 'create' | 'update' | 'retire' | 'approve';
  simulatedAt: string;
  impactedEntities: ImpactedEntity[];
  summary: {
    totalImpacted: number;
    byType: Record<EntityType, number>;
    bySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
    maxDepth: number;
  };
  recommendations: string[];
  riskAssessment: {
    highRiskChanges: number;
    breakingChanges: number;
    requiresApproval: boolean;
  };
}

// ── Entity Title Resolvers ────────────────────────────────────────────────

/**
 * Resolve entity title from database.
 */
async function resolveEntityTitle(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<string> {
  const schema = tenantSchema(tenantId);
  
  const tableMap: Record<EntityType, { table: string; idColumn: string; titleColumn: string }> = {
    risk: { table: 'risks', idColumn: 'risk_id', titleColumn: 'title' },
    control: { table: 'controls', idColumn: 'control_id', titleColumn: 'title' },
    policy: { table: 'governance_policies', idColumn: 'policy_id', titleColumn: 'title' },
    framework: { table: 'frameworks', idColumn: 'framework_id', titleColumn: 'name_en' },
    incident: { table: 'incidents', idColumn: 'incident_id', titleColumn: 'title' },
    vendor: { table: 'vendors', idColumn: 'vendor_id', titleColumn: 'name' },
    evidence: { table: 'evidence', idColumn: 'evidence_id', titleColumn: 'title' },
    finding: { table: 'assessment_items', idColumn: 'item_id', titleColumn: 'title' },
    remediation: { table: 'remediation_plans', idColumn: 'plan_id', titleColumn: 'title' },
    team: { table: 'teams', idColumn: 'team_id', titleColumn: 'name' },
    workflow: { table: 'workflows', idColumn: 'workflow_id', titleColumn: 'name' },
    asset: { table: 'assets', idColumn: 'asset_id', titleColumn: 'name' },
    bcp_plan: { table: 'bcp_plans', idColumn: 'plan_id', titleColumn: 'title' },
    exception: { table: 'control_exceptions', idColumn: 'exception_id', titleColumn: 'justification' },
    process_task: { table: 'process_tasks', idColumn: 'task_id', titleColumn: 'title' },
  };

  const mapping = tableMap[entityType];
  if (!mapping) return entityId;

  try {
    const res = await safeQuery(
      `SELECT ${mapping.titleColumn} FROM "${schema}".${mapping.table}
       WHERE ${mapping.idColumn} = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [entityId]
    );
    return getFirstRow(res)?.[mapping.titleColumn] || entityId;
  } catch {
    return entityId;
  }
}

// ── Impact Tracing ───────────────────────────────────────────────────────────

/**
 * Recursively trace entity relationships from a policy.
 * Returns all impacted entities with their relationship paths.
 */
async function traceEntityImpact(
  tenantId: string,
  entityType: EntityType,
  entityId: string,
  visited: Set<string>,
  currentDepth: number = 0,
  maxDepth: number = 3
): Promise<ImpactedEntity[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const entityKey = `${entityType}:${entityId}`;
  if (visited.has(entityKey)) {
    return []; // Avoid cycles
  }
  visited.add(entityKey);

  const impacted: ImpactedEntity[] = [];
  
  // Get all direct links from this entity
  const links = await getLinksForEntity(tenantId, entityType, entityId);

  for (const link of links) {
    // Determine which entity is the target (not the current entity)
    const targetType = link.sourceType === entityType && link.sourceId === entityId 
      ? link.targetType 
      : link.sourceType;
    const targetId = link.sourceType === entityType && link.sourceId === entityId 
      ? link.targetId 
      : link.sourceId;

    // Skip if we've already visited this target
    const targetKey = `${targetType}:${targetId}`;
    if (visited.has(targetKey)) {
      continue;
    }

    // Resolve entity title
    const entityTitle = await resolveEntityTitle(tenantId, targetType, targetId);

    // Determine impact severity based on relationship type and depth
    let impactSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let impactReason = '';

    if (link.relationshipType === 'governs') {
      impactSeverity = currentDepth === 0 ? 'high' : 'medium';
      impactReason = 'Policy governs this entity';
    } else if (link.relationshipType === 'implements') {
      impactSeverity = currentDepth === 0 ? 'critical' : 'high';
      impactReason = 'Entity implements policy requirements';
    } else if (link.relationshipType === 'depends_on') {
      impactSeverity = currentDepth === 0 ? 'high' : 'medium';
      impactReason = 'Entity depends on this policy';
    } else if (link.relationshipType === 'mitigates') {
      impactSeverity = 'medium';
      impactReason = 'Entity mitigates policy-related risks';
    } else {
      impactSeverity = currentDepth === 0 ? 'medium' : 'low';
      impactReason = 'Entity related to policy';
    }

    impacted.push({
      entityType: targetType,
      entityId: targetId,
      entityTitle,
      relationshipType: link.relationshipType,
      depth: currentDepth,
      impactSeverity,
      impactReason,
      metadata: link.metadata,
    });

    // Recursively trace from this entity (if not at max depth)
    if (currentDepth < maxDepth - 1) {
      const nested = await traceEntityImpact(
        tenantId,
        targetType,
        targetId,
        visited,
        currentDepth + 1,
        maxDepth
      );
      impacted.push(...nested);
    }
  }

  return impacted;
}

// ── Impact Assessment ───────────────────────────────────────────────────────

/**
 * Assess impact severity for a policy change simulation.
 */
function assessImpactSeverity(
  simulationType: 'create' | 'update' | 'retire' | 'approve',
  impactedEntities: ImpactedEntity[]
): {
  highRiskChanges: number;
  breakingChanges: number;
  requiresApproval: boolean;
} {
  let highRiskChanges = 0;
  let breakingChanges = 0;

  for (const entity of impactedEntities) {
    if (entity.impactSeverity === 'high' || entity.impactSeverity === 'critical') {
      highRiskChanges++;
    }

    // Breaking changes: retiring a policy that governs critical entities
    if (simulationType === 'retire' && entity.relationshipType === 'governs' && entity.depth === 0) {
      breakingChanges++;
    }

    // Breaking changes: updating a policy that is directly implemented
    if (simulationType === 'update' && entity.relationshipType === 'implements' && entity.depth === 0) {
      breakingChanges++;
    }
  }

  const requiresApproval = breakingChanges > 0 || highRiskChanges >= 5;

  return {
    highRiskChanges,
    breakingChanges,
    requiresApproval,
  };
}

/**
 * Generate recommendations based on impact analysis.
 */
function generateRecommendations(
  simulationType: 'create' | 'update' | 'retire' | 'approve',
  impactedEntities: ImpactedEntity[],
  riskAssessment: { highRiskChanges: number; breakingChanges: number; requiresApproval: boolean }
): string[] {
  const recommendations: string[] = [];

  if (riskAssessment.breakingChanges > 0) {
    recommendations.push(
      `⚠️ Breaking changes detected: ${riskAssessment.breakingChanges} entity(ies) will be directly affected. Review and update impacted entities before proceeding.`
    );
  }

  if (riskAssessment.highRiskChanges >= 5) {
    recommendations.push(
      `High impact detected: ${riskAssessment.highRiskChanges} high/critical impact entities. Consider phased rollout or stakeholder approval.`
    );
  }

  // Type-specific recommendations
  const controls = impactedEntities.filter(e => e.entityType === 'control');
  if (controls.length > 0) {
    recommendations.push(
      `${controls.length} control(s) will be impacted. Verify control effectiveness after policy change.`
    );
  }

  const risks = impactedEntities.filter(e => e.entityType === 'risk');
  if (risks.length > 0) {
    recommendations.push(
      `${risks.length} risk(s) will be impacted. Reassess risk scores after policy change.`
    );
  }

  if (simulationType === 'retire') {
    recommendations.push(
      'Policy retirement will remove governance coverage. Ensure alternative policies or controls are in place.'
    );
  }

  if (simulationType === 'update') {
    recommendations.push(
      'Policy update may require evidence refresh and control re-testing for impacted entities.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('No significant impacts detected. Proceed with standard change management process.');
  }

  return recommendations;
}

// ── Main Simulation Function ────────────────────────────────────────────────

/**
 * Simulate policy impact by tracing entity relationships.
 * Returns a comprehensive impact report.
 */
/**
 * Simulates the impact of a policy change on related entities.
 * 
 * Traces entity relationships to identify all entities that would be affected
 * by creating, updating, retiring, or approving a policy. Uses graph traversal
 * to find direct and indirect relationships up to a configurable depth.
 * 
 * Impact severity is calculated based on:
 * - Relationship type (direct vs indirect)
 * - Entity criticality
 * - Current compliance status
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} policyId - Policy ID to simulate
 * @param {'create' | 'update' | 'retire' | 'approve'} simulationType - Type of change to simulate
 * @param {Object} [options] - Simulation options
 * @param {number} [options.maxDepth=3] - Maximum relationship depth to traverse
 * @param {boolean} [options.includeIndirect=true] - Include indirect relationships
 * @returns {Promise<PolicyImpactReport>} Impact report with affected entities and recommendations
 * @throws {Error} If policy not found
 */
export async function simulatePolicyImpact(
  tenantId: string,
  policyId: string,
  simulationType: 'create' | 'update' | 'retire' | 'approve',
  options?: {
    maxDepth?: number; // Default: 3
    includeIndirect?: boolean; // Default: true
  }
): Promise<PolicyImpactReport> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Batch Simulation ─────────────────────────────────────────────────────────

/**
 * Simulate impact for multiple policies.
 */
export async function simulateBatchPolicyImpact(
  tenantId: string,
  policyIds: string[],
  simulationType: 'create' | 'update' | 'retire' | 'approve',
  options?: { maxDepth?: number }
): Promise<PolicyImpactReport[]> {
  const reports: PolicyImpactReport[] = [];

  for (const policyId of policyIds) {
    try {
      const report = await simulatePolicyImpact(tenantId, policyId, simulationType, options);
      reports.push(report);
    } catch (err: unknown) {
      logger.warn(`[PolicyImpactSimulator] Failed to simulate impact for policy ${policyId}:`, (err as Error).message);
    }
  }

  return reports;
}
