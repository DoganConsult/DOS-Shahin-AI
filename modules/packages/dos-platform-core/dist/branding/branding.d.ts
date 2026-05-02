export interface ProductIdentity {
    name: string;
    displayName?: string;
    url?: string;
    logoUrl?: string;
    supportEmail?: string;
}
export interface PlatformBranding {
    getProductName(): string;
    getProductUrl(): string;
    setProductIdentity(identity: ProductIdentity): void;
}
export declare function setProductIdentity(identity: ProductIdentity): void;
export declare function setBrandingProvider(impl: PlatformBranding): void;
export declare function getProductName(): string;
export declare function getProductUrl(): string;
