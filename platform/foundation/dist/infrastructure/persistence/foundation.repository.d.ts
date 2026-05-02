import type { GenericRow } from '@dos/types';
export declare function getAllNodes(tenantId: string): Promise<GenericRow[]>;
export declare function getNodesPaginated(tenantId: string, filters?: Record<string, string>, page?: number, pageSize?: number): Promise<{
    rows: GenericRow[];
    total: number;
}>;
export declare function getNodeById(tenantId: string, nodeId: string): Promise<GenericRow | null>;
export declare function createNode(tenantId: string, data: Record<string, unknown>): Promise<GenericRow>;
export declare function updateNode(tenantId: string, nodeId: string, data: Record<string, unknown>): Promise<GenericRow | null>;
export declare function deleteNode(tenantId: string, nodeId: string, _userId: string): Promise<boolean>;
export declare function getChildren(tenantId: string, parentId: string): Promise<GenericRow[]>;
export declare function writeAuditLog(tenantId: string, entityId: string, action: string, actorId: string, beforeState: GenericRow | null, afterState: GenericRow | null): Promise<void>;
export declare function getHierarchyStats(tenantId: string): Promise<{
    totalNodes: number;
    maxDepth: number;
    orphanedNodes: number;
    duplicateCodes: number;
}>;
