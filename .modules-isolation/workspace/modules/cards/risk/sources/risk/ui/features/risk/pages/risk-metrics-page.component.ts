import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/datepicker';
import { devError } from '../../../core/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-metrics-page',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, ExportButtonComponent, SkeletonModule, CardModule, ButtonModule, TagModule, TableModule, CalendarModule],
  template: `
    <div class="rm-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Risk Metrics"
        titleAr="مقاييس المخاطر"
        subtitleEn="Risk KPIs and trend analysis over time"
        subtitleAr="مؤشرات الأداء الرئيسية وتحليل الاتجاهات عبر الزمن"
        icon="gauge"
        [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().pageTitle]"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        [actions]="[]" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rm-body">
      @if (loading()) {
        <div class="rm-skeleton">
          <p-skeleton height="80px" borderRadius="10px" />
          <p-skeleton height="320px" borderRadius="10px" />
        </div>
      }

      <div class="health-strip" *ngIf="!loading() && !error">
        <div tabindex="0" role="button" (keyup.enter)="navigateKpi(kpi)" class="health-card clickable" *ngFor="let kpi of kpis()" (click)="navigateKpi(kpi)">
          <div class="health-value" [style.color]="kpi.color">{{ kpi.value }}</div>
          <div class="health-label">{{ kpi.label }}</div>
        </div>
      </div>

      <div class="toolbar-row mb-3" *ngIf="!error">
        <app-export-button module="risk-metrics" [label]="L().export" [data]="trends()" />
      </div>

      <div *ngIf="!error">
        <p-card [header]="L().trends">
          <div class="filter-row">
            <p-calendar [(ngModel)]="startDate" dateFormat="yy-mm-dd" [placeholder]="L().startDate" />
            <p-calendar [(ngModel)]="endDate" dateFormat="yy-mm-dd" [placeholder]="L().endDate" />
            <p-button [label]="L().loadTrends" icon="pi pi-refresh" (onClick)="loadTrends()" />
          </div>
          <p-table aria-label="Data table" [value]="trends()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ L().date }}</th><th>{{ L().riskScore }}</th><th>{{ L().openRisks }}</th><th>{{ L().critical }}</th><th>{{ L().high }}</th><th>{{ L().medium }}</th><th>{{ L().low }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td>{{ t.date || t.snapshotDate | appDate:'medium' }}</td>
                <td><p-tag [value]="t.riskScore + ''" [severity]="t.riskScore > 70 ? 'danger' : t.riskScore > 40 ? 'warning' : 'success'" /></td>
                <td>{{ t.openRisks || 0 }}</td>
                <td class="text-danger font-bold">{{ t.critical || 0 }}</td>
                <td class="text-warning">{{ t.high || 0 }}</td>
                <td class="text-info">{{ t.medium || 0 }}</td>
                <td class="text-success">{{ t.low || 0 }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="empty-inline text-center">{{ L().emptyTrends }}</td></tr></ng-template>
          </p-table>
        </p-card>
      </div>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">{{ L().retry }}</button>
      </div>

      </div>
    </div>
  `,
  styles: [`
    .rm-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .rm-body { flex: 1; padding: 20px 28px 32px; display: flex; flex-direction: column; gap: 16px; }
    .rm-skeleton { display: flex; flex-direction: column; gap: 12px; }
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; text-align: center; padding: 14px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); transition: box-shadow .15s; }
    .health-card.clickable { cursor: pointer; }
    .health-card.clickable:hover { box-shadow: var(--shadow-card); border-color: var(--primary-200, #93c5fd); }
    .health-card:hover { box-shadow: var(--shadow-card); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .toolbar-row { display: flex; align-items: center; gap: var(--space-md, 12px); }
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .filter-row { display: flex; gap: var(--space-md, 12px); align-items: center; margin-bottom: var(--space-md, 12px); flex-wrap: wrap; }
    .text-center { text-align: center; }
    .text-danger { color: var(--error); }
    .text-warning { color: var(--warning); }
    .text-info { color: var(--primary); }
    .text-success { color: var(--success); }
    .font-bold { font-weight: 700; }
    .empty-inline { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: var(--space-md, 12px) 0; }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .error-state button { margin-top: 12px; padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--status-danger-bg, #fff1f1); background: var(--status-danger-bg, #fff1f1); color: var(--error); cursor: pointer; font-weight: 600; }
  `]
})
export class RiskMetricsPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  public i18n = inject(I18nService);

  loading = signal(false);
  error = '';
  kpis = signal<Record<string, any>[]>([]);
  trends = signal<Record<string, any>[]>([]);
  startDate: Date | null = null;
  endDate: Date | null = null;

  tabs = RISK_TABS;
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  L = computed(() => this.i18n.isAr() ? AR : EN);

  ngOnInit() {
    this.loadMetrics();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadMetrics());
  }

  private loadMetrics(): void {
    this.loading.set(true);
    const now = new Date();
    this.endDate = now;
    this.startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Use overview API for richer KPIs
    this.api.getOverview().subscribe({
      next: (ov: Record<string, any>) => {
        const s = ov?.summary || {};
        this.kpis.set([
          { label: this.L().totalRisks, value: s.totalRisks || 0, color: '#3b82f6', route: '/risk/register' },
          { label: this.L().critical, value: s.criticalRisks || 0, color: '#ef4444', route: '/risk/register', queryParams: { severity: 'critical' } },
          { label: this.L().avgScore, value: Math.round(s.residualRiskTrend || 0), color: '#f59e0b', route: '/risk/scoring' },
          { label: this.L().mitigated, value: s.overdueTreatments || 0, color: '#22c55e', route: '/risk/treatments', queryParams: { status: 'done' } },
        ]);
        this.loading.set(false);
      },
      error: () => {
        // Fallback to register API
        this.api.getRegister({}).subscribe({
          next: (d: Record<string, any>) => {
            const risks = d.risks || [];
            const critical = risks.filter((r: Record<string, any>) => r.inherentScore >= 20).length;
            const avgScore = risks.length ? Math.round(risks.reduce((s: number, r: Record<string, any>) => s + (r.residualScore || 0), 0) / risks.length) : 0;
            const mitigated = risks.filter((r: Record<string, any>) => r.treatmentStatus === 'done' || r.treatmentStatus === 'completed').length;
            this.kpis.set([
              { label: this.L().totalRisks, value: risks.length, color: '#3b82f6', route: '/risk/register' },
              { label: this.L().critical, value: critical, color: '#ef4444', route: '/risk/register', queryParams: { severity: 'critical' } },
              { label: this.L().avgScore, value: avgScore, color: '#f59e0b', route: '/risk/scoring' },
              { label: this.L().mitigated, value: mitigated, color: '#22c55e', route: '/risk/treatments', queryParams: { status: 'done' } },
            ]);
            this.loading.set(false);
          },
          error: () => { this.error = 'Failed to load data'; this.loading.set(false); }
        });
      }
    });
    this.loadTrends();
  }

  loadTrends() {
    if (!this.startDate || !this.endDate) return;
    this.api.getKRITrends().subscribe({
      next: (d: Record<string, any>) => { this.trends.set(Array.isArray(d) ? d : d.trends || []); },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  navigateKpi(kpi: Record<string, any>): void {
    if (kpi.route) {
      this.router.navigate([kpi.route], { queryParams: kpi.queryParams });
    }
  }

}

const EN = {
  pageTitle: 'Risk Metrics', pageSubtitle: 'Risk KPIs and trend analysis over time',
  trends: 'Risk Trends', startDate: 'Start Date', endDate: 'End Date', loadTrends: 'Load Trends',
  date: 'Date', riskScore: 'Risk Score', openRisks: 'Open Risks',
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
  totalRisks: 'Total Risks', avgScore: 'Avg Risk Score', mitigated: 'Mitigated', export: 'Export',
  emptyTrends: 'No trend data — select a date range', retry: 'Retry',
};

const AR: typeof EN = {
  pageTitle: 'مقاييس المخاطر', pageSubtitle: 'مؤشرات الأداء الرئيسية وتحليل الاتجاهات عبر الزمن',
  trends: 'اتجاهات المخاطر', startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية', loadTrends: 'تحميل الاتجاهات',
  date: 'التاريخ', riskScore: 'درجة المخاطر', openRisks: 'المخاطر المفتوحة',
  critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض',
  totalRisks: 'إجمالي المخاطر', avgScore: 'متوسط الدرجة', mitigated: 'تمت المعالجة', export: 'تصدير',
  emptyTrends: 'لا توجد بيانات — حدد نطاقًا زمنيًا', retry: 'إعادة المحاولة',

};
