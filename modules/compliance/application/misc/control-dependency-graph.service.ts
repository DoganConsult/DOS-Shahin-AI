// Shahin - Control Dependency Graph Service
// Priority 11: Control-to-Control Dependency Graph
// Builds DAG from entity_links where relationship_type='depends_on'
// When control.failed fires, traverses downstream and auto-flags dependent controls

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { GenericRow } from '@dos/types';

// ============================================================================
// Types
// ============================================================================

export interface ControlDependencyNode {
  controlId: string;
  controlName?: string;
  effectivenessRating?: string;
  depth: number; // Distance from root in dependency chain
}

export interface ControlDependencyEdge {
  sourceControlId: string;
  targetControlId: string;
  relationshipType: 'depends_on';
}

export interface ControlDependencyGraph {
  nodes: ControlDependencyNode[];
  edges: ControlDependencyEdge[];
  rootControlId: string;
}

export interface DownstreamCascadeResult {
  flaggedControls: string[];
  skippedControls: string[]; // Already low/ineffective
  errors: string[];
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Builds a dependency graph for a given control.
 * Returns all controls that depend on this control (downstream).
 */
export async function buildControlDependencyGraph(
  tenantId: string,
  rootControlId: string,
  maxDepth: number = 10
): Promise<ControlDependencyGraph> {
  const schema = tenantSchema(tenantId);
  
  // Get all controls for metadata
  const controlsResult = await safeQuery(
    `SELECT control_id, title, effectiveness_rating 
     FROM "${schema}".controls 
     WHERE control_id = $1 OR control_id IN (
       SELECT DISTINCT target_id 
       FROM "${schema}".entity_links 
       WHERE source_type = 'control' 
         AND source_id = $1 
         AND relationship_type = 'depends_on'
         AND target_type = 'control'
     )`,
    [rootControlId]
  );
  
  const controlMap = new Map<string, { title?: string; effectivenessRating?: string }>();
  controlsResult.rows.forEach((row: GenericRow) => {
    controlMap.set(row.control_id, {
      title: row.title,
      effectivenessRating: row.effectiveness_rating,
    });
  });

  // Build graph using recursive CTE to traverse dependencies
  // Note: entity_links uses UUID for source_id/target_id, but control_id is VARCHAR(128)
  // We cast UUID to text for comparison
  const graphResult = await safeQuery(
    `WITH RECURSIVE dependency_tree AS (
       -- Base case: the root control
       SELECT 
         $1::text AS control_id,
         0 AS depth,
         ARRAY[$1::text] AS path
       
       UNION ALL
       
       -- Recursive case: find controls that depend on current control
       SELECT 
         el.target_id::text,
         dt.depth + 1,
         dt.path || el.target_id::text
       FROM "${schema}".entity_links el
       INNER JOIN dependency_tree dt ON el.source_id::text = dt.control_id
       WHERE el.source_type = 'control'
         AND el.target_type = 'control'
         AND el.relationship_type = 'depends_on'
         AND dt.depth < $2
         AND NOT (el.target_id::text = ANY(dt.path)) -- Prevent cycles
     )
     SELECT DISTINCT control_id, depth 
     FROM dependency_tree
     ORDER BY depth, control_id`,
    [rootControlId, maxDepth]
  );

  // Collect all control IDs in the graph
  const allControlIds = [rootControlId, ...graphResult.rows.map((row: GenericRow) => row.control_id)];

  // Get all dependency edges for controls in the graph
  // Cast UUID columns to text for comparison with VARCHAR control_id
  const edgesResult = await safeQuery(
    `SELECT source_id::text AS source_id, target_id::text AS target_id, relationship_type
     FROM "${schema}".entity_links
     WHERE source_type = 'control'
       AND target_type = 'control'
       AND relationship_type = 'depends_on'
       AND (source_id::text = ANY($1) AND target_id::text = ANY($1))`,
    [allControlIds]
  );

  const nodes: ControlDependencyNode[] = [];
  const nodeIds = new Set<string>();
  
  // Add root node
  const rootMeta = controlMap.get(rootControlId) || {};
  nodes.push({
    controlId: rootControlId,
    controlName: rootMeta.title,
    effectivenessRating: rootMeta.effectivenessRating,
    depth: 0,
  });
  nodeIds.add(rootControlId);

  // Add dependent nodes
  graphResult.rows.forEach((row: GenericRow) => {
    if (!nodeIds.has(row.control_id)) {
      const meta = controlMap.get(row.control_id) || {};
      nodes.push({
        controlId: row.control_id,
        controlName: meta.title,
        effectivenessRating: meta.effectivenessRating,
        depth: row.depth,
      });
      nodeIds.add(row.control_id);
    }
  });

  const edges: ControlDependencyEdge[] = edgesResult.rows.map((row: GenericRow) => ({
    sourceControlId: row.source_id,
    targetControlId: row.target_id,
    relationshipType: 'depends_on',
  }));

  return {
    nodes,
    edges,
    rootControlId,
  };
}

/**
 * Gets all downstream controls that depend on a given control.
 * Used for cascading effectiveness updates when a control fails.
 */
export async function getDownstreamControls(
  tenantId: string,
  sourceControlId: string,
  maxDepth: number = 10
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  
  // Cast UUID to text for comparison with VARCHAR control_id
  const result = await safeQuery(
    `WITH RECURSIVE downstream AS (
       SELECT $1::text AS control_id, 0 AS depth
       
       UNION ALL
       
       SELECT el.target_id::text, d.depth + 1
       FROM "${schema}".entity_links el
       INNER JOIN downstream d ON el.source_id::text = d.control_id
       WHERE el.source_type = 'control'
         AND el.target_type = 'control'
         AND el.relationship_type = 'depends_on'
         AND d.depth < $2
     )
     SELECT DISTINCT control_id 
     FROM downstream 
     WHERE control_id != $1
     ORDER BY control_id`,
    [sourceControlId, maxDepth]
  );

  return result.rows.map((row: GenericRow) => row.control_id);
}

/**
 * Cascades control failure to downstream dependent controls.
 * Flags all dependent controls with effectiveness_rating='low' and emits events.
 */
export async function cascadeControlFailure(
  tenantId: string,
  failedControlId: string,
  reason: string = 'upstream_control_failed'
): Promise<DownstreamCascadeResult> {
  const schema = tenantSchema(tenantId);
  const flaggedControls: string[] = [];
  const skippedControls: string[] = [];
  const errors: string[] = [];

  try {
    // Get all downstream controls
    const downstreamIds = await getDownstreamControls(tenantId, failedControlId);
    
    if (downstreamIds.length === 0) {
      return { flaggedControls, skippedControls, errors };
    }

    // Get current effectiveness ratings for downstream controls
    const currentRatings = await safeQuery(
      `SELECT control_id, effectiveness_rating, title
       FROM "${schema}".controls
       WHERE control_id = ANY($1)`,
      [downstreamIds]
    );

    const controlsToFlag: string[] = [];
    const controlTitles = new Map<string, string>();
    const fromRatings = new Map<string, string>(); // Store from_rating before update

    currentRatings.rows.forEach((row: GenericRow) => {
      controlTitles.set(row.control_id, row.title || row.control_id);
      fromRatings.set(row.control_id, row.effectiveness_rating || 'adequate');
      
      // Only flag if not already low or ineffective
      if (row.effectiveness_rating !== 'low' && row.effectiveness_rating !== 'ineffective') {
        controlsToFlag.push(row.control_id);
      } else {
        skippedControls.push(row.control_id);
      }
    });

    // Update effectiveness_rating to 'low' for all dependent controls
    if (controlsToFlag.length > 0) {
      await safeQuery(
        `UPDATE "${schema}".controls
         SET effectiveness_rating = 'low',
             effectiveness_updated_at = NOW(),
             effectiveness_updated_by = 'agrc-os'
         WHERE control_id = ANY($1)
           AND effectiveness_rating NOT IN ('low', 'ineffective')`,
        [controlsToFlag]
      );

      // Log effectiveness changes
      for (const controlId of controlsToFlag) {
        try {
          await safeQuery(
            `INSERT INTO "${schema}".control_effectiveness_log
             (control_id, from_rating, to_rating, reason, changed_by)
             VALUES ($1, $2, 'low', $3, 'agrc-os')`,
            [controlId, fromRatings.get(controlId) || 'adequate', `${reason}: upstream control ${failedControlId} failed`]
          );
        } catch (err) {
          errors.push(`Failed to log effectiveness change for ${controlId}: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Emit control.effectiveness_low event for each flagged control
        try {
          await eventBus.publish(({
                      eventType: 'control.effectiveness_low',
                      tenantId,
                      sourceService: 'control-dependency-graph',
                      entityType: 'control',
                      entityId: controlId,
                      severity: 'warning',
                      payload: {
                        controlId,
                        controlName: controlTitles.get(controlId) || controlId,
                        reason: 'cascade_from_failed_control',
                        upstreamControlId: failedControlId,
                      },
                    } as any));
        } catch (err) {
          errors.push(`Failed to emit event for ${controlId}: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Record audit
        try {
          await recordAudit({
            tenantId,
            userId: 'agrc-os',
            module: 'control_dependency',
            action: 'update',
            entityType: 'control',
            entityId: controlId,
            beforeState: { effectivenessRating: 'adequate' },
            afterState: { effectivenessRating: 'low', reason: 'cascade_from_failed_control' },
          });
        } catch (_err) {
          // Non-fatal: audit logging failure
        }

        flaggedControls.push(controlId);
      }
    }

    return { flaggedControls, skippedControls, errors };
  } catch (err) {
    errors.push(`Cascade failure error: ${err instanceof Error ? err.message : String(err)}`);
    return { flaggedControls, skippedControls, errors };
  }
}

/**
 * Gets the full dependency graph for visualization.
 * Returns nodes and edges formatted for entity-graph component.
 */
export async function getControlDependencyGraphForVisualization(
  tenantId: string,
  rootControlId: string,
  maxDepth: number = 5
): Promise<{
  nodes: Array<{ id: string; type: string; title: string; status?: string; linkCount: number }>;
  edges: Array<{ source: string; target: string; relationshipType: string }>;
}> {
  const graph = await buildControlDependencyGraph(tenantId, rootControlId, maxDepth);
  const schema = tenantSchema(tenantId);

  // Get control titles and statuses
  const controlIds = graph.nodes.map(n => n.controlId);
  if (controlIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  const controlsResult = await safeQuery(
    `SELECT control_id, title, status, effectiveness_rating,
            (SELECT COUNT(*) FROM "${schema}".entity_links 
             WHERE (source_type = 'control' AND source_id = controls.control_id)
                OR (target_type = 'control' AND target_id = controls.control_id)) as link_count
     FROM "${schema}".controls
     WHERE control_id = ANY($1)`,
    [controlIds]
  );

  const controlMap = new Map<string, unknown>();
  controlsResult.rows.forEach((row: GenericRow) => {
    controlMap.set(row.control_id, {
      title: row.title || row.control_id,
      status: row.status,
      effectivenessRating: row.effectiveness_rating,
      linkCount: parseInt(row.link_count || '0', 10),
    });
  });

  const nodes = graph.nodes.map(node => {
    const meta = controlMap.get(node.controlId) || {};
    return {
      id: node.controlId,
      type: 'control',

      title: meta.title || node.controlId,

      status: meta.effectivenessRating || meta.status,

      linkCount: meta.linkCount || 0,
    };
  });

  const edges = graph.edges.map(edge => ({
    source: edge.sourceControlId,
    target: edge.targetControlId,
    relationshipType: edge.relationshipType,
  }));

  return { nodes, edges };
}
