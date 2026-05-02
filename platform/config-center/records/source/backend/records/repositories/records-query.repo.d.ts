export declare function getDashboardStats(tenantId: string): Promise<Record<string, number>>;
export declare function getKpiMetrics(tenantId: string): Promise<{
    totalRecords: number;
    activeRecords: number;
    onLegalHold: number;
    overdueDisposal: number;
    noRetentionPolicy: number;
    disposedThisMonth: number;
    avgRetentionDays: number;
}>;
export declare function getClassificationBreakdown(tenantId: string): Promise<Array<{
    classification: string;
    count: number;
    onHold: number;
}>>;
export declare function getRetentionCompliance(tenantId: string): Promise<{
    totalActive: number;
    withRetention: number;
    withoutRetention: number;
    compliancePct: number;
    byRecordType: Array<{
        recordType: string;
        total: number;
        compliant: number;
    }>;
}>;
export declare function getDisposalQueue(tenantId: string): Promise<Array<{
    id: string;
    title: string;
    recordType: string;
    classification: string;
    disposalDate: string;
    legalHold: boolean;
    daysOverdue: number;
}>>;
export declare function getLegalHolds(tenantId: string): Promise<Array<{
    id: string;
    title: string;
    recordType: string;
    classification: string;
    createdAt: string;
    holdSince: string;
}>>;
export declare function getAgingReport(tenantId: string): Promise<Array<{
    bucket: string;
    count: number;
}>>;
export declare function searchEntities(tenantId: string, params: {
    query?: string;
    status?: string;
    recordType?: string;
    classification?: string;
    legalHold?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}): Promise<{
    rows: unknown[];
    total: number;
}>;
export declare function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]>;
export declare function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]>;
