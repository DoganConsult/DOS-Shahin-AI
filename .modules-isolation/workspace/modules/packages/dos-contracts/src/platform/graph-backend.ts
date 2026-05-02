import { logger } from '@dos/platform-core/observability';

export type GraphBackendType = 'apache-age';

export const GRAPH_BACKEND: GraphBackendType = 'apache-age';

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  label: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphBackendContract {
  type: GraphBackendType;
  createNode(tenantId: string, label: string, properties: Record<string, unknown>): Promise<GraphNode | null>;
  createEdge(tenantId: string, label: string, sourceId: string, targetId: string, properties?: Record<string, unknown>): Promise<GraphEdge | null>;
  queryNeighbors(tenantId: string, nodeId: string, depth?: number): Promise<GraphQueryResult>;
  queryPath(tenantId: string, sourceId: string, targetId: string): Promise<GraphNode[]>;
  deleteNode(tenantId: string, nodeId: string): Promise<boolean>;
  deleteEdge(tenantId: string, edgeId: string): Promise<boolean>;
}

let _backend: GraphBackendContract | null = null;

export function registerGraphBackend(backend: GraphBackendContract): void {
  _backend = backend;
  logger.info(`[GraphBackend] Registered: ${backend.type}`);
}

export function getGraphBackend(): GraphBackendContract | null {
  return _backend;
}

export function graphBackendAvailable(): boolean {
  return _backend !== null;
}

export const GRAPH_BACKEND_CONFIG = {
  type: 'apache-age' as const,
  description: 'Apache AGE — PostgreSQL graph extension for entity relationships',
  envVars: {
    AGE_ENABLED: 'Enable/disable Apache AGE graph backend',
    AGE_GRAPH_NAME: 'Graph name within PostgreSQL (default: dogan_ai_os_graph)',
  },
  capabilities: [
    'entity-relationship-mapping',
    'ownership-graph',
    'dependency-tracking',
    'risk-propagation',
    'control-mapping',
    'compliance-lineage',
  ],
  alternativesConsidered: [
    { name: 'Neo4j', reason: 'Separate infrastructure, license cost, operational overhead' },
    { name: 'In-memory graph', reason: 'Not durable, limited scalability' },
  ],
  decision: 'Apache AGE chosen: runs inside PostgreSQL (shared infra), SQL-compatible, zero additional ops cost, sufficient for GRC relationship patterns.',
};
