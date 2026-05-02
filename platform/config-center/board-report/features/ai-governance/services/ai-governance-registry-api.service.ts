import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { AssetsListResponse } from '@app/core/models/ai-api.types';
import type {
  AssetDetailDto,
  CreateAssetRequest,
  UpdateAssetRequest,
  MutationResponse,
  DeleteResponse,
  AssetDiscoveryResponse,
  VersionActionResponse,
  RegistryListResponse,
  ModelVersionDto,
  ModelVersionListResponse,
  CreateModelDraftRequest,
  UpdateModelDraftRequest,
  ResolvedModelDto,
  GovernanceMismatchDto,
  PromptVersionDto,
  PromptVersionListResponse,
  CreatePromptDraftRequest,
  UpdatePromptDraftRequest,
  AgentVersionDto,
  AgentVersionListResponse,
  CreateAgentDraftRequest,
  UpdateAgentDraftRequest,
} from './ai-governance.types';

// ── Helper: build HttpParams from a flat object, skipping undefined/null values ──
function toParams(obj?: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  if (!obj) return params;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Sub-service covering Asset Inventory, Model Registry, Prompt Registry, and Agent Registry.
 * Extracted from AiGovernanceApiService Groups 1-4.
 */
@Injectable({ providedIn: 'root' })
export class AiGovernanceRegistryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ════════════════════════════════════════════════════════════════════════════
  // Group 1: Asset Inventory — /api/ai-assets
  // ════════════════════════════════════════════════════════════════════════════

  /** List AI assets with optional filters and pagination. */
  listAssets(params?: {
    asset_type?: string;
    scope_type?: string;
    lifecycle_status?: string;
    status?: string;
    source_type?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<AssetsListResponse> {
    return this.http.get<AssetsListResponse>(`${this.base}/ai-assets`, { params: toParams(params) });
  }

  /** Lookup a single asset by asset_type + asset_key (+ optional scope_type). */
  lookupAsset(asset_type: string, asset_key: string, scope_type?: string): Observable<AssetDetailDto> {
    let params = new HttpParams().set('asset_type', asset_type).set('asset_key', asset_key);
    if (scope_type) params = params.set('scope_type', scope_type);
    return this.http.get<AssetDetailDto>(`${this.base}/ai-assets/lookup`, { params });
  }

  /** Get a single asset by ID. */
  getAsset(id: string): Observable<AssetDetailDto> {
    return this.http.get<AssetDetailDto>(`${this.base}/ai-assets/${id}`);
  }

  /** Create a new AI asset. */
  createAsset(data: CreateAssetRequest): Observable<AssetDetailDto> {
    return this.http.post<AssetDetailDto>(`${this.base}/ai-assets`, data);
  }

  /** Partially update an existing AI asset. */
  updateAsset(id: string, data: UpdateAssetRequest): Observable<AssetDetailDto> {
    return this.http.patch<AssetDetailDto>(`${this.base}/ai-assets/${id}`, data);
  }

  /** Transition an asset to a new lifecycle status. */
  transitionAsset(id: string, target_status: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-assets/${id}/transition`, { target_status });
  }

  /** Delete an AI asset. */
  deleteAsset(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/ai-assets/${id}`);
  }

  /** Trigger asset discovery scan. */
  discoverAssets(): Observable<AssetDiscoveryResponse> {
    return this.http.post<AssetDiscoveryResponse>(`${this.base}/ai-assets/discover`, {});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 2: Model Registry — /api/model-registry
  // ════════════════════════════════════════════════════════════════════════════

  /** List model-type assets. */
  listModelAssets(params?: Record<string, string>): Observable<RegistryListResponse<AssetDetailDto>> {
    return this.http.get<RegistryListResponse<AssetDetailDto>>(`${this.base}/model-registry/assets`, { params: toParams(params) });
  }

  /** List model versions with optional filters and pagination. */
  listModelVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<ModelVersionListResponse> {
    return this.http.get<ModelVersionListResponse>(`${this.base}/model-registry/versions`, { params: toParams(params) });
  }

  /** Get the currently active model version for an asset. */
  getActiveModelVersion(assetId: string): Observable<ModelVersionDto> {
    return this.http.get<ModelVersionDto>(`${this.base}/model-registry/versions/active/${assetId}`);
  }

  /** Get a single model version by ID. */
  getModelVersion(versionId: string): Observable<ModelVersionDto> {
    return this.http.get<ModelVersionDto>(`${this.base}/model-registry/versions/${versionId}`);
  }

  /** Create a new draft model version. */
  createModelDraft(data: CreateModelDraftRequest): Observable<ModelVersionDto> {
    return this.http.post<ModelVersionDto>(`${this.base}/model-registry/versions`, data);
  }

  /** Update an existing draft model version. */
  updateModelDraft(versionId: string, data: UpdateModelDraftRequest): Observable<ModelVersionDto> {
    return this.http.patch<ModelVersionDto>(`${this.base}/model-registry/versions/${versionId}`, data);
  }

  /** Submit a draft model version for approval. */
  submitModelVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/submit`, {});
  }

  /** Approve a pending model version. */
  approveModelVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/approve`, {});
  }

  /** Reject a pending model version. */
  rejectModelVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/reject`, { notes });
  }

  /** Activate an approved model version. */
  activateModelVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/activate`, {});
  }

  /** Suspend an active model version. */
  suspendModelVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/suspend`, { notes });
  }

  /** Retire a model version. */
  retireModelVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${versionId}/retire`, { notes });
  }

  /** Rollback to a previous model version. */
  rollbackModelVersion(assetId: string, target_version_id: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/model-registry/versions/${assetId}/rollback`, { target_version_id, notes });
  }

  /** Delete a draft model version. */
  deleteModelVersion(versionId: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/model-registry/versions/${versionId}`);
  }

  /** Resolve which model a given agent should use at runtime. */
  resolveGovernedModel(agentId: string, task_type?: string, input_token_estimate?: number): Observable<ResolvedModelDto> {
    let params = new HttpParams();
    if (task_type) params = params.set('task_type', task_type);
    if (input_token_estimate !== undefined) params = params.set('input_token_estimate', String(input_token_estimate));
    return this.http.get<ResolvedModelDto>(`${this.base}/model-registry/governance/resolve/${agentId}`, { params });
  }

  /** Get all model governance mismatches. */
  getModelMismatches(): Observable<GovernanceMismatchDto> {
    return this.http.get<GovernanceMismatchDto>(`${this.base}/model-registry/governance/mismatches`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 3: Prompt Registry — /api/prompt-registry
  // ════════════════════════════════════════════════════════════════════════════

  /** List prompt-type assets. */
  listPromptAssets(params?: Record<string, string>): Observable<RegistryListResponse<AssetDetailDto>> {
    return this.http.get<RegistryListResponse<AssetDetailDto>>(`${this.base}/prompt-registry/assets`, { params: toParams(params) });
  }

  /** List prompt versions with optional filters and pagination. */
  listPromptVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    linked_model_asset_id?: string;
    limit?: number;
    offset?: number;
  }): Observable<PromptVersionListResponse> {
    return this.http.get<PromptVersionListResponse>(`${this.base}/prompt-registry/versions`, { params: toParams(params) });
  }

  /** Get the currently active prompt version for an asset. */
  getActivePromptVersion(assetId: string): Observable<PromptVersionDto> {
    return this.http.get<PromptVersionDto>(`${this.base}/prompt-registry/versions/active/${assetId}`);
  }

  /** Get a single prompt version by ID. */
  getPromptVersion(versionId: string): Observable<PromptVersionDto> {
    return this.http.get<PromptVersionDto>(`${this.base}/prompt-registry/versions/${versionId}`);
  }

  /** Create a new draft prompt version. */
  createPromptDraft(data: CreatePromptDraftRequest): Observable<PromptVersionDto> {
    return this.http.post<PromptVersionDto>(`${this.base}/prompt-registry/versions`, data);
  }

  /** Update an existing draft prompt version. */
  updatePromptDraft(versionId: string, data: UpdatePromptDraftRequest): Observable<PromptVersionDto> {
    return this.http.patch<PromptVersionDto>(`${this.base}/prompt-registry/versions/${versionId}`, data);
  }

  /** Submit a draft prompt version for approval. */
  submitPromptVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/submit`, {});
  }

  /** Approve a pending prompt version. */
  approvePromptVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/approve`, {});
  }

  /** Reject a pending prompt version. */
  rejectPromptVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/reject`, { notes });
  }

  /** Activate an approved prompt version. */
  activatePromptVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/activate`, {});
  }

  /** Suspend an active prompt version. */
  suspendPromptVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/suspend`, { notes });
  }

  /** Retire a prompt version. */
  retirePromptVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${versionId}/retire`, { notes });
  }

  /** Rollback to a previous prompt version. */
  rollbackPromptVersion(assetId: string, target_version_id: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/prompt-registry/versions/${assetId}/rollback`, { target_version_id, notes });
  }

  /** Delete a draft prompt version. */
  deletePromptVersion(versionId: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/prompt-registry/versions/${versionId}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 4: Agent Registry — /api/agent-registry
  // ════════════════════════════════════════════════════════════════════════════

  /** List agent-type assets. */
  listAgentAssets(params?: Record<string, string>): Observable<RegistryListResponse<AssetDetailDto>> {
    return this.http.get<RegistryListResponse<AssetDetailDto>>(`${this.base}/agent-registry/assets`, { params: toParams(params) });
  }

  /** List agent versions with optional filters and pagination. */
  listAgentVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    linked_prompt_asset_id?: string;
    linked_model_asset_id?: string;
    limit?: number;
    offset?: number;
  }): Observable<AgentVersionListResponse> {
    return this.http.get<AgentVersionListResponse>(`${this.base}/agent-registry/versions`, { params: toParams(params) });
  }

  /** Get the currently active agent version for an asset. */
  getActiveAgentVersion(assetId: string): Observable<AgentVersionDto> {
    return this.http.get<AgentVersionDto>(`${this.base}/agent-registry/versions/active/${assetId}`);
  }

  /** Get a single agent version by ID. */
  getAgentVersion(versionId: string): Observable<AgentVersionDto> {
    return this.http.get<AgentVersionDto>(`${this.base}/agent-registry/versions/${versionId}`);
  }

  /** Create a new draft agent version. */
  createAgentDraft(data: CreateAgentDraftRequest): Observable<AgentVersionDto> {
    return this.http.post<AgentVersionDto>(`${this.base}/agent-registry/versions`, data);
  }

  /** Update an existing draft agent version. */
  updateAgentDraft(versionId: string, data: UpdateAgentDraftRequest): Observable<AgentVersionDto> {
    return this.http.patch<AgentVersionDto>(`${this.base}/agent-registry/versions/${versionId}`, data);
  }

  /** Submit a draft agent version for approval. */
  submitAgentVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/submit`, {});
  }

  /** Approve a pending agent version. */
  approveAgentVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/approve`, {});
  }

  /** Reject a pending agent version. */
  rejectAgentVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/reject`, { notes });
  }

  /** Activate an approved agent version. */
  activateAgentVersion(versionId: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/activate`, {});
  }

  /** Suspend an active agent version. */
  suspendAgentVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/suspend`, { notes });
  }

  /** Retire an agent version. */
  retireAgentVersion(versionId: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${versionId}/retire`, { notes });
  }

  /** Rollback to a previous agent version. */
  rollbackAgentVersion(assetId: string, target_version_id: string, notes?: string): Observable<VersionActionResponse> {
    return this.http.post<VersionActionResponse>(`${this.base}/agent-registry/versions/${assetId}/rollback`, { target_version_id, notes });
  }

  /** Delete a draft agent version. */
  deleteAgentVersion(versionId: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/agent-registry/versions/${versionId}`);
  }

  /** Resolve which agent version should be used at runtime. */
  resolveGovernedAgent(agentId: string): Observable<AgentVersionDto> {
    return this.http.get<AgentVersionDto>(`${this.base}/agent-registry/governance/resolve/${agentId}`);
  }

  /** Get all agent governance mismatches. */
  getAgentMismatches(): Observable<GovernanceMismatchDto> {
    return this.http.get<GovernanceMismatchDto>(`${this.base}/agent-registry/governance/mismatches`);
  }
}
