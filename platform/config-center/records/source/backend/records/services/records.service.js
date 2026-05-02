"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
const records_repository_1 = require("../repositories/records.repository");
async function list(tenantId, limit = 50, offset = 0) {
    const repo = new records_repository_1.RecordsRepository(tenantId);
    const page = Math.max(1, Math.floor(offset / limit) + 1);
    return repo.findAll({ page, pageSize: limit });
}
async function getById(id, tenantId) {
    const repo = new records_repository_1.RecordsRepository(tenantId);
    return repo.findById(id);
}
async function create(data, tenantId) {
    const repo = new records_repository_1.RecordsRepository(tenantId);
    return repo.create(data);
}
async function update(id, data, tenantId) {
    const repo = new records_repository_1.RecordsRepository(tenantId);
    return repo.update(id, data);
}
async function remove(id, tenantId) {
    const repo = new records_repository_1.RecordsRepository(tenantId);
    return repo.softDelete(id);
}
//# sourceMappingURL=records.service.js.map