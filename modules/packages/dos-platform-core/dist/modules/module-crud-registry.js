"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModuleCrud = registerModuleCrud;
exports.getModuleCrud = getModuleCrud;
exports.listModuleCrud = listModuleCrud;
const _crud = new Map();
function registerModuleCrud(def) {
    _crud.set(`${def.moduleCode}:${def.entityType}`, def);
}
function getModuleCrud(moduleCode, entityType) {
    return _crud.get(`${moduleCode}:${entityType}`);
}
function listModuleCrud() {
    return [..._crud.values()];
}
//# sourceMappingURL=module-crud-registry.js.map