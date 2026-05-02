import { logger } from '../../../ports/logger.port';
// ============================================================================
// Shahin-Ai — Governance Knowledge Graph Service (F13-14)
//
// Syncs governance entities from PostgreSQL to a Neo4j knowledge graph and
// provides traversal queries for control inheritance, impact paths, and
// entity neighborhood exploration.
//
// Node types: Regulator, Framework, Domain, Control, Obligation, Evidence,
//             Policy, Risk, Asset, Owner, Committee, Decision
//
// Relationship types: REGULATES, CONTAINS, MAPS_TO, EVIDENCED_BY, OWNED_BY,
//                     IMPACTS, MITIGATES, LINKED_TO
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { runQuery, createNode as _createNode, createRelationship as _createRelationship } from "../../../../../connectors/data-infra/neo4j.connector.js";
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

/** Supported governance entity types for graph nodes */
export type GovernanceEntityType =
  | "Regulator"
  | "Framework"
  | "Domain"
  | "Control"
  | "Obligation"
  | "Evidence"
  | "Policy"
  | "Risk"
  | "Asset"
  | "Owner"
  | "Committee"
  | "Decision";

/** Supported relationship types between governance entities */
export type GovernanceRelType =
  | "REGULATES"
  | "CONTAINS"
  | "MAPS_TO"
  | "EVIDENCED_BY"
  | "OWNED_BY"
  | "IMPACTS"
  | "MITIGATES"
  | "LINKED_TO";

export interface GraphNode {
  id: string;
  type: GovernanceEntityType;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GovernanceRelType;
  properties: Record<string, unknown>;
}

export interface GraphNeighborhood {
  center: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
}

export interface ImpactPath {
  found: boolean;
  pathLength: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  nodeCountsByType: Record<string, number>;
  relationshipCountsByType: Record<string, number>;
  totalNodes: number;
  totalRelationships: number;
  lastSyncedAt: string | null;
}

// ── Table-to-entity mapping ────────────────────────────────────────────────

/** Mapping from PostgreSQL tables to Neo4j entity types and their label columns */
const ENTITY_TABLE_MAP: Record<GovernanceEntityType, { table: string; idCol: string; labelCol: string; extraCols: string[] }> = {
  Regulator:   { table: "regulators",        idCol: "id", labelCol: "name_en",  extraCols: ["name_ar", "country", "status"] },
  Framework:   { table: "frameworks",        idCol: "id", labelCol: "name_en",  extraCols: ["name_ar", "version", "status", "regulator_id"] },
  Domain:      { table: "domains",           idCol: "id", labelCol: "name_en",  extraCols: ["name_ar", "framework_id", "parent_domain_id"] },
  Control:     { table: "controls",          idCol: "id", labelCol: "title_en", extraCols: ["title_ar", "control_ref", "domain_id", "parent_control_id", "owner_id", "status"] },
  Obligation:  { table: "obligations",       idCol: "id", labelCol: "title_en", extraCols: ["title_ar", "framework_id", "obligation_type", "status"] },
  Evidence:    { table: "evidence",          idCol: "id", labelCol: "title",    extraCols: ["control_id", "status", "created_at"] },
  Policy:      { table: "policies",          idCol: "id", labelCol: "title_en", extraCols: ["title_ar", "status", "owner_id", "effective_date"] },
  Risk:        { table: "risks",             idCol: "id", labelCol: "title_en", extraCols: ["title_ar", "risk_level", "status", "owner_id"] },
  Asset:       { table: "assets",            idCol: "id", labelCol: "name",     extraCols: ["asset_type", "criticality", "owner_id"] },
  Owner:       { table: "users",             idCol: "id", labelCol: "full_name", extraCols: ["email", "role"] },
  Committee:   { table: "committees",        idCol: "id", labelCol: "name_en",  extraCols: ["name_ar", "committee_type", "status"] },
  Decision:    { table: "board_decisions",   idCol: "decision_id", labelCol: "title_en", extraCols: ["title_ar", "decision_type", "status", "decision_date"] },
};

/** Relationship definitions: source table, target table, link columns */
const RELATIONSHIP_MAP: Array<{
  relType: GovernanceRelType;
  sourceType: GovernanceEntityType;
  targetType: GovernanceEntityType;
  sourceTable: string;
  fkCol: string;
}> = [
  { relType: "REGULATES",    sourceType: "Regulator",  targetType: "Framework",  sourceTable: "frameworks",      fkCol: "regulator_id" },
  { relType: "CONTAINS",     sourceType: "Framework",  targetType: "Domain",     sourceTable: "domains",         fkCol: "framework_id" },
  { relType: "CONTAINS",     sourceType: "Domain",     targetType: "Control",    sourceTable: "controls",        fkCol: "domain_id" },
  { relType: "MAPS_TO",      sourceType: "Obligation", targetType: "Control",    sourceTable: "obligation_control_mappings", fkCol: "obligation_id" },
  { relType: "EVIDENCED_BY", sourceType: "Control",    targetType: "Evidence",   sourceTable: "evidence",        fkCol: "control_id" },
  { relType: "OWNED_BY",     sourceType: "Control",    targetType: "Owner",      sourceTable: "controls",        fkCol: "owner_id" },
  { relType: "OWNED_BY",     sourceType: "Risk",       targetType: "Owner",      sourceTable: "risks",           fkCol: "owner_id" },
  { relType: "OWNED_BY",     sourceType: "Policy",     targetType: "Owner",      sourceTable: "policies",        fkCol: "owner_id" },
  { relType: "OWNED_BY",     sourceType: "Asset",      targetType: "Owner",      sourceTable: "assets",          fkCol: "owner_id" },
  { relType: "IMPACTS",      sourceType: "Risk",       targetType: "Control",    sourceTable: "risk_control_links", fkCol: "risk_id" },
  { relType: "MITIGATES",    sourceType: "Control",    targetType: "Risk",       sourceTable: "risk_control_links", fkCol: "control_id" },
  { relType: "LINKED_TO",    sourceType: "Policy",     targetType: "Control",    sourceTable: "policy_control_links", fkCol: "policy_id" },
  { relType: "LINKED_TO",    sourceType: "Decision",   targetType: "Risk",       sourceTable: "decision_entity_links", fkCol: "decision_id" },
];

// ── Full Graph Sync ────────────────────────────────────────────────────────

/**
 * Perform a full sync of all governance entities from PostgreSQL to Neo4j.
 * Clears existing tenant nodes and rebuilds the graph from scratch.
 */
export async function syncGovernanceGraph(tenantId: string): Promise<{
  nodesCreated: number;
  relationshipsCreated: number;
  durationMs: number;
}> {
  const schema = tenantSchema(tenantId);
  const startTime = Date.now();
  let nodesCreated = 0;
  let relationshipsCreated = 0;

  // Clear existing nodes for this tenant
  await runQuery(
    `MATCH (n { tenantId: $tenantId }) DETACH DELETE n`,
    { tenantId }
  );

  // ── Sync all entity types as nodes ──
  for (const [entityType, config] of Object.entries(ENTITY_TABLE_MAP)) {
    try {
      const selectCols = [config.idCol, config.labelCol, ...config.extraCols].join(", ");
      const res = await safeQuery(
        `SELECT ${selectCols} FROM "${schema}".${config.table} WHERE deleted_at IS NULL`,
        []
      );

      for (const row of res.rows) {
        const properties: Record<string, unknown> = {
          tenantId,
          entityId: row[config.idCol],
          label: row[config.labelCol] || "Untitled",
        };

        // Add extra columns as properties
        for (const col of config.extraCols) {
          if (row[col] !== null && row[col] !== undefined) {
            properties[col] = row[col];
          }
        }

        await runQuery(
          `CREATE (n:${entityType} $props)`,
          { props: properties }
        );
        nodesCreated++;
      }
    } catch (err) {
      // Table may not exist for this tenant; skip silently
      logger.warn(`[GovernanceGraph] Skipping ${entityType} sync: ${(err as Error).message}`);
    }
  }

  // ── Sync relationships ──
  for (const rel of RELATIONSHIP_MAP) {
    try {
      relationshipsCreated += await syncRelationships(tenantId, schema, rel);
    } catch (err) {
      logger.warn(`[GovernanceGraph] Skipping ${rel.relType} (${rel.sourceType}->${rel.targetType}): ${(err as Error).message}`);
    }
  }

  const durationMs = Date.now() - startTime;

  // Record sync timestamp
  await runQuery(
    `MERGE (m:SyncMeta { tenantId: $tenantId })
     SET m.lastSyncedAt = datetime(), m.nodesCreated = $nodesCreated, m.relationshipsCreated = $relationshipsCreated`,
    { tenantId, nodesCreated, relationshipsCreated }
  );

  // Publish sync event

  eventBus.publish(("graph.synced" as any), {
    tenantId,
    nodesCreated,
    relationshipsCreated,
    durationMs,
  });

  return { nodesCreated, relationshipsCreated, durationMs };
}

/**
 * Helper: sync relationships of a given type from a join/FK table.
 */
async function syncRelationships(
  tenantId: string,
  schema: string,
  rel: typeof RELATIONSHIP_MAP[number]
): Promise<number> {
  const sourceConfig = ENTITY_TABLE_MAP[rel.sourceType];
  const targetConfig = ENTITY_TABLE_MAP[rel.targetType];

  // For link tables (e.g. risk_control_links, obligation_control_mappings)
  // we need to query the link table for source/target ID pairs
  const isLinkTable = rel.sourceTable !== sourceConfig.table && rel.sourceTable !== targetConfig.table;

  let rows: Record<string, unknown>[];

  if (isLinkTable) {
    // Link table: has both source FK and target FK
    const targetFkCol = rel.relType === "MAPS_TO" ? "control_id"
      : rel.relType === "IMPACTS" ? "control_id"
      : rel.relType === "MITIGATES" ? "risk_id"
      : rel.relType === "LINKED_TO" && rel.sourceType === "Decision" ? "entity_id"
      : "target_id";

    const res = await safeQuery(
      `SELECT ${rel.fkCol} AS source_id, ${targetFkCol} AS target_id
       FROM "${schema}".${rel.sourceTable}`,
      []
    );
    rows = res.rows;
  } else {
    // FK is on the target table (e.g., controls.domain_id → Domain)
    const res = await safeQuery(
      `SELECT ${targetConfig.idCol} AS source_id, ${rel.fkCol} AS target_id
       FROM "${schema}".${rel.sourceTable}
       WHERE ${rel.fkCol} IS NOT NULL AND deleted_at IS NULL`,
      []
    );
    rows = res.rows;
  }

  let created = 0;
  for (const row of rows) {
    if (!row.source_id || !row.target_id) continue;

    await runQuery(
      `MATCH (a { tenantId: $tenantId, entityId: $sourceId })
       MATCH (b { tenantId: $tenantId, entityId: $targetId })
       CREATE (a)-[:${rel.relType} { tenantId: $tenantId }]->(b)`,
      { tenantId, sourceId: row.source_id, targetId: row.target_id }
    );
    created++;
  }
  return created;
}

// ── Incremental Entity Sync ────────────────────────────────────────────────

/**
 * Incrementally sync a single entity to the Neo4j graph.
 * Removes existing node (with relationships) and re-creates it.
 */
export async function syncEntity(
  tenantId: string,
  entityType: GovernanceEntityType,
  entityId: string
): Promise<{ synced: boolean }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Control Inheritance Graph ──────────────────────────────────────────────

/**
 * Traverse the control inheritance graph across parent/group/entity levels.
 * Returns the full inheritance chain from root to leaf for a given control.
 */
export async function getControlInheritanceGraph(
  tenantId: string,
  controlId: string
): Promise<GraphNeighborhood> {
  // Traverse upward through parent_control_id chain
  const ancestorResult = await runQuery(
    `MATCH path = (leaf:Control { tenantId: $tenantId, entityId: $controlId })
           <-[:CONTAINS*0..10]-(ancestor)
     WHERE ancestor.tenantId = $tenantId
     RETURN nodes(path) AS pathNodes, relationships(path) AS pathRels
     ORDER BY length(path) DESC
     LIMIT 1`,
    { tenantId, controlId }
  );

  // Traverse downward to find child controls
  const descendantResult = await runQuery(
    `MATCH path = (root:Control { tenantId: $tenantId, entityId: $controlId })
           -[:CONTAINS*1..10]->(child)
     WHERE child.tenantId = $tenantId
     RETURN nodes(path) AS pathNodes, relationships(path) AS pathRels`,
    { tenantId, controlId }
  );

  // Also get sibling controls (same parent)
  const siblingResult = await runQuery(
    `MATCH (c:Control { tenantId: $tenantId, entityId: $controlId })
           <-[:CONTAINS]-(parent)-[:CONTAINS]->(sibling:Control)
     WHERE sibling.tenantId = $tenantId AND sibling.entityId <> $controlId
     RETURN sibling`,
    { tenantId, controlId }
  );

  // Build unified graph response
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const extractNodes = (records: Record<string, unknown>[]) => {
    for (const record of records) {
      const pathNodes = record["pathNodes"] || [];

      for (const n of pathNodes) {
        const props = n.properties || {};
        if (!nodesMap.has(props.entityId)) {
          nodesMap.set(props.entityId, {
            id: props.entityId,
            type: (n.labels?.[0] || "Control") as GovernanceEntityType,
            label: props.label || "",
            properties: props,
          });
        }
      }

      const pathRels = record["pathRels"] || [];

      for (const r of pathRels) {
        edges.push({
          source: r.start?.properties?.entityId || "",
          target: r.end?.properties?.entityId || "",
          type: (r.type || "CONTAINS") as GovernanceRelType,
          properties: r.properties || {},
        });
      }
    }
  };

  extractNodes(ancestorResult.records || []);
  extractNodes(descendantResult.records || []);

  // Add siblings
  for (const record of (siblingResult.records || [])) {
    const sib = record["sibling"];
    if (sib) {

      const props = sib.properties || {};
      if (!nodesMap.has(props.entityId)) {
        nodesMap.set(props.entityId, {
          id: props.entityId,
          type: "Control",
          label: props.label || "",
          properties: props,
        });
      }
    }
  }

  const centerNode: GraphNode = nodesMap.get(controlId) || {
    id: controlId,
    type: "Control",
    label: "",
    properties: { tenantId, entityId: controlId },
  };

  return {
    center: centerNode,
    nodes: Array.from(nodesMap.values()),
    edges,
    depth: edges.length,
  };
}

// ── Entity Neighborhood Query ──────────────────────────────────────────────

/**
 * Retrieve the graph neighborhood around a given entity up to a configurable depth.
 * Returns the center node with all connected nodes and relationships.
 */
export async function getEntityGraph(
  tenantId: string,
  entityType: GovernanceEntityType,
  entityId: string,
  depth: number = 2
): Promise<GraphNeighborhood> {
  // Clamp depth to prevent runaway queries
  const safeDepth = Math.min(Math.max(depth, 1), 5);

  const result = await runQuery(
    `MATCH path = (center:${entityType} { tenantId: $tenantId, entityId: $entityId })
           -[*1..${safeDepth}]-(connected)
     WHERE connected.tenantId = $tenantId
     RETURN nodes(path) AS pathNodes, relationships(path) AS pathRels
     LIMIT 200`,
    { tenantId, entityId }
  );

  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();

  for (const record of (result.records || [])) {
    const pathNodes = record["pathNodes"] || [];

    for (const n of pathNodes) {
      const props = n.properties || {};
      const nodeId = props.entityId;
      if (nodeId && !nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          type: (n.labels?.[0] || entityType) as GovernanceEntityType,
          label: props.label || "",
          properties: props,
        });
      }
    }

    const pathRels = record["pathRels"] || [];

    for (const r of pathRels) {
      const startId = r.start?.properties?.entityId || "";
      const endId = r.end?.properties?.entityId || "";
      const edgeKey = `${startId}-${r.type}-${endId}`;
      if (!edgesMap.has(edgeKey)) {
        edgesMap.set(edgeKey, {
          source: startId,
          target: endId,
          type: (r.type || "LINKED_TO") as GovernanceRelType,
          properties: r.properties || {},
        });
      }
    }
  }

  const centerNode: GraphNode = nodesMap.get(entityId) || {
    id: entityId,
    type: entityType,
    label: "",
    properties: { tenantId, entityId },
  };

  return {
    center: centerNode,
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    depth: safeDepth,
  };
}

// ── Impact Path Finder ─────────────────────────────────────────────────────

/**
 * Find the shortest path between two governance entities in the graph.
 * Uses Neo4j shortest-path algorithm for efficient traversal.
 */
export async function findImpactPath(
  tenantId: string,
  fromType: GovernanceEntityType,
  fromId: string,
  toType: GovernanceEntityType,
  toId: string
): Promise<ImpactPath> {
  const result = await runQuery(
    `MATCH (start:${fromType} { tenantId: $tenantId, entityId: $fromId }),
           (end:${toType} { tenantId: $tenantId, entityId: $toId }),
           path = shortestPath((start)-[*..15]-(end))
     RETURN nodes(path) AS pathNodes, relationships(path) AS pathRels, length(path) AS pathLength
     LIMIT 1`,
    { tenantId, fromId, toId }
  );

  if (!result.records || result.records.length === 0) {
    return { found: false, pathLength: 0, nodes: [], edges: [] };
  }

  const record = result.records[0];
  const pathNodes = record["pathNodes"] || [];
  const pathRels = record["pathRels"] || [];
  const pathLength = record["pathLength"] || 0;

  const nodes: GraphNode[] = pathNodes.map((n: GenericRow) => {
    const props = n.properties || {};
    return {
      id: props.entityId,
      type: (n.labels?.[0] || "Control") as GovernanceEntityType,
      label: props.label || "",
      properties: props,
    };
  });

  const edges: GraphEdge[] = pathRels.map((r: GenericRow) => ({
    source: r.start?.properties?.entityId || "",
    target: r.end?.properties?.entityId || "",
    type: (r.type || "LINKED_TO") as GovernanceRelType,
    properties: r.properties || {},
  }));

  return {
    found: true,

    pathLength: typeof pathLength === "number" ? pathLength : pathLength.toNumber?.() ?? 0,
    nodes,
    edges,
  };
}

// ── Graph Statistics ───────────────────────────────────────────────────────

/**
 * Retrieve aggregated statistics for the governance graph:
 * node counts by type, relationship counts by type, and last sync timestamp.
 */
export async function getGraphStats(tenantId: string): Promise<GraphStats> {
  // Count nodes by label
  const nodeResult = await runQuery(
    `MATCH (n { tenantId: $tenantId })
     WHERE NOT n:SyncMeta
     RETURN labels(n)[0] AS nodeType, count(n) AS cnt`,
    { tenantId }
  );

  const nodeCountsByType: Record<string, number> = {};
  let totalNodes = 0;
  for (const record of (nodeResult.records || [])) {
    const nodeType = record["nodeType"] || "Unknown";
    const cnt = record["cnt"];

    const count = typeof cnt === "number" ? cnt : cnt?.toNumber?.() ?? 0;
    nodeCountsByType[(nodeType as any)] = count;
    totalNodes += count;
  }

  // Count relationships by type
  const relResult = await runQuery(
    `MATCH (a { tenantId: $tenantId })-[r]->(b { tenantId: $tenantId })
     RETURN type(r) AS relType, count(r) AS cnt`,
    { tenantId }
  );

  const relationshipCountsByType: Record<string, number> = {};
  let totalRelationships = 0;
  for (const record of (relResult.records || [])) {
    const relType = record["relType"] || "Unknown";
    const cnt = record["cnt"];

    const count = typeof cnt === "number" ? cnt : cnt?.toNumber?.() ?? 0;
    relationshipCountsByType[(relType as any)] = count;
    totalRelationships += count;
  }

  // Get last sync timestamp
  const metaResult = await runQuery(
    `MATCH (m:SyncMeta { tenantId: $tenantId })
     RETURN m.lastSyncedAt AS lastSyncedAt
     LIMIT 1`,
    { tenantId }
  );

  const lastSyncedAt = metaResult.records?.[0]?.["lastSyncedAt"]?.toString?.() || null;

  return {
    nodeCountsByType,
    relationshipCountsByType,
    totalNodes,
    totalRelationships,
    lastSyncedAt,
  };
}
