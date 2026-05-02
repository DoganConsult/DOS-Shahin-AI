export declare function masterQuery(text: string, params?: unknown[]): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
}>;
export declare function masterGetFirst(table: string, where: string, params?: unknown[]): Promise<Record<string, unknown> | null>;
