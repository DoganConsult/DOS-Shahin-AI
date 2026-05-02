import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

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
 * Sub-service covering Binding Governance and Enforcement Mode Configuration.
 * Extracted from AiGovernanceApiService Groups 5-6.
 */
@Injectable({ providedIn: 'root' })
export class AiGovernanceBindingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ════════════════════════════════════════════════════════════════════════════
  // Group 5: Binding Governance — /api/ai-bindings
  // ════════════════════════════════════════════════════════════════════════════

  // ── Agent-Tool Bindings ────────────────────────────────────────────────────

  /** List agent-tool bindings with optional filters. */
  listAgentToolBindings(params?: {
    agent_asset_id?: string;
    tool_asset_id?: string;
    is_enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/agent-tools`, { params: toParams(params) });
  }

  /** Get a single agent-tool binding by ID. */
  getAgentToolBinding(bindingId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/agent-tools/${bindingId}`);
  }

  /** Create a new agent-tool binding. */
  createAgentToolBinding(data: {
    agent_asset_id: string;
    tool_asset_id: string;
    is_enabled?: boolean;
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/agent-tools`, data);
  }

  /** Update an agent-tool binding. */
  updateAgentToolBinding(bindingId: string, data: {
    is_enabled?: boolean;
    notes?: string;
  }): Observable<any> {
    return this.http.patch(`${this.base}/ai-bindings/agent-tools/${bindingId}`, data);
  }

  /** Enable an agent-tool binding. */
  enableAgentToolBinding(bindingId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/agent-tools/${bindingId}/enable`, {});
  }

  /** Disable an agent-tool binding. */
  disableAgentToolBinding(bindingId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/agent-tools/${bindingId}/disable`, {});
  }

  /** Delete an agent-tool binding. */
  deleteAgentToolBinding(bindingId: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-bindings/agent-tools/${bindingId}`);
  }

  // ── Tenant Allowlist ───────────────────────────────────────────────────────

  /** List tenant allowlist entries with optional filters. */
  listAllowlist(params?: {
    asset_type?: string;
    asset_id?: string;
    is_enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/allowlist`, { params: toParams(params) });
  }

  /** Check whether an asset is allowlisted. */
  checkAllowlisted(assetId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/allowlist/check/${assetId}`);
  }

  /** Get a single allowlist entry by ID. */
  getAllowlistEntry(allowlistId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/allowlist/${allowlistId}`);
  }

  /** Create a new allowlist entry. */
  createAllowlistEntry(data: {
    asset_id: string;
    asset_type: string;
    is_enabled?: boolean;
    notes?: string;
    max_tokens_limit?: number;
    temperature_limit?: number;
  }): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/allowlist`, data);
  }

  /** Update an allowlist entry. */
  updateAllowlistEntry(allowlistId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/ai-bindings/allowlist/${allowlistId}`, data);
  }

  /** Enable an allowlist entry. */
  enableAllowlistEntry(allowlistId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/allowlist/${allowlistId}/enable`, {});
  }

  /** Disable an allowlist entry. */
  disableAllowlistEntry(allowlistId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/allowlist/${allowlistId}/disable`, {});
  }

  /** Delete an allowlist entry. */
  deleteAllowlistEntry(allowlistId: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-bindings/allowlist/${allowlistId}`);
  }

  /** Backfill allowlist from existing approved assets. */
  backfillAllowlist(): Observable<any> {
    return this.http.post(`${this.base}/ai-bindings/allowlist/backfill`, {});
  }

  // ── Runtime Queries ────────────────────────────────────────────────────────

  /** Get the list of enabled tool asset IDs for a given agent. */
  getEnabledToolsForAgent(agentAssetId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-bindings/runtime/agent-tools/${agentAssetId}`);
  }

  /** Get the enabled allowlist for the tenant (optionally filtered by asset type). */
  getEnabledAllowlist(assetType?: string): Observable<any> {
    let params = new HttpParams();
    if (assetType) params = params.set('asset_type', assetType);
    return this.http.get(`${this.base}/ai-bindings/runtime/allowlist`, { params });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 6: Enforcement Mode Config — /api/ai-governance/config
  // ════════════════════════════════════════════════════════════════════════════

  /** Get the current tenant enforcement mode. */
  getEnforcementMode(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/config/enforcement-mode`);
  }

  /** Set the tenant enforcement mode (audit | warn | enforce). */
  setEnforcementMode(mode: string): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/config/enforcement-mode`, { mode });
  }

  /** Get the SoD policy. */
  getSoDPolicy(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/config/sod-policy`);
  }

  /** Set the SoD policy (enforce | warn | off). */
  setSoDPolicy(policy: string): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/config/sod-policy`, { policy });
  }
}
