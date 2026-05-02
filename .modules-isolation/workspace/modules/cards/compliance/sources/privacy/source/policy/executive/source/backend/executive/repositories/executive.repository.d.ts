export declare class ExecutiveRepository {
    static getRiskSummary(tenantId: string): Promise<import("pg").QueryResult<any>>;
    static getComplianceControlSummary(tenantId: string): Promise<import("pg").QueryResult<any>>;
    static getActiveFrameworksCount(tenantId: string): Promise<import("pg").QueryResult<any>>;
    static getIncidentSummary(tenantId: string): Promise<import("pg").QueryResult<any>>;
}
