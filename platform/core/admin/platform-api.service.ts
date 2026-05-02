/**
 * Platform API Service — AGRC-OS (Residual)
 * Cross-cutting platform concerns after domain splits:
 * - Risk/Compliance → RiskComplianceApiService
 * - Evidence → EvidenceApiService
 * - Workflows/Automation → WorkflowApiService
 * - Reporting/Analytics/KPI → ReportingApiService
 * - Relationships/Exceptions/Findings/Assets → RelationshipApiService
 *
 * Remaining: dashboard, registry, digital twin, red team, explainability,
 * regulation compiler, public content, cadence, connectors, control lifecycle,
 * training, privacy ops, integrations hub, content packs.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Risk, Control, Framework, DashboardData } from '../models/grc.models';

// ── Re-exports for backward compatibility ──
export const DEC_STUB = {};

// ── Local imports for types used in residual methods ──
import { ConnectorDto } from '../services/api/platform-evidence-api.service';
import { ReportTemplateDto } from '../reporting/reporting-api.service';

// ── DTOs (residual) ──

export interface RegulatorDto {
  id: string;
  name: string;
  country: string;
  sector: string;
}

export interface SectorDto {
  id: string;
  name: string;
  regulators: string[];
}

export interface SimulationDto {
  id: string;
  status: string;
  createdAt: string;
  results?: Record<string, any>;
}

export interface RedTeamRunDto {
  id: string;
  status: string;
  startedAt: string;
  findings: number;
}

export interface RedTeamSummaryDto {
  totalRuns: number;
  totalFindings: number;
  criticalFindings: number;
  lastRunAt?: string;
}

export interface ExplainabilityPackDto {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  content?: Record<string, any>;
}

export interface ControlLifecycleStateDto {
  state: string;
  allowedTransitions: string[];
}

export interface ControlLifecycleHistoryDto {
  entries: Array<{ fromState: string; toState: string; changedBy: string; changedAt: string }>;
}

export interface TrainingStatusDto {
  status: string;
  loaded: boolean;
  recordCount: number;
}

export interface CadenceTaskDto {
  id: string;
  title: string;
  frequency: string;
  nextDueDate: string;
  status: string;
}

export interface CadenceOverrideDto {
  id: string;
  taskId: string;
  overrideDate: string;
  reason: string;
}

export interface PrivacyRopaDto {
  entries: Array<{ id: string; purpose: string; legalBasis: string; dataCategories: string[] }>;
}

export interface PrivacyDSRDto {
  id: string;
  type: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
}

export interface WebhookDto {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export interface IntegrationConfigDto {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  active: boolean;
}

export interface ContentPackDto {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ═══ Dashboard ═══
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/dashboard`);
  }

  // ═══ Module Data (legacy) ═══
  getRisks(): Observable<Risk[]> {
    return this.http.get<Risk[]>(`${this.base}/dashboard/risks`);
  }

  getPolicies(): Observable<Array<{ policyId: string; title: string; status: string }>> {
    return this.http.get<Array<{ policyId: string; title: string; status: string }>>(`${this.base}/policies`);
  }

  getControls(): Observable<Control[]> {
    return this.http.get<Control[]>(`${this.base}/dashboard/controls`);
  }

  getFrameworks(): Observable<Framework[]> {
    return this.http.get<Framework[]>(`${this.base}/dashboard/frameworks`);
  }

  createFramework(data: Partial<Framework>): Observable<Framework> {
    return this.http.post<Framework>(`${this.base}/frameworks`, data);
  }

  updateFramework(id: string, data: Partial<Framework>): Observable<Framework> {
    return this.http.put<Framework>(`${this.base}/frameworks/${id}`, data);
  }

  deleteFramework(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/frameworks/${id}`);
  }

  // ═══ Registry ═══
  getRegulators(): Observable<RegulatorDto[]> {
    return this.http.get<RegulatorDto[]>(`${this.base}/registry/regulators`);
  }

  getSectors(): Observable<SectorDto[]> {
    return this.http.get<SectorDto[]>(`${this.base}/registry/sectors`);
  }

  getFrameworkHierarchy(id: string): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.base}/registry/frameworks/${id}/hierarchy`);
  }

  // ═══ Digital Twin ═══
  getSimulations(): Observable<SimulationDto[]> {
    return this.http.get<SimulationDto[]>(`${this.base}/digital-twin`);
  }

  createSimulation(): Observable<SimulationDto> {
    return this.http.post<SimulationDto>(`${this.base}/digital-twin`, {});
  }

  // ═══ Red Team ═══
  getRedTeamRuns(): Observable<RedTeamRunDto[]> {
    return this.http.get<RedTeamRunDto[]>(`${this.base}/red-team`);
  }

  getRedTeamSummary(): Observable<RedTeamSummaryDto> {
    return this.http.get<RedTeamSummaryDto>(`${this.base}/red-team/summary`);
  }

  // ═══ Explainability ═══
  getExplainabilityPacks(): Observable<ExplainabilityPackDto[]> {
    return this.http.get<ExplainabilityPackDto[]>(`${this.base}/explainability`);
  }

  generateExplainabilityPack(data: { model: string; context?: Record<string, any> }): Observable<ExplainabilityPackDto> {
    return this.http.post<ExplainabilityPackDto>(`${this.base}/explainability`, data);
  }

  // ═══ Regulation Compiler ═══
  compileRegulation(instrumentId: string): Observable<{ compiled: Record<string, any> }> {
    return this.http.get<{ compiled: Record<string, any> }>(`${this.base}/regulation-compiler/${instrumentId}`);
  }

  // ═══ Public Content ═══
  getPublicAgents(): Observable<Array<{ id: string; name: string; description: string }>> {
    return this.http.get<Array<{ id: string; name: string; description: string }>>(`${this.base}/public/agents`);
  }

  getPublicReportTemplates(): Observable<ReportTemplateDto[]> {
    return this.http.get<ReportTemplateDto[]>(`${this.base}/public/report-templates`);
  }

  getPublicLandingContent(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.base}/public/landing-content`);
  }

  getPublicCategoryLabels(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.base}/public/category-labels`);
  }

  getPublicDPIAConfig(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.base}/public/dpia-config`);
  }

  // ═══ Cadence Calendar ═══
  getCadenceTasks(): Observable<CadenceTaskDto[]> {
    return this.http.get<CadenceTaskDto[]>(`${this.base}/cadence/tasks`);
  }

  updateCadenceTask(taskId: string, data: Partial<CadenceTaskDto>): Observable<CadenceTaskDto> {
    return this.http.put<CadenceTaskDto>(`${this.base}/cadence/tasks/${taskId}`, data);
  }

  getCadenceOverrides(): Observable<CadenceOverrideDto[]> {
    return this.http.get<CadenceOverrideDto[]>(`${this.base}/cadence/overrides`);
  }

  saveCadenceOverride(data: Partial<CadenceOverrideDto>): Observable<CadenceOverrideDto> {
    return this.http.post<CadenceOverrideDto>(`${this.base}/cadence/overrides`, data);
  }

  // ═══ Connectors ═══
  getConnectors(): Observable<ConnectorDto[]> {
    return this.http.get<ConnectorDto[]>(`${this.base}/connectors`);
  }

  createConnector(data: Partial<ConnectorDto>): Observable<ConnectorDto> {
    return this.http.post<ConnectorDto>(`${this.base}/connectors`, data);
  }

  runConnector(connectorId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/connectors/${connectorId}/run`, {});
  }

  deleteConnector(connectorId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/connectors/${connectorId}`);
  }

  // ═══ Control Lifecycle ═══
  getControlLifecycleStates(): Observable<ControlLifecycleStateDto[]> {
    return this.http.get<ControlLifecycleStateDto[]>(`${this.base}/lifecycle/states`);
  }

  getControlLifecycleById(controlId: string): Observable<ControlLifecycleStateDto> {
    return this.http.get<ControlLifecycleStateDto>(`${this.base}/lifecycle/${controlId}`);
  }

  transitionControlState(controlId: string, data: { targetState: string; reason?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/lifecycle/${controlId}/transition`, data);
  }

  getControlLifecycleHistory(controlId: string): Observable<ControlLifecycleHistoryDto> {
    return this.http.get<ControlLifecycleHistoryDto>(`${this.base}/lifecycle/${controlId}/history`);
  }

  // ═══ Training Data ═══
  loadTrainingData(volume: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/training/load`, { volume });
  }

  purgeTrainingData(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/training/purge`);
  }

  getTrainingStatus(): Observable<TrainingStatusDto> {
    return this.http.get<TrainingStatusDto>(`${this.base}/training/status`);
  }

  // ═══ Privacy Operations ═══
  getPrivacyRopa(): Observable<PrivacyRopaDto> {
    return this.http.get<PrivacyRopaDto>(`${this.base}/privacy-ops/ropa`);
  }

  getPrivacyDSRs(): Observable<PrivacyDSRDto[]> {
    return this.http.get<PrivacyDSRDto[]>(`${this.base}/privacy-ops/dsr`);
  }

  createPrivacyDSR(data: Partial<PrivacyDSRDto>): Observable<PrivacyDSRDto> {
    return this.http.post<PrivacyDSRDto>(`${this.base}/privacy-ops/dsr`, data);
  }

  getPrivacyConsent(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.base}/privacy-ops/consent`);
  }

  getPrivacyBreaches(): Observable<Array<{ id: string; type: string; severity: string; date: string }>> {
    return this.http.get<Array<{ id: string; type: string; severity: string; date: string }>>(`${this.base}/privacy-ops/breaches`);
  }

  getPrivacyRetention(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.base}/privacy-ops/retention`);
  }

  // ═══ Integrations Hub ═══
  getWebhooks(): Observable<WebhookDto[]> {
    return this.http.get<WebhookDto[]>(`${this.base}/integrations/webhooks`);
  }

  createWebhook(data: Partial<WebhookDto>): Observable<WebhookDto> {
    return this.http.post<WebhookDto>(`${this.base}/integrations/webhooks`, data);
  }

  deleteWebhook(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/integrations/webhooks/${id}`);
  }

  getIntegrationConfigs(): Observable<IntegrationConfigDto[]> {
    return this.http.get<IntegrationConfigDto[]>(`${this.base}/integrations/configs`);
  }

  createIntegrationConfig(data: Partial<IntegrationConfigDto>): Observable<IntegrationConfigDto> {
    return this.http.post<IntegrationConfigDto>(`${this.base}/integrations/configs`, data);
  }

  updateIntegrationConfig(id: string, data: Partial<IntegrationConfigDto>): Observable<IntegrationConfigDto> {
    return this.http.put<IntegrationConfigDto>(`${this.base}/integrations/configs/${id}`, data);
  }

  deleteIntegrationConfig(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/integrations/configs/${id}`);
  }

  // ═══ Content Packs ═══
  getInstalledPacks(): Observable<ContentPackDto[]> {
    return this.http.get<ContentPackDto[]>(`${this.base}/content-packs/installed`);
  }

  installContentPack(manifest: Record<string, unknown>): Observable<ContentPackDto> {
    return this.http.post<ContentPackDto>(`${this.base}/content-packs/install`, manifest);
  }

  upgradeContentPack(packId: string, manifest: Record<string, unknown>): Observable<ContentPackDto> {
    return this.http.post<ContentPackDto>(`${this.base}/content-packs/upgrade`, { packId, manifest });
  }

  rollbackContentPack(packId: string, targetVersion: string): Observable<ContentPackDto> {
    return this.http.post<ContentPackDto>(`${this.base}/content-packs/rollback`, { packId, targetVersion });
  }
}
