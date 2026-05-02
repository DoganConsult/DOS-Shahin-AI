import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssetDto {
  id: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  type: string;
  classification: string;
  status: string;
  ownerId?: string;
  ownerName?: string;
  departmentId?: string;
  departmentName?: string;
  criticality: string;
  vendor?: string;
  location?: string;
  ipAddress?: string;
  tags: string[];
  cmdbId?: string;
  lastScanDate?: string;
  assetCategory?: string;
  parentAssetId?: string;
  businessServiceId?: string;
  dataClassificationId?: string;
  acquisitionDate?: string;
  disposalDate?: string;
  lifecycleStage?: string;
  valuationAmount?: number;
  valuationCurrency?: string;
  complianceScore?: number;
  riskScore?: number;
  externalExposure?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListResponse {
  data: AssetDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApplicationDto {
  applicationId: string;
  name: string;
  appType: string;
  vendor?: string;
  version?: string;
  environment: string;
  businessOwner?: string;
  technicalOwner?: string;
  department?: string;
  criticality: string;
  status: string;
  hostingType: string;
  hostingProvider?: string;
  url?: string;
  dataClassification?: string;
  licenseType?: string;
  licenseExpiry?: string;
  linkedAssetIds: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessServiceDto {
  serviceId: string;
  name: string;
  description?: string;
  serviceType: string;
  businessOwner?: string;
  technicalOwner?: string;
  department?: string;
  criticality: string;
  status: string;
  slaTargetUptime?: number;
  rtoHours?: number;
  rpoHours?: number;
  parentServiceId?: string;
  linkedApplicationIds: string[];
  linkedAssetIds: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DependencyDto {
  dependencyId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  dependencyType: string;
  criticality: string;
  direction: string;
  notes?: string;
  createdAt: string;
}

export interface ClassificationDto {
  classificationId: string;
  code: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
  level: number;
  color?: string;
  handlingRequirements?: string;
  retentionPeriodDays?: number;
  requiresEncryption: boolean;
  requiresDlp: boolean;
}

export interface OwnerDto {
  ownershipId: string;
  entityType: string;
  entityId: string;
  ownerType: string;
  ownerUserId: string;
  assignedAt: string;
  revokedAt?: string;
  notes?: string;
}

export interface LifecycleEventDto {
  eventId: string;
  entityType: string;
  entityId: string;
  fromStage?: string;
  toStage: string;
  performedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface VendorLinkDto {
  linkId: string;
  assetId: string;
  vendorId: string;
  linkType: string;
  contractRef?: string;
  notes?: string;
}

export interface EvidenceLinkDto {
  linkId: string;
  assetId: string;
  evidenceTaskId: string;
  linkType: string;
  notes?: string;
}

export interface AssetHomeKpis {
  totalAssets: number;
  totalApplications: number;
  totalServices: number;
  criticalAssets: number;
  unownedAssets: number;
  criticalityBreakdown: Record<string, number>;
  classificationDistribution: Record<string, number>;
  lifecycleDistribution: Record<string, number>;
}

export interface ServiceMapNode {
  id: string;
  name: string;
  type: string;
  criticality: string;
  children: ServiceMapNode[];
}

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  private http = inject(HttpClient);
  private base = '/api/assets';

  list(params?: Record<string, string | number | undefined>): Observable<AssetListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') httpParams = httpParams.set(k, String(v)); });
    }
    return this.http.get<AssetListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<AssetDto> {
    return this.http.get<AssetDto>(`${this.base}/${id}`);
  }

  create(asset: Partial<AssetDto>): Observable<AssetDto> {
    return this.http.post<AssetDto>(this.base, asset);
  }

  update(id: string, asset: Partial<AssetDto>): Observable<AssetDto> {
    return this.http.put<AssetDto>(`${this.base}/${id}`, asset);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  getHomeKpis(): Observable<AssetHomeKpis> {
    return this.http.get<AssetHomeKpis>('/api/asset-home/kpis');
  }

  listApplications(params?: Record<string, string | number | undefined>): Observable<{ data: ApplicationDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<{ data: ApplicationDto[]; total: number }>('/api/asset-applications', { params: httpParams });
  }

  getApplication(id: string): Observable<ApplicationDto> {
    return this.http.get<ApplicationDto>(`/api/asset-applications/${id}`);
  }

  createApplication(data: Partial<ApplicationDto>): Observable<ApplicationDto> {
    return this.http.post<ApplicationDto>('/api/asset-applications', data);
  }

  updateApplication(id: string, data: Partial<ApplicationDto>): Observable<ApplicationDto> {
    return this.http.put<ApplicationDto>(`/api/asset-applications/${id}`, data);
  }

  deleteApplication(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/asset-applications/${id}`);
  }

  listServices(params?: Record<string, string | number | undefined>): Observable<{ data: BusinessServiceDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<{ data: BusinessServiceDto[]; total: number }>('/api/asset-services', { params: httpParams });
  }

  getService(id: string): Observable<BusinessServiceDto> {
    return this.http.get<BusinessServiceDto>(`/api/asset-services/${id}`);
  }

  createService(data: Partial<BusinessServiceDto>): Observable<BusinessServiceDto> {
    return this.http.post<BusinessServiceDto>('/api/asset-services', data);
  }

  updateService(id: string, data: Partial<BusinessServiceDto>): Observable<BusinessServiceDto> {
    return this.http.put<BusinessServiceDto>(`/api/asset-services/${id}`, data);
  }

  deleteService(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/asset-services/${id}`);
  }

  getServiceMap(): Observable<{ tree: ServiceMapNode[] }> {
    return this.http.get<{ tree: ServiceMapNode[] }>('/api/asset-service-map');
  }

  getServiceImpact(serviceId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/api/asset-service-map/impact/${serviceId}`);
  }

  listDependencies(params?: Record<string, string>): Observable<{ data: DependencyDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) httpParams = httpParams.set(k, v); });
    return this.http.get<{ data: DependencyDto[]; total: number }>('/api/asset-dependencies', { params: httpParams });
  }

  createDependency(data: Partial<DependencyDto>): Observable<DependencyDto> {
    return this.http.post<DependencyDto>('/api/asset-dependencies', data);
  }

  deleteDependency(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/asset-dependencies/${id}`);
  }

  getUpstream(entityType: string, entityId: string): Observable<{ chain: DependencyDto[] }> {
    return this.http.get<{ chain: DependencyDto[] }>(`/api/asset-dependencies/upstream/${entityType}/${entityId}`);
  }

  getDownstream(entityType: string, entityId: string): Observable<{ chain: DependencyDto[] }> {
    return this.http.get<{ chain: DependencyDto[] }>(`/api/asset-dependencies/downstream/${entityType}/${entityId}`);
  }

  computeCriticality(assetId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`/api/asset-criticality/compute/${assetId}`, {});
  }

  bulkComputeCriticality(): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/asset-criticality/bulk-compute', {});
  }

  getCriticalAssets(): Observable<{ data: AssetDto[] }> {
    return this.http.get<{ data: AssetDto[] }>('/api/asset-criticality/critical');
  }

  getVendorLinks(assetId: string): Observable<{ data: VendorLinkDto[] }> {
    return this.http.get<{ data: VendorLinkDto[] }>(`/api/asset-linkage/vendor/${assetId}`);
  }

  createVendorLink(data: Partial<VendorLinkDto>): Observable<VendorLinkDto> {
    return this.http.post<VendorLinkDto>('/api/asset-linkage/vendor', data);
  }

  deleteVendorLink(linkId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/asset-linkage/vendor/${linkId}`);
  }

  getEvidenceLinks(assetId: string): Observable<{ data: EvidenceLinkDto[] }> {
    return this.http.get<{ data: EvidenceLinkDto[] }>(`/api/asset-linkage/evidence/${assetId}`);
  }

  createEvidenceLink(data: Partial<EvidenceLinkDto>): Observable<EvidenceLinkDto> {
    return this.http.post<EvidenceLinkDto>('/api/asset-linkage/evidence', data);
  }

  getAllLinks(assetId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/api/asset-linkage/all/${assetId}`);
  }

  getOwners(entityType: string, entityId: string): Observable<{ data: OwnerDto[] }> {
    return this.http.get<{ data: OwnerDto[] }>(`/api/asset-ownership/${entityType}/${entityId}`);
  }

  assignOwner(data: { entity_type: string; entity_id: string; owner_type: string; owner_user_id: string; notes?: string }): Observable<OwnerDto> {
    return this.http.post<OwnerDto>('/api/asset-ownership/assign', data);
  }

  revokeOwner(ownershipId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/asset-ownership/revoke/${ownershipId}`, {});
  }

  transferOwner(data: { entity_type: string; entity_id: string; owner_type: string; from_user_id: string; to_user_id: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/asset-ownership/transfer', data);
  }

  getUnownedEntities(): Observable<{ data: Record<string, unknown>[] }> {
    return this.http.get<{ data: Record<string, unknown>[] }>('/api/asset-ownership/unowned');
  }

  listClassifications(): Observable<{ data: ClassificationDto[] }> {
    return this.http.get<{ data: ClassificationDto[] }>('/api/asset-classification');
  }

  createClassification(data: Partial<ClassificationDto>): Observable<ClassificationDto> {
    return this.http.post<ClassificationDto>('/api/asset-classification', data);
  }

  updateClassification(id: string, data: Partial<ClassificationDto>): Observable<ClassificationDto> {
    return this.http.put<ClassificationDto>(`/api/asset-classification/${id}`, data);
  }

  classifyAsset(assetId: string, classificationId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/asset-classification/assign/${assetId}`, { classification_id: classificationId });
  }

  getClassificationDistribution(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>('/api/asset-classification/distribution');
  }

  transitionStage(data: { entity_type: string; entity_id: string; to_stage: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/asset-lifecycle/transition', data);
  }

  getLifecycleEvents(entityType: string, entityId: string): Observable<{ data: LifecycleEventDto[] }> {
    return this.http.get<{ data: LifecycleEventDto[] }>(`/api/asset-lifecycle/events/${entityType}/${entityId}`);
  }

  getLifecycleDistribution(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>('/api/asset-lifecycle/distribution');
  }

  getCoverageReport(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/asset-reports/coverage');
  }

  getAgingReport(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/asset-reports/aging');
  }

  getOrphanReport(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/asset-reports/orphans');
  }

  getDashboardSummary(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/asset-reports/dashboard');
  }

  getModuleConfig(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/asset-admin/config');
  }

  updateModuleConfig(config: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<Record<string, unknown>>('/api/asset-admin/config', config);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/asset/diagnostics`);
  }
}
