// ============================================
// AI-Governance — Digital Twin Org Analysis Service
// Organization structure impact analysis for
// digital twin simulations: scenario comparison,
// org snapshots, and change impact modeling.
// Owner: Product — ai-governance module (Law 2)
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import type {
  OrgStructureChangePayload,
  OrgStructureImpactAnalysis,
} from './digital-twin.types';

// ── Types ──────────────────────────────────────────────────────────

export interface ChangeScenario {
  name: string;
  description?: string;
  changes: OrgStructureChangePayload[];
}

export interface OrgUnit {
  unitId: string;
  unitName: string;
  unitType: string;
  parentUnitId: string | null;
  depth: number;
  controlCount: number;
  riskCount: number;
  userCount: number;
}

export interface OrgSnapshot {
  tenantId: string;
  capturedAt: string;
  units: OrgUnit[];
  totalUnits: number;
  totalDepartments: number;
  maxDepth: number;
  controlCoverage: number;
}

export interface ScenarioComparison {
  scenarioA: ChangeScenario;
  scenarioB: ChangeScenario;
  impactA: OrgStructureImpactAnalysis;
  impactB: OrgStructureImpactAnalysis;
  recommendation: string;
  preferredScenario: 'A' | 'B' | 'neutral';
  comparisonDetails: {
    riskDelta: number;
    controlCoverageDelta: number;
    sodConflictDelta: number;
    userImpactDelta: number;
  };
}

// ── Org Structure Snapshot ─────────────────────────────────────────

/**
 * Capture the current organizational structure for a tenant,
 * including unit hierarchy, control/risk/user counts per unit.
 */
export async function getOrgStructureSnapshot(tenantId: string): Promise<OrgSnapshot> {
  const schema = tenantSchema(tenantId);

  let units: OrgUnit[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT
         ou.unit_id,
         ou.unit_name,
         ou.unit_type,
         ou.parent_unit_id,
         ou.depth,
         COALESCE(cc.control_count, 0)::int AS control_count,
         COALESCE(rc.risk_count, 0)::int AS risk_count,
         COALESCE(uc.user_count, 0)::int AS user_count
       FROM "${schema}".org_units ou
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS control_count
         FROM "${schema}".controls c
         WHERE c.org_unit_id = ou.unit_id AND c.deleted_at IS NULL
       ) cc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS risk_count
         FROM "${schema}".risks r
         WHERE r.org_unit_id::text = ou.unit_id::text AND r.deleted_at IS NULL
       ) rc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS user_count
         FROM "${schema}".user_org_assignments uoa
         WHERE uoa.org_unit_id = ou.unit_id
       ) uc ON TRUE
       WHERE ou.deleted_at IS NULL
       ORDER BY ou.depth ASC, ou.unit_name ASC`,
    );

    units = rows.map((r: GenericRow) => ({
      unitId: r.unit_id,
      unitName: r.unit_name,
      unitType: r.unit_type || 'department',
      parentUnitId: r.parent_unit_id || null,
      depth: Number(r.depth) || 0,
      controlCount: r.control_count || 0,
      riskCount: r.risk_count || 0,
      userCount: r.user_count || 0,
    }));
  } catch (err: unknown) {
    logger.warn(`[DigitalTwinOrg] Could not query org_units: ${String(err)}`);
  }

  const maxDepth = units.reduce((max, u) => Math.max(max, u.depth), 0);
  const _totalControls = units.reduce((sum, u) => sum + u.controlCount, 0);
  const unitsWithControls = units.filter((u) => u.controlCount > 0).length;
  const controlCoverage = units.length > 0
    ? Math.round((unitsWithControls / units.length) * 100)
    : 0;

  return {
    tenantId,
    capturedAt: new Date().toISOString(),
    units,
    totalUnits: units.length,
    totalDepartments: units.filter((u) => u.unitType === 'department').length,
    maxDepth,
    controlCoverage,
  };
}

// ── Analyze Org Impact ─────────────────────────────────────────────

/**
 * Simulate the impact of an organizational change scenario.
 * Returns before/after state comparison, affected users,
 * RACI changes, and SoD conflict assessment.
 */
export async function analyzeOrgImpact(
  tenantId: string,
  changeScenario: ChangeScenario,
): Promise<OrgStructureImpactAnalysis> {
  const schema = tenantSchema(tenantId);
  const snapshot = await getOrgStructureSnapshot(tenantId);

  let unitsAdded = 0;
  let unitsRemoved = 0;
  let unitsMoved = 0;
  let rolesChanged = 0;
  let affectedUsers = 0;
  let raciChanges = 0;
  let controlCoverageChanges = 0;
  let sodConflictsIntroduced = 0;
  const complianceImpactAreas: string[] = [];
  const recommendations: string[] = [];

  for (const change of changeScenario.changes) {
    switch (change.operation) {
      case 'add_department': {
        unitsAdded++;
        recommendations.push(
          `New unit "${change.unitName || change.unitId}" requires control assignment and RACI mapping`,
        );
        break;
      }
      case 'remove_department': {
        unitsRemoved++;
        const unit = snapshot.units.find((u) => u.unitId === change.unitId);
        if (unit) {
          affectedUsers += unit.userCount;
          controlCoverageChanges += unit.controlCount;
          raciChanges += unit.controlCount + unit.riskCount;
          if (unit.controlCount > 0) {
            complianceImpactAreas.push(
              `Controls from ${unit.unitName} must be reassigned (${unit.controlCount} controls)`,
            );
          }
        }
        recommendations.push(
          `Removing "${unit?.unitName || change.unitId}" requires control/risk reassignment plan`,
        );
        break;
      }
      case 'move_department': {
        unitsMoved++;
        const movedUnit = snapshot.units.find((u) => u.unitId === change.unitId);
        if (movedUnit) {
          affectedUsers += movedUnit.userCount;
          raciChanges += movedUnit.controlCount;
        }
        recommendations.push(
          `Moving department changes reporting lines — verify delegation chains`,
        );
        break;
      }
      case 'add_role': {
        rolesChanged++;
        // Check for potential SoD conflicts with existing roles
        try {
          const { rows: existingRoles } = await safeQuery(
            `SELECT role_name, permissions
             FROM "${schema}".functional_roles
             WHERE org_unit_id = $1 AND deleted_at IS NULL`,
            [change.unitId],
          );
          if (existingRoles.length > 3) {
            sodConflictsIntroduced++;
            complianceImpactAreas.push(
              `Adding role "${change.roleName}" to a unit with ${existingRoles.length} existing roles — SoD review required`,
            );
          }
        } catch { /* non-fatal */ }
        break;
      }
      case 'remove_role': {
        rolesChanged++;
        try {
          const { rows: affectedAssignments } = await safeQuery(
            `SELECT COUNT(*)::int AS cnt
             FROM "${schema}".user_role_assignments
             WHERE role_name = $1 AND deleted_at IS NULL`,
            [change.roleName],
          );
          const cnt = affectedAssignments[0]?.cnt || 0;
          affectedUsers += cnt;
          raciChanges += cnt;
        } catch { /* non-fatal */ }
        recommendations.push(
          `Removing role "${change.roleName}" requires RACI reassignment`,
        );
        break;
      }
      case 'change_reporting_line': {
        unitsMoved++;
        raciChanges++;
        recommendations.push(
          'Reporting line change may affect delegation chains and approval workflows',
        );
        break;
      }
    }
  }

  // Calculate after-state metrics
  const afterTotalUnits = snapshot.totalUnits + unitsAdded - unitsRemoved;
  const afterDepartments = snapshot.totalDepartments
    + changeScenario.changes.filter((c) => c.operation === 'add_department').length
    - changeScenario.changes.filter((c) => c.operation === 'remove_department').length;
  const afterControlCoverage = afterTotalUnits > 0
    ? Math.max(0, snapshot.controlCoverage - Math.round((controlCoverageChanges / Math.max(afterTotalUnits, 1)) * 100))
    : 0;

  // Risk assessment
  const totalImpact = affectedUsers + raciChanges + controlCoverageChanges + sodConflictsIntroduced;
  let overallRisk: 'low' | 'medium' | 'high' | 'critical';
  if (totalImpact > 50 || sodConflictsIntroduced > 3) overallRisk = 'critical';
  else if (totalImpact > 20 || sodConflictsIntroduced > 1) overallRisk = 'high';
  else if (totalImpact > 5) overallRisk = 'medium';
  else overallRisk = 'low';

  return {
    simulationId: `org-sim-${Date.now()}`,
    beforeState: {
      totalUnits: snapshot.totalUnits,
      totalDepartments: snapshot.totalDepartments,
      maxDepth: snapshot.maxDepth,
      controlCoverage: snapshot.controlCoverage,
    },
    afterState: {
      totalUnits: afterTotalUnits,
      totalDepartments: afterDepartments,
      maxDepth: snapshot.maxDepth + (unitsAdded > 0 ? 1 : 0),
      controlCoverage: afterControlCoverage,
    },
    diff: {
      unitsAdded,
      unitsRemoved,
      unitsMoved,
      rolesChanged,
    },
    affectedUsers,
    raciChanges,
    controlCoverageChanges,
    sodConflictsIntroduced,
    riskAssessment: {
      overallRisk,
      summary: `Scenario "${changeScenario.name}" affects ${affectedUsers} users with ${raciChanges} RACI changes. Risk level: ${overallRisk}.`,
      recommendations,
      complianceImpactAreas,
    },
  };
}

// ── Compare Scenarios ──────────────────────────────────────────────

/**
 * Run two change scenarios and compare their organizational impact,
 * producing a recommendation for the preferred approach.
 */
export async function compareScenarios(
  tenantId: string,
  scenarioA: ChangeScenario,
  scenarioB: ChangeScenario,
): Promise<ScenarioComparison> {
  const [impactA, impactB] = await Promise.all([
    analyzeOrgImpact(tenantId, scenarioA),
    analyzeOrgImpact(tenantId, scenarioB),
  ]);

  const riskRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const riskDelta =
    riskRank[impactA.riskAssessment.overallRisk] - riskRank[impactB.riskAssessment.overallRisk];
  const controlCoverageDelta =
    impactA.afterState.controlCoverage - impactB.afterState.controlCoverage;
  const sodConflictDelta =
    impactA.sodConflictsIntroduced - impactB.sodConflictsIntroduced;
  const userImpactDelta = impactA.affectedUsers - impactB.affectedUsers;

  // Score: lower is better (fewer risks, fewer affected users, fewer SoD conflicts)
  const scoreA = riskRank[impactA.riskAssessment.overallRisk] * 10
    + impactA.sodConflictsIntroduced * 5
    + impactA.affectedUsers
    - impactA.afterState.controlCoverage;
  const scoreB = riskRank[impactB.riskAssessment.overallRisk] * 10
    + impactB.sodConflictsIntroduced * 5
    + impactB.affectedUsers
    - impactB.afterState.controlCoverage;

  let preferredScenario: 'A' | 'B' | 'neutral';
  let recommendation: string;

  if (Math.abs(scoreA - scoreB) < 3) {
    preferredScenario = 'neutral';
    recommendation = 'Both scenarios have similar impact profiles. Choose based on strategic priorities.';
  } else if (scoreA < scoreB) {
    preferredScenario = 'A';
    recommendation = `Scenario "${scenarioA.name}" is preferred — lower risk (${impactA.riskAssessment.overallRisk}) with fewer affected users (${impactA.affectedUsers}).`;
  } else {
    preferredScenario = 'B';
    recommendation = `Scenario "${scenarioB.name}" is preferred — lower risk (${impactB.riskAssessment.overallRisk}) with fewer affected users (${impactB.affectedUsers}).`;
  }

  return {
    scenarioA,
    scenarioB,
    impactA,
    impactB,
    recommendation,
    preferredScenario,
    comparisonDetails: {
      riskDelta,
      controlCoverageDelta,
      sodConflictDelta,
      userImpactDelta,
    },
  };
}
