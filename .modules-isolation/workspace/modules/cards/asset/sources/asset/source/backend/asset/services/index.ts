import { safeQuery } from "@dos/db";

/**
 * Asset Management services barrel.
 */

// Asset Registry
export { listAssets, getAssetById, createAsset, updateAsset, deleteAsset, bulkUpdateAssets, bulkDeleteAssets, getAssetStats } from './asset-registry.service';

// Application Registry
export { listApplications, getApplicationById, createApplication, updateApplication, deleteApplication, getApplicationStats } from './application-registry.service';

// Business Services
export { listBusinessServices, getBusinessServiceById, getServiceHierarchy, createBusinessService, updateBusinessService, deleteBusinessService, getServiceStats } from './business-service.service';

// Service Map
export { getFullServiceMap, getServiceImpact, getServiceMapStats } from './service-map.service';

// Dependencies
export { listDependencies, createDependency, deleteDependency, getUpstreamChain, getDownstreamChain, detectCycles, getBlastRadius, getDependencyStats } from './dependency.service';

// Criticality
export { computeCriticality, bulkComputeCriticality, getCriticalAssets } from './asset-criticality.service';

// Linkage
export { getVendorLinks, createVendorLink, deleteVendorLink, getEvidenceLinks, createEvidenceLink, deleteEvidenceLink, getControlLinks, createControlLink, getRiskLinks, createRiskLink, getAllLinksForAsset } from './asset-linkage.service';

// Ownership
export { getOwners, getOwnerHistory, assignOwner, revokeOwner, transferOwner, getUnownedEntities, getOwnershipStats } from './asset-ownership.service';

// Classification
export { listClassifications, getClassificationById, createClassification, updateClassification, classifyAsset, getClassificationDistribution } from './asset-classification.service';

// Lifecycle
export { getValidTransitions, transitionStage, getLifecycleEvents, getLifecycleDistribution, getLifecycleStages } from './asset-lifecycle.service';

// Reports
export { getCoverageReport, getAgingReport, getOrphanReport, getClassificationReport, getDashboardSummary } from './asset-reports.service';
