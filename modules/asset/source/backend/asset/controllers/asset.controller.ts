// ============================================
// Asset Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  listAssets as listAssetsService, getAssetById as getAssetByIdService,
  createAsset as createAssetService, updateAsset as updateAssetService,
  deleteAsset as deleteAssetService, bulkUpdateAssets, bulkDeleteAssets,
  getAssetStats,
} from '../services/asset-registry.service';
import {
  listClassifications, getClassificationById, createClassification,
  updateClassification, classifyAsset as classifyAssetService,
  getClassificationDistribution,
} from '../services/asset-classification.service';
import {
  transitionStage, getLifecycleEvents, getLifecycleDistribution, getLifecycleStages,
} from '../services/asset-lifecycle.service';
import {
  computeCriticality, bulkComputeCriticality, getCriticalAssets,
} from '../services/asset-criticality.service';
import {
  getVendorLinks, createVendorLink, deleteVendorLink,
  getEvidenceLinks, createEvidenceLink, deleteEvidenceLink,
  getControlLinks, createControlLink,
  getRiskLinks, createRiskLink,
  getAllLinksForAsset,
} from '../services/asset-linkage.service';
import {
  getOwners, getOwnerHistory, assignOwner, revokeOwner,
  transferOwner, getUnownedEntities, getOwnershipStats,
} from '../services/asset-ownership.service';
import {
  listBusinessServices, getBusinessServiceById, getServiceHierarchy,
  createBusinessService, updateBusinessService, deleteBusinessService,
  getServiceStats,
} from '../services/business-service.service';
import {
  listApplications, getApplicationById, createApplication,
  updateApplication, deleteApplication, getApplicationStats,
} from '../services/application-registry.service';
import {
  getFullServiceMap, getServiceImpact, getServiceMapStats,
} from '../services/service-map.service';
import {
  listDependencies, createDependency, deleteDependency,
  getUpstreamChain, getDownstreamChain, detectCycles,
  getBlastRadius, getDependencyStats,
} from '../services/dependency.service';
import {
  getCoverageReport, getAgingReport, getOrphanReport,
  getClassificationReport, getDashboardSummary,
} from '../services/asset-reports.service';

// ── ASSET REGISTRY CRUD ────────────────────────────────

export async function listAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listAssetsService(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getAssetById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const asset = await getAssetByIdService(req.tenantId!, req.params.id);
  if (!asset) throw new NotFoundError('asset', req.params.id);
  res.json(ok(asset, req));
}

export async function createAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const asset = await createAssetService(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'asset', entityId: asset?.asset_id, afterState: asset });
  res.status(201).json(ok(asset, req));
}

export async function updateAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId!;
  const before = await getAssetByIdService(req.tenantId!, id);
  if (!before) throw new NotFoundError('asset', id);
  const updated = await updateAssetService(req.tenantId!, userId, id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'asset', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function deleteAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const deleted = await deleteAssetService(req.tenantId!, userId, req.params.id);
  if (!deleted) throw new NotFoundError('asset', req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'asset', entityId: req.params.id });
  res.json(action('Asset deleted', req));
}

export async function bulkUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await bulkUpdateAssets(req.tenantId!, userId, req.body.ids, req.body.update);
  res.json(ok(result, req));
}

export async function bulkRemove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await bulkDeleteAssets(req.tenantId!, userId, req.body.ids);
  res.json(ok(result, req));
}

export async function assetStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAssetStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── CLASSIFICATION ─────────────────────────────────────

export async function listClassificationsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listClassifications(req.tenantId!);
  res.json(ok(result, req));
}

export async function getClassification(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getClassificationById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('classification', req.params.id);
  res.json(ok(result, req));
}

export async function createClassificationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createClassification(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'classification', entityId: result?.classification_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateClassificationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateClassification(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'classification', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function classifyAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await classifyAssetService(req.tenantId!, userId, req.params.id, req.body.classificationId);
  setAuditData(res as any, { action: 'update', entityType: 'asset_classification', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function classificationDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getClassificationDistribution(req.tenantId!);
  res.json(ok(result, req));
}

// ── LIFECYCLE ──────────────────────────────────────────

export async function transitionLifecycleStage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await transitionStage(
    req.tenantId!,
    req.body.entityId,
    req.body.newStage,
    userId,
  );
  setAuditData(res as any, { action: 'update', entityType: 'lifecycle', entityId: req.body.entityId });
  res.json(ok(result, req));
}

export async function lifecycleEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getLifecycleEvents(req.tenantId!, req.params.entityId);
  res.json(ok(result, req));
}

export async function lifecycleDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getLifecycleDistribution(req.tenantId!);
  res.json(ok(result, req));
}

export async function lifecycleStages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getLifecycleStages();
  res.json(ok(result, req));
}

// ── CRITICALITY ────────────────────────────────────────

export async function computeAssetCriticality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await computeCriticality(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('asset', req.params.id);
  res.json(ok(result, req));
}

export async function bulkCriticality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await bulkComputeCriticality(req.tenantId!);
  res.json(ok(result, req));
}

export async function criticalAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 25;
  const result = await getCriticalAssets(req.tenantId!, page, pageSize);
  res.json(ok(result, req));
}

// ── LINKAGE ────────────────────────────────────────────

export async function getVendorLinksHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getVendorLinks(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function createVendorLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createVendorLink(req.tenantId!, userId, req.params.id, req.body.vendorId, req.body.linkType, req.body.notes, req.body.contractRef);
  setAuditData(res as any, { action: 'create', entityType: 'asset_vendor_link', entityId: result?.link_id });
  res.status(201).json(ok(result, req));
}

export async function deleteVendorLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _result = await deleteVendorLink(req.tenantId!, req.params.linkId);
  setAuditData(res as any, { action: 'delete', entityType: 'asset_vendor_link', entityId: req.params.linkId });
  res.json(action('Vendor link deleted', req));
}

export async function getEvidenceLinksHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEvidenceLinks(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function createEvidenceLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createEvidenceLink(req.tenantId!, userId, req.params.id, req.body.evidenceTaskId, req.body.linkType, req.body.notes);
  setAuditData(res as any, { action: 'create', entityType: 'asset_evidence_link', entityId: result?.link_id });
  res.status(201).json(ok(result, req));
}

export async function deleteEvidenceLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _result = await deleteEvidenceLink(req.tenantId!, req.params.linkId);
  setAuditData(res as any, { action: 'delete', entityType: 'asset_evidence_link', entityId: req.params.linkId });
  res.json(action('Evidence link deleted', req));
}

export async function getControlLinksHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getControlLinks(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function createControlLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createControlLink(req.tenantId!, userId, req.params.id, req.body.controlId, req.body.linkPurpose, req.body.assetType);
  setAuditData(res as any, { action: 'create', entityType: 'asset_control_link', entityId: result?.link_id });
  res.status(201).json(ok(result, req));
}

export async function getRiskLinksHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRiskLinks(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function createRiskLinkHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createRiskLink(req.tenantId!, userId, req.params.id, req.body.riskId, req.body.linkType, req.body.notes);
  setAuditData(res as any, { action: 'create', entityType: 'asset_risk_link', entityId: result?.link_id });
  res.status(201).json(ok(result, req));
}

export async function allLinks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAllLinksForAsset(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── OWNERSHIP ──────────────────────────────────────────

export async function getOwnersHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOwners(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json(ok(result, req));
}

export async function ownerHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOwnerHistory(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json(ok(result, req));
}

export async function assignOwnerHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await assignOwner(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'ownership', entityId: result?.ownership_id });
  res.status(201).json(ok(result, req));
}

export async function revokeOwnerHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await revokeOwner(req.tenantId!, userId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'ownership', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function transferOwnerHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await transferOwner(
    req.tenantId!, userId,
    req.body.entityType, req.body.entityId,
    req.body.ownerType, req.body.newOwnerId, req.body.notes,
  );
  setAuditData(res as any, { action: 'update', entityType: 'ownership', entityId: req.body.entityId });
  res.json(ok(result, req));
}

export async function unownedEntities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 25;
  const result = await getUnownedEntities(req.tenantId!, req.params.entityType, page, pageSize);
  res.json(ok(result, req));
}

export async function ownershipStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOwnershipStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── BUSINESS SERVICES ──────────────────────────────────

export async function listBizServices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listBusinessServices(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await getBusinessServiceById(req.tenantId!, req.params.id);
  if (!svc) throw new NotFoundError('business_service', req.params.id);
  res.json(ok(svc, req));
}

export async function serviceHierarchy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const rootId = req.query.rootId as string | undefined;
  const result = await getServiceHierarchy(req.tenantId!, rootId);
  res.json(ok(result, req));
}

export async function createBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const svc = await createBusinessService(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'business_service', entityId: svc?.service_id, afterState: svc });
  res.status(201).json(ok(svc, req));
}

export async function updateBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateBusinessService(req.tenantId!, userId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'business_service', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteBizService(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await deleteBusinessService(req.tenantId!, userId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'business_service', entityId: req.params.id });
  res.json(action('Business service deleted', req));
}

export async function bizServiceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── APPLICATIONS ───────────────────────────────────────

export async function listApps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listApplications(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getApp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const app = await getApplicationById(req.tenantId!, req.params.id);
  if (!app) throw new NotFoundError('application', req.params.id);
  res.json(ok(app, req));
}

export async function createApp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const app = await createApplication(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'application', entityId: app?.app_id, afterState: app });
  res.status(201).json(ok(app, req));
}

export async function updateApp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateApplication(req.tenantId!, userId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'application', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteApp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await deleteApplication(req.tenantId!, userId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'application', entityId: req.params.id });
  res.json(action('Application deleted', req));
}

export async function appStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getApplicationStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── SERVICE MAP ────────────────────────────────────────

export async function fullServiceMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFullServiceMap(req.tenantId!);
  res.json(ok(result, req));
}

export async function serviceImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceImpact(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function serviceMapStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getServiceMapStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── DEPENDENCIES ───────────────────────────────────────

export async function listDeps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listDependencies(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function createDep(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createDependency(req.tenantId!, userId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'dependency', entityId: result?.dependency_id });
  res.status(201).json(ok(result, req));
}

export async function deleteDep(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  await deleteDependency(req.tenantId!, userId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'dependency', entityId: req.params.id });
  res.json(action('Dependency deleted', req));
}

export async function upstreamChain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const maxDepth = parseInt(req.query.maxDepth as string, 10) || 10;
  const result = await getUpstreamChain(req.tenantId!, req.params.entityType, req.params.entityId, maxDepth);
  res.json(ok(result, req));
}

export async function downstreamChain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const maxDepth = parseInt(req.query.maxDepth as string, 10) || 10;
  const result = await getDownstreamChain(req.tenantId!, req.params.entityType, req.params.entityId, maxDepth);
  res.json(ok(result, req));
}

export async function detectDepCycles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectCycles(req.tenantId!);
  res.json(ok(result, req));
}

export async function blastRadius(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBlastRadius(req.tenantId!, req.params.entityType, req.params.entityId);
  res.json(ok(result, req));
}

export async function depStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDependencyStats(req.tenantId!);
  res.json(ok(result, req));
}

// ── REPORTS ────────────────────────────────────────────

export async function coverageReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCoverageReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function agingReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgingReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function orphanReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOrphanReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function classificationReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getClassificationReport(req.tenantId!);
  res.json(ok(result, req));
}

export async function dashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDashboardSummary(req.tenantId!);
  res.json(ok(result, req));
}
