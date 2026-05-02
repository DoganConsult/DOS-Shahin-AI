interface RoleRecommendation {
    roleCode: string;
    roleName: string;
    category: string;
    priority: number;
    isMandatory: boolean;
    recommendedFte: number;
    rationale: string;
}
interface TeamRecommendation {
    teamName: string;
    roles: RoleRecommendation[];
    totalFte: number;
    priority: number;
}
export interface TeamRecommendationResult {
    companySize: string;
    frameworks: unknown[];
    teams: TeamRecommendation[];
    totalRoles: number;
    totalFte: number;
    generatedAt: string;
}
export declare function generateTeamRecommendation(companySize: string, frameworks: unknown[]): TeamRecommendationResult;
export declare function saveTeamRecommendation(tenantId: string, recommendation: TeamRecommendationResult): Promise<void>;
export declare function getTeamRecommendation(tenantId: string): Promise<TeamRecommendationResult | null>;
export declare function applyTeamRecommendation(tenantId: string, recommendation: TeamRecommendationResult): Promise<{
    teamsCreated: number;
    membersAssigned: number;
}>;
export {};
