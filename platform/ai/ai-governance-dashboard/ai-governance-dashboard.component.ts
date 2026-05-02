import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiGovernanceApiService } from '@app/core/services/api-clients/ai/ai-governance-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { GrcRecord } from '@app/core/models/shared.types';

interface DashboardMetrics {
  // Model Risk Management
  totalModels: number;
  highRiskModels: number;
  modelsRequiringAssessment: number;
  avgRiskScore: number;
  
  // DPIA
  totalDPIAs: number;
  pendingReview: number;
  highPrivacyRisk: number;
  avgPrivacyRiskScore: number;
  
  // Agent Performance & Bias
  totalAgents: number;
  agentsWithBias: number;
  avgTrustScore: number;
  humanOverrides: number;
  
  // Explainability
  explainabilityRecords: number;
  lowQualityExplanations: number;
  avgExplainabilityScore: number;
  
  // Compliance Framework
  mappedFrameworks: number;
  nonCompliantSystems: number;
  avgComplianceScore: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-governance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageShellComponent,
    StatCardComponent,
    StatusBadgeComponent,
    CardModule,
    TableModule,
    ProgressBarModule,
    TagModule,
    ButtonModule,
    TabViewModule,
    TooltipModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="microchip-ai"
      [title]="i18n.translate('ai.governanceDashboard') || 'AI Governance Dashboard'"
      [subtitle]="i18n.translate('ai.governanceDashboardSubtitle') || 'Comprehensive oversight of AI model risk, privacy, performance, explainability, and compliance'"
      [breadcrumbs]="['Dashboard', 'AI Governance']"
      [loading]="loading()">

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <p-progressSpinner [style]="{width: '48px', height: '48px'}" strokeWidth="4" />
          <p>{{ i18n.translate('common.loading') || 'Loading...' }}</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-banner">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
          <p-button [label]="i18n.translate('common.retry') || 'Retry'" icon="pi pi-refresh" [text]="true" (onClick)="loadMetrics()" />
        </div>
      }

      <!-- Metrics Overview -->
      @if (!loading() && !error() && metrics()) {
        <div class="stat-cards-row">
          <app-stat-card icon="shield" [value]="metrics()!.totalModels" [label]="i18n.translate('ai.totalModels') || 'Total Models'" accentColor="var(--red-500)" />
          <app-stat-card icon="microchip-ai" [value]="metrics()!.totalAgents" [label]="i18n.translate('ai.totalAgents') || 'Total Agents'" accentColor="var(--green-500)" />
          <app-stat-card icon="check-square" [value]="metrics()!.avgComplianceScore.toFixed(1) + '%'" [label]="i18n.translate('ai.avgComplianceScore') || 'Avg Compliance'" accentColor="var(--orange-500)" />
          <app-stat-card icon="exclamation-triangle" [value]="metrics()!.nonCompliantSystems" [label]="i18n.translate('ai.nonCompliantSystems') || 'Non-Compliant'" accentColor="var(--red-500)" [trend]="-(metrics()!.nonCompliantSystems)" />
        </div>
        <div class="metrics-grid">
          <!-- Model Risk Management -->
          <p-card styleClass="metric-card">
            <div class="metric-header">
              <i class="pi pi-shield" style="font-size: var(--font-size-2xl); color: var(--red-500)"></i>
              <h3>{{ i18n.translate('ai.modelRiskManagement') || 'Model Risk Management' }}</h3>
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.totalModels') || 'Total Models' }}</span>
                <span class="stat-value">{{ metrics()!.totalModels }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.highRiskModels') || 'High Risk' }}</span>
                <span class="stat-value stat-danger">{{ metrics()!.highRiskModels }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.avgRiskScore') || 'Avg Risk Score' }}</span>
                <span class="stat-value">{{ metrics()!.avgRiskScore.toFixed(1) }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.requiringAssessment') || 'Requiring Assessment' }}</span>
                <span class="stat-value stat-warning">{{ metrics()!.modelsRequiringAssessment }}</span>
              </div>
            </div>
          </p-card>

          <!-- DPIA & Privacy -->
          <p-card styleClass="metric-card">
            <div class="metric-header">
              <i class="pi pi-lock" style="font-size: var(--font-size-2xl); color: var(--blue-500)"></i>
              <h3>{{ i18n.translate('ai.dpiaPrivacy') || 'DPIA & Privacy' }}</h3>
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.totalDPIAs') || 'Total DPIAs' }}</span>
                <span class="stat-value">{{ metrics()!.totalDPIAs }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.pendingReview') || 'Pending Review' }}</span>
                <span class="stat-value stat-warning">{{ metrics()!.pendingReview }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.highPrivacyRisk') || 'High Privacy Risk' }}</span>
                <span class="stat-value stat-danger">{{ metrics()!.highPrivacyRisk }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.avgPrivacyRiskScore') || 'Avg Privacy Risk' }}</span>
                <span class="stat-value">{{ metrics()!.avgPrivacyRiskScore.toFixed(1) }}%</span>
              </div>
            </div>
          </p-card>

          <!-- Agent Performance & Bias -->
          <p-card styleClass="metric-card">
            <div class="metric-header">
              <i class="pi pi-chart-line" style="font-size: var(--font-size-2xl); color: var(--green-500)"></i>
              <h3>{{ i18n.translate('ai.agentPerformanceBias') || 'Agent Performance & Bias' }}</h3>
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.totalAgents') || 'Total Agents' }}</span>
                <span class="stat-value">{{ metrics()!.totalAgents }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.agentsWithBias') || 'Bias Detected' }}</span>
                <span class="stat-value stat-danger">{{ metrics()!.agentsWithBias }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.avgTrustScore') || 'Avg Trust Score' }}</span>
                <span class="stat-value">{{ metrics()!.avgTrustScore.toFixed(1) }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.humanOverrides') || 'Human Overrides' }}</span>
                <span class="stat-value">{{ metrics()!.humanOverrides }}</span>
              </div>
            </div>
          </p-card>

          <!-- Explainability -->
          <p-card styleClass="metric-card">
            <div class="metric-header">
              <i class="pi pi-info-circle" style="font-size: var(--font-size-2xl); color: var(--purple-500)"></i>
              <h3>{{ i18n.translate('ai.explainability') || 'Explainability & Transparency' }}</h3>
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.explainabilityRecords') || 'Total Records' }}</span>
                <span class="stat-value">{{ metrics()!.explainabilityRecords }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.lowQualityExplanations') || 'Low Quality' }}</span>
                <span class="stat-value stat-warning">{{ metrics()!.lowQualityExplanations }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.avgExplainabilityScore') || 'Avg Quality Score' }}</span>
                <span class="stat-value">{{ metrics()!.avgExplainabilityScore.toFixed(1) }}%</span>
              </div>
            </div>
          </p-card>

          <!-- Compliance Framework -->
          <p-card styleClass="metric-card">
            <div class="metric-header">
              <i class="pi pi-check-square" style="font-size: var(--font-size-2xl); color: var(--orange-500)"></i>
              <h3>{{ i18n.translate('ai.complianceFramework') || 'Compliance Framework Mapping' }}</h3>
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.mappedFrameworks') || 'Mapped Frameworks' }}</span>
                <span class="stat-value">{{ metrics()!.mappedFrameworks }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.nonCompliantSystems') || 'Non-Compliant' }}</span>
                <span class="stat-value stat-danger">{{ metrics()!.nonCompliantSystems }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ i18n.translate('ai.avgComplianceScore') || 'Avg Compliance' }}</span>
                <span class="stat-value">{{ metrics()!.avgComplianceScore.toFixed(1) }}%</span>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Detailed Tabs -->
        <p-tabView styleClass="dashboard-tabs">
          <p-tabPanel [header]="i18n.translate('ai.modelRisk') || 'Model Risk'">
            <div class="tab-content">
              <p-table [value]="modelRiskData()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('ai.modelId') || 'Model ID' }}</th>
                    <th>{{ i18n.translate('ai.riskScore') || 'Risk Score' }}</th>
                    <th>{{ i18n.translate('ai.lifecycleState') || 'State' }}</th>
                    <th>{{ i18n.translate('ai.lastAssessment') || 'Last Assessment' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.modelId || '-' }}</td>
                    <td>
                      <span [class]="getRiskScoreClass(item.riskScore)">
                        {{ item.riskScore?.toFixed(1) || '-' }}%
                      </span>
                    </td>
                    <td><app-status-badge [status]="item.state || 'unknown'" /><p-tag [value]="item.state || '-'" [severity]="getStateSeverity(item.state)" styleClass="ms-1" /></td>
                    <td>{{ item.lastAssessment || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center">{{ i18n.translate('common.noData') || 'No data available' }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.translate('ai.dpia') || 'DPIA'">
            <div class="tab-content">
              <p-table [value]="dpiaData()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('ai.systemId') || 'System ID' }}</th>
                    <th>{{ i18n.translate('ai.privacyRiskScore') || 'Privacy Risk' }}</th>
                    <th>{{ i18n.translate('ai.status') || 'Status' }}</th>
                    <th>{{ i18n.translate('ai.reviewDue') || 'Review Due' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.systemId || '-' }}</td>
                    <td>
                      <span [class]="getRiskScoreClass(item.privacyRiskScore)">
                        {{ item.privacyRiskScore?.toFixed(1) || '-' }}%
                      </span>
                    </td>
                    <td><p-tag [value]="item.status || '-'" [severity]="getStatusSeverity(item.status)" /></td>
                    <td>{{ item.reviewDue || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center">{{ i18n.translate('common.noData') || 'No data available' }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.translate('ai.agentPerformance') || 'Agent Performance'">
            <div class="tab-content">
              <p-table [value]="agentPerformanceData()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('ai.agentId') || 'Agent ID' }}</th>
                    <th>{{ i18n.translate('ai.trustScore') || 'Trust Score' }}</th>
                    <th>{{ i18n.translate('ai.biasDetected') || 'Bias' }}</th>
                    <th>{{ i18n.translate('ai.overrides') || 'Overrides' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.agentId || '-' }}</td>
                    <td>
                      <span [class]="getTrustScoreClass(item.trustScore)">
                        {{ item.trustScore?.toFixed(1) || '-' }}%
                      </span>
                    </td>
                    <td>
                      <p-tag 
                        [value]="item.biasDetected ? (i18n.translate('common.yes') || 'Yes') : (i18n.translate('common.no') || 'No')" 
                        [severity]="item.biasDetected ? 'danger' : 'success'" />
                    </td>
                    <td>{{ item.overrides || 0 }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center">{{ i18n.translate('common.noData') || 'No data available' }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.translate('ai.explainability') || 'Explainability'">
            <div class="tab-content">
              <p-table [value]="explainabilityData()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('ai.systemId') || 'System ID' }}</th>
                    <th>{{ i18n.translate('ai.qualityScore') || 'Quality Score' }}</th>
                    <th>{{ i18n.translate('ai.explanationType') || 'Type' }}</th>
                    <th>{{ i18n.translate('ai.recordedAt') || 'Recorded At' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.systemId || '-' }}</td>
                    <td>
                      <span [class]="getQualityScoreClass(item.qualityScore)">
                        {{ item.qualityScore?.toFixed(1) || '-' }}%
                      </span>
                    </td>
                    <td>{{ item.explanationType || '-' }}</td>
                    <td>{{ item.recordedAt || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center">{{ i18n.translate('common.noData') || 'No data available' }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.translate('ai.compliance') || 'Compliance'">
            <div class="tab-content">
              <p-table [value]="complianceData()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('ai.systemId') || 'System ID' }}</th>
                    <th>{{ i18n.translate('ai.framework') || 'Framework' }}</th>
                    <th>{{ i18n.translate('ai.complianceStatus') || 'Status' }}</th>
                    <th>{{ i18n.translate('ai.complianceScore') || 'Score' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>{{ item.systemId || '-' }}</td>
                    <td>{{ item.framework || '-' }}</td>
                    <td><p-tag [value]="item.status || '-'" [severity]="getComplianceStatusSeverity(item.status)" /></td>
                    <td>
                      <span [class]="getComplianceScoreClass(item.complianceScore)">
                        {{ item.complianceScore?.toFixed(1) || '-' }}%
                      </span>
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center">{{ i18n.translate('common.noData') || 'No data available' }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>
        </p-tabView>
      }

    </app-page-shell>
    <p-toast />
  `,
  styles: [`
    .stat-cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--red-50, #fef2f2);
      border: 1px solid var(--red-200, #fecaca);
      border-radius: var(--radius-lg, 8px);
      color: var(--red-700, #b91c1c);
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      height: 100%;
    }

    .metric-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--surface-border);
    }

    .metric-header h3 {
      margin: 0;
      font-size: var(--font-size-body-md);
      font-weight: 600;
    }

    .metric-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-color-secondary);
      font-weight: 500;
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-color);
    }

    .stat-danger {
      color: var(--red-500, #ef4444);
    }

    .stat-warning {
      color: var(--orange-500, #f97316);
    }

    .dashboard-tabs {
      margin-top: 24px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .text-center {
      text-align: center;
    }

    @media (max-width: 768px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .metric-stats {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AiGovernanceDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(AiGovernanceApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msg = inject(MessageService);

  loading = signal(true);
  error = signal<string | null>(null);
  metrics = signal<DashboardMetrics | null>(null);
  
  // Tab data
  modelRiskData = signal<GrcRecord[]>([]);
  dpiaData = signal<GrcRecord[]>([]);
  agentPerformanceData = signal<GrcRecord[]>([]);
  explainabilityData = signal<GrcRecord[]>([]);
  complianceData = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      // Model Risk Management
      modelsRequiringAssessment: this.api.getModelsRequiringAssessment().pipe(
        catchError(() => of([]))
      ),
      
      // DPIA
      dpiaRequiringReview: this.api.getDPIAsRequiringReview().pipe(
        catchError(() => of([]))
      ),
      dpiaList: this.api.getDPIAAssessments().pipe(
        catchError(() => of({ items: [], total: 0 }))
      ),

      // Agent Performance
      agentPerformance: this.api.getAgentPerformanceMetrics('*').pipe(
        catchError(() => of([]))
      ),
      agentBias: this.api.getAgentBiasDetections('*').pipe(
        catchError(() => of([]))
      ),
      agentTrust: this.api.getAgentTrustScores('*').pipe(
        catchError(() => of([]))
      ),
      
      // Explainability
      explainability: this.api.getExplainabilityRecords().pipe(
        catchError(() => of([]))
      ),
      transparency: this.api.getTransparencyMetrics().pipe(
        catchError(() => of({ avgQualityScore: 0, totalRecords: 0 }))
      ),
      
      // Compliance Framework
      complianceDashboard: this.api.getComplianceDashboard().pipe(
        catchError(() => of({ mappedFrameworks: 0, nonCompliantCount: 0, avgComplianceScore: 0 }))
      ),
      systemsRequiringAssessment: this.api.getSystemsRequiringAssessment().pipe(
        catchError(() => of([]))
      ),
    }).subscribe({
      next: (data) => {
        // Calculate metrics
        const dpiaItems = Array.isArray(data.dpiaList) ? data.dpiaList : (data.dpiaList?.items || []);
        const highPrivacyRisk = dpiaItems.filter((d) => (d.privacy_risk_score || 0) > 70).length;
        const avgPrivacyRisk = dpiaItems.length > 0
          ? dpiaItems.reduce((sum: number, d: GrcRecord) => sum + (d.privacy_risk_score || 0), 0) / dpiaItems.length
          : 0;

        const agentPerf = Array.isArray(data.agentPerformance) ? data.agentPerformance : [];
        const avgTrust = agentPerf.length > 0
          ? agentPerf.reduce((sum: number, a: GrcRecord) => sum + (a.trust_score || 0), 0) / agentPerf.length
          : 0;

        const explainRecords = Array.isArray(data.explainability) ? data.explainability : [];
        const lowQuality = explainRecords.filter((e) => (e.quality_score || 0) < 60).length;
        const avgExplain = explainRecords.length > 0
          ? explainRecords.reduce((sum: number, e: GrcRecord) => sum + (e.quality_score || 0), 0) / explainRecords.length
          : 0;

        this.metrics.set({
          totalModels: 0, // Would need model registry API
          highRiskModels: 0,
          modelsRequiringAssessment: Array.isArray(data.modelsRequiringAssessment) ? data.modelsRequiringAssessment.length : 0,
          avgRiskScore: 0,
          
          totalDPIAs: dpiaItems.length,
          pendingReview: Array.isArray(data.dpiaRequiringReview) ? data.dpiaRequiringReview.length : 0,
          highPrivacyRisk,
          avgPrivacyRiskScore: avgPrivacyRisk,
          
          totalAgents: agentPerf.length,
          agentsWithBias: Array.isArray(data.agentBias) ? data.agentBias.length : 0,
          avgTrustScore: avgTrust,
          humanOverrides: 0, // Would need override API
          
          explainabilityRecords: explainRecords.length,
          lowQualityExplanations: lowQuality,
          avgExplainabilityScore: avgExplain,
          
          mappedFrameworks: (data.complianceDashboard as any)?.mappedFrameworks || 0,
          nonCompliantSystems: (data.complianceDashboard as any)?.nonCompliantCount || 0,
          avgComplianceScore: (data.complianceDashboard as any)?.avgComplianceScore || 0,
        });

        // Set tab data
        this.modelRiskData.set(Array.isArray(data.modelsRequiringAssessment) ? data.modelsRequiringAssessment : []);
        this.dpiaData.set(dpiaItems);
        this.agentPerformanceData.set(agentPerf.map((a) => ({
          agentId: a.agent_id || a.agentId,
          trustScore: a.trust_score || 0,
          biasDetected: false, // Would need to cross-reference with bias data
          overrides: 0,
        })));
        this.explainabilityData.set(explainRecords.map((e) => ({
          systemId: e.system_id || e.systemId,
          qualityScore: e.quality_score || 0,
          explanationType: e.explanation_type || '-',
          recordedAt: e.recorded_at || '-',
        })));
        this.complianceData.set(Array.isArray(data.systemsRequiringAssessment) ? data.systemsRequiringAssessment : []);

        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load dashboard metrics');
        this.loading.set(false);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('common.error') || 'Error',
          detail: this.i18n.translate('common.failedToLoadData') || 'Failed to load dashboard data',
          life: 5000,
        });
      },
    });
  }

  getRiskScoreClass(score?: number): string {
    if (!score) return '';
    if (score >= 70) return 'stat-danger';
    if (score >= 40) return 'stat-warning';
    return '';
  }

  getTrustScoreClass(score?: number): string {
    if (!score) return '';
    if (score >= 80) return '';
    if (score >= 60) return 'stat-warning';
    return 'stat-danger';
  }

  getQualityScoreClass(score?: number): string {
    if (!score) return '';
    if (score >= 80) return '';
    if (score >= 60) return 'stat-warning';
    return 'stat-danger';
  }

  getComplianceScoreClass(score?: number): string {
    if (!score) return '';
    if (score >= 80) return '';
    if (score >= 60) return 'stat-warning';
    return 'stat-danger';
  }

  getStateSeverity(state?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'contrast' {
    if (!state) return 'info';
    const s = state.toLowerCase();
    if (s.includes('approved') || s.includes('active')) return 'success';
    if (s.includes('pending') || s.includes('review')) return 'warning';
    if (s.includes('rejected') || s.includes('retired')) return 'danger';
    return 'info';
  }

  getStatusSeverity(status?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'contrast' {
    if (!status) return 'info';
    const s = status.toLowerCase();
    if (s.includes('approved') || s.includes('compliant')) return 'success';
    if (s.includes('pending') || s.includes('review')) return 'warning';
    if (s.includes('rejected') || s.includes('non-compliant')) return 'danger';
    return 'info';
  }

  getComplianceStatusSeverity(status?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'contrast' {
    if (!status) return 'info';
    const s = status.toLowerCase();
    if (s.includes('compliant')) return 'success';
    if (s.includes('partial') || s.includes('review')) return 'warning';
    if (s.includes('non-compliant')) return 'danger';
    return 'info';
  }
}
