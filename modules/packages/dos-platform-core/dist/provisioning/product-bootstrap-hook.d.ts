export interface ProductProvisioningContext {
    tenantId: string;
    tenantCode?: string;
    productKey: string;
    productCode?: string;
    requestedBy?: string;
    metadata?: Record<string, unknown>;
}
export interface ProductBootstrapHook {
    productKey: string;
    productName: string;
    onProvision: (context: ProductProvisioningContext) => Promise<void>;
}
export declare function registerProductBootstrapHook(hook: ProductBootstrapHook): void;
export declare function getProductBootstrapHook(productKey: string): ProductBootstrapHook | undefined;
export declare function listProductBootstrapHooks(): ProductBootstrapHook[];
