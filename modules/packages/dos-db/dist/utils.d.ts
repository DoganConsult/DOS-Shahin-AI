export interface QueryResultLike<T = unknown> {
    rows: T[];
    rowCount?: number | null;
}
export declare function getFirstRow<T = unknown>(result: QueryResultLike<T>): T | null;
export declare function getFirstRowOrThrow<T>(result: QueryResultLike<T>, errorMsg?: string): T;
export declare function assertHasRows<T>(result: QueryResultLike<T>): asserts result is QueryResultLike<T> & {
    rows: [T, ...T[]];
};
export declare function columnExists(schema: string, table: string, column: string): Promise<boolean>;
export declare function resetColumnExistsCache(): void;
