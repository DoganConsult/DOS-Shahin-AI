/**
 * Asset Management services barrel.
 */
export { listAssets, getAssetById, createAsset, updateAsset, deleteAsset, bulkUpdateAssets, bulkDeleteAssets, getAssetStats } from './asset-registry.service';
export { listApplications, getApplicationById, createApplication, updateApplication, deleteApplication, getApplicationStats } from './application-registry.service';
export { listBusinessServices, getBusinessServiceById, getServiceHierarchy, createBusinessService, updateBusinessService, deleteBusinessService, getServiceStats } from './business-service.service';
export { getFullServiceMap, getServiceImpact, getServiceMapStats } from './service-map.service';
export { listDependencies, createDependency, deleteDependency, getUpstreamChain, getDownstreamChain, detectCycles, getBlastRadius, getDependencyStats } from './dependency.service';
export { computeCriticality, bulkComputeCriticality, getCriticalAssets } from './asset-criticality.service';
export { getVendorLinks, createVendorLink, deleteVendorLink, getEvidenceLinks, createEvidenceLink, deleteEvidenceLink, getControlLinks, createControlLink, getRiskLinks, createRiskLink, getAllLinksForAsset } from './asset-linkage.service';
export { getOwners, getOwnerHistory, assignOwner, revokeOwner, transferOwner, getUnownedEntities, getOwnershipStats } from './asset-ownership.service';
export { listClassifications, getClassificationById, createClassification, updateClassification, classifyAsset, getClassificationDistribution } from './asset-classification.service';
export { getValidTransitions, transitionStage, getLifecycleEvents, getLifecycleDistribution, getLifecycleStages } from './asset-lifecycle.service';
export { getCoverageReport, getAgingReport, getOrphanReport, getClassificationReport, getDashboardSummary } from './asset-reports.service';
