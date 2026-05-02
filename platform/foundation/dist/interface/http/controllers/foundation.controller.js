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
exports.listNodes = listNodes;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.transitionStatus = transitionStatus;
exports.remove = remove;
exports.getTree = getTree;
exports.getChildNodes = getChildNodes;
const response_port_1 = require("../../../ports/response.port");
const index_1 = require("../../../domain/errors/index");
const middleware_port_1 = require("../../../ports/middleware.port");
const foundationService = __importStar(require("../../../application/services/foundation.service"));
async function listNodes(req, res) {
    const result = await foundationService.getNodes(req.tenantId, req.query);
    res.json((0, response_port_1.ok)(result, req));
}
async function getById(req, res) {
    const node = await foundationService.getNodeById(req.tenantId, req.params.id);
    if (!node)
        throw new index_1.NotFoundError('foundation_node', req.params.id);
    res.json((0, response_port_1.ok)(node, req));
}
async function create(req, res) {
    const userId = req.user.userId;
    const node = await foundationService.createNode(req.tenantId, { ...req.body, createdBy: userId });
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'foundation_node', entityId: node?.id, afterState: node });
    res.status(201).json((0, response_port_1.ok)(node, req));
}
async function update(req, res) {
    const userId = req.user.userId;
    const updated = await foundationService.updateNode(req.tenantId, req.params.id, { ...req.body, updatedBy: userId });
    if (!updated)
        throw new index_1.NotFoundError('foundation_node', req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'foundation_node', entityId: req.params.id, afterState: updated });
    res.json((0, response_port_1.ok)(updated, req));
}
async function transitionStatus(req, res) {
    const userId = req.user.userId;
    const { toStatus } = req.body;
    const updated = await foundationService.transitionStatus(req.tenantId, req.params.id, toStatus, userId);
    if (!updated)
        throw new index_1.NotFoundError('foundation_node', req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'status_change', entityType: 'foundation_node', entityId: req.params.id, afterState: updated });
    res.json((0, response_port_1.ok)(updated, req));
}
async function remove(req, res) {
    const userId = req.user.userId;
    const deleted = await foundationService.deleteNode(req.tenantId, req.params.id, userId);
    if (!deleted)
        throw new index_1.NotFoundError('foundation_node', req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'foundation_node', entityId: req.params.id });
    res.json((0, response_port_1.action)('Foundation node deleted', req));
}
async function getTree(req, res) {
    const tree = await foundationService.getHierarchyTree(req.tenantId);
    res.json((0, response_port_1.ok)(tree, req));
}
async function getChildNodes(req, res) {
    const children = await foundationService.getChildren(req.tenantId, req.params.id);
    res.json((0, response_port_1.ok)(children, req));
}
//# sourceMappingURL=foundation.controller.js.map