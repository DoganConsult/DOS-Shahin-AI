import type { RebacAdapter, RebacCheckRequest, RebacCheckResult, RebacListRequest, RebacListResult, RebacTupleWrite } from '../../ports/rebac.port';
export interface OpenFgaAdapterOptions {
    apiUrl?: string;
    storeId?: string;
    modelId?: string;
    apiToken?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class OpenFgaRebacAdapter implements RebacAdapter {
    readonly name: "openfga";
    private readonly apiUrl;
    private readonly storeId;
    private readonly modelId;
    private readonly apiToken?;
    private readonly timeoutMs;
    private readonly fetchImpl;
    constructor(options?: OpenFgaAdapterOptions);
    check(request: RebacCheckRequest): Promise<RebacCheckResult>;
    listObjects(request: RebacListRequest): Promise<RebacListResult>;
    writeTuples(tuples: RebacTupleWrite[]): Promise<void>;
    currentModelVersion(): Promise<string>;
    private call;
}
