"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetsService = void 0;
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
async function list(...args) { return []; }
async function getById(...args) { return null; }
async function create(...args) { return {}; }
async function update(...args) { return {}; }
async function remove(...args) { }
class WidgetsService {
    async list(...args) { return []; }
    async getById(...args) { return null; }
    async create(...args) { return {}; }
    async update(...args) { return {}; }
    async remove(...args) { }
}
exports.WidgetsService = WidgetsService;
//# sourceMappingURL=widgets.service.js.map