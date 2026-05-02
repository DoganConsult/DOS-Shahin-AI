// ============================================
// Shahin — Digital Twin Impact Engine
// Change application, cascading effects, and org-wide impact projection
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';
import type { ScenarioDefinition, OrgWideImpactProjection } from './digital-twin.types';
import type { GenericRow } from '@dos/types';

export async function applyChange(
  tenantId: string,
  simulationId: string,
  change: {
    type: 'policy_change' | 'control_change' | 'risk_change' | 'org_structure_change';
    entityId: string;
    changes: Record<string, unknown>;
    cascade?: boolean;
  }
): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function applyScenario(
  tenantId: string,
  simulationId: string,
  scenario: ScenarioDefinition
): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Internal: Impact Computation ──────────────────────────────────────────

interface OrgStructureChangePayload {
  operation: 'add_department' | 'remove_department' | 'move_department' |
             'add_role' | 'remove_role' | 'change_reporting_line';
  unitId?: string;
  unitName?: string;
  unitType?: string;
  parentUnitId?: string;
  roleName?: string;
  metadata?: Record<string, unknown>;
}

function computeOrgWideImpact(
  snapshot: Record<string, unknown>, changes: Array<{ type: string; entityId: string; changes: Record<string, unknown>; cascade?: boolean }>, tenantId: string, scenario?: ScenarioDefinition
): OrgWideImpactProjection {
  const controls = [...((snapshot.controls as GenericRow[]) || [])];
  const risks = [...((snapshot.risks as GenericRow[]) || [])];
  const policies = [...((snapshot.policies as GenericRow[]) || [])];
  const orgStructure = (snapshot.orgStructure as GenericRow[]) || [];
  const entityLinks = (snapshot.entityLinks as GenericRow[]) || [];
  const totalControls = controls.length;
  const totalRisks = risks.length;
  const totalPolicies = policies.length;

  const controlMap = new Map(controls.map((c: GenericRow) => [c.control_id, { ...c }]));
  const riskMap = new Map(risks.map((r: GenericRow) => [r.risk_id, { ...r }]));
  const policyMap = new Map(policies.map((p: GenericRow) => [p.policy_id, { ...p }]));

  const cascadingEffects: NonNullable<OrgWideImpactProjection['orgWideMetrics']>['cascadingEffects'] = [];
  const dependencyChain: NonNullable<OrgWideImpactProjection['orgWideMetrics']>['dependencyChain'] = [];

  for (const change of changes) {
    if (change.type === 'control_change') {
      const ctrl = controlMap.get(change.entityId);
      if (ctrl) {
        Object.assign(ctrl, change.changes);
        if (change.cascade && change.changes.status) {
          const deps = findDependentEntities(change.entityId, 'control', entityLinks);
          for (const dep of deps) {
            if (dep.entityType === 'risk') {
              const risk = riskMap.get(dep.entityId);
              if (risk && (change.changes.status === 'failed' || change.changes.status === 'not_implemented')) {
                risk.likelihood = Math.min(5, (risk.likelihood || 3) + 1);
                risk.risk_score = risk.likelihood * (risk.impact || 3);
                cascadingEffects.push({ entityType: 'risk', entityId: dep.entityId, impactType: 'likelihood_increase', severity: 'medium' });
              }
            }
            dependencyChain.push({ from: { type: 'control', id: change.entityId }, to: { type: dep.entityType, id: dep.entityId }, relationship: dep.relationship || 'depends_on' });
          }
        }
      }
    } else if (change.type === 'risk_change') {
      const risk = riskMap.get(change.entityId);
      if (risk) {
        Object.assign(risk, change.changes);
        if (change.changes.likelihood != null || change.changes.impact != null) {
          risk.risk_score = (change.changes.likelihood ?? risk.likelihood) * (change.changes.impact ?? risk.impact);
        }
        if (change.cascade && (change.changes.likelihood || change.changes.impact)) {
          const deps = findDependentEntities(change.entityId, 'risk', entityLinks);
          for (const dep of deps) {
            if (dep.entityType === 'control') {
              const ctrl = controlMap.get(dep.entityId);
              if (ctrl && ctrl.status === 'implemented') {
                cascadingEffects.push({ entityType: 'control', entityId: dep.entityId, impactType: 'priority_increase', severity: 'high' });
              }
            }
            dependencyChain.push({ from: { type: 'risk', id: change.entityId }, to: { type: dep.entityType, id: dep.entityId }, relationship: dep.relationship || 'mitigates' });
          }
        }
      }
    } else if (change.type === 'policy_change') {
      const pol = policyMap.get(change.entityId);
      if (pol) Object.assign(pol, change.changes);
    } else if (change.type === 'org_structure_change') {
      applyOrgStructureChange(orgStructure, change, cascadingEffects, dependencyChain, controlMap, riskMap);
    }
  }

  const implementedBefore = controls.filter((c: GenericRow) => c.status === 'implemented').length;
  const implementedAfter = Array.from(controlMap.values()).filter((c: GenericRow) => c.status === 'implemented').length;
  const testedBefore = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const testedAfter = Array.from(controlMap.values()).filter((c: GenericRow) => c.test_status === 'passed').length;
  const complianceBefore = totalControls > 0 ? Math.round((implementedBefore / totalControls) * 100) : 0;
  const complianceAfter = totalControls > 0 ? Math.round((implementedAfter / totalControls) * 100) : 0;

  const avgRiskBefore = totalRisks > 0 ? risks.reduce((s: number, r: GenericRow) => s + (r.risk_score || r.likelihood * r.impact || 0), 0) / totalRisks : 0;
  const afterRisks = Array.from(riskMap.values());
  const avgRiskAfter = afterRisks.length > 0 ? afterRisks.reduce((s: number, r: GenericRow) => s + (r.risk_score || 0), 0) / afterRisks.length : 0;
  const criticalRisksBefore = risks.filter((r: GenericRow) => (r.risk_score || 0) >= 20).length;
  const criticalRisksAfter = afterRisks.filter((r: GenericRow) => (r.risk_score || 0) >= 20).length;

  const approvedPoliciesBefore = policies.filter((p: GenericRow) => p.status === 'approved' || p.status === 'published').length;
  const approvedPoliciesAfter = Array.from(policyMap.values()).filter((p: GenericRow) => p.status === 'approved' || p.status === 'published').length;

  const departmentsAffected = scenario?.scope === 'department' && scenario.scopeFilter?.department_id ? 1 : orgStructure.filter((u: GenericRow) => u.unit_type === 'department').length;
  const businessUnitsAffected = scenario?.scope === 'business_unit' && scenario.scopeFilter?.business_unit_id ? 1 : orgStructure.filter((u: GenericRow) => u.unit_type === 'business_unit').length;

  const scenarioMetrics = scenario ? {
    scenarioName: scenario.name, scope: scenario.scope,
    totalEntitiesInScope: computeScopeEntityCount(snapshot, scenario),
    entitiesModified: changes.length,
    coveragePercent: totalControls > 0 ? Math.round((changes.filter((c: GenericRow) => c.type === 'control_change').length / totalControls) * 100) : 0,
  } : undefined;

  return {
    complianceScoreBefore: complianceBefore, complianceScoreAfter: complianceAfter, complianceDelta: complianceAfter - complianceBefore,
    riskPosture: { avgRiskScoreBefore: Math.round(avgRiskBefore * 100) / 100, avgRiskScoreAfter: Math.round(avgRiskAfter * 100) / 100, riskDelta: Math.round((avgRiskAfter - avgRiskBefore) * 100) / 100, criticalRisksBefore, criticalRisksAfter },
    controlReadiness: { implementedBefore, implementedAfter, testedBefore, testedAfter },
    policyCoverage: { approvedBefore: approvedPoliciesBefore, approvedAfter: approvedPoliciesAfter, totalPolicies },
    changesCount: changes.length,
    controlsImpacted: changes.filter((c: GenericRow) => c.type === 'control_change').length,
    risksImpacted: changes.filter((c: GenericRow) => c.type === 'risk_change').length,
    policiesImpacted: changes.filter((c: GenericRow) => c.type === 'policy_change').length,
    overallImpactScore: Math.round(((complianceAfter - complianceBefore) * 0.4) + ((avgRiskBefore - avgRiskAfter) * 2) + ((approvedPoliciesAfter - approvedPoliciesBefore) * 5)),
    orgWideMetrics: { departmentsAffected, businessUnitsAffected, cascadingEffects, dependencyChain },
    scenarioMetrics,
  };
}

function findDependentEntities(entityId: string, entityType: string, entityLinks: GenericRow[]): Array<{ entityType: string; entityId: string; relationship?: string }> {
  return entityLinks
    .filter((link) => (link.source_entity_id === entityId && link.source_entity_type === entityType) || (link.target_entity_id === entityId && link.target_entity_type === entityType))
    .map((link) => link.source_entity_id === entityId
      ? { entityType: link.target_entity_type, entityId: link.target_entity_id, relationship: link.relationship_type }
      : { entityType: link.source_entity_type, entityId: link.source_entity_id, relationship: link.relationship_type });
}

function computeScopeEntityCount(snapshot: Record<string, unknown>, scenario: ScenarioDefinition): number {

  if (scenario.scope === 'org_wide') return (snapshot.controls?.length || 0) + (snapshot.risks?.length || 0) + (snapshot.policies?.length || 0);
  if (scenario.scope === 'department' && scenario.scopeFilter?.department_id) {

    return (snapshot.controls?.filter((c: GenericRow) => c.department_id === scenario.scopeFilter?.department_id) || []).length + (snapshot.risks?.filter((r: GenericRow) => r.department_id === scenario.scopeFilter?.department_id) || []).length;
  }
  if (scenario.scope === 'business_unit' && scenario.scopeFilter?.business_unit_id) {

    return (snapshot.controls?.filter((c: GenericRow) => c.business_unit_id === scenario.scopeFilter?.business_unit_id) || []).length + (snapshot.risks?.filter((r: GenericRow) => r.business_unit_id === scenario.scopeFilter?.business_unit_id) || []).length;
  }
  return 0;
}

function applyOrgStructureChange(
  orgStructure: GenericRow[], change: { entityId: string; changes: Record<string, unknown>; cascade?: boolean },
  cascadingEffects: Array<{ entityType: string; entityId: string; impactType: string; severity: 'low' | 'medium' | 'high' }>,
  dependencyChain: Array<{ from: { type: string; id: string }; to: { type: string; id: string }; relationship: string }>,
  controlMap: Map<string, GenericRow>, riskMap: Map<string, GenericRow>
): void {

  const payload = change.changes as OrgStructureChangePayload;
  const operation = payload.operation || 'move_department';

  switch (operation) {
    case 'add_department': {
      const newUnit = { id: payload.unitId || uuid(), unit_name: payload.unitName || 'New Department', unit_type: payload.unitType || 'department', parent_unit_id: payload.parentUnitId || null, status: 'active', _simulated: true };
      orgStructure.push(newUnit);
      cascadingEffects.push({ entityType: 'org_unit', entityId: newUnit.id, impactType: 'new_unit_requires_coverage', severity: 'medium' });
      break;
    }
    case 'remove_department': {
      const unitIdx = orgStructure.findIndex((u: GenericRow) => u.id === change.entityId || u.node_id === change.entityId);
      if (unitIdx === -1) break;
      const removedUnit = orgStructure[unitIdx];
      removedUnit._removed = true; removedUnit.status = 'removed';
      const childUnits = orgStructure.filter((u: GenericRow) => u.parent_unit_id === change.entityId || u.parent_node_id === change.entityId);
      for (const child of childUnits) {
        cascadingEffects.push({ entityType: 'org_unit', entityId: child.id || child.node_id, impactType: 'orphaned_unit_needs_reassignment', severity: 'high' });
        dependencyChain.push({ from: { type: 'org_unit', id: change.entityId }, to: { type: 'org_unit', id: child.id || child.node_id }, relationship: 'parent_removed' });
      }
      if (change.cascade) {
        for (const [ctrlId, ctrl] of Array.from(controlMap.entries())) {
          if (ctrl.department_id === change.entityId || ctrl.owner_unit_id === change.entityId) {
            cascadingEffects.push({ entityType: 'control', entityId: ctrlId, impactType: 'control_coverage_gap', severity: 'high' });
            dependencyChain.push({ from: { type: 'org_unit', id: change.entityId }, to: { type: 'control', id: ctrlId }, relationship: 'ownership_lost' });
          }
        }
        for (const [riskId, risk] of Array.from(riskMap.entries())) {
          if (risk.department_id === change.entityId || risk.owner_unit_id === change.entityId) {
            risk.likelihood = Math.min(5, (risk.likelihood || 3) + 1);
            risk.risk_score = risk.likelihood * (risk.impact || 3);
            cascadingEffects.push({ entityType: 'risk', entityId: riskId, impactType: 'risk_owner_removed', severity: 'high' });
          }
        }
      }
      break;
    }
    case 'move_department': {
      const unit = orgStructure.find((u: GenericRow) => u.id === change.entityId || u.node_id === change.entityId);
      if (!unit) break;
      const oldParent = unit.parent_unit_id || unit.parent_node_id;
      unit.parent_unit_id = payload.parentUnitId; unit.parent_node_id = payload.parentUnitId; unit._moved = true;
      cascadingEffects.push({ entityType: 'org_unit', entityId: change.entityId, impactType: 'reporting_line_changed', severity: 'medium' });
      if (oldParent) dependencyChain.push({ from: { type: 'org_unit', id: oldParent }, to: { type: 'org_unit', id: change.entityId }, relationship: 'reporting_line_removed' });
      if (payload.parentUnitId) dependencyChain.push({ from: { type: 'org_unit', id: payload.parentUnitId }, to: { type: 'org_unit', id: change.entityId }, relationship: 'reporting_line_added' });
      if (change.cascade) cascadingEffects.push({ entityType: 'org_unit', entityId: change.entityId, impactType: 'potential_sod_conflict', severity: 'medium' });
      break;
    }
    case 'change_reporting_line': {
      const sourceUnit = orgStructure.find((u: GenericRow) => u.id === change.entityId || u.node_id === change.entityId);
      if (!sourceUnit) break;
      sourceUnit.parent_unit_id = payload.parentUnitId; sourceUnit.parent_node_id = payload.parentUnitId;
      cascadingEffects.push({ entityType: 'org_unit', entityId: change.entityId, impactType: 'reporting_line_changed', severity: 'low' });
      break;
    }
    case 'add_role':
    case 'remove_role': {
      const impactType = operation === 'add_role' ? 'raci_assignment_needed' : 'raci_reassignment_needed';
      cascadingEffects.push({ entityType: 'role', entityId: change.entityId, impactType, severity: operation === 'remove_role' ? 'high' : 'low' });
      if (operation === 'remove_role' && change.cascade) {
        for (const [ctrlId, ctrl] of Array.from(controlMap.entries())) {
          if (ctrl.owner_role === payload.roleName || ctrl.responsible_role === payload.roleName) {
            cascadingEffects.push({ entityType: 'control', entityId: ctrlId, impactType: 'control_owner_role_removed', severity: 'high' });
          }
        }
      }
      break;
    }
  }
}
