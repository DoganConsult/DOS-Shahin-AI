import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { environment } from '@env/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TabViewModule } from 'primeng/tabs';
import { GrcFormFieldComponent } from '@app/shared/components';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { MessageService } from 'primeng/api';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { devError } from '../../../core/utils/dev-logger';
import { AppDatePipe, AppNumberPipe} from '../../../../shared/pipes';
import { type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incidents',
    imports: [
        CommonModule, FormsModule, RouterModule,
        PageShellComponent, StatusBadgeComponent, TabViewModule, TableModule, CardModule, ButtonModule,
        DialogModule, InputTextModule, InputTextarea,
        DropdownModule, ToolbarModule, TooltipModule, ToastModule,
        AiPanelComponent, ExportButtonComponent, AppDatePipe, AppNumberPipe, RaciPanelComponent
    ],
    providers: [MessageService],
    templateUrl: './incidents.component.html',
    styleUrls: ['./incidents.component.scss']
})
export class IncidentsComponent implements OnInit {
  tabIndex = 0;
  loading = false;
  incidents: Record<string, any>[] = [];
  triageResult: Record<string, any> | null = null;
  showReportDialog = false;
  newIncident = { title: '', description: '', severity: 'medium', category: 'policy_violation', responder: '', lessons_learned: '' };
  pipelineData: Record<string, any> | null = null;
  severityKeys = ['critical', 'high', 'medium', 'low'];

  severityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  categoryOptions = [
    { label: 'Data Breach', value: 'data_breach' },
    { label: 'Unauthorized Access', value: 'unauthorized_access' },
    { label: 'Policy Violation', value: 'policy_violation' },
    { label: 'System Failure', value: 'system_failure' },
    { label: 'Compliance Gap', value: 'compliance_gap' }
  ];

  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);

  constructor(public i18n: I18nService, private messageService: MessageService, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadIncidents());
    this.loadIncidents();
    this.loadPipeline();
  }

  isAr(): boolean { return this.i18n.currentLang() === 'ar'; }

  severityColor(s: string): string {
    const map: Record<string, string> = { critical: 'var(--error)', high: '#ea580c', medium: 'var(--warning)', low: 'var(--success)' };
    return map[s] || '#6b7280';
  }

  slaForSeverity(s: string): number {
    const map: Record<string, number> = { critical: 4, high: 24, medium: 72, low: 168 };
    return map[s] || 72;
  }

  loadPipeline(): void {
    this.http.get<any>(`${environment.apiUrl}/incidents/governance-pipeline`).subscribe({
      next: (d) => { this.pipelineData = d; },
      error: (e: any) => devError("[API]", e)
    });
  }

  loadIncidents(): void {
    this.loading = true;
    this.riskSvc.getIncidents().subscribe({
      next: (r: Record<string, any>) => { this.incidents = r.incidents || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadIncidents'), life: 4000 });
      }
    });
  }

  reportNewIncident(): void {
    if (!this.newIncident.title) return;
    this.riskSvc.reportIncident(this.newIncident).subscribe({
      next: () => {
        this.newIncident = { title: '', description: '', severity: 'medium', category: 'policy_violation', responder: '', lessons_learned: '' };
        this.showReportDialog = false;
        this.tabIndex = 0;
        this.loadIncidents();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.incidentReported'), life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToReportIncident'), life: 4000 });
      }
    });
  }

  resetForm(): void {
    this.newIncident = { title: '', description: '', severity: 'medium', category: 'policy_violation', responder: '', lessons_learned: '' };
  }

  investigate(inc: Record<string, any>): void {
    this.riskSvc.investigateIncident(inc.incident_id, { findings: 'Investigation started' }).subscribe({
      next: () => {
        this.loadIncidents();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.investigationStarted'), life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToStartInvestigation'), life: 4000 });
      }
    });
  }

  triageIncident(id: string): void {
    this.riskSvc.getAIIncidentTriage(id).subscribe({
      next: (r: Record<string, any>) => { this.triageResult = r; this.tabIndex = 2; },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.aiTriageFailed'), life: 4000 });
      }
    });
  }

  readonly incidentAgents: AgentInfo[] = [
    { id: 'A08', name: 'Incident Responder', nameAr: 'مستجيب الحوادث', icon: 'pi-bolt', color: '#ef4444', domain: 'Incident', domainAr: 'الحوادث', autonomyLevel: 'full', status: 'active' },
  ];

  readonly incidentTransitions = [
    { from: 'reported', to: 'triaged' },
    { from: 'triaged', to: 'investigating' },
    { from: 'investigating', to: 'contained' },
    { from: 'contained', to: 'remediated' },
    { from: 'remediated', to: 'closed', requiresApproval: true },
    { from: 'reported', to: 'dismissed' },
    { from: 'investigating', to: 'escalated' },
    { from: 'escalated', to: 'investigating' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'incident',
    tier: 'full',
    automationLevel: 'full',
    slaHours: 24,
    transitions: this.incidentTransitions,
    currentStatus: 'triaged',
    agents: this.incidentAgents,
    lang: this.isAr() ? 'ar' : 'en',
  }));
}
