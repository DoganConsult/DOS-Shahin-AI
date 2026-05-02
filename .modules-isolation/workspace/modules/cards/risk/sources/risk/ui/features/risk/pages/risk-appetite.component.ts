import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RiskAppetiteConfigDto, AppetiteBreachDto, AcceptanceQueueItemDto, AppetiteTrendDto } from './risk-workspace/risk-workspace.models';
import { HasPermissionDirective } from '@app/shared/directives/has-permission.directive';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-appetite-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
    TableModule, ButtonModule, TagModule, TooltipModule, DialogModule, InputTextModule, DropdownModule, ToastModule, AppDatePipe, HasPermissionDirective,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="sliders-h"
      [title]="i18n.translate('risk.appetite')"
      [subtitle]="i18n.translate('risk.appetiteSubtitle')"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), i18n.translate('risk.appetite')]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <p-toast />

      <div class="health-strip" *ngIf="!loading()">
        <div class="health-card">
          <div class="health-value" style="color:var(--error)">{{ healthBreaches() }}</div>
          <div class="health-label">{{ i18n.translate('risk.breachesCount') }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#d97706">{{ healthPending() }}</div>
          <div class="health-label">{{ i18n.translate('risk.pendingAcceptance') }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--success)">{{ healthAccepted() }}</div>
          <div class="health-label">{{ i18n.translate('risk.acceptedCount') }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#6b7280">{{ healthRejected() }}</div>
          <div class="health-label">{{ i18n.translate('risk.rejectedCount') }}</div>
        </div>
      </div>

      <div class="section-header">
        <h4 class="section-title">{{ i18n.translate('risk.appetiteSettings') }}</h4>
        <p-button *appHasPermission="'risk:admin'" [label]="i18n.translate('risk.editAppetite')" icon="pi pi-pencil" severity="secondary" [outlined]="true" size="small" (onClick)="openConfigDialog()" />
      </div>
      <div *ngIf="config()" class="appetite-settings">
        <div class="appetite-meta">
          <span><strong>{{ i18n.translate('risk.model') }}:</strong> {{ config()!.appetiteModel || 'category_threshold' }}</span>
          <span *ngIf="config()!.lastApprovalDate"><strong>{{ i18n.translate('risk.lastApproved') }}:</strong> {{ config()!.lastApprovalDate | appDate:'medium' }}</span>
          <span *ngIf="config()!.approvingAuthority"><strong>{{ i18n.translate('risk.authority') }}:</strong> {{ config()!.approvingAuthority }}</span>
        </div>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="config()!.thresholdsByCategory || []" [rows]="10" styleClass="p-datatable-sm" *ngIf="config()!.thresholdsByCategory?.length">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('risk.category') }}</th><th>{{ i18n.translate('risk.threshold') }}</th><th>{{ i18n.translate('risk.severity') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-t>
            <tr>
              <td>{{ t.category | titlecase }}</td>
              <td><span class="score-pill" [class]="scoreClass(t.threshold)">{{ t.threshold }}</span></td>
              <td><p-tag [value]="t.severity" [rounded]="true" /></td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      <div *ngIf="!config() && !loading()" class="empty-section">
        <i class="pi pi-sliders-h"></i>
        <p>{{ i18n.translate('risk.emptyAppetite') }}</p>
        <p-button *appHasPermission="'risk:admin'" [label]="i18n.translate('risk.configureAppetite')" icon="pi pi-cog" (onClick)="openConfigDialog()" />
      </div>

      <!-- Category Gauge Meters -->
      <div class="section-header mt-lg">
        <h4 class="section-title">{{ i18n.translate('risk.categoryGauges') }}</h4>
      </div>
      <div class="gauge-grid" *ngIf="gauges().length > 0">
        <div *ngFor="let g of gauges()" class="gauge-card" tabindex="0" role="button" (keyup.enter)="navigateCategory(g.category)" (click)="navigateCategory(g.category)">
          <div class="gauge-label">{{ g.category | titlecase }}</div>
          <div class="gauge-bar-bg" role="img" [attr.aria-label]="'Residual ' + g.avgResidual + ' / Threshold ' + g.threshold">
            <div class="gauge-bar-fill" [style.width.%]="gaugePercent(g)" [class.gauge-green]="g.avgResidual <= g.threshold" [class.gauge-amber]="g.avgResidual > g.threshold && g.avgResidual <= g.threshold * 1.3" [class.gauge-red]="g.avgResidual > g.threshold * 1.3"></div>
            <div class="gauge-threshold-line" [style.left.%]="gaugeThresholdPercent(g)" aria-hidden="true"></div>
          </div>
          <div class="gauge-meta">
            <span>{{ i18n.translate('risk.avgResidual') }}: <strong>{{ g.avgResidual }}</strong></span>
            <span>{{ i18n.translate('risk.threshold') }}: <strong>{{ g.threshold }}</strong></span>
          </div>
        </div>
      </div>
      <div *ngIf="gauges().length === 0 && !loading()" class="empty-inline">{{ i18n.translate('risk.noGaugeData') }}</div>

      <!-- What-If Simulation -->
      <div class="section-header mt-lg">
        <h4 class="section-title">{{ i18n.translate('risk.whatIfSimulation') }}</h4>
      </div>
      <div class="whatif-panel" *ngIf="config()">
        <div class="whatif-controls">
          <label>{{ i18n.translate('risk.adjustThreshold') }}</label>
          <input type="range" [min]="1" [max]="25" [(ngModel)]="whatIfThreshold" (input)="computeWhatIf()" class="whatif-slider" />
          <span class="whatif-value">{{ whatIfThreshold }}</span>
        </div>
        <div class="whatif-result" *ngIf="whatIfResult">
          <div class="whatif-stat">
            <span class="whatif-num" style="color:var(--error)">{{ whatIfResult.wouldBreach }}</span>
            <span class="whatif-desc">{{ i18n.translate('risk.wouldBreach') }}</span>
          </div>
          <div class="whatif-stat">
            <span class="whatif-num" style="color:var(--success)">{{ whatIfResult.wouldClear }}</span>
            <span class="whatif-desc">{{ i18n.translate('risk.wouldClear') }}</span>
          </div>
        </div>
      </div>

      <div class="toolbar-row mt-lg">
        <h4 class="section-title">{{ i18n.translate('risk.appetiteBreaches') }}</h4>
        <app-export-button module="risk-appetite-breaches" [label]="i18n.translate('risk.export')" [data]="breaches()" />
      </div>
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="breaches()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" *ngIf="breaches().length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('risk.risk') }}</th><th>{{ i18n.translate('risk.category') }}</th><th>{{ i18n.translate('risk.residualScore') }}</th>
            <th>{{ i18n.translate('risk.threshold') }}</th><th>{{ i18n.translate('risk.breach') }}</th><th>{{ i18n.translate('risk.owner') }}</th>
            <th>{{ i18n.translate('risk.escalation') }}</th><th>{{ i18n.translate('risk.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-b>
          <tr>
            <td class="font-semibold">{{ b.riskTitle }}</td>
            <td><p-tag [value]="b.category" [rounded]="true" /></td>
            <td class="text-center"><span class="score-pill score-danger">{{ b.residualScore }}</span></td>
            <td class="text-center">{{ b.appetiteThreshold }}</td>
            <td class="text-center font-semibold text-danger">+{{ b.breachAmount }}</td>
            <td>{{ b.owner || '—' }}</td>
            <td><app-status-badge [status]="b.escalationStatus" /></td>
            <td>
              <div class="row-actions">
                <button aria-label="View Risk" class="icon-btn" (click)="navigateToRisk(b.riskId)" pTooltip="View Risk"><i class="pi pi-eye"></i></button>
                <button *appHasPermission="'risk:write'" aria-label="Request Acceptance" class="icon-btn" (click)="requestAcceptance(b.riskId)" pTooltip="Request Acceptance"><i class="pi pi-check-circle"></i></button>
                <button aria-label="Request Acceptance Page" class="icon-btn" (click)="navigateToAcceptance(b.riskId)" pTooltip="Go to Acceptance"><i class="pi pi-arrow-right"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
      <div *ngIf="breaches().length === 0" class="empty-inline">{{ i18n.translate('risk.noBreaches') }}</div>

      <h4 class="section-title mt-lg">{{ i18n.translate('risk.acceptanceQueue') }}</h4>
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="queue()" [rows]="10" styleClass="p-datatable-sm" *ngIf="queue().length > 0">
        <ng-template pTemplate="header">
          <tr><th>{{ i18n.translate('risk.risk') }}</th><th>{{ i18n.translate('risk.category') }}</th><th>{{ i18n.translate('risk.residualScore') }}</th><th>{{ i18n.translate('risk.status') }}</th><th>{{ i18n.translate('risk.actions') }}</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-q>
          <tr>
            <td class="font-semibold">{{ q.riskTitle }}</td>
            <td><p-tag [value]="q.category" [rounded]="true" /></td>
            <td class="text-center"><span class="score-pill" [class]="scoreClass(q.residualScore)">{{ q.residualScore }}</span></td>
            <td><app-status-badge [status]="q.status" /></td>
            <td>
              <div class="row-actions">
                <button *appHasPermission="'risk:approve'" aria-label="Accept" class="icon-btn" (click)="approveAcceptance(q.riskId, 'accepted')" pTooltip="Accept"><i class="pi pi-check"></i></button>
                <button *appHasPermission="'risk:approve'" aria-label="Reject" class="icon-btn danger" (click)="approveAcceptance(q.riskId, 'rejected')" pTooltip="Reject"><i class="pi pi-times"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
      <div *ngIf="queue().length === 0" class="empty-inline">{{ i18n.translate('risk.noAcceptancePending') }}</div>

      <h4 class="section-title mt-lg">{{ i18n.translate('risk.appetiteTrend') }}</h4>
      <div *ngIf="trends().length > 0" class="appetite-trend-grid">
        <div *ngFor="let at of trends()" class="appetite-trend-card">
          <span class="at-category">{{ at.category | titlecase }}</span>
          <span class="at-breaches">{{ at.breachCount }} {{ i18n.translate('risk.breachesLabel') }}</span>
          <span class="at-accepted">{{ at.acceptedCount }} {{ i18n.translate('risk.acceptedLabel') }}</span>
        </div>
      </div>

      <p-dialog [header]="i18n.translate('risk.configureAppetite')" [(visible)]="configDialogVisible" [modal]="true" [style]="{width:'500px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('risk.model') }}</label>
            <p-dropdown [(ngModel)]="configForm.model" [options]="modelOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field"><label>{{ i18n.translate('risk.authority') }}</label><input pInputText [(ngModel)]="configForm.authority" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('risk.cancel')" severity="secondary" [text]="true" (onClick)="configDialogVisible=false" />
          <p-button [label]="i18n.translate('risk.save')" icon="pi pi-check" (onClick)="saveConfig()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; text-align: center; padding: 14px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: default; transition: box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-card); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md, 12px); }
    .section-title { font-size: var(--font-size-base); font-weight: 600; color: var(--text); margin: 0; padding-bottom: var(--space-xs, 4px); border-bottom: 2px solid var(--primary); display: inline-block; }
    .mt-lg { margin-top: var(--space-xl, 24px); }
    .toolbar-row { display: flex; align-items: center; gap: var(--space-md, 12px); flex-wrap: wrap; }
    .appetite-settings { margin-bottom: var(--space-lg, 16px); }
    .appetite-meta { display: flex; gap: var(--space-lg, 16px); flex-wrap: wrap; margin-bottom: var(--space-md, 12px); font-size: var(--font-size-sm); color: var(--text); }
    .appetite-meta strong { margin-inline-end: var(--space-xs, 4px); }
    .font-semibold { font-weight: 600; }
    .text-center { text-align: center; }
    .text-danger { color: var(--error); }
    .score-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; padding: 0 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 700; }
    .score-pill.score-danger { background: rgba(239,68,68,.12); color: var(--error); }
    .score-pill.score-warning { background: rgba(245,158,11,.12); color: var(--warning); }
    .score-pill.score-success { background: rgba(34,197,94,.12); color: var(--success); }
    .row-actions { display: flex; gap: var(--space-xs, 4px); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: var(--surface-ice, rgba(0,0,0,.05)); color: var(--primary); }
    .icon-btn.danger:hover { background: rgba(239,68,68,.08); color: var(--error); }
    .appetite-trend-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-md, 12px); }
    .appetite-trend-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); padding: var(--space-md, 12px); display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .at-category { font-weight: 600; color: var(--text); }
    .at-breaches { font-size: var(--font-size-sm); color: var(--error); }
    .at-accepted { font-size: var(--font-size-sm); color: var(--success); }
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: 2.5rem; color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); margin-bottom: var(--space-md, 12px); }
    .empty-inline { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: var(--space-md, 12px) 0; }
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .w-full { width: 100%; }
    .gauge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md, 12px); }
    .gauge-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; cursor: pointer; transition: box-shadow .15s; }
    .gauge-card:hover { box-shadow: var(--shadow-card); border-color: var(--primary-200, #93c5fd); }
    .gauge-label { font-weight: 600; font-size: var(--font-size-sm); margin-bottom: 8px; }
    .gauge-bar-bg { position: relative; height: 12px; background: var(--surface-ice, #f0f0f0); border-radius: 6px; overflow: visible; }
    .gauge-bar-fill { height: 100%; border-radius: 6px; transition: width .3s; }
    .gauge-bar-fill.gauge-green { background: var(--success, #22c55e); }
    .gauge-bar-fill.gauge-amber { background: var(--warning, #f59e0b); }
    .gauge-bar-fill.gauge-red { background: var(--error, #ef4444); }
    .gauge-threshold-line { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--text, #333); border-radius: 1px; }
    .gauge-meta { display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 6px; }
    .whatif-panel { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; display: flex; flex-wrap: wrap; gap: var(--space-lg, 16px); align-items: center; }
    .whatif-controls { display: flex; align-items: center; gap: var(--space-md, 12px); flex: 1; min-width: 250px; }
    .whatif-controls label { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; }
    .whatif-slider { flex: 1; accent-color: var(--primary); }
    .whatif-value { font-size: var(--font-size-lg); font-weight: 700; min-width: 30px; text-align: center; }
    .whatif-result { display: flex; gap: var(--space-lg, 16px); }
    .whatif-stat { display: flex; flex-direction: column; align-items: center; }
    .whatif-num { font-size: var(--font-size-2xl); font-weight: 700; }
    .whatif-desc { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
  `]
})
export class RiskAppetitePageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private msg = inject(MessageService);
  public i18n = inject(I18nService);

  loading = signal(true);
  config = signal<RiskAppetiteConfigDto | null>(null);
  breaches = signal<AppetiteBreachDto[]>([]);
  queue = signal<AcceptanceQueueItemDto[]>([]);
  trends = signal<AppetiteTrendDto[]>([]);
  gauges = signal<GrcRecord[]>([]);
  configDialogVisible = false;
  configForm = { model: 'category_threshold', authority: '' };
  whatIfThreshold = 15;
  whatIfResult: { wouldBreach: number; wouldClear: number } | null = null;

  tabs = RISK_TABS;
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  healthBreaches = computed(() => this.breaches().length);
  healthPending = computed(() => this.queue().filter(q => q.status === 'pending').length);
  healthAccepted = computed(() => this.queue().filter(q => q.status === 'accepted').length);
  healthRejected = computed(() => this.queue().filter(q => q.status === 'rejected').length);

  get modelOptions() {
    return [
      { label: this.i18n.translate('risk.categoryThreshold'), value: 'category_threshold' },
      { label: this.i18n.translate('risk.severityThreshold'), value: 'severity_threshold' },
      { label: this.i18n.translate('risk.entityThreshold'), value: 'entity_threshold' },
    ];
  }

  ngOnInit(): void {
    this.loadAll();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());
  }

  private loadAll(): void {
    this.api.getAppetiteConfig().subscribe({
      next: (d) => { this.config.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getAppetiteBreaches().subscribe({ next: (d: Record<string, any>) => this.breaches.set(Array.isArray(d) ? d : d?.breaches || []), error: (e) => devError("[API]", e) });
    this.api.getAcceptanceQueue().subscribe({ next: (d: Record<string, any>) => this.queue.set(Array.isArray(d) ? d : d?.queue || d?.items || []), error: (e) => devError("[API]", e) });
    this.api.getAppetiteTrends().subscribe({ next: (d) => this.trends.set(d), error: (e) => devError("[API]", e) });
    this.api.getAppetiteCategoryGauges().subscribe({ next: (d) => { this.gauges.set(d?.gauges || []); this.computeWhatIf(); }, error: (e) => devError("[API]", e) });
  }

  requestAcceptance(riskId: string): void {
    this.api.requestAcceptance(riskId, { reason: 'Residual risk exceeds appetite threshold' }).subscribe({
      next: () => this.toast('success', 'risk.acceptanceRequested'),
      error: () => this.toast('error', 'risk.acceptanceRequestFailed'),
    });
  }

  approveAcceptance(riskId: string, decision: string): void {
    this.api.approveAcceptance(riskId, { decision }).subscribe({
      next: () => { this.toast('success', 'risk.riskAcceptanceDecision', { decision }); this.ngOnInit(); },
      error: () => this.toast('error', 'risk.acceptanceProcessFailed'),
    });
  }

  openConfigDialog(): void {
    const c = this.config();
    this.configForm = { model: c?.appetiteModel || 'category_threshold', authority: c?.approvingAuthority || '' };
    this.configDialogVisible = true;
  }

  saveConfig(): void {
    this.api.updateAppetiteConfig({ appetiteModel: this.configForm.model, approvingAuthority: this.configForm.authority }).subscribe({
      next: (d) => { this.config.set(d); this.configDialogVisible = false; this.toast('success', 'risk.appetiteConfigured'); },
      error: () => this.toast('error', 'risk.appetiteSaveFailed'),
    });
  }

  gaugePercent(g: GrcRecord): number {
    const max = Math.max(g.avgResidual, g.threshold, 25);
    return Math.min(100, (g.avgResidual / max) * 100);
  }

  gaugeThresholdPercent(g: GrcRecord): number {
    const max = Math.max(g.avgResidual, g.threshold, 25);
    return Math.min(100, (g.threshold / max) * 100);
  }

  computeWhatIf(): void {
    const gs = this.gauges();
    if (!gs.length) { this.whatIfResult = null; return; }
    let wouldBreach = 0, wouldClear = 0;
    for (const g of gs) {
      const currentlyBreached = g.avgResidual > g.threshold;
      const wouldBeBreached = g.avgResidual > this.whatIfThreshold;
      if (!currentlyBreached && wouldBeBreached) wouldBreach++;
      if (currentlyBreached && !wouldBeBreached) wouldClear++;
    }
    this.whatIfResult = { wouldBreach, wouldClear };
  }

  navigateToRisk(riskId: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { id: riskId } });
  }

  navigateToAcceptance(riskId: string): void {
    this.router.navigate(['/risk/acceptance'], { queryParams: { riskId } });
  }

  navigateCategory(category: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { category } });
  }

  scoreClass(score: number): string {
    if (score >= 20) return 'score-danger';
    if (score >= 12) return 'score-warning';
    return 'score-success';
  }

  private toast(severity: 'success' | 'error', detailKey: string, params?: Record<string, string>): void {
    this.msg.add({
      severity,
      summary: severity === 'error' ? this.i18n.translate('common.error') : this.i18n.translate('common.success'),
      detail: this.i18n.translate(detailKey, params),
      life: 3000,
    });
  }

}
