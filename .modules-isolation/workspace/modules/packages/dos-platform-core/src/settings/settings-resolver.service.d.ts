export type SettingsScope = 'platform' | 'product' | 'tenant' | 'workspace' | 'module' | 'user';
export interface SettingsContext {
    schema: string;
    scope: SettingsScope;
    productKey?: string;
    moduleCode?: string;
    workspaceId?: string;
    ownerUserId?: string;
}
export interface SettingRecord {
    key: string;
    value: unknown;
    scope: SettingsScope;
    productKey?: string;
    moduleCode?: string;
    workspaceId?: string;
    ownerUserId?: string;
}
export declare function getSetting(ctx: SettingsContext, key: string): Promise<unknown | undefined>;
export declare function getSettingsForScope(ctx: SettingsContext): Promise<SettingRecord[]>;
export declare function upsertSetting(ctx: SettingsContext, key: string, value: unknown): Promise<void>;
export declare function resolveSettingWithInheritance(schema: string, key: string, context: {
    productKey?: string;
    moduleCode?: string;
    workspaceId?: string;
    ownerUserId?: string;
}): Promise<{
    value: unknown;
    resolvedScope: SettingsScope;
} | undefined>;
export declare function validateScopeContext(ctx: SettingsContext): void;
export declare function detectScopeAmbiguities(schema: string): Promise<string[]>;
