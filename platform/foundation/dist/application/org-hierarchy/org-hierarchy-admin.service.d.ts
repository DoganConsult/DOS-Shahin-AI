export interface ActivationSelection {
    organizationId: string;
    departments: Array<{
        departmentId: string;
        activated: boolean;
        teams?: Array<{
            teamId: string;
            activated: boolean;
        }>;
    }>;
    [key: string]: unknown;
}
export declare function applyTemplateWithSelectiveActivation(tenantId: string, userId: string, templateId: string, orgName: string, orgNameAr: string | undefined, selection: Record<string, unknown>): Promise<{
    created: unknown;
    activated: unknown;
    hierarchy: unknown;
}>;
export declare function getActivationStatus(tenantId: string): Promise<{
    departments: Array<{
        id: string;
        name: string;
        status: string;
        teamCount: number;
        activeTeamCount: number;
    }>;
    summary: {
        total: number;
        active: number;
        inactive: number;
    };
}>;
export declare function updateActivationStatus(tenantId: string, userId: string, selection: ActivationSelection): Promise<{
    updated: number;
    moduleMappings: unknown[];
}>;
export declare function getModuleRoleMappings(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function getRoleProfiles(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function getUserProfileAssignments(tenantId: string, userId: string): Promise<Record<string, unknown>[]>;
export declare function assignProfileToUser(tenantId: string, userId: string, targetUserId: string, teamId: string, departmentId: string, profileCode: string): Promise<{
    assigned: boolean;
    roleCode: string;
}>;
export declare function getHierarchyVisualization(tenantId: string, layoutType: string): Promise<{
    nodes: unknown[];
    edges: unknown[];
    layoutType: string;
}>;
export declare function getOrgStructureAnalytics(tenantId: string): Promise<{
    nodeCount: Record<string, number>;
    memberCount: number;
    avgTeamSize: number;
    depthDistribution: Record<string, number>;
    activationRate: number;
}>;
export interface CustomFieldDefinition {
    fieldId?: string;
    fieldKey: string;
    fieldName: string;
    fieldType: string;
    nodeTypes: string[];
    isRequired?: boolean;
    defaultValue?: any;
    options?: string[];
    [key: string]: unknown;
}
export declare function defineCustomField(tenantId: string, userId: string, field: CustomFieldDefinition): Promise<{
    fieldId: string;
    created: boolean;
}>;
