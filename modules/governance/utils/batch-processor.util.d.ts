export interface BatchOptions {
    concurrency?: number;
    retries?: number;
    retryDelayMs?: number;
    onItemError?: (err: unknown, item: unknown, index: number) => void;
}
export interface BatchResult<T, R> {
    successes: Array<{
        item: T;
        result: R;
        index: number;
    }>;
    failures: Array<{
        item: T;
        error: string;
        index: number;
    }>;
    totalMs: number;
}
export declare function processBatch<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, opts?: BatchOptions): Promise<BatchResult<T, R>>;
export declare const batchProcessor: {
    processBatch: typeof processBatch;
};
export default batchProcessor;
