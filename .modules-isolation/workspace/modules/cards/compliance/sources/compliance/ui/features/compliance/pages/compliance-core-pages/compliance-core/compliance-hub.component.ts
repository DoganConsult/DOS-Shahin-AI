import { Component, inject, signal, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { Store } from '@ngrx/store';
import { ComplianceActions } from '@compliance-module/ui/state/compliance.actions';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compliance-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentBadgeComponent, HubHelpPanelComponent],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <div class="hub-toolbar">
        <app-agent-badge [agentId]="agentId" />
        <app-hub-help-panel [hubRoute]="'/compliance'" />
      </div>

      <!-- KPI Bar -->
      @if (kpis()) {
      <div class="kpi-bar">
        <button class="kpi-chip" (click)="navigate('/compliance/frameworks')">
          <span class="kpi-value">{{ kpis().activeFrameworks || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('compliance.frameworks') || 'Frameworks' }}</span>
        </button>
        <button class="kpi-chip kpi-info" (click)="navigate('/compliance/controls')">
          <span class="kpi-value">{{ kpis().controlsMapped || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('compliance.controls') || 'Controls' }}</span>
        </button>
        <button class="kpi-chip kpi-warning" (click)="navigate('/compliance/gaps')">
          <span class="kpi-value">{{ kpis().openGaps || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('compliance.openGaps') || 'Open Gaps' }}</span>
        </button>
        <button class="kpi-chip kpi-danger" (click)="navigate('/compliance/gaps', {severity: 'critical'})">
          <span class="kpi-value">{{ kpis().criticalGaps || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('compliance.criticalGaps') || 'Critical Gaps' }}</span>
        </button>
        <button class="kpi-chip kpi-success" (click)="navigate('/compliance/posture')">
          <span class="kpi-value">{{ kpis().auditReadiness || '—' }}%</span>
          <span class="kpi-label">{{ i18n.translate('compliance.auditReadiness') || 'Audit Readiness' }}</span>
        </button>
        <button class="kpi-chip" (click)="navigate('/audit/overview')">
          <span class="kpi-value">{{ lastAuditOpinion() }}</span>
          <span class="kpi-label">{{ i18n.translate('compliance.lastAuditOpinion') || 'Last Audit Opinion' }}</span>
        </button>
      </div>
      }

      <div class="hub-content">
        <router-outlet />
      </div>

      <!-- FAB -->
      <div class="fab-container">
        <button class="fab-main" (click)="fabOpen = !fabOpen"><i class="pi" [class.pi-plus]="!fabOpen" [class.pi-times]="fabOpen"></i></button>
        @if (fabOpen) {
        <div class="fab-menu">
          <button class="fab-item" (click)="navigate('/compliance/assessments', {action: 'create'}); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.newAssessment') || 'New Assessment' }}</button>
          <button class="fab-item" (click)="navigate('/compliance/gaps', {action: 'create'}); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.logGap') || 'Log Gap' }}</button>
          <button class="fab-item" (click)="navigate('/compliance/controls', {action: 'create'}); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.newControl') || 'New Control' }}</button>
          <button class="fab-item" (click)="navigate('/compliance/templates'); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.templates') || 'Templates' }}</button>
          <button class="fab-item" (click)="navigate('/risk/home'); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.riskModule') || 'Risk Module' }}</button>
          <button class="fab-item" (click)="navigate('/audit/overview'); fabOpen = false"><i class=""></i> {{ i18n.translate('compliance.auditModule') || 'Audit Module' }}</button>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .grc-hub { min-height: 100vh; background: var(--surface-ground, var(--surface-ice)); position: relative; }
    .hub-toolbar {
      position: sticky; top: 0; z-index: var(--z-dropdown);
      display: flex; align-items: center; gap: 8px;
      justify-content: flex-end;
      padding: 6px 20px;
      pointer-events: none;
    }
    .hub-toolbar > * { pointer-events: auto; }
    .hub-content { padding: 0; }

    .kpi-bar { display: flex; gap: 8px; padding: 8px 20px; overflow-x: auto; flex-wrap: wrap; }
    .kpi-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 16px; min-width: 100px;
      background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 12px);
      cursor: pointer; transition: all .15s; }
    .kpi-chip:hover { border-color: var(--primary-200, #93c5fd); background: var(--primary-50, #eff6ff); }
    .kpi-value { font-size: var(--font-size-xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-xs, 11px); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .kpi-info .kpi-value { color: var(--info, #3b82f6); }
    .kpi-warning .kpi-value { color: #ca8a04; }
    .kpi-danger .kpi-value { color: var(--error, #ef4444); }
    .kpi-success .kpi-value { color: var(--success, #22c55e); }

    .fab-container { position: fixed; bottom: 24px; right: 24px; z-index: var(--z-modal); display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 8px; }
    .fab-main { width: 48px; height: 48px; border-radius: 50%; background: var(--primary-color); color: #fff; border: none; cursor: pointer; font-size: var(--font-size-xl); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(var(--color-black-rgb), .2); transition: transform .2s; }
    .fab-main:hover { transform: scale(1.1); }
    .fab-menu { display: flex; flex-direction: column; gap: 6px; }
    .fab-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 12px); cursor: pointer; font-size: var(--font-size-sm); white-space: nowrap; box-shadow: 0 2px 8px rgba(var(--color-black-rgb), .1); transition: all .15s; }
    .fab-item:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); }
    .fab-item .pi { color: var(--primary-color); font-size: var(--font-size-sm); }
  `]
})
export class ComplianceHubComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  readonly agentId = 'A05';

  private http = inject(HttpClient);
  private readonly ngrxStore = inject(Store);

  kpis = signal<GrcRecord | null>(null);
  lastAuditOpinion = signal<string>('—');
  fabOpen = false;

  ngOnInit() {
    // Load via centralized store (cached, prevents duplicate calls)
    this.ngrxStore.dispatch(ComplianceActions.loadOverview());
    this.ngrxStore.dispatch(ComplianceActions.loadFrameworks());

    // Also load local KPIs for backward compat
    this.loadKpis();
    this.loadAuditOpinion();
    this.live.compliance$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadKpis();
      this.ngrxStore.dispatch(ComplianceActions.loadOverview());
    });
  }

  loadKpis() {
    this.api.getComplianceStatus().subscribe({
      next: d => {
        const s = d?.summary || d;
        this.kpis.set(s);
      },
      error: () => this.kpis.set({ activeFrameworks: 0, controlsMapped: 0, openGaps: 0, criticalGaps: 0, auditReadiness: '—' })
    });
  }

  loadAuditOpinion() {
    this.http.get<unknown>('/api/audit/ratings/summary').subscribe({
      next: d => {
        const rating = d?.averageRating || d?.average_rating || d?.overall;
        this.lastAuditOpinion.set(rating ? String(rating) : '—');
      },
      error: () => this.lastAuditOpinion.set('—')
    });
  }

  navigate(path: string, queryParams?: Record<string, string>) {
    this.router.navigate([path], queryParams ? { queryParams } : undefined);
  }
}
