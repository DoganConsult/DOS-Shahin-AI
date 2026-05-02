import type { GenericRow } from '@dos/types';
export interface PositionData {
    dept_id?: string;
    title_en: string;
    title_ar?: string;
    grade?: string;
    reports_to_position_id?: string;
    status?: 'active' | 'inactive' | 'vacant';
    metadata?: Record<string, unknown>;
}
export declare function listPositions(tenantId: string, filters?: {
    departmentId?: string;
    limit?: number;
    offset?: number;
}): Promise<GenericRow[]>;
export declare function getPositionById(tenantId: string, positionId: string): Promise<GenericRow | null>;
export declare function createPosition(tenantId: string, data: PositionData, actorId: string): Promise<GenericRow>;
export declare function updatePosition(tenantId: string, positionId: string, data: Partial<PositionData>, actorId: string): Promise<GenericRow | null>;
export declare function deletePosition(tenantId: string, positionId: string, actorId: string): Promise<{
    deleted: boolean;
}>;
