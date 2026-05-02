export interface ProvisionedTenant {
    tenant_id: string;
    settings?: any;
}
export interface PlatformTenancy {
    getProvisionedTenants(): Promise<ProvisionedTenant[]>;
}
export declare function setTenancyHandler(impl: PlatformTenancy): void;
export declare function getProvisionedTenants(): Promise<ProvisionedTenant[]>;
