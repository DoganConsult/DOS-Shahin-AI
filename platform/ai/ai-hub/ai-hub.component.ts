import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { extractAgentMetrics, AgentMetrics, AgentPerformanceRecord } from './agent-metrics.utils';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-hub',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageShellComponent, StatusBadgeComponent,
    CardModule, ButtonModule, InputTextModule, DropdownModule,
    ProgressSpinnerModule, TagModule, ToastModule, TableModule
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="microchip-ai"
      [title]="i18n.translate('ai.hub')"
      [subtitle]="i18n.translate('ai.hubSubtitle')"
      [breadcrumbs]="['Dashboard', 'AI Hub']"
      [loading]="false">

      <!-- Agent Showcase Banner -->
      <div class="agents-banner">
        <img loading="lazy" src="agents-grid.png" alt="Shahin-AI Agents" class="agents-banner-img" />
        <div class="agents-banner-overlay">
          <h2>{{ i18n.translate('ai.specializedAgents') }}</h2>
          <p>{{ i18n.translate('ai.poweredByEngine') }}</p>
        </div>
      </div>

      <!-- Error Banner -->
      <div *ngIf="errorMessage" class="ai-error-banner">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ errorMessage }}</span>
        <button [attr.aria-label]="i18n.translate('common.close')" class="ai-error-close" (click)="dismissError()"><i class="pi pi-times"></i></button>
      </div>

      <!-- Agent Performance Metrics Panel -->
      <p-card styleClass="metrics-panel" *ngIf="!metricsError">
        <div class="metrics-header">
          <div class="metrics-title">
            <i class="pi pi-chart-line" style="font-size: var(--font-size-xl); color: var(--primary)"></i>
            <h3>{{ i18n.translate('ai.agentPerformance') }}</h3>
          </div>
          <p-button icon="pi pi-refresh" [rounded]="true" [text]="true"
                    (onClick)="loadAgentPerformance()" [disabled]="metricsLoading" />
        </div>
        <div *ngIf="metricsLoading" class="loading-box">
          <p-progressSpinner [style]="{width: '36px', height: '36px'}" strokeWidth="4" />
        </div>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('ai.ariaAgentPerformanceTable')" *ngIf="!metricsLoading && agentMetrics.length > 0"
                 [value]="agentMetrics" [rows]="10" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('ai.agentId') }}</th>
              <th>{{ i18n.translate('ai.successRate') }}</th>
              <th>{{ i18n.translate('ai.avgResponseTime') }}</th>
              <th>{{ i18n.translate('ai.totalExecutions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-m>
            <tr>
              <td>
                <div class="flex align-items-center gap-2">
                  <i class="pi" [ngClass]="getAgentIcon(m.agentId)" [style.color]="getAgentColor(m.agentId)"></i>
                  <p-tag [value]="m.agentId" severity="info" />
                </div>
              </td>
              <td>
                <span [class]="getSuccessRateClass(m.successRate)">{{ m.successRate }}%</span>
              </td>
              <td>{{ m.avgResponseTime }} ms</td>
              <td>{{ m.totalExecutions }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4" class="text-center">{{ i18n.translate('ai.noPerformanceData') }}</td></tr>
          </ng-template>
        </p-table>
        <div *ngIf="!metricsLoading && agentMetrics.length === 0" class="no-data">
          {{ i18n.translate('ai.noPerformanceData') }}
        </div>
      </p-card>

      <!-- Metrics Error Banner -->
      <div *ngIf="metricsError" class="ai-error-banner" style="margin-bottom: 16px;">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ metricsError }}</span>
        <span *ngIf="metricsCorrelationId" class="ai-correlation">
          <span class="correlation-label">{{ i18n.translate('common.correlationId') || 'Correlation ID' }}:</span>
          <code>{{ metricsCorrelationId }}</code>
        </span>
        <button [attr.aria-label]="i18n.translate('common.retry')" class="ai-error-retry" (click)="loadAgentPerformance()"><i class="pi pi-refresh"></i> {{ i18n.translate('common.retry') || 'Retry' }}</button>
      </div>

      <!-- Agent Mesh + Monitored controls link -->
      <p-card styleClass="mesh-panel" *ngIf="!meshError">
        <div class="mesh-header">
          <div class="mesh-title">
            <i class="pi pi-sitemap" style="font-size: var(--font-size-xl); color: var(--primary)"></i>
            <h3>{{ i18n.translate('Agent Mesh') }}</h3>
          </div>
          <a [routerLink]="['/compliance/controls']" [queryParams]="{ monitored: '1' }" class="mesh-link">
            <i class="pi pi-shield"></i> {{ i18n.translate('Monitored controls') }}
          </a>
        </div>
        <div *ngIf="meshLoading" class="loading-box">
          <p-progressSpinner [style]="{width: '36px', height: '36px'}" strokeWidth="4" />
        </div>
        <div *ngIf="!meshLoading && meshParticipants.length === 0 && meshHandoffs.length === 0" class="no-data">
          {{ i18n.translate('No mesh data') }}
        </div>
        <div *ngIf="!meshLoading && (meshParticipants.length > 0 || meshHandoffs.length > 0)" class="mesh-body">
          <div class="mesh-participants" *ngIf="meshParticipants.length > 0">
            <h4 class="mesh-subtitle">{{ i18n.translate('Participants') }}</h4>
            <div class="participant-pills">
              <a *ngFor="let p of meshParticipants" [routerLink]="['/ai-os-dashboard', 'decisions']" [queryParams]="{ agentId: p.userId || p.memberId || p.id }" class="participant-pill participant-pill-link">{{ p.displayNameEn || p.name || p.id || p }}</a>
            </div>
          </div>
          <div class="mesh-handoffs" *ngIf="meshHandoffs.length > 0">
            <h4 class="mesh-subtitle">{{ i18n.translate('Handoffs') }}</h4>
            <ul class="handoff-list">
              <li *ngFor="let h of meshHandoffs">
                <a [routerLink]="['/ai-os-dashboard', 'decisions']" [queryParams]="{ agentId: h.from_agent || h.from || h.source }" class="handoff-link">{{ h.from_agent || h.from || h.source || '?' }}</a>
                <i class="pi pi-arrow-right"></i>
                <a [routerLink]="['/ai-os-dashboard', 'decisions']" [queryParams]="{ agentId: h.to_agent || h.to || h.target }" class="handoff-link">{{ h.to_agent || h.to || h.target || '?' }}</a>
              </li>
            </ul>
          </div>
          <div class="mesh-monitoring" *ngIf="meshMonitoringTotal > 0">
            <span class="mesh-meta">{{ i18n.translate('Monitoring targets') }}: {{ meshMonitoringTotal }}</span>
          </div>
        </div>
      </p-card>
      <div *ngIf="meshError" class="ai-error-banner" style="margin-bottom: 16px;">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ meshError }}</span>
        <span *ngIf="meshCorrelationId" class="ai-correlation">
          <span class="correlation-label">{{ i18n.translate('common.correlationId') || 'Correlation ID' }}:</span>
          <code>{{ meshCorrelationId }}</code>
        </span>
        <button [attr.aria-label]="i18n.translate('common.retry')" class="ai-error-retry" (click)="loadIntegrationMesh()"><i class="pi pi-refresh"></i> {{ i18n.translate('common.retry') || 'Retry' }}</button>
      </div>

      <!-- AI Agent Cards Grid -->
      <div class="ai-grid">
        <!-- Risk Assessment -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-shield" style="font-size: var(--font-size-2xl); color: var(--red-500)"></i>
            <h4>{{ i18n.translate('ai.riskAssessment') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.riskAssessmentDesc') }}</p>
          <div class="ai-card-input">
            <input pInputText [(ngModel)]="riskId" [placeholder]="i18n.translate('ai.riskIdPlaceholder')" [attr.aria-label]="i18n.translate('ai.riskIdPlaceholder')" />
            <p-button [label]="i18n.translate('ai.analyze')" icon="pi pi-search"
                      (onClick)="runRiskAssessment()" [loading]="analysisLoading === 'risk'" />
          </div>
          <div *ngIf="analysisResults['risk']" class="ai-result">
            <pre>{{ analysisResults['risk'] | json }}</pre>
          </div>
        </p-card>

        <!-- Gap Analysis -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-chart-bar" style="font-size: var(--font-size-2xl); color: var(--blue-500)"></i>
            <h4>{{ i18n.translate('ai.gapAnalysis') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.gapAnalysisDesc') }}</p>
          <div class="ai-card-input">
            <input pInputText [(ngModel)]="frameworkId" [placeholder]="i18n.translate('ai.frameworkIdPlaceholder')" [attr.aria-label]="i18n.translate('ai.frameworkIdPlaceholder')" />
            <p-button [label]="i18n.translate('ai.analyze')" icon="pi pi-search"
                      (onClick)="runGapAnalysis()" [loading]="analysisLoading === 'gap'" />
          </div>
          <div *ngIf="analysisResults['gap']" class="ai-result">
            <pre>{{ analysisResults['gap'] | json }}</pre>
          </div>
        </p-card>

        <!-- Policy Generation -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-file-edit" style="font-size: var(--font-size-2xl); color: var(--green-500)"></i>
            <h4>{{ i18n.translate('ai.policyGeneration') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.policyGenerationDesc') }}</p>
          <div class="ai-card-input">
            <input pInputText [(ngModel)]="policyTopic" [placeholder]="i18n.translate('ai.policyTopicPlaceholder')" [attr.aria-label]="i18n.translate('ai.policyTopicPlaceholder')" />
            <p-button [label]="i18n.translate('ai.generate')" icon="pi pi-sparkles"
                      (onClick)="runPolicyGeneration()" [loading]="analysisLoading === 'policy'" />
          </div>
          <div *ngIf="analysisResults['policy']" class="ai-result">
            <pre>{{ analysisResults['policy'] | json }}</pre>
          </div>
        </p-card>

        <!-- Audit Preparation -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-check-square" style="font-size: var(--font-size-2xl); color: var(--purple-500)"></i>
            <h4>{{ i18n.translate('ai.auditPrep') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.auditPrepDesc') }}</p>
          <div class="ai-card-input">
            <input pInputText [(ngModel)]="auditFrameworkId" [placeholder]="i18n.translate('ai.frameworkIdPlaceholder')" [attr.aria-label]="i18n.translate('ai.frameworkIdPlaceholder')" />
            <p-button [label]="i18n.translate('ai.analyze')" icon="pi pi-search"
                      (onClick)="runAuditPrep()" [loading]="analysisLoading === 'audit'" />
          </div>
          <div *ngIf="analysisResults['audit']" class="ai-result">
            <pre>{{ analysisResults['audit'] | json }}</pre>
          </div>
        </p-card>

        <!-- Incident Triage -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-exclamation-circle" style="font-size: var(--font-size-2xl); color: var(--orange-500)"></i>
            <h4>{{ i18n.translate('ai.incidentTriage') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.incidentTriageDesc') }}</p>
          <div class="ai-card-input">
            <input pInputText [(ngModel)]="incidentId" [placeholder]="i18n.translate('ai.incidentIdPlaceholder')" [attr.aria-label]="i18n.translate('ai.incidentIdPlaceholder')" />
            <p-button [label]="i18n.translate('ai.analyze')" icon="pi pi-search"
                      (onClick)="runIncidentTriage()" [loading]="analysisLoading === 'incident'" />
          </div>
          <div *ngIf="analysisResults['incident']" class="ai-result">
            <pre>{{ analysisResults['incident'] | json }}</pre>
          </div>
        </p-card>

        <!-- Explainability Packs -->
        <p-card styleClass="ai-card">
          <div class="ai-card-header">
            <i class="pi pi-info-circle" style="font-size: var(--font-size-2xl); color: var(--teal-500)"></i>
            <h4>{{ i18n.translate('ai.explainability') }}</h4>
          </div>
          <p>{{ i18n.translate('ai.explainabilityDesc') }}</p>
          <div class="ai-card-input">
            <p-button [label]="i18n.translate('ai.generate')" icon="pi pi-sparkles"
                      (onClick)="runExplainability()" [loading]="analysisLoading === 'explain'" />
          </div>
          <div *ngIf="analysisResults['explain']" class="ai-result">
            <pre>{{ analysisResults['explain'] | json }}</pre>
          </div>
        </p-card>
      </div>

    </app-page-shell>
    <p-toast />
  `,
  styles: [`
    .agents-banner { position: relative; border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 24px; height: 180px; background: linear-gradient(135deg, #1a1a2e, #16213e); }
    .agents-banner-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.3; }
    .agents-banner-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; text-align: center; }
    .agents-banner-overlay h2 { margin: 0 0 8px; font-size: var(--font-size-2xl); }
    .agents-banner-overlay p { margin: 0; opacity: 0.8; }
    .ai-error-banner { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 16px; background: var(--red-50); border: 1px solid var(--red-200); border-radius: var(--radius); color: var(--red-700); margin-bottom: 16px; }
    .ai-error-close { background: none; border: none; cursor: pointer; color: var(--red-500); padding: 4px; }
    .ai-correlation { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); }
    .correlation-label { font-weight: 600; }
    .ai-correlation code { background: var(--surface-100); padding: 2px 8px; border-radius: var(--radius); font-size: var(--font-size-tag); }
    .ai-error-retry { display: inline-flex; align-items: center; gap: 6px; background: var(--red-100); border: 1px solid var(--red-300); color: var(--red-700); padding: 6px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }
    .ai-error-retry:hover { background: var(--red-200); }
    .metrics-panel { margin-bottom: 24px; }
    .metrics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .metrics-title { display: flex; align-items: center; gap: 8px; }
    .metrics-title h3 { margin: 0; font-size: var(--font-size-body-md); }
    .loading-box { display: flex; justify-content: center; padding: 24px; }
    .no-data { text-align: center; padding: 24px; color: var(--text-color-secondary); }
    .rate-high { color: var(--success); font-weight: 600; }
    .rate-medium { color: var(--orange-600); font-weight: 600; }
    .rate-low { color: var(--error); font-weight: 600; }
    .ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
    .ai-card { height: 100%; }
    .ai-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .ai-card-header h4 { margin: 0; }
    .ai-card-input { display: flex; gap: 8px; margin-top: 12px; }
    .ai-card-input input { flex: 1; }
    .ai-result { margin-top: 12px; background: var(--surface-ground); border-radius: var(--radius); padding: 12px; max-height: 200px; overflow: auto; }
    .ai-result pre { margin: 0; white-space: pre-wrap; font-size: var(--font-size-tag); }
    .mesh-panel { margin-bottom: 24px; }
    .mesh-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
    .mesh-title { display: flex; align-items: center; gap: 8px; }
    .mesh-title h3 { margin: 0; font-size: var(--font-size-body-md); }
    .mesh-link { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); font-weight: 600; color: var(--primary); text-decoration: none; }
    .mesh-link:hover { text-decoration: underline; }
    .mesh-body { display: flex; flex-direction: column; gap: 16px; }
    .mesh-subtitle { margin: 0 0 8px; font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); }
    .participant-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .participant-pill { padding: 4px 12px; border-radius: var(--radius-lg); background: var(--surface-100); font-size: var(--font-size-sm); font-weight: 500; }
    .participant-pill-link { color: var(--text-color); text-decoration: none; }
    .participant-pill-link:hover { background: var(--primary); color: var(--primary-contrast, #fff); }
    .handoff-list { margin: 0; padding-left: 20px; }
    .handoff-list li { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: var(--font-size-sm); }
    .handoff-link { color: var(--primary); text-decoration: none; font-weight: 500; }
    .handoff-link:hover { text-decoration: underline; }
    .handoff-from, .handoff-to { font-weight: 500; }
    .mesh-meta { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
  `]
})
export class AIHubComponent implements OnInit {
    private governanceSvc = inject(GrcGovernanceService);
    private complianceSvc = inject(GrcComplianceService);
    private riskSvc = inject(GrcRiskService);
  private destroyRef = inject(DestroyRef);
  agentMetrics: AgentMetrics[] = [];
  metricsLoading = false;
  metricsError = '';
  metricsCorrelationId = '';
  errorMessage = '';
  agentMeta: Record<string, unknown> = {};

  meshLoading = false;
  meshError = '';
  meshCorrelationId = '';
  meshParticipants: GrcRecord[] = [];
  meshHandoffs: GrcRecord[] = [];
  meshMonitoringTotal = 0;

  riskId = '';
  frameworkId = '';
  policyTopic = '';
  auditFrameworkId = '';
  incidentId = '';

  analysisLoading: string | null = null;
  analysisResults: Record<string, unknown> = {};

  private readonly AGENT_ICONS: Record<string, string> = {
    A01: 'pi-user-plus', A02: 'pi-key', A03: 'pi-sitemap', A04: 'pi-file-edit', A05: 'pi-folder-open',
    A06: 'pi-map', A07: 'pi-exclamation-triangle', A08: 'pi-book', A09: 'pi-link', A10: 'pi-chart-bar',
  };
  private readonly AGENT_COLORS: Record<string, string> = {
    A01: '#0ea5e9', A02: '#8b5cf6', A03: 'var(--warning)', A04: '#10b981', A05: '#ec4899',
    A06: 'var(--error)', A07: '#06b6d4', A08: '#f97316', A09: '#6366f1', A10: '#14b8a6',
  };

  constructor(
    public i18n: I18nService,
    private msg: MessageService,
    private router: Router,
    private agrcOs: AGRCOSService, private operationsSvc: GrcOperationsService
  ) {}

  ngOnInit(): void {
    this.loadAgentPerformance();
    this.loadIntegrationMesh();
    this.operationsSvc.getPublicAgents().subscribe({
      next: (res: Record<string, unknown>) => {
        for (const a of (res?.agents || [])) this.agentMeta[a.id] = a;
      }
    });
  }

  loadIntegrationMesh(): void {
    this.meshLoading = true;
    this.meshError = '';
    this.meshCorrelationId = '';
    this.agrcOs.getIntegrationMesh().subscribe({
      next: (mesh) => {
        this.meshParticipants = mesh?.participants ?? [];
        const items = mesh?.handoffs?.items ?? [];
        this.meshHandoffs = Array.isArray(items) ? items : [];
        const mt = mesh?.monitoringTargets;
        this.meshMonitoringTotal = mt && typeof mt.total === 'number' ? mt.total : 0;
        this.meshLoading = false;
      },
      error: (err) => {
        this.meshError = err?.error?.error || err?.message || this.i18n.translate('Failed to load mesh');
        this.meshCorrelationId = err?.error?.correlationId ?? err?.error?.correlation_id ?? '';
        this.meshLoading = false;
      }
    });
  }

  getAgentIcon(agentId: string): string { return this.agentMeta[agentId]?.icon || this.AGENT_ICONS[agentId] || 'pi-microchip-ai'; }
  getAgentColor(agentId: string): string { return this.agentMeta[agentId]?.color || this.AGENT_COLORS[agentId] || 'var(--text-muted)'; }

  loadAgentPerformance(): void {
    this.metricsLoading = true;
    this.metricsError = '';
    this.metricsCorrelationId = '';
    this.operationsSvc.getAgentPerformance().subscribe({
      next: (records: any) => {
        this.agentMetrics = extractAgentMetrics(records);
        this.metricsLoading = false;
      },
      error: (err: unknown) => {
        this.metricsError = err?.error?.error || err?.message || this.i18n.translate('admin.errorLoadTenants');
        this.metricsCorrelationId = err?.error?.correlationId ?? err?.error?.correlation_id ?? '';
        this.metricsLoading = false;
      }
    });
  }

  getSuccessRateClass(rate: number): string {
    if (rate >= 80) return 'rate-high';
    if (rate >= 50) return 'rate-medium';
    return 'rate-low';
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  private runAnalysis(key: string, obs: import('rxjs').Observable<any>): void {
    this.analysisLoading = key;
    this.errorMessage = '';
    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result: Record<string, unknown>) => {
        this.analysisResults[key] = result;
        this.analysisLoading = null;
      },
      error: (err: unknown) => {
        this.errorMessage = err?.error?.error || err?.message || this.i18n.translate('aiPanel.loadFailed');
        this.analysisLoading = null;
      }
    });
  }

  runRiskAssessment(): void {
    if (!this.riskId) return;
    this.runAnalysis('risk', this.riskSvc.getAIRiskAssessment(this.riskId));
  }

  runGapAnalysis(): void {
    if (!this.frameworkId) return;
    this.runAnalysis('gap', this.complianceSvc.getAIGapAnalysis(this.frameworkId));
  }

  runPolicyGeneration(): void {
    if (!this.policyTopic) return;
    this.runAnalysis('policy', this.governanceSvc.generateAIPolicy({ topic: this.policyTopic }));
  }

  runAuditPrep(): void {
    if (!this.auditFrameworkId) return;
    this.runAnalysis('audit', this.complianceSvc.getAIAuditPrep(this.auditFrameworkId));
  }

  runIncidentTriage(): void {
    if (!this.incidentId) return;
    this.runAnalysis('incident', this.riskSvc.getAIIncidentTriage(this.incidentId));
  }

  runExplainability(): void {
    this.runAnalysis('explain', this.operationsSvc.getExplainabilityPacks());
  }
}
