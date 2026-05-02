export type GraphBackendType = 'apache-age';
export declare const GRAPH_BACKEND: GraphBackendType;
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
export declare function registerGraphBackend(backend: GraphBackendContract): void;
export declare function getGraphBackend(): GraphBackendContract | null;
export declare function graphBackendAvailable(): boolean;
export declare const GRAPH_BACKEND_CONFIG: {
    type: "apache-age";
    description: string;
    envVars: {
        AGE_ENABLED: string;
        AGE_GRAPH_NAME: string;
    };
    capabilities: string[];
    alternativesConsidered: {
        name: string;
        reason: string;
    }[];
    decision: string;
};
