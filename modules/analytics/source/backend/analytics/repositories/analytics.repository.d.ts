import type { GenericRow } from "@dos/types";
export declare class AnalyticsRepository {
    private schema;
    constructor(tenantId: string);
    findById(id: string): Promise<GenericRow | null>;
    findAll(filters?: {
        status?: string;
        search?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortDir?: string;
    }): Promise<{
        rows: GenericRow[];
        total: number;
    }>;
    create(data: Record<string, unknown>): Promise<GenericRow | null>;
    update(id: string, data: Record<string, unknown>): Promise<GenericRow | null>;
    softDelete(id: string, deletedBy?: string): Promise<boolean>;
    count(filters?: {
        status?: string;
    }): Promise<number>;
}
