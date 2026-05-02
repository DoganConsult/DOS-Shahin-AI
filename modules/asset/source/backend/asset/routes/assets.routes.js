"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const resilience_1 = require("@dos/platform-core/resilience");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const auth_port_1 = require("../ports/auth.port");
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const db_1 = require("@dos/db");
const asset_schemas_1 = require("../schemas/asset.schemas");
const common_schemas_1 = require("../../../schemas/common.schemas");
const middleware_port_1 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)("asset"));
router.use((0, middleware_port_1.automationMiddleware)("asset"));
router.use((0, middleware_port_1.fieldRbacFilter)("asset"));
router.use((0, middleware_port_1.enforceMandatoryFields)("asset"));
router.use((0, middleware_port_1.enforceStageGates)("asset"));
router.get("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const wsId = req.query.workspace_id;
    const result = wsId
        ? await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".assets WHERE deleted_at IS NULL AND workspace_id = $1 ORDER BY created_at DESC`, [wsId])
        : await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".assets WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    res.json({ assets: result.rows, count: result.rows.length });
}));
router.get("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".assets WHERE asset_id = $1`, [req.params.id]);
    if (!(0, db_1.getFirstRow)(result)) {
        res.status(404).json({ error: "Asset not found" });
        return;
    }
    res.json((0, db_1.getFirstRow)(result));
}));
router.post("/", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.write"), (0, middleware_port_1.validate)({ body: asset_schemas_1.createAssetBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const { name, type, asset_type, criticality, owner, description, name_en, name_ar, custodian_id, cia_confidentiality, cia_integrity, cia_availability, lifecycle_status, department, location, ip_address, classification } = req.body;
    if (!name && !name_en) {
        res.status(400).json({ error: "name required" });
        return;
    }
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".assets
  (name, name_en, name_ar, type, criticality, owner, custodian_id, description,
  cia_confidentiality, cia_integrity, cia_availability, lifecycle_status,
  department, location, ip_address, classification, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`, [name || name_en, name_en || name || '', name_ar || '',
        type || asset_type || 'server', criticality || 'medium', owner || null, custodian_id || null,
        description || '',
        cia_confidentiality || 3, cia_integrity || 3, cia_availability || 3,
        lifecycle_status || 'active',
        department || null, location || null, ip_address || null, classification || 'internal',
        req.user?.userId]);
    (0, middleware_port_1.setAuditData)(res, { action: "create", entityType: "asset", entityId: (0, db_1.getFirstRow)(result)?.asset_id, afterState: (0, db_1.getFirstRow)(result) });
    (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'created', entityType: 'asset', entityId: (0, db_1.getFirstRow)(result)?.asset_id, data: (0, db_1.getFirstRow)(result) }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
    // Emit asset.inventory_updated when a new asset is added to inventory
    (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'inventory_updated', entityType: 'asset', entityId: (0, db_1.getFirstRow)(result)?.asset_id, data: (0, db_1.getFirstRow)(result) }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.status(201).json((0, db_1.getFirstRow)(result));
}));
router.put("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.write"), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: asset_schemas_1.updateAssetBody }), (0, middleware_port_1.lifecycleGate)('asset'), (0, middleware_port_1.requireOwnership)('asset'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const cols = Object.keys(req.body).filter(k => ['name', 'name_en', 'name_ar', 'type', 'criticality', 'owner', 'custodian_id', 'description', 'status', 'classification', 'department', 'location', 'ip_address', 'mac_address', 'os', 'cia_confidentiality', 'cia_integrity', 'cia_availability', 'lifecycle_status', 'last_reviewed_at', 'review_frequency', 'vendor', 'license_expiry'].includes(k));
    if (!cols.length) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
    }
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = cols.map(c => req.body[c]);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".assets SET ${sets.join(', ')}, updated_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING *`, [req.params.id, ...vals]);
    if (!(0, db_1.getFirstRow)(result)) {
        res.status(404).json({ error: "Asset not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "update", entityType: "asset", entityId: req.params.id, afterState: (0, db_1.getFirstRow)(result) });
    (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'updated', entityType: 'asset', entityId: req.params.id, data: (0, db_1.getFirstRow)(result) }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
    // Emit asset.classified when the classification field was updated
    if (req.body.classification) {
        (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'classified', entityType: 'asset', entityId: req.params.id, data: { classification: req.body.classification } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    // Emit asset.inventory_updated for any asset modification
    (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'inventory_updated', entityType: 'asset', entityId: req.params.id, data: (0, db_1.getFirstRow)(result) }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json((0, db_1.getFirstRow)(result));
}));
router.get("/stats/health", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.read"), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const r = await (0, database_port_1.safeQuery)(`
  SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical,
  COUNT(*) FILTER (WHERE owner IS NULL OR owner = '')::int AS without_owner,
  COUNT(*) FILTER (WHERE custodian_id IS NULL OR custodian_id = '')::int AS without_custodian,
  COUNT(*) FILTER (WHERE last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '12 months')::int AS not_reviewed
  FROM "${schema}".assets WHERE deleted_at IS NULL
  `);
    res.json((0, db_1.getFirstRow)(r) || { total: 0, critical: 0, without_owner: 0, without_custodian: 0, not_reviewed: 0 });
}));
router.delete("/:id", auth_port_1.authenticate, (0, auth_port_1.requirePermission)("asset.record.write"), (0, middleware_port_1.requireOwnership)('asset'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".assets SET deleted_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`, [req.params.id]);
    if (!(0, db_1.getFirstRow)(result)) {
        res.status(404).json({ error: "Asset not found" });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: "delete", entityType: "asset", entityId: req.params.id });
    (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'asset', event: 'deleted', entityType: 'asset', entityId: req.params.id }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
    res.json({ message: "Asset deleted", asset_id: (0, db_1.getFirstRow)(result)?.asset_id });
}));
exports.default = router;
//# sourceMappingURL=assets.routes.js.map