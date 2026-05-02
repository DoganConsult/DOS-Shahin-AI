// ============================================
// Shahin — Report Drill-Down Service
// Deep navigation hierarchy for infinite-depth drill-down
// Supports navigation from summary → detail → sub-detail → ...
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

// === Types ===

export interface DrillDownNode {
  nodeId: string;
  nodeType: 'summary' | 'framework' | 'domain' | 'control' | 'evidence' | 'risk' | 'finding' | 'assessment';
  title: string;
  titleAr?: string;
  parentId?: string;
  path: string[]; // Breadcrumb path
  data: unknown;
  children?: DrillDownNode[];
  hasChildren: boolean;
  metadata?: {
    count?: number;
    score?: number;
    status?: string;
    severity?: string;
    lastUpdated?: string;
  };
}

export interface DrillDownRequest {
  tenantId: string;
  nodeId?: string;
  nodeType?: string;
  parentPath?: string[];
  filters?: Record<string, unknown>;
  depth?: number; // Max depth to fetch (default: 1)
}

export interface DrillDownResponse {
  node: DrillDownNode;
  siblings?: DrillDownNode[]; // Sibling nodes at same level
  breadcrumbs: Array<{ id: string; title: string; path: string[] }>;
  canGoDeeper: boolean;
}

// === Node data fetchers ===

/**
 * Fetch node data based on type and ID.
 */
async function fetchNodeData(
  tenantId: string,
  nodeType: string,
  nodeId: string,
  filters?: Record<string, unknown>
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  switch (nodeType) {
    case 'summary':
      // Root summary — aggregate all frameworks
      const frameworks = await safeQuery(
        `SELECT framework_id, name_en, name_ar FROM "${schema}".frameworks WHERE active = true`,
        []
      );
      const complianceSummary = await safeQuery(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
          COUNT(*) FILTER (WHERE status = 'partially_compliant') as partially_compliant,
          COUNT(*) FILTER (WHERE status = 'non_compliant') as non_compliant,
          COUNT(*) FILTER (WHERE status = 'not_assessed') as not_assessed
         FROM "${schema}".tenant_controls`,
        []
      );
      return {
        frameworks: frameworks.rows,
        summary: getFirstRow(complianceSummary) || {},
      };

    case 'framework':
      // Framework detail — domains and overall score
      const framework = await safeQuery(
        `SELECT * FROM "${schema}".frameworks WHERE framework_id = $1`,
        [nodeId]
      );
      const domains = await safeQuery(
        `SELECT DISTINCT domain FROM "${schema}".controls WHERE framework_id = $1`,
        [nodeId]
      );
      const frameworkControls = await safeQuery(
        `SELECT control_id, title_en, title_ar, status, score
         FROM "${schema}".tenant_controls
         WHERE framework_id = $1
         LIMIT 100`,
        [nodeId]
      );
      return {
        framework: getFirstRow(framework),
        domains: domains.rows.map((r) => r.domain),
        controls: frameworkControls.rows,
        totalControls: frameworkControls.rows.length,
      };

    case 'domain':
      // Domain detail — control families and controls
      const domainControls = await safeQuery(
        `SELECT control_id, title_en, title_ar, status, score, family
         FROM "${schema}".tenant_controls
         WHERE framework_id = $1 AND domain = $2
         ORDER BY family, control_id`,
        [filters?.frameworkId, nodeId]
      );
      const families = Array.from(new Set(domainControls.rows.map((r) => r.family))).filter(Boolean);
      return {
        domain: nodeId,
        frameworkId: filters?.frameworkId,
        families,
        controls: domainControls.rows,
        totalControls: domainControls.rows.length,
      };

    case 'control':
      // Control detail — evidence, tests, findings
      const control = await safeQuery(
        `SELECT * FROM "${schema}".tenant_controls WHERE control_id = $1`,
        [nodeId]
      );
      const evidence = await safeQuery(
        `SELECT evidence_id, title, collected_at, status, quality_tier
         FROM "${schema}".evidence
         WHERE control_id = $1
         ORDER BY collected_at DESC
         LIMIT 20`,
        [nodeId]
      );
      const findings = await safeQuery(
        `SELECT finding_id, title, severity, status, due_date
         FROM "${schema}".findings
         WHERE control_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [nodeId]
      );
      return {
        control: getFirstRow(control),
        evidence: evidence.rows,
        findings: findings.rows,
        evidenceCount: evidence.rows.length,
        findingsCount: findings.rows.length,
      };

    case 'evidence':
      // Evidence detail — versions, custody, linked controls
      const evidenceDetail = await safeQuery(
        `SELECT * FROM "${schema}".evidence WHERE evidence_id = $1`,
        [nodeId]
      );
      const evidenceVersions = await safeQuery(
        `SELECT version, collected_at, collected_by, hash
         FROM "${schema}".evidence_versions
         WHERE evidence_id = $1
         ORDER BY version DESC`,
        [nodeId]
      );
      const linkedControls = await safeQuery(
        `SELECT control_id, title_en, title_ar
         FROM "${schema}".tenant_controls
         WHERE control_id IN (
           SELECT control_id FROM "${schema}".evidence_control_map WHERE evidence_id = $1
         )`,
        [nodeId]
      );
      return {
        evidence: getFirstRow(evidenceDetail),
        versions: evidenceVersions.rows,
        linkedControls: linkedControls.rows,
      };

    case 'risk':
      // Risk detail — treatments, KRIs, linked controls
      const risk = await safeQuery(
        `SELECT * FROM "${schema}".risks WHERE risk_id = $1`,
        [nodeId]
      );
      const treatments = await safeQuery(
        `SELECT * FROM "${schema}".remediation_tasks WHERE risk_id = $1 ORDER BY due_date`,
        [nodeId]
      );
      const linkedControlsRisk = await safeQuery(
        `SELECT control_id, title_en, title_ar
         FROM "${schema}".tenant_controls
         WHERE control_id IN (
           SELECT control_id FROM "${schema}".risk_control_map WHERE risk_id = $1
         )`,
        [nodeId]
      );
      return {
        risk: getFirstRow(risk),
        treatments: treatments.rows,
        linkedControls: linkedControlsRisk.rows,
      };

    case 'finding':
      // Finding detail — remediation, evidence, status
      const finding = await safeQuery(
        `SELECT * FROM "${schema}".findings WHERE finding_id = $1`,
        [nodeId]
      );
      const remediation = await safeQuery(
        `SELECT * FROM "${schema}".remediation_tasks WHERE finding_id = $1 ORDER BY due_date`,
        [nodeId]
      );
      return {
        finding: getFirstRow(finding),
        remediation: remediation.rows,
      };

    case 'assessment':
      // Assessment detail — scope, results, findings
      const assessment = await safeQuery(
        `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`,
        [nodeId]
      );
      const assessmentResults = await safeQuery(
        `SELECT control_id, test_result, evidence_count, notes
         FROM "${schema}".assessment_results
         WHERE assessment_id = $1`,
        [nodeId]
      );
      return {
        assessment: getFirstRow(assessment),
        results: assessmentResults.rows,
      };

    default:
      return {};
  }
}

/**
 * Build child nodes for a given parent node.
 */
async function buildChildNodes(
  tenantId: string,
  parentNode: DrillDownNode,
  filters?: Record<string, unknown>
): Promise<DrillDownNode[]> {
  const children: DrillDownNode[] = [];
  const schema = tenantSchema(tenantId);

  switch (parentNode.nodeType) {
    case 'summary':
      // Children: frameworks
      const frameworks = await safeQuery(
        `SELECT framework_id, name_en, name_ar FROM "${schema}".frameworks WHERE active = true`,
        []
      );
      for (const fw of frameworks.rows) {
        const frameworkData = await fetchNodeData(tenantId, 'framework', fw.framework_id, filters);
        children.push({
          nodeId: fw.framework_id,
          nodeType: 'framework',
          title: fw.name_en,
          titleAr: fw.name_ar,
          parentId: parentNode.nodeId,
          path: [...parentNode.path, fw.framework_id],
          data: frameworkData,
          hasChildren: true,
          metadata: {

            count: frameworkData.totalControls || 0,
          },
        });
      }
      break;

    case 'framework':
      // Children: domains

      const domains = parentNode.data.domains || [];
      for (const domain of domains) {
        const domainData = await fetchNodeData(tenantId, 'domain', domain, {
          ...filters,
          frameworkId: parentNode.nodeId,
        });
        children.push({
          nodeId: domain,
          nodeType: 'domain',
          title: domain,
          parentId: parentNode.nodeId,
          path: [...parentNode.path, domain],
          data: domainData,
          hasChildren: true,
          metadata: {

            count: domainData.totalControls || 0,
          },
        });
      }
      break;

    case 'domain':
      // Children: controls

      const controls = parentNode.data.controls || [];
      for (const ctrl of controls.slice(0, 50)) {
        // Limit to 50 for performance
        const controlData = await fetchNodeData(tenantId, 'control', ctrl.control_id, filters);
        children.push({
          nodeId: ctrl.control_id,
          nodeType: 'control',
          title: ctrl.title_en,
          titleAr: ctrl.title_ar,
          parentId: parentNode.nodeId,
          path: [...parentNode.path, ctrl.control_id],
          data: controlData,

          hasChildren: controlData.evidenceCount > 0 || controlData.findingsCount > 0,
          metadata: {

            count: controlData.evidenceCount + controlData.findingsCount,
            score: ctrl.score,
            status: ctrl.status,
          },
        });
      }
      break;

    case 'control':
      // Children: evidence and findings

      const evidence = parentNode.data.evidence || [];
      for (const ev of evidence) {
        children.push({
          nodeId: ev.evidence_id,
          nodeType: 'evidence',
          title: ev.title,
          parentId: parentNode.nodeId,
          path: [...parentNode.path, ev.evidence_id],
          data: { evidenceId: ev.evidence_id },
          hasChildren: true, // Evidence can have versions
          metadata: {
            status: ev.status,
            lastUpdated: ev.collected_at,
          },
        });
      }

      const findings = parentNode.data.findings || [];
      for (const finding of findings) {
        children.push({
          nodeId: finding.finding_id,
          nodeType: 'finding',
          title: finding.title,
          parentId: parentNode.nodeId,
          path: [...parentNode.path, finding.finding_id],
          data: { findingId: finding.finding_id },
          hasChildren: true, // Findings can have remediation
          metadata: {
            severity: finding.severity,
            status: finding.status,
          },
        });
      }
      break;

    // Add more cases as needed for evidence, risk, finding, assessment
  }

  return children;
}

// === Main API ===

/**
 * Get drill-down node with children.
 */
export async function getDrillDownNode(
  request: DrillDownRequest
): Promise<DrillDownResponse> {
  const _schema = tenantSchema(request.tenantId);
  const nodeType = request.nodeType || 'summary';
  const nodeId = request.nodeId || 'root';

  // Build breadcrumbs from path
  const breadcrumbs: Array<{ id: string; title: string; path: string[] }> = [];
  if (request.parentPath && request.parentPath.length > 0) {
    // Reconstruct breadcrumbs by fetching parent nodes
    for (let i = 0; i < request.parentPath.length; i++) {
      const pathId = request.parentPath[i];
      // Simplified: would need to fetch actual titles
      breadcrumbs.push({
        id: pathId,
        title: `Level ${i + 1}`,
        path: request.parentPath.slice(0, i + 1),
      });
    }
  }

  // Fetch node data
  const nodeData = await fetchNodeData(request.tenantId, nodeType, nodeId, request.filters);

  // Build node
  const node: DrillDownNode = {
    nodeId,
    nodeType: nodeType as any,

    title: nodeData.title || nodeData.name_en || nodeId,

    titleAr: nodeData.name_ar,
    parentId: request.parentPath?.[request.parentPath.length - 1],
    path: request.parentPath || [nodeId],
    data: nodeData,
    hasChildren: false, // Will be determined below
  };

  // Fetch children if depth > 0
  const depth = request.depth || 1;
  if (depth > 0) {
    const children = await buildChildNodes(request.tenantId, node, request.filters);
    node.children = children;
    node.hasChildren = children.length > 0;
  } else {
    // Check if children exist without fetching
    node.hasChildren = await checkHasChildren(request.tenantId, nodeType, nodeId);
  }

  // Fetch siblings if parent exists
  let siblings: DrillDownNode[] | undefined;
  if (node.parentId) {
    // Would need parent node type to fetch siblings
    // Simplified for now
  }

  return {
    node,
    siblings,
    breadcrumbs,
    canGoDeeper: node.hasChildren,
  };
}

/**
 * Check if a node has children without fetching them.
 */
async function checkHasChildren(
  tenantId: string,
  nodeType: string,
  nodeId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  switch (nodeType) {
    case 'summary':
      const fwCount = await safeQuery(
        `SELECT COUNT(*) FROM "${schema}".frameworks WHERE active = true`,
        []
      );
      return (getFirstRow(fwCount)?.count || 0) > 0;

    case 'framework':
      const domainCount = await safeQuery(
        `SELECT COUNT(DISTINCT domain) FROM "${schema}".controls WHERE framework_id = $1`,
        [nodeId]
      );
      return (getFirstRow(domainCount)?.count || 0) > 0;

    case 'domain':
      const controlCount = await safeQuery(
        `SELECT COUNT(*) FROM "${schema}".tenant_controls WHERE framework_id = $1 AND domain = $2`,
        [nodeId, nodeId] // Would need frameworkId from context
      );
      return (getFirstRow(controlCount)?.count || 0) > 0;

    case 'control':
      const evidenceCount = await safeQuery(
        `SELECT COUNT(*) FROM "${schema}".evidence WHERE control_id = $1`,
        [nodeId]
      );
      const findingCount = await safeQuery(
        `SELECT COUNT(*) FROM "${schema}".findings WHERE control_id = $1`,
        [nodeId]
      );
      return (getFirstRow(evidenceCount)?.count || 0) > 0 || (getFirstRow(findingCount)?.count || 0) > 0;

    default:
      return false;
  }
}

/**
 * Navigate to a specific path in the drill-down hierarchy.
 */
export async function navigateToPath(
  tenantId: string,
  path: string[],
  filters?: Record<string, unknown>
): Promise<DrillDownResponse> {
  if (path.length === 0) {
    return getDrillDownNode({ tenantId, nodeType: 'summary', nodeId: 'root', filters });
  }

  // Determine node type from path position (simplified)
  const nodeTypes = ['summary', 'framework', 'domain', 'control', 'evidence', 'finding'];
  const nodeType = nodeTypes[Math.min(path.length - 1, nodeTypes.length - 1)] || 'summary';
  const nodeId = path[path.length - 1];

  return getDrillDownNode({
    tenantId,
    nodeId,
    nodeType,
    parentPath: path.slice(0, -1),
    filters,
    depth: 1, // Fetch one level of children
  });
}
