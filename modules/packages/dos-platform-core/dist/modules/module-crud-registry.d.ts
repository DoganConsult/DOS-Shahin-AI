export interface ModuleCrudDef {
    moduleCode: string;
    entityType: string;
    tableName?: string;
    idColumn?: string;
    titleField?: string;
    routes?: {
        list?: string;
        detail?: string;
        create?: string;
        update?: string;
        delete?: string;
    };
    permissions?: {
        read?: string;
        write?: string;
        delete?: string;
    };
    metadata?: Record<string, unknown>;
}
export declare function registerModuleCrud(def: ModuleCrudDef): void;
export declare function getModuleCrud(moduleCode: string, entityType: string): ModuleCrudDef | undefined;
export declare function listModuleCrud(): ModuleCrudDef[];
