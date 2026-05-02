// ============================================
// Compliance Heat Map by Business Unit
// Priority 18: Cross-reference business units → departments → team RACI assignments → controls → control effectiveness
// Produce BU×framework matrix with color-coded compliance scores
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getControlEvidenceQualityAverage } from "../../../../evidence/services/analysis/evidence-quality-scoring.service.js";
import { getFirstRow } from '@dos/db';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface ComplianceHeatMapCell {
  businessUnitId: string | null;
  businessUnitName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  frameworkId: string;
  frameworkName: string;
  totalControls: number;
  implementedControls: number;
  effectiveControls: number;
  complianceScore: number; // 0-100
  maturityLevel: 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimized';
  criticalGaps: number;
  openFindings: number;
}

export interface ComplianceHeatMapResult {
  groupBy: 'business_unit' | 'department';
  frameworks: Array<{
    frameworkId: string;
    frameworkName: string;
  }>;
  cells: ComplianceHeatMapCell[];
  summary: {
    totalBusinessUnits: number;
    totalDepartments: number;
    totalFrameworks: number;
    averageComplianceScore: number;
  };
}

// ═══════════════════════════════════════════════════════════════════
// Core Function: Compute Compliance Heat Map
// ═══════════════════════════════════════════════════════════════════

/**
 * Priority 18: Compliance Heat Map by Business Unit
 *
 * Cross-references:
 * - business_units → departments → teams → team_raci_assignments (scope_type='control') → controls
 * - OR controls directly via controls.department_id / controls.business_unit_id
 * - Controls → frameworks (via frameworks TEXT[], framework_id, or mapped_frameworks JSONB)
 * - Control effectiveness (from controls.test_status + evidence quality)
 *
 * Produces a BU×framework matrix with color-coded compliance scores.
 */
export async function computeComplianceHeatMap(
  tenantId: string,
  options?: {
    groupBy?: 'business_unit' | 'department';
    includeInactive?: boolean;
    frameworkFilter?: string[]; // framework IDs to include
  }
): Promise<ComplianceHeatMapResult> {
  const schema = tenantSchema(tenantId);
  const groupBy = options?.groupBy || 'business_unit';
  const _includeInactive = options?.includeInactive || false;

  // Step 1: Get all active frameworks
  const frameworksRes = await safeQuery(
    `SELECT framework_id, name, category
     FROM "${schema}".frameworks
     WHERE deleted_at IS NULL
     ${options?.frameworkFilter ? `AND framework_id = ANY($1::text[])` : ''}
     ORDER BY name`,
    options?.frameworkFilter ? [options.frameworkFilter] : []
  );
  const frameworks = frameworksRes.rows;

  // Step 2: Build the heatmap matrix
  // Strategy: Query controls with their organizational unit and framework mappings
  const cells: ComplianceHeatMapCell[] = [];

  if (groupBy === 'business_unit') {
    // Group by Business Unit
    const buRes = await safeQuery(
      `SELECT bu.business_unit_id, bu.name AS bu_name
       FROM "${schema}".business_units bu
       WHERE bu.deleted_at IS NULL
       ORDER BY bu.name`
    );

    for (const bu of buRes.rows) {
      for (const fw of frameworks) {
        // Query controls for this BU and framework
        // Controls can be linked directly via business_unit_id, or via departments within this BU
        const controlsRes = await safeQuery(
          `SELECT c.control_id, c.test_status, c.status, c.frameworks, c.framework_id, c.mapped_frameworks
           FROM "${schema}".controls c
           LEFT JOIN "${schema}".departments d ON c.department_id = d.department_id
           WHERE c.deleted_at IS NULL
             AND (
               c.business_unit_id = $1
               OR (c.department_id IS NOT NULL AND d.business_unit_id = $1)
               OR (
                 -- Fallback: via RACI assignments
                 EXISTS (
                   SELECT 1 FROM "${schema}".team_raci_assignments tra
                   JOIN "${schema}".teams t ON tra.team_id = t.team_id
                   JOIN "${schema}".departments d2 ON t.department_id = d2.department_id
                   WHERE tra.scope_type = 'control'
                     AND tra.scope_id = c.control_id::text
                     AND d2.business_unit_id = $1
                 )
               )
             )
             AND (
               -- Match framework via frameworks array, framework_id, or mapped_frameworks JSONB
               $2 = ANY(c.frameworks)
               OR c.framework_id = $2
               OR (c.mapped_frameworks::jsonb ? $2)
             )`,
          [bu.business_unit_id, fw.framework_id]
        );

        const controls = controlsRes.rows;
        const totalControls = controls.length;
        let implementedControls = 0;
        let effectiveControls = 0;
        let totalScore = 0;
        let criticalGaps = 0;

        // Calculate control effectiveness per control
        for (const ctrl of controls) {
          if (ctrl.status === 'implemented' || ctrl.status === 'effective') {
            implementedControls++;
          }

          let baseScore = 50; // default
          if (ctrl.test_status === 'effective' || ctrl.test_status === 'passed') {
            baseScore = 100;
            effectiveControls++;
          } else if (ctrl.test_status === 'partially_effective' || ctrl.test_status === 'partial') {
            baseScore = 70;
          } else if (ctrl.test_status === 'ineffective' || ctrl.test_status === 'failed') {
            baseScore = 30;
          } else if (ctrl.test_status === 'not_tested') {
            baseScore = 50;
          }

          // Factor in evidence quality
          try {
            const evidenceQuality = await getControlEvidenceQualityAverage(tenantId, ctrl.control_id);
            if (evidenceQuality.evidenceCount > 0) {
              if (evidenceQuality.tier === 'A') {
                baseScore = Math.min(100, baseScore + 5);
              } else if (evidenceQuality.tier === 'C') {
                baseScore = Math.max(0, baseScore - 10);
              }
            } else {
              baseScore = Math.max(0, baseScore - 5);
            }
          } catch {
            // If evidence quality scoring fails, use base score only
          }

          totalScore += baseScore;
        }

        const complianceScore = totalControls > 0 ? Math.round((totalScore / totalControls) * 100) / 100 : 0;

        // Get critical gaps (findings) for this BU and framework
        const gapsRes = await safeQuery(
          `SELECT COUNT(*)::int AS critical_count
           FROM "${schema}".findings f
           LEFT JOIN "${schema}".departments d ON f.department_id = d.department_id
           WHERE f.deleted_at IS NULL
             AND f.status NOT IN ('closed', 'resolved')
             AND f.severity = 'critical'
             AND (
               f.business_unit_id = $1
               OR (f.department_id IS NOT NULL AND d.business_unit_id = $1)
             )
             AND (
               -- Link finding to framework via control if possible
               EXISTS (
                 SELECT 1 FROM "${schema}".controls c2
                 WHERE c2.control_id = f.source_id
                   AND (
                     $2 = ANY(c2.frameworks)
                     OR c2.framework_id = $2
                     OR (c2.mapped_frameworks::jsonb ? $2)
                   )
               )
               OR f.source_type = 'framework'
             )`,
          [bu.business_unit_id, fw.framework_id]
        );
        criticalGaps = parseInt(getFirstRow(gapsRes)?.critical_count, 10) || 0;

        // Get open findings count
        const findingsRes = await safeQuery(
          `SELECT COUNT(*)::int AS open_count
           FROM "${schema}".findings f
           LEFT JOIN "${schema}".departments d ON f.department_id = d.department_id
           WHERE f.deleted_at IS NULL
             AND f.status NOT IN ('closed', 'resolved')
             AND (
               f.business_unit_id = $1
               OR (f.department_id IS NOT NULL AND d.business_unit_id = $1)
             )
             AND (
               EXISTS (
                 SELECT 1 FROM "${schema}".controls c2
                 WHERE c2.control_id = f.source_id
                   AND (
                     $2 = ANY(c2.frameworks)
                     OR c2.framework_id = $2
                     OR (c2.mapped_frameworks::jsonb ? $2)
                   )
               )
               OR f.source_type = 'framework'
             )`,
          [bu.business_unit_id, fw.framework_id]
        );
        const openFindings = parseInt(getFirstRow(findingsRes)?.open_count, 10) || 0;

        // Determine maturity level
        const maturityLevel = computeMaturityLevel(complianceScore, effectiveControls, totalControls);

        cells.push({
          businessUnitId: bu.business_unit_id,
          businessUnitName: bu.bu_name,
          departmentId: null,
          departmentName: null,
          frameworkId: fw.framework_id,
          frameworkName: fw.name,
          totalControls,
          implementedControls,
          effectiveControls,
          complianceScore,
          maturityLevel,
          criticalGaps,
          openFindings,
        });
      }
    }
  } else {
    // Group by Department
    const deptRes = await safeQuery(
      `SELECT d.department_id, d.name AS dept_name, d.business_unit_id, bu.name AS bu_name
       FROM "${schema}".departments d
       LEFT JOIN "${schema}".business_units bu ON d.business_unit_id = bu.business_unit_id
       WHERE d.deleted_at IS NULL
       ORDER BY bu.name, d.name`
    );

    for (const dept of deptRes.rows) {
      for (const fw of frameworks) {
        // Query controls for this department and framework
        const controlsRes = await safeQuery(
          `SELECT c.control_id, c.test_status, c.status, c.frameworks, c.framework_id, c.mapped_frameworks
           FROM "${schema}".controls c
           WHERE c.deleted_at IS NULL
             AND (
               c.department_id = $1
               OR (
                 -- Fallback: via RACI assignments
                 EXISTS (
                   SELECT 1 FROM "${schema}".team_raci_assignments tra
                   JOIN "${schema}".teams t ON tra.team_id = t.team_id
                   WHERE tra.scope_type = 'control'
                     AND tra.scope_id = c.control_id::text
                     AND t.department_id = $1
                 )
               )
             )
             AND (
               $2 = ANY(c.frameworks)
               OR c.framework_id = $2
               OR (c.mapped_frameworks::jsonb ? $2)
             )`,
          [dept.department_id, fw.framework_id]
        );

        const controls = controlsRes.rows;
        const totalControls = controls.length;
        let implementedControls = 0;
        let effectiveControls = 0;
        let totalScore = 0;
        let criticalGaps = 0;

        for (const ctrl of controls) {
          if (ctrl.status === 'implemented' || ctrl.status === 'effective') {
            implementedControls++;
          }

          let baseScore = 50;
          if (ctrl.test_status === 'effective' || ctrl.test_status === 'passed') {
            baseScore = 100;
            effectiveControls++;
          } else if (ctrl.test_status === 'partially_effective' || ctrl.test_status === 'partial') {
            baseScore = 70;
          } else if (ctrl.test_status === 'ineffective' || ctrl.test_status === 'failed') {
            baseScore = 30;
          } else if (ctrl.test_status === 'not_tested') {
            baseScore = 50;
          }

          try {
            const evidenceQuality = await getControlEvidenceQualityAverage(tenantId, ctrl.control_id);
            if (evidenceQuality.evidenceCount > 0) {
              if (evidenceQuality.tier === 'A') {
                baseScore = Math.min(100, baseScore + 5);
              } else if (evidenceQuality.tier === 'C') {
                baseScore = Math.max(0, baseScore - 10);
              }
            } else {
              baseScore = Math.max(0, baseScore - 5);
            }
          } catch {
            // Ignore evidence quality errors
          }

          totalScore += baseScore;
        }

        const complianceScore = totalControls > 0 ? Math.round((totalScore / totalControls) * 100) / 100 : 0;

        // Get critical gaps and open findings
        const gapsRes = await safeQuery(
          `SELECT COUNT(*)::int AS critical_count
           FROM "${schema}".findings f
           WHERE f.deleted_at IS NULL
             AND f.status NOT IN ('closed', 'resolved')
             AND f.severity = 'critical'
             AND f.department_id = $1
             AND (
               EXISTS (
                 SELECT 1 FROM "${schema}".controls c2
                 WHERE c2.control_id = f.source_id
                   AND (
                     $2 = ANY(c2.frameworks)
                     OR c2.framework_id = $2
                     OR (c2.mapped_frameworks::jsonb ? $2)
                   )
               )
               OR f.source_type = 'framework'
             )`,
          [dept.department_id, fw.framework_id]
        );
        criticalGaps = parseInt(getFirstRow(gapsRes)?.critical_count, 10) || 0;

        const findingsRes = await safeQuery(
          `SELECT COUNT(*)::int AS open_count
           FROM "${schema}".findings f
           WHERE f.deleted_at IS NULL
             AND f.status NOT IN ('closed', 'resolved')
             AND f.department_id = $1
             AND (
               EXISTS (
                 SELECT 1 FROM "${schema}".controls c2
                 WHERE c2.control_id = f.source_id
                   AND (
                     $2 = ANY(c2.frameworks)
                     OR c2.framework_id = $2
                     OR (c2.mapped_frameworks::jsonb ? $2)
                   )
               )
               OR f.source_type = 'framework'
             )`,
          [dept.department_id, fw.framework_id]
        );
        const openFindings = parseInt(getFirstRow(findingsRes)?.open_count, 10) || 0;

        const maturityLevel = computeMaturityLevel(complianceScore, effectiveControls, totalControls);

        cells.push({
          businessUnitId: dept.business_unit_id || null,
          businessUnitName: dept.bu_name || null,
          departmentId: dept.department_id,
          departmentName: dept.dept_name,
          frameworkId: fw.framework_id,
          frameworkName: fw.name,
          totalControls,
          implementedControls,
          effectiveControls,
          complianceScore,
          maturityLevel,
          criticalGaps,
          openFindings,
        });
      }
    }
  }

  // Calculate summary statistics
  const uniqueBUs = new Set(cells.map(c => c.businessUnitId).filter(Boolean));
  const uniqueDepts = new Set(cells.map(c => c.departmentId).filter(Boolean));
  const avgScore = cells.length > 0
    ? Math.round((cells.reduce((sum, c) => sum + c.complianceScore, 0) / cells.length) * 100) / 100
    : 0;

  return {
    groupBy,
    frameworks: frameworks.map(fw => ({
      frameworkId: fw.framework_id,
      frameworkName: fw.name,
    })),
    cells,
    summary: {
      totalBusinessUnits: uniqueBUs.size,
      totalDepartments: uniqueDepts.size,
      totalFrameworks: frameworks.length,
      averageComplianceScore: avgScore,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute maturity level based on compliance score and control effectiveness.
 * Uses SAMA/industry alignment: Initial → Developing → Defined → Managed → Optimized
 */
function computeMaturityLevel(
  complianceScore: number,
  effectiveControls: number,
  totalControls: number
): 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimized' {
  const effectivenessRate = totalControls > 0 ? (effectiveControls / totalControls) * 100 : 0;
  const combinedScore = (complianceScore * 0.6) + (effectivenessRate * 0.4);

  if (combinedScore >= 81) return 'Optimized';
  if (combinedScore >= 61) return 'Managed';
  if (combinedScore >= 41) return 'Defined';
  if (combinedScore >= 21) return 'Developing';
  return 'Initial';
}
