export declare function assertTenantAccess(userId: string, tenantId: string): Promise<void>;
export interface WorkspaceContext {
    workspaceId: string;
    tenantId: string;
    name: string;
    type: 'default' | 'project' | 'sandbox';
    isActive: boolean;
    settings: Record<string, unknown>;
    createdAt: string;
}
export declare function getWorkspaceContext(tenantId: string, workspaceId: string): Promise<WorkspaceContext | null>;
export declare function getDefaultWorkspace(tenantId: string): Promise<WorkspaceContext | null>;
export declare function listWorkspaces(tenantId: string): Promise<WorkspaceContext[]>;
/** Compat alias for listWorkspaces */
export declare const getWorkspaces: typeof listWorkspaces;
export declare function createWorkspace(tenantId: string, name: string, type: 'default' | 'project' | 'sandbox', createdBy: string): Promise<WorkspaceContext>;
export declare function updateWorkspace(tenantId: string, workspaceId: string, data: {
    name?: string;
    type?: string;
    is_active?: boolean;
    settings?: Record<string, unknown>;
}): Promise<Record<string, unknown>>;
export declare function deleteWorkspace(tenantId: string, workspaceId: string): Promise<boolean>;
export interface ScopeDimension {
    dimension_id: string;
    workspace_id: string;
    type: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}
export declare function getScopeDimensions(tenantId: string, workspaceId: string, type?: string): Promise<ScopeDimension[]>;
export declare function createScopeDimension(tenantId: string, data: {
    workspace_id: string;
    type: string;
    name: string;
    parent_id?: string;
}): Promise<ScopeDimension>;
