export interface ServiceClientOptions {
    sourceService: string;
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerResetMs?: number;
}
export interface ServiceResponse<T = unknown> {
    status: number;
    data: T;
    headers: Record<string, string>;
}
type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export declare function getAllCircuitStates(): Array<{
    target: string;
    state: CBState;
    failures: number;
}>;
export declare class ServiceClient {
    private sourceService;
    private timeoutMs;
    private retries;
    private retryDelayMs;
    private cbThreshold;
    private cbResetMs;
    constructor(options: ServiceClientOptions);
    private buildHeaders;
    request<T = unknown>(targetService: string, path: string, options?: {
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
    get<T = unknown>(targetService: string, path: string, opts?: {
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
    post<T = unknown>(targetService: string, path: string, body: unknown, opts?: {
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
    put<T = unknown>(targetService: string, path: string, body: unknown, opts?: {
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
    patch<T = unknown>(targetService: string, path: string, body: unknown, opts?: {
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
    delete<T = unknown>(targetService: string, path: string, opts?: {
        headers?: Record<string, string>;
        tenantId?: string;
    }): Promise<ServiceResponse<T>>;
}
export declare function createServiceClient(sourceService: string, options?: Partial<ServiceClientOptions>): ServiceClient;
export {};
