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

const _crud = new Map<string, ModuleCrudDef>();

export function registerModuleCrud(def: ModuleCrudDef): void {
  _crud.set(`${def.moduleCode}:${def.entityType}`, def);
}

export function getModuleCrud(moduleCode: string, entityType: string): ModuleCrudDef | undefined {
  return _crud.get(`${moduleCode}:${entityType}`);
}

export function listModuleCrud(): ModuleCrudDef[] {
  return [..._crud.values()];
}

