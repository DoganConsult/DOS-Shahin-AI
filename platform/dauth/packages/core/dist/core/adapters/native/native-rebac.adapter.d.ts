import type { RebacAdapter, RebacCheckRequest, RebacCheckResult, RebacListRequest, RebacListResult, RebacTupleWrite } from '../../ports/rebac.port';
export declare class NativeRebacAdapter implements RebacAdapter {
    readonly name: "native";
    check(request: RebacCheckRequest): Promise<RebacCheckResult>;
    listObjects(request: RebacListRequest): Promise<RebacListResult>;
    writeTuples(tuples: RebacTupleWrite[]): Promise<void>;
    currentModelVersion(): Promise<string>;
}
export declare const nativeRebacAdapter: NativeRebacAdapter;
