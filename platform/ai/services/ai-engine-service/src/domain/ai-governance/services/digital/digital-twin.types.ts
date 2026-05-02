import { safeQuery } from "@dos/db";

// ============================================
// Shahin -- Digital Twin Types
// Type definitions for digital twin simulation
// and org-wide impact modeling
// ============================================

/**
 * Scenario definition for org-wide modeling
 */
export interface ScenarioDefinition {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description?: string;
  /** Scope: 'org_wide' | 'department' | 'business_unit' | 'control_family' */
  scope: string;
  /** Scope filter (department_id, business_unit_id, etc.) */
  scopeFilter?: Record<string, unknown>;
  /** Changes to apply */
  changes: Array<{
    type: 'policy_change' | 'control_change' | 'risk_change' | 'org_structure_change';
    entityId: string;
    changes: Record<string, unknown>;
    cascade?: boolean; // Apply cascading effects
  }>;
  /** Include dependencies */
  includeDependencies?: boolean;
}

/**
 * Extended impact projection with org-wide metrics
 */
export interface OrgWideImpactProjection {
  // Existing metrics
  complianceScoreBefore: number;
  complianceScoreAfter: number;
  complianceDelta: number;
  riskPosture: {
    avgRiskScoreBefore: number;
    avgRiskScoreAfter: number;
    riskDelta: number;
    criticalRisksBefore: number;
    criticalRisksAfter: number;
  };
  controlReadiness: {
    implementedBefore: number;
    implementedAfter: number;
    testedBefore: number;
    testedAfter: number;
  };
  policyCoverage: {
    approvedBefore: number;
    approvedAfter: number;
    totalPolicies: number;
  };
  changesCount: number;
  controlsImpacted: number;
  risksImpacted: number;
  policiesImpacted: number;
  overallImpactScore: number;

  // New org-wide metrics
  orgWideMetrics?: {
    departmentsAffected: number;
    businessUnitsAffected: number;
    cascadingEffects: Array<{
      entityType: string;
      entityId: string;
      impactType: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    dependencyChain: Array<{
      from: { type: string; id: string };
      to: { type: string; id: string };
      relationship: string;
    }>;
  };
  scenarioMetrics?: {
    scenarioName: string;
    scope: string;
    totalEntitiesInScope: number;
    entitiesModified: number;
    coveragePercent: number;
  };
}

/**
 * Supported org structure change operations:
 * - add_department: Add a new department/unit to the simulated org structure
 * - remove_department: Remove a department and reassign its controls/risks
 * - move_department: Move a department under a new parent (change reporting line)
 * - add_role: Add a new role within a department
 * - remove_role: Remove a role and track RACI reassignment needs
 * - change_reporting_line: Modify reporting relationships between units
 */
export interface OrgStructureChangePayload {
  operation: 'add_department' | 'remove_department' | 'move_department' |
             'add_role' | 'remove_role' | 'change_reporting_line';
  /** For add: new unit details; for remove/move: target unit_id */
  unitId?: string;
  /** New department/unit name (for add operations) */
  unitName?: string;
  /** Unit type: department, division, branch, subsidiary */
  unitType?: string;
  /** Parent unit ID (for add/move operations) */
  parentUnitId?: string;
  /** Role name (for add_role/remove_role) */
  roleName?: string;
  /** Additional metadata for the change */
  metadata?: Record<string, unknown>;
}

/**
 * Result of an AI-powered org structure impact analysis
 */
export interface OrgStructureImpactAnalysis {
  simulationId: string;
  beforeState: {
    totalUnits: number;
    totalDepartments: number;
    maxDepth: number;
    controlCoverage: number;
  };
  afterState: {
    totalUnits: number;
    totalDepartments: number;
    maxDepth: number;
    controlCoverage: number;
  };
  diff: {
    unitsAdded: number;
    unitsRemoved: number;
    unitsMoved: number;
    rolesChanged: number;
  };
  affectedUsers: number;
  raciChanges: number;
  controlCoverageChanges: number;
  sodConflictsIntroduced: number;
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    recommendations: string[];
    complianceImpactAreas: string[];
  };
}
