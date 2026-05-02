export interface CapabilityRecord {
    capability_key: string;
    provider_module: string;
    provider_version: string;
    shape_ref: string;
    http_route?: string | null;
    fga_relation?: string | null;
    description?: string | null;
    is_active: boolean;
}
export interface InvokeOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    params?: Record<string, string | number>;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}
export interface CapabilitiesClientOptions {
    brokerBaseUrl?: string;
    gatewayBaseUrl?: string;
    cacheTtlMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class CapabilitiesClient {
    private cache;
    private brokerBase;
    private gatewayBase;
    private ttl;
    private fetchImpl;
    constructor(opts?: CapabilitiesClientOptions);
    resolve(capability: string): Promise<CapabilityRecord>;
    invalidate(capability?: string): void;
    invoke<T = unknown>(capability: string, opts?: InvokeOptions): Promise<T>;
}
export interface EnrollOptions {
    tenant_id: string;
    module_code: string;
    module_version: string;
    mode_override?: 'eager' | 'on_demand' | 'pool_warmed';
    idempotency_key?: string;
    brokerBaseUrl?: string;
    fetchImpl?: typeof fetch;
}
export interface EnrollResult {
    ok: boolean;
    replayed: boolean;
    row: {
        tenant_id: string;
        module_code: string;
        module_version: string;
        status: string;
        provisioning_mode: string;
        attached_slot_id: string | null;
        materialized_at: string | null;
    };
}
export declare function enrollTenantModule(opts: EnrollOptions): Promise<EnrollResult>;
export declare const capabilities: {
    client(): CapabilitiesClient;
    resolve(capability: string): Promise<CapabilityRecord>;
    invoke<T = unknown>(capability: string, opts?: InvokeOptions): Promise<T>;
    invalidate(capability?: string): void;
    configure(opts: CapabilitiesClientOptions): void;
};
