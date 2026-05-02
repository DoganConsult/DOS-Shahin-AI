export type OrgNodeType = 'organization' | 'division' | 'department' | 'team' | 'unit';
export interface OrgHierarchyNode {
    type: OrgNodeType;
    id: string;
    name: string;
    nameAr?: string;
    parentId?: string;
    status: string;
    headUserId?: string;
    locationId?: string;
    costCenterId?: string;
    metadata?: Record<string, unknown>;
    children?: OrgHierarchyNode[];
    [key: string]: unknown;
}
interface AccessRules {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isOwner: boolean;
    reason?: string;
}
export declare function getOrgHierarchyTree(tenantId: string, includeInactive?: boolean): Promise<OrgHierarchyNode[]>;
export declare function getOrgHierarchyAccessRules(tenantId: string, userId: string, userRole: string, nodeId: string, nodeType: OrgNodeType): Promise<AccessRules>;
export declare function evaluateOrgHierarchyAccess(userRole: string, _nodeRole: string, _nodeType: OrgNodeType, _ownership: string, isOwner: boolean): AccessRules;
export declare function validateOrgStructure(tenantId: string): Promise<{
    valid: boolean;
    issues: Array<{
        type: string;
        message: string;
        nodeId?: string;
        severity: string;
    }>;
    stats: {
        organizations: number;
        divisions: number;
        departments: number;
        teams: number;
    };
}>;
export declare function getUserAccessibleDepartments(tenantId: string, userId: string, userRole: string): Promise<string[]>;
export declare function getUserAccessibleTeams(tenantId: string, userId: string, userRole: string): Promise<string[]>;
export declare function upsertOrgHierarchyNode(tenantId: string, userId: string, nodeType: OrgNodeType, data: unknown): Promise<{
    id: string;
    node: any;
}>;
export {};
