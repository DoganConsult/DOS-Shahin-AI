"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecords = listRecords;
exports.getRecordById = getRecordById;
exports.createRecord = createRecord;
exports.updateRecord = updateRecord;
exports.deleteRecord = deleteRecord;
const module_sdk_1 = require("@dos/module-sdk");
const index_1 = require("../../../errors/index");
const middleware_port_1 = require("../ports/middleware.port");
const recordsSvc = __importStar(require("../services/records.service"));
const records_event_service_1 = require("../services/records-event.service");
async function listRecords(req, res) {
    const result = await recordsSvc.list(req.tenantId, Number(req.query.limit) || 50, Number(req.query.offset) || 0);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getRecordById(req, res) {
    const result = await recordsSvc.getById(req.params.id, req.tenantId);
    if (!result)
        throw new index_1.NotFoundError('record', req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createRecord(req, res) {
    const userId = req.user.userId;
    const result = await recordsSvc.create({ ...req.body, created_by: userId }, req.tenantId);
    const entityId = result?.record_id ?? result?.id;
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'record', entityId });
    (0, records_event_service_1.emitRecordsEvent)({ tenantId: req.tenantId, entityType: 'record', entityId, action: 'created', triggeredBy: userId, data: result });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function updateRecord(req, res) {
    const userId = req.user.userId;
    const result = await recordsSvc.update(req.params.id, { ...req.body, updated_by: userId }, req.tenantId);
    if (!result)
        throw new index_1.NotFoundError('record', req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'record', entityId: req.params.id });
    (0, records_event_service_1.emitRecordsEvent)({ tenantId: req.tenantId, entityType: 'record', entityId: req.params.id, action: 'updated', triggeredBy: userId, data: result });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function deleteRecord(req, res) {
    const userId = req.user.userId;
    await recordsSvc.remove(req.params.id, req.tenantId);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'record', entityId: req.params.id });
    (0, records_event_service_1.emitRecordsEvent)({ tenantId: req.tenantId, entityType: 'record', entityId: req.params.id, action: 'deleted', triggeredBy: userId });
    res.json((0, module_sdk_1.action)('Record deleted', req));
}
//# sourceMappingURL=records.controller.js.map