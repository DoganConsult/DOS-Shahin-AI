export interface ModuleNavItemContract {
    id: string;
    label?: string;
    labelKey?: string;
    route?: string;
    icon?: string;
    permission?: string;
    order?: number;
    group?: string;
    badge?: string;
}
export interface ModuleNavGroupContract {
    id: string;
    label?: string;
    labelKey?: string;
    items?: string[];
    order?: number;
}
export interface ModuleNavContract {
    schemaVersion: number;
    moduleCode: string;
    items: ModuleNavItemContract[];
    groups?: ModuleNavGroupContract[];
}
export declare const MODULE_NAVIGATION_REGISTRY: Readonly<Record<string, ModuleNavContract>>;
export declare function getModuleNavContract(moduleCode: string): ModuleNavContract | undefined;
export declare function listRegisteredModuleNav(): string[];
