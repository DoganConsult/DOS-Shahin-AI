export interface FgaTuple {
    user: string;
    relation: string;
    object: string;
}
export interface CheckRequest {
    user: string;
    relation: string;
    object: string;
    contextualTuples?: {
        tuple_keys: FgaTuple[];
    };
}
export interface ReadRequest {
    tuple_key?: Partial<FgaTuple>;
    page_size?: number;
    continuation_token?: string;
}
export interface WriteRequest {
    writes?: {
        tuple_keys: FgaTuple[];
    };
    deletes?: {
        tuple_keys: FgaTuple[];
    };
}
export declare const fgaClient: {
    /** Check whether `user` has `relation` to `object`. */
    check(req: CheckRequest): Promise<{
        allowed: boolean;
    }>;
    /** Read tuples matching the partial tuple key. */
    read(req?: ReadRequest): Promise<{
        tuples: Array<{
            key: FgaTuple;
            timestamp: string;
        }>;
        continuation_token?: string;
    }>;
    /** Apply a batch of writes / deletes. */
    write(req: WriteRequest): Promise<{}>;
    /** Expose the configured store/model for diagnostics. */
    config(): {
        apiUrl: string;
        storeId: string;
        authorizationModelId?: string;
    };
};
