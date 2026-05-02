export interface Position {
    position_id: string;
    tenant_id: string;
    title_en: string;
    title_ar: string | null;
    code: string | null;
    bu_id: string | null;
    grade: string | null;
    level: number | null;
    reports_to: string | null;
    status: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreatePositionInput {
    title_en: string;
    title_ar?: string;
    code?: string;
    bu_id?: string;
    grade?: string;
    level?: number;
    reports_to?: string;
    status?: string;
    description?: string;
}
export type UpdatePositionInput = Partial<CreatePositionInput>;
export declare function listPositions(tenantId: string, opts?: {
    page?: number;
    pageSize?: number;
    bu_id?: string;
    search?: string;
}): Promise<{
    data: Position[];
    total: number;
}>;
export declare function getPosition(tenantId: string, id: string): Promise<Position | null>;
export declare function getReportingTree(tenantId: string): Promise<any[]>;
export declare function getPositionHolders(tenantId: string, positionId: string): Promise<any[]>;
export declare function createPosition(tenantId: string, input: CreatePositionInput, actorId: string): Promise<Position>;
export declare function updatePosition(tenantId: string, id: string, input: UpdatePositionInput): Promise<Position | null>;
export declare function assignUserToPosition(tenantId: string, positionId: string, userId: string, opts?: {
    isPrimary?: boolean;
}): Promise<{
    assignmentId: string;
}>;
export declare function unassignUserFromPosition(tenantId: string, positionId: string, userId: string): Promise<{
    removed: number;
}>;
export declare function deletePosition(tenantId: string, id: string): Promise<boolean>;
