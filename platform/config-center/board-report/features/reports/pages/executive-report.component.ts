import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import {  AppNumberPipe } from '@app/shared/pipes';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService } from '../services/reports-api.service';
import type { BoardReport } from '../services/reports-api.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WidgetShellComponent } from '@app/dashboard';
import { ComplianceGaugeEchartComponent } from '@app/shared/widgets/echart-components/gauge/compliance-gauge-echart.component';
import { TrendLineEchartComponent } from '@app/shared/widgets/echart-components/line/trend-line-echart.component';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS, PERIOD_OPTIONS, periodToDates, ReportPeriod } from '../reports.constants';
import type { GaugeData, TimeSeriesData } from '@app/shared/widgets/echart-builders/builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-executive-report',
    imports: [
        CommonModule, StatCardComponent, WidgetShellComponent,
        ComplianceGaugeEchartComponent, TrendLineEchartComponent,
        PageHeaderComponent, ModuleTabsBarComponent, AppNumberPipe,
    ],
    template: `
    <div class="rp-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Executive Dashboard"
        titleAr="لوحة التنفيذيين"
        subtitleEn="Board-level GRC overview: compliance, risk, evidence and remediation KPIs"
        subtitleAr="نظرة تنفيذية شاملة: الامتثال والمخاطر والأدلة ومؤشرات المعالجة"
        icon="chart-bar"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','تنفيذي'] : ['Dashboard','Reports','Executive']"
        [actions]="headerActions"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rp-period-bar">
        <span class="period-label">{{ i18n.isAr() ? 'الفترة:' : 'Period:' }}</span>
        @for (p of periods; track p.value) {
          <button class="period-btn" [class.active]="period() === p.value" (click)="setPeriod(p.value)">
            {{ i18n.isAr() ? p.labelAr : p.labelEn }}
          </button>
        }
      </div>

      <div class="rp-body">

        <section class="kpi-grid">
          <app-stat-card
            icon="check-circle" [label]="i18n.isAr() ? 'نسبة الامتثال' : 'Compliance Score'"
            [value]="kpis()?.complianceScore != null ? (kpis()!.complianceScore | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="var(--success)" [trend]="kpiTrend('complianceScore')"
            (click)="drill('/compliance/posture')" class="clickable" />
          <app-stat-card
            icon="exclamation-triangle" [label]="i18n.isAr() ? 'درجة المخاطر' : 'Risk Score'"
            [value]="kpis()?.riskScore != null ? ('' + (kpis()!.riskScore | appNumber:'decimal':'1.0-1')) : '--'"
            accentColor="var(--error)" [trend]="kpiTrend('riskScore')"
            (click)="drill('/reports/risk')" class="clickable" />
          <app-stat-card
            icon="folder" [label]="i18n.isAr() ? 'تغطية الأدلة' : 'Evidence Coverage'"
            [value]="kpis()?.evidenceCoverage != null ? (kpis()!.evidenceCoverage | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="var(--primary)" [trend]="kpiTrend('evidenceCoverage')"
            (click)="drill('/reports/evidence')" class="clickable" />
          <app-stat-card
            icon="wrench" [label]="i18n.isAr() ? 'معدل إغلاق المعالجة' : 'Remediation Closure'"
            [value]="kpis()?.remediationClosureRate != null ? (kpis()!.remediationClosureRate | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="var(--hub-governance)" [trend]="kpiTrend('remediationClosureRate')"
            (click)="drill('/governance/actions', {status: 'overdue'})" class="clickable" />
        </section>

        @if (boardState() !== 'loading') {
          <section class="board-grid">
            <app-stat-card icon="shield"
              [label]="i18n.isAr() ? 'المخاطر المفتوحة' : 'Open Risks'"
              [value]="board()?.executiveSummary?.openRisks ?? '--'"
              accentColor="var(--warning)"
              (click)="drill('/risk/register', {status: 'open'})" class="clickable" />
            <app-stat-card icon="search"
              [label]="i18n.isAr() ? 'النتائج الحرجة' : 'Critical Findings'"
              [value]="board()?.findings?.criticalOpen ?? '--'"
              accentColor="var(--error)"
              (click)="drill('/audit/findings', {severity: 'critical'})" class="clickable" />
            <app-stat-card icon="bell"
              [label]="i18n.isAr() ? 'الحوادث المفتوحة' : 'Open Incidents'"
              [value]="board()?.incidents?.openIncidents ?? '--'"
              accentColor="var(--primary)"
              (click)="drill('/incident-hub')" class="clickable" />
            <app-stat-card icon="percentage"
              [label]="i18n.isAr() ? 'فعالية الضوابط' : 'Control Effectiveness'"
              [value]="board()?.controls?.effectivenessPct != null ? (board()!.controls.effectivenessPct | appNumber:'decimal':'1.0-0') + '%' : '--'"
              accentColor="var(--info)"
              (click)="drill('/compliance/controls')" class="clickable" />
          </section>
        }

        <section class="board-grid">
          <app-stat-card icon="heart"
            [label]="i18n.isAr() ? 'صحة الحوكمة' : 'Governance Health'"
            [value]="govHealth()?.overall_score != null ? (govHealth()!.overall_score | appNumber:'decimal':'1.0-0') + '%' : '--'"
            [accentColor]="govHealth()?.overall_grade === 'green' ? 'var(--success)' : govHealth()?.overall_grade === 'yellow' ? 'var(--warning)' : govHealth()?.overall_grade === 'red' ? 'var(--error)' : 'var(--text-muted)'"
            (click)="drill('/governance/health')" class="clickable" />
          <app-stat-card icon="file"
            [label]="i18n.isAr() ? 'السياسات المعتمدة' : 'Policies Approved'"
            [value]="board()?.policies?.approvalPct != null ? (board()!.policies.approvalPct | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="var(--primary)"
            (click)="drill('/governance/policies')" class="clickable" />
          <app-stat-card icon="truck"
            [label]="i18n.isAr() ? 'الموردين الحرجين' : 'Critical Vendors'"
            [value]="board()?.vendors?.criticalVendors ?? '--'"
            accentColor="var(--hub-governance)"
            (click)="drill('/vendor-hub')" class="clickable" />
          <app-stat-card icon="th-large"
            [label]="i18n.isAr() ? 'الأطر النشطة' : 'Active Frameworks'"
            [value]="board()?.compliance?.activeFrameworks ?? '--'"
            accentColor="var(--info)"
            (click)="drill('/compliance/frameworks')" class="clickable" />
        </section>

        <section class="board-grid">
          <app-stat-card icon="users"
            [label]="i18n.isAr() ? 'الفرق' : 'Teams'"
            [value]="teamCount()"
            accentColor="var(--primary)"
            (click)="drill('/team-hub')" class="clickable" />
          <app-stat-card icon="sitemap"
            [label]="i18n.isAr() ? 'سير العمل النشطة' : 'Active Workflows'"
            [value]="workflowCount()"
            accentColor="var(--primary)"
            (click)="drill('/workflow-hub')" class="clickable" />
          <app-stat-card icon="eye-slash"
            [label]="i18n.isAr() ? 'تقييمات الخصوصية' : 'Privacy Assessments'"
            [value]="privacyCount()"
            accentColor="var(--hub-governance)"
            (click)="drill('/privacy-hub')" class="clickable" />
          <app-stat-card icon="bolt"
            [label]="i18n.isAr() ? 'الحوادث الإجمالية' : 'Total Incidents'"
            [value]="incidentCount()"
            accentColor="var(--error)"
            (click)="drill('/incident-hub')" class="clickable" />
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'مقياس الامتثال' : 'Compliance Gauge'" [state]="gaugeState()">
            @if (gaugeData()) {
              <div class="chart-h"><app-compliance-gauge-echart [data]="gaugeData()!" /></div>
            }
          </app-widget-shell>

          <app-widget-shell
            [title]="i18n.isAr() ? 'اتجاه المؤشرات (' + periodLabel() + ')' : 'KPI Trends (' + periodLabel() + ')'"
            [state]="trendState()">
            @if (trendData()) {
              <div class="chart-h"><app-trend-line-echart [data]="trendData()!" /></div>
            }
          </app-widget-shell>
        </section>

        @if (maturity()) {
          <section class="maturity-banner">
            <div class="maturity-level">
              <span class="maturity-label">{{ i18n.isAr() ? 'مستوى النضج' : 'Maturity Level' }}</span>
              <span class="maturity-value">{{ maturity()!.maturityLevel }}</span>
              <span class="maturity-score">({{ maturity()!.aggregateScore | appNumber:'decimal':'1.0-0' }}%)</span>
            </div>
            <span tabindex="0" role="button" (keyup.enter)="drill('/analytics-dashboard')" class="drill-link" (click)="drill('/analytics-dashboard')">
              {{ i18n.isAr() ? 'عرض التفاصيل' : 'View Details' }}
            </span>
          </section>
        }

        @if (govHealth()) {
          <section class="maturity-banner">
            <div class="maturity-level">
              <span class="maturity-label">{{ i18n.isAr() ? 'صحة الحوكمة' : 'Governance Health' }}</span>
              <span class="maturity-value" [style.color]="govHealth()!.overall_grade === 'green' ? 'var(--success)' : govHealth()!.overall_grade === 'yellow' ? 'var(--warning)' : 'var(--error)'">
                {{ govHealth()!.overall_grade | uppercase }}
              </span>
              <span class="maturity-score">({{ govHealth()!.overall_score | appNumber:'decimal':'1.0-0' }}%)</span>
            </div>
            <span tabindex="0" role="button" (keyup.enter)="drill('/governance/health')" class="drill-link" (click)="drill('/governance/health')">
              {{ i18n.isAr() ? 'عرض التفاصيل' : 'View Details' }}
            </span>
          </section>
        }

        <section class="module-nav-grid">
          @for (mod of moduleLinks; track mod.route) {
            <div tabindex="0" role="button" (keyup.enter)="drill(mod.route)" class="module-nav-card" (click)="drill(mod.route)" [style.border-color]="mod.color">
              <i class="pi" [ngClass]="mod.icon" [style.color]="mod.color"></i>
              <span>{{ i18n.isAr() ? mod.labelAr : mod.labelEn }}</span>
            </div>
          }
        </section>

      </div>
    </div>
  `,
    styles: [`
    .rp-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }

    .rp-period-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 28px;
      background: var(--surface-card, #fff);
      border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .period-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); margin-inline-end: 4px; }
    .period-btn {
      padding: 5px 14px; border-radius: var(--radius-xl); border: 1.5px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface-ground, var(--surface-ice)); font-size: var(--font-size-sm); font-weight: 600;
      color: var(--text-muted, var(--text-muted)); cursor: pointer; transition: all .15s;
    }
    .period-btn:hover { border-color: var(--primary-300, #93c5fd); }
    .period-btn.active { border-color: var(--primary-600, #2563eb); background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); }

    .rp-body { flex: 1; padding: 20px 28px 40px; display: flex; flex-direction: column; gap: 20px; }

    .kpi-grid, .board-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .clickable { cursor: pointer; }
    .charts-row { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
    .chart-h { height: 280px; }

    .maturity-banner {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 16px 20px; border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--primary-50, #eff6ff), var(--surface-card, #fff));
      border: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .maturity-level { display: flex; align-items: center; gap: 10px; }
    .maturity-label { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 600; }
    .maturity-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--primary-700, #1d4ed8); text-transform: capitalize; }
    .maturity-score { font-size: var(--font-size-base); color: var(--text-muted); }
    .drill-link { font-size: var(--font-size-sm); color: var(--primary-500); cursor: pointer; text-decoration: underline; }

    .module-nav-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;
    }
    .module-nav-card {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: var(--radius-md);
      background: var(--surface-card, #fff); cursor: pointer;
      border: 1px solid var(--surface-border, var(--border-subtle));
      border-inline-start: 3px solid; transition: box-shadow .15s;
      font-size: var(--font-size-sm); font-weight: 500; color: var(--text-heading, #111);
    }
    .module-nav-card:hover { box-shadow: var(--shadow-md); }
    .module-nav-card .pi { font-size: var(--font-size-md); }

    @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
    /* Note: hex fallbacks in var() retained for backwards compatibility with var(--token, fallback) pattern */
    @media (max-width: 768px) {
      .rp-body { padding: 16px 16px 32px; }
      .kpi-grid, .board-grid { grid-template-columns: repeat(2, 1fr); }
      .rp-period-bar { padding: 10px 16px; flex-wrap: wrap; }
      .module-nav-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class ExecutiveReportComponent implements OnInit {
    private riskSvc = inject(GrcRiskService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private reportsApi = inject(ReportsApiService);
  private router = inject(Router);

  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly tabs    = REPORT_TABS;
  readonly periods = PERIOD_OPTIONS;

  readonly headerActions: PageHeaderAction[] = [
    { id: 'export-pdf',   labelEn: 'PDF',     labelAr: 'PDF',     icon: 'file-pdf' },
    { id: 'export-excel', labelEn: 'Excel',   labelAr: 'Excel',   icon: 'file-excel' },
    { id: 'print',        labelEn: 'Print',   labelAr: 'طباعة',  icon: 'print' },
    { id: 'builder',      labelEn: 'Builder', labelAr: 'المنشئ', icon: 'file-edit', primary: true },
  ];

  readonly moduleLinks = [
    { route: '/governance/overview', labelEn: 'Governance', labelAr: 'الحوكمة', icon: 'pi-building', color: 'var(--hub-governance)' },
    { route: '/risk/home', labelEn: 'Risk', labelAr: 'المخاطر', icon: 'pi-exclamation-triangle', color: 'var(--hub-risk)' },
    { route: '/compliance/overview', labelEn: 'Compliance', labelAr: 'الامتثال', icon: 'pi-shield', color: 'var(--hub-compliance)' },
    { route: '/audit', labelEn: 'Audit', labelAr: 'التدقيق', icon: 'pi-verified', color: 'var(--success)' },
    { route: '/evidence/overview', labelEn: 'Evidence', labelAr: 'الأدلة', icon: 'pi-folder-open', color: 'var(--success)' },
    { route: '/framework-hub', labelEn: 'Frameworks', labelAr: 'الأطر', icon: 'pi-th-large', color: 'var(--primary)' },
    { route: '/vendor-hub', labelEn: 'Vendors', labelAr: 'الموردين', icon: 'pi-truck', color: 'var(--hub-governance)' },
    { route: '/incident-hub', labelEn: 'Incidents', labelAr: 'الحوادث', icon: 'pi-bolt', color: 'var(--error)' },
    { route: '/privacy-hub', labelEn: 'Privacy', labelAr: 'الخصوصية', icon: 'pi-eye-slash', color: 'var(--hub-governance)' },
    { route: '/intelligence-hub', labelEn: 'Intelligence', labelAr: 'الاستخبارات', icon: 'pi-globe', color: 'var(--info)' },
    { route: '/operations-hub', labelEn: 'Operations', labelAr: 'العمليات', icon: 'pi-calendar', color: 'var(--primary)' },
    { route: '/analytics-hub', labelEn: 'Analytics', labelAr: 'التحليلات', icon: 'pi-chart-line', color: 'var(--primary)' },
    { route: '/reports/overview', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-file-pdf', color: 'var(--info)' },
    { route: '/connector-hub', labelEn: 'Connectors', labelAr: 'الاتصالات', icon: 'pi-link', color: 'var(--hub-governance)' },
    { route: '/team-hub', labelEn: 'Team', labelAr: 'الفريق', icon: 'pi-users', color: 'var(--primary)' },
    { route: '/automation-hub', labelEn: 'Automation', labelAr: 'الأتمتة', icon: 'pi-play-circle', color: 'var(--warning)' },
    { route: '/ai-suite', labelEn: 'AI Suite', labelAr: 'الذكاء الاصطناعي', icon: 'pi-microchip-ai', color: 'var(--hub-governance)' },
    { route: '/advanced-hub', labelEn: 'Advanced', labelAr: 'متقدم', icon: 'pi-objects-column', color: 'var(--primary)' },
    { route: '/admin-hub', labelEn: 'Admin', labelAr: 'الإدارة', icon: 'pi-sliders-h', color: 'var(--text-muted)' },
    { route: '/knowledge-hub', labelEn: 'Knowledge', labelAr: 'المعرفة', icon: 'pi-book', color: 'var(--success)' },
    { route: '/workflow-hub', labelEn: 'Workflows', labelAr: 'سير العمل', icon: 'pi-sitemap', color: 'var(--primary)' },
  ];

  period = signal<ReportPeriod>('30d');
  periodLabel = computed(() => {
    const p = this.periods.find(x => x.value === this.period());
    return this.i18n.isAr() ? (p?.labelAr ?? '') : (p?.labelEn ?? '');
  });

  kpis        = signal<GrcRecord | null>(null);
  board       = signal<BoardReport | null>(null);
  boardState  = signal<LoadState>('loading');
  gaugeData   = signal<GaugeData | null>(null);
  gaugeState  = signal<LoadState>('loading');
  trendData   = signal<TimeSeriesData | null>(null);
  trendState  = signal<LoadState>('loading');
  maturity    = signal<GrcRecord | null>(null);
  predictions = signal<GrcRecord | null>(null);
  govHealth   = signal<GrcRecord | null>(null);
  teamCount   = signal<string>('--');
  workflowCount = signal<string>('--');
  incidentCount = signal<string>('--');
  privacyCount  = signal<string>('--');

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll(): Promise<void> {
    await Promise.all([
      this.loadKpis(), this.loadBoard(), this.loadTrends(), this.loadMaturity(),
      this.loadGovernanceHealth(), this.loadTeams(), this.loadWorkflows(),
      this.loadIncidents(), this.loadPrivacy(),
    ]);
  }

  setPeriod(p: ReportPeriod): void {
    this.period.set(p);
    this.trendState.set('loading');
    this.loadTrends();
  }

  private async loadKpis(): Promise<void> {
    try {
      const data = await firstValueFrom(this.operationsSvc.getAnalyticsKPIs());
      this.kpis.set(data);
      if ((data as any)?.complianceScore != null) {
        this.gaugeData.set({
          value: (data as any).complianceScore, min: 0, max: 100,
          zones: [
            { min: 0, max: 40, color: 'var(--error)' },
            { min: 40, max: 70, color: 'var(--warning)' },
            { min: 70, max: 100, color: 'var(--success)' },
          ],
          label: 'Compliance',
        });
        this.gaugeState.set('ready');
      } else {
        this.gaugeState.set('empty');
      }
    } catch { this.gaugeState.set('error'); }
  }

  private async loadBoard(): Promise<void> {
    try {
      const data = await firstValueFrom(this.reportsApi.getBoardReport());
      this.board.set(data);
      this.boardState.set(data ? 'ready' : 'empty');
    } catch { this.boardState.set('error'); }
  }

  private async loadTrends(): Promise<void> {
    try {
      const { start, end } = periodToDates(this.period());
      const data = await firstValueFrom(this.operationsSvc.getKPITrends(start, end));
      if (data?.length) {
        this.trendData.set({
          series: [
            { name: 'Compliance', data: data.map((d: Record<string, any>) => ({ date: String(d['snapshotDate'] || d['date'] || ''), value: Number(d['complianceScore'] ?? 0) })) },
            { name: 'Risk',       data: data.map((d: Record<string, any>) => ({ date: String(d['snapshotDate'] || d['date'] || ''), value: Number(d['riskScore'] ?? 0) })) },
            { name: 'Evidence',   data: data.map((d: Record<string, any>) => ({ date: String(d['snapshotDate'] || d['date'] || ''), value: Number(d['evidenceCoverage'] ?? 0) })) },
          ],
        });
        this.trendState.set('ready');
      } else {
        this.trendState.set('empty');
      }
    } catch { this.trendState.set('error'); }
  }

  private async loadMaturity(): Promise<void> {
    try {
      const data = await firstValueFrom(this.operationsSvc.getAnalyticsMaturity());
      this.maturity.set(data);
    } catch { /* non-critical */ }
  }

  private async loadGovernanceHealth(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.post<any>('/api/governance/health/recalculate', {}).pipe(catchError(() =>
        this.http.get<any>('/api/governance/health')
      )).pipe(catchError(() => of(null))));
      if (data) this.govHealth.set(data as Record<string, any>);
    } catch { /* non-critical */ }
  }

  private async loadTeams(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<any>('/api/teams').pipe(catchError(() => of({ count: 0 })))) as Record<string, any>;
      this.teamCount.set(String(data?.count ?? (data?.teams as unknown[] | undefined)?.length ?? 0));
    } catch { /* non-critical */ }
  }

  private async loadWorkflows(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<any>('/api/workflows').pipe(catchError(() => of({ count: 0 })))) as Record<string, any>;
      const items = data?.workflows ?? data?.items ?? data;
      this.workflowCount.set(String(Array.isArray(items) ? items.length : (data?.count as number) ?? 0));
    } catch { /* non-critical */ }
  }

  private async loadIncidents(): Promise<void> {
    try {
      const data = await firstValueFrom(this.riskSvc.getIncidents().pipe(catchError(() => of([])))) as Record<string, any> | unknown[];
      const items = Array.isArray(data) ? data : ((data as Record<string, any>)?.incidents ?? []) as unknown[];
      this.incidentCount.set(String(items.length));
    } catch { /* non-critical */ }
  }

  private async loadPrivacy(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<any>('/api/dpia').pipe(catchError(() => of([])))) as Record<string, any> | unknown[];
      const items = Array.isArray(data) ? data : ((data as Record<string, any>)?.assessments ?? []) as unknown[];
      this.privacyCount.set(String(items.length));
    } catch { /* non-critical */ }
  }

  kpiTrend(key: string): number | undefined { return (this.predictions()?.[key] as Record<string, any> | undefined)?.trend as number | undefined; }

  drill(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  onHeaderAction(id: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    if (id === 'export-pdf') {
      this.reportsApi.generateReport('executive-snapshot', 'pdf', lang).subscribe(blob => this.download(blob, 'executive-report', 'pdf'));
    } else if (id === 'export-excel') {
      this.reportsApi.generateReport('executive-snapshot', 'excel', lang).subscribe(blob => this.download(blob, 'executive-report', 'xlsx'));
    } else if (id === 'print') {
      window.print();
    } else if (id === 'builder') {
      this.router.navigate(['/reports/builder']);
    }
  }

  private download(blob: Blob, name: string, ext: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }
}
