export interface ListTeamsParams {
    page: number;
    pageSize: number;
    status?: string;
}
export declare function listTeams(tenantId: string, params: ListTeamsParams): Promise<{
    data: any[];
    total: number;
}>;
export declare function getTeamById(tenantId: string, teamId: string): Promise<any>;
export declare function createTeam(tenantId: string, input: {
    name_en: string;
    code?: string | null;
    description?: string | null;
    department_id?: string | null;
    bu_id?: string | null;
    owner_user_id?: string | null;
}): Promise<any>;
export declare function updateTeam(tenantId: string, teamId: string, patch: Partial<{
    name_en: string;
    code: string | null;
    description: string | null;
    department_id: string | null;
    bu_id: string | null;
    status: string;
    owner_user_id: string | null;
}>): Promise<any>;
export declare function deleteTeam(tenantId: string, teamId: string): Promise<boolean>;
export declare function listMembers(tenantId: string, teamId: string): Promise<any[]>;
export declare function addMember(tenantId: string, teamId: string, userId: string, roleInTeam: string): Promise<any>;
export declare function removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean>;
