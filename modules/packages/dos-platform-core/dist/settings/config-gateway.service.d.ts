type RuntimeOverrideEntry = {
    value: unknown;
    setBy: string;
    setAt: string;
};
export interface ConfigInventoryItem {
    key: string;
    bootstrap: boolean;
    hasOverride: boolean;
    currentValue: unknown;
    source: string;
    setBy?: string;
    setAt?: string;
}
export declare class ConfigGateway {
    static isInitialized(): boolean;
    static initialize(): Promise<void>;
    static getSync(key: string): unknown;
    static get(key: string, options?: {
        tenantId?: string;
        moduleCode?: string;
        workspaceId?: string;
        userId?: string;
    }): Promise<unknown>;
    static getString(key: string, fallback?: string): string;
    static getNumber(key: string, fallback?: number): number;
    static getBool(key: string, fallback?: boolean): boolean;
    static setOverride(key: string, value: unknown, setBy: string): void;
    static clearOverride(key: string): void;
    static getOverrides(): Record<string, RuntimeOverrideEntry>;
    static invalidateCache(key?: string): void;
    static isBootstrapKey(key: string): boolean;
    static getFullInventory(): ConfigInventoryItem[];
}
export {};
