"use strict";
// ============================================
// Asset Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssets = listAssets;
exports.getAssetById = getAssetById;
exports.createAsset = createAsset;
exports.updateAsset = updateAsset;
exports.deleteAsset = deleteAsset;
exports.bulkUpdate = bulkUpdate;
exports.bulkRemove = bulkRemove;
exports.assetStats = assetStats;
exports.listClassificationsHandler = listClassificationsHandler;
exports.getClassification = getClassification;
exports.createClassificationHandler = createClassificationHandler;
exports.updateClassificationHandler = updateClassificationHandler;
exports.classifyAsset = classifyAsset;
exports.classificationDistribution = classificationDistribution;
exports.transitionLifecycleStage = transitionLifecycleStage;
exports.lifecycleEvents = lifecycleEvents;
exports.lifecycleDistribution = lifecycleDistribution;
exports.lifecycleStages = lifecycleStages;
exports.computeAssetCriticality = computeAssetCriticality;
exports.bulkCriticality = bulkCriticality;
exports.criticalAssets = criticalAssets;
exports.getVendorLinksHandler = getVendorLinksHandler;
exports.createVendorLinkHandler = createVendorLinkHandler;
exports.deleteVendorLinkHandler = deleteVendorLinkHandler;
exports.getEvidenceLinksHandler = getEvidenceLinksHandler;
exports.createEvidenceLinkHandler = createEvidenceLinkHandler;
exports.deleteEvidenceLinkHandler = deleteEvidenceLinkHandler;
exports.getControlLinksHandler = getControlLinksHandler;
exports.createControlLinkHandler = createControlLinkHandler;
exports.getRiskLinksHandler = getRiskLinksHandler;
exports.createRiskLinkHandler = createRiskLinkHandler;
exports.allLinks = allLinks;
exports.getOwnersHandler = getOwnersHandler;
exports.ownerHistory = ownerHistory;
exports.assignOwnerHandler = assignOwnerHandler;
exports.revokeOwnerHandler = revokeOwnerHandler;
exports.transferOwnerHandler = transferOwnerHandler;
exports.unownedEntities = unownedEntities;
exports.ownershipStats = ownershipStats;
exports.listBizServices = listBizServices;
exports.getBizService = getBizService;
exports.serviceHierarchy = serviceHierarchy;
exports.createBizService = createBizService;
exports.updateBizService = updateBizService;
exports.deleteBizService = deleteBizService;
exports.bizServiceStats = bizServiceStats;
exports.listApps = listApps;
exports.getApp = getApp;
exports.createApp = createApp;
exports.updateApp = updateApp;
exports.deleteApp = deleteApp;
exports.appStats = appStats;
exports.fullServiceMap = fullServiceMap;
exports.serviceImpact = serviceImpact;
exports.serviceMapStats = serviceMapStats;
exports.listDeps = listDeps;
exports.createDep = createDep;
exports.deleteDep = deleteDep;
exports.upstreamChain = upstreamChain;
exports.downstreamChain = downstreamChain;
exports.detectDepCycles = detectDepCycles;
exports.blastRadius = blastRadius;
exports.depStats = depStats;
exports.coverageReport = coverageReport;
exports.agingReport = agingReport;
exports.orphanReport = orphanReport;
exports.classificationReport = classificationReport;
exports.dashboardSummary = dashboardSummary;
const module_sdk_1 = require("@dos/module-sdk");
const index_1 = require("../../../errors/index");
const middleware_port_1 = require("../ports/middleware.port");
// --- Service imports ---
const asset_registry_service_1 = require("../services/asset-registry.service");
const asset_classification_service_1 = require("../services/asset-classification.service");
const asset_lifecycle_service_1 = require("../services/asset-lifecycle.service");
const asset_criticality_service_1 = require("../services/asset-criticality.service");
const asset_linkage_service_1 = require("../services/asset-linkage.service");
const asset_ownership_service_1 = require("../services/asset-ownership.service");
const business_service_service_1 = require("../services/business-service.service");
const application_registry_service_1 = require("../services/application-registry.service");
const service_map_service_1 = require("../services/service-map.service");
const dependency_service_1 = require("../services/dependency.service");
const asset_reports_service_1 = require("../services/asset-reports.service");
// ── ASSET REGISTRY CRUD ────────────────────────────────
async function listAssets(req, res) {
    const result = await (0, asset_registry_service_1.listAssets)(req.tenantId, req.query);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getAssetById(req, res) {
    const asset = await (0, asset_registry_service_1.getAssetById)(req.tenantId, req.params.id);
    if (!asset)
        throw new index_1.NotFoundError('asset', req.params.id);
    res.json((0, module_sdk_1.ok)(asset, req));
}
async function createAsset(req, res) {
    const userId = req.user.userId;
    const asset = await (0, asset_registry_service_1.createAsset)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset', entityId: asset?.asset_id, afterState: asset });
    res.status(201).json((0, module_sdk_1.ok)(asset, req));
}
async function updateAsset(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    const before = await (0, asset_registry_service_1.getAssetById)(req.tenantId, id);
    if (!before)
        throw new index_1.NotFoundError('asset', id);
    const updated = await (0, asset_registry_service_1.updateAsset)(req.tenantId, userId, id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'asset', entityId: id, beforeState: before, afterState: updated });
    res.json((0, module_sdk_1.ok)(updated, req));
}
async function deleteAsset(req, res) {
    const userId = req.user.userId;
    const deleted = await (0, asset_registry_service_1.deleteAsset)(req.tenantId, userId, req.params.id);
    if (!deleted)
        throw new index_1.NotFoundError('asset', req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'asset', entityId: req.params.id });
    res.json((0, module_sdk_1.action)('Asset deleted', req));
}
async function bulkUpdate(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_registry_service_1.bulkUpdateAssets)(req.tenantId, userId, req.body.ids, req.body.update);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function bulkRemove(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_registry_service_1.bulkDeleteAssets)(req.tenantId, userId, req.body.ids);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function assetStats(req, res) {
    const result = await (0, asset_registry_service_1.getAssetStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── CLASSIFICATION ─────────────────────────────────────
async function listClassificationsHandler(req, res) {
    const result = await (0, asset_classification_service_1.listClassifications)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getClassification(req, res) {
    const result = await (0, asset_classification_service_1.getClassificationById)(req.tenantId, req.params.id);
    if (!result)
        throw new index_1.NotFoundError('classification', req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createClassificationHandler(req, res) {
    const result = await (0, asset_classification_service_1.createClassification)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'classification', entityId: result?.classification_id, afterState: result });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function updateClassificationHandler(req, res) {
    const result = await (0, asset_classification_service_1.updateClassification)(req.tenantId, req.params.id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'classification', entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function classifyAsset(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_classification_service_1.classifyAsset)(req.tenantId, userId, req.params.id, req.body.classificationId);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'asset_classification', entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function classificationDistribution(req, res) {
    const result = await (0, asset_classification_service_1.getClassificationDistribution)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── LIFECYCLE ──────────────────────────────────────────
async function transitionLifecycleStage(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_lifecycle_service_1.transitionStage)(req.tenantId, req.body.entityId, req.body.newStage, userId);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'lifecycle', entityId: req.body.entityId });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function lifecycleEvents(req, res) {
    const result = await (0, asset_lifecycle_service_1.getLifecycleEvents)(req.tenantId, req.params.entityId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function lifecycleDistribution(req, res) {
    const result = await (0, asset_lifecycle_service_1.getLifecycleDistribution)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function lifecycleStages(req, res) {
    const result = await (0, asset_lifecycle_service_1.getLifecycleStages)();
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── CRITICALITY ────────────────────────────────────────
async function computeAssetCriticality(req, res) {
    const result = await (0, asset_criticality_service_1.computeCriticality)(req.tenantId, req.params.id);
    if (!result)
        throw new index_1.NotFoundError('asset', req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function bulkCriticality(req, res) {
    const result = await (0, asset_criticality_service_1.bulkComputeCriticality)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function criticalAssets(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 25;
    const result = await (0, asset_criticality_service_1.getCriticalAssets)(req.tenantId, page, pageSize);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── LINKAGE ────────────────────────────────────────────
async function getVendorLinksHandler(req, res) {
    const result = await (0, asset_linkage_service_1.getVendorLinks)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createVendorLinkHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_linkage_service_1.createVendorLink)(req.tenantId, userId, req.params.id, req.body.vendorId, req.body.linkType, req.body.notes, req.body.contractRef);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_vendor_link', entityId: result?.link_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function deleteVendorLinkHandler(req, res) {
    const _result = await (0, asset_linkage_service_1.deleteVendorLink)(req.tenantId, req.params.linkId);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'asset_vendor_link', entityId: req.params.linkId });
    res.json((0, module_sdk_1.action)('Vendor link deleted', req));
}
async function getEvidenceLinksHandler(req, res) {
    const result = await (0, asset_linkage_service_1.getEvidenceLinks)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createEvidenceLinkHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_linkage_service_1.createEvidenceLink)(req.tenantId, userId, req.params.id, req.body.evidenceTaskId, req.body.linkType, req.body.notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_evidence_link', entityId: result?.link_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function deleteEvidenceLinkHandler(req, res) {
    const _result = await (0, asset_linkage_service_1.deleteEvidenceLink)(req.tenantId, req.params.linkId);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'asset_evidence_link', entityId: req.params.linkId });
    res.json((0, module_sdk_1.action)('Evidence link deleted', req));
}
async function getControlLinksHandler(req, res) {
    const result = await (0, asset_linkage_service_1.getControlLinks)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createControlLinkHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_linkage_service_1.createControlLink)(req.tenantId, userId, req.params.id, req.body.controlId, req.body.linkPurpose, req.body.assetType);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_control_link', entityId: result?.link_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function getRiskLinksHandler(req, res) {
    const result = await (0, asset_linkage_service_1.getRiskLinks)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createRiskLinkHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_linkage_service_1.createRiskLink)(req.tenantId, userId, req.params.id, req.body.riskId, req.body.linkType, req.body.notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_risk_link', entityId: result?.link_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function allLinks(req, res) {
    const result = await (0, asset_linkage_service_1.getAllLinksForAsset)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── OWNERSHIP ──────────────────────────────────────────
async function getOwnersHandler(req, res) {
    const result = await (0, asset_ownership_service_1.getOwners)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function ownerHistory(req, res) {
    const result = await (0, asset_ownership_service_1.getOwnerHistory)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function assignOwnerHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_ownership_service_1.assignOwner)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'ownership', entityId: result?.ownership_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function revokeOwnerHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_ownership_service_1.revokeOwner)(req.tenantId, userId, req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'ownership', entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function transferOwnerHandler(req, res) {
    const userId = req.user.userId;
    const result = await (0, asset_ownership_service_1.transferOwner)(req.tenantId, userId, req.body.entityType, req.body.entityId, req.body.ownerType, req.body.newOwnerId, req.body.notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'ownership', entityId: req.body.entityId });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function unownedEntities(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 25;
    const result = await (0, asset_ownership_service_1.getUnownedEntities)(req.tenantId, req.params.entityType, page, pageSize);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function ownershipStats(req, res) {
    const result = await (0, asset_ownership_service_1.getOwnershipStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── BUSINESS SERVICES ──────────────────────────────────
async function listBizServices(req, res) {
    const result = await (0, business_service_service_1.listBusinessServices)(req.tenantId, req.query);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getBizService(req, res) {
    const svc = await (0, business_service_service_1.getBusinessServiceById)(req.tenantId, req.params.id);
    if (!svc)
        throw new index_1.NotFoundError('business_service', req.params.id);
    res.json((0, module_sdk_1.ok)(svc, req));
}
async function serviceHierarchy(req, res) {
    const rootId = req.query.rootId;
    const result = await (0, business_service_service_1.getServiceHierarchy)(req.tenantId, rootId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createBizService(req, res) {
    const userId = req.user.userId;
    const svc = await (0, business_service_service_1.createBusinessService)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'business_service', entityId: svc?.service_id, afterState: svc });
    res.status(201).json((0, module_sdk_1.ok)(svc, req));
}
async function updateBizService(req, res) {
    const userId = req.user.userId;
    const result = await (0, business_service_service_1.updateBusinessService)(req.tenantId, userId, req.params.id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'business_service', entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function deleteBizService(req, res) {
    const userId = req.user.userId;
    await (0, business_service_service_1.deleteBusinessService)(req.tenantId, userId, req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'business_service', entityId: req.params.id });
    res.json((0, module_sdk_1.action)('Business service deleted', req));
}
async function bizServiceStats(req, res) {
    const result = await (0, business_service_service_1.getServiceStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── APPLICATIONS ───────────────────────────────────────
async function listApps(req, res) {
    const result = await (0, application_registry_service_1.listApplications)(req.tenantId, req.query);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getApp(req, res) {
    const app = await (0, application_registry_service_1.getApplicationById)(req.tenantId, req.params.id);
    if (!app)
        throw new index_1.NotFoundError('application', req.params.id);
    res.json((0, module_sdk_1.ok)(app, req));
}
async function createApp(req, res) {
    const userId = req.user.userId;
    const app = await (0, application_registry_service_1.createApplication)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'application', entityId: app?.app_id, afterState: app });
    res.status(201).json((0, module_sdk_1.ok)(app, req));
}
async function updateApp(req, res) {
    const userId = req.user.userId;
    const result = await (0, application_registry_service_1.updateApplication)(req.tenantId, userId, req.params.id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'application', entityId: req.params.id });
    res.json((0, module_sdk_1.ok)(result, req));
}
async function deleteApp(req, res) {
    const userId = req.user.userId;
    await (0, application_registry_service_1.deleteApplication)(req.tenantId, userId, req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'application', entityId: req.params.id });
    res.json((0, module_sdk_1.action)('Application deleted', req));
}
async function appStats(req, res) {
    const result = await (0, application_registry_service_1.getApplicationStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── SERVICE MAP ────────────────────────────────────────
async function fullServiceMap(req, res) {
    const result = await (0, service_map_service_1.getFullServiceMap)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function serviceImpact(req, res) {
    const result = await (0, service_map_service_1.getServiceImpact)(req.tenantId, req.params.id);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function serviceMapStats(req, res) {
    const result = await (0, service_map_service_1.getServiceMapStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── DEPENDENCIES ───────────────────────────────────────
async function listDeps(req, res) {
    const result = await (0, dependency_service_1.listDependencies)(req.tenantId, req.query);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function createDep(req, res) {
    const userId = req.user.userId;
    const result = await (0, dependency_service_1.createDependency)(req.tenantId, userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'dependency', entityId: result?.dependency_id });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
async function deleteDep(req, res) {
    const userId = req.user.userId;
    await (0, dependency_service_1.deleteDependency)(req.tenantId, userId, req.params.id);
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'dependency', entityId: req.params.id });
    res.json((0, module_sdk_1.action)('Dependency deleted', req));
}
async function upstreamChain(req, res) {
    const maxDepth = parseInt(req.query.maxDepth, 10) || 10;
    const result = await (0, dependency_service_1.getUpstreamChain)(req.tenantId, req.params.entityType, req.params.entityId, maxDepth);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function downstreamChain(req, res) {
    const maxDepth = parseInt(req.query.maxDepth, 10) || 10;
    const result = await (0, dependency_service_1.getDownstreamChain)(req.tenantId, req.params.entityType, req.params.entityId, maxDepth);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function detectDepCycles(req, res) {
    const result = await (0, dependency_service_1.detectCycles)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function blastRadius(req, res) {
    const result = await (0, dependency_service_1.getBlastRadius)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function depStats(req, res) {
    const result = await (0, dependency_service_1.getDependencyStats)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── REPORTS ────────────────────────────────────────────
async function coverageReport(req, res) {
    const result = await (0, asset_reports_service_1.getCoverageReport)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function agingReport(req, res) {
    const result = await (0, asset_reports_service_1.getAgingReport)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function orphanReport(req, res) {
    const result = await (0, asset_reports_service_1.getOrphanReport)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function classificationReport(req, res) {
    const result = await (0, asset_reports_service_1.getClassificationReport)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function dashboardSummary(req, res) {
    const result = await (0, asset_reports_service_1.getDashboardSummary)(req.tenantId);
    res.json((0, module_sdk_1.ok)(result, req));
}
//# sourceMappingURL=asset.controller.js.map