import type { AbacAdapter, AbacRequest, AbacVerdict } from '../../ports/abac.port';
export interface CerbosAdapterOptions {
    pdpUrl?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class CerbosAbacAdapter implements AbacAdapter {
    readonly name: "cerbos";
    private readonly pdpUrl;
    private readonly timeoutMs;
    private readonly fetchImpl;
    private versionCache;
    constructor(options?: CerbosAdapterOptions);
    evaluate(request: AbacRequest): Promise<AbacVerdict>;
    currentPolicyVersion(): Promise<string>;
    private unavailableVerdict;
}
