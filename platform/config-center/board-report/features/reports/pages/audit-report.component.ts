import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService } from '../services/reports-api.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WidgetShellComponent } from '@app/dashboard';
import { FindingsBarComponent } from '@app/shared/widgets/echart-components/bar/findings-bar.component';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { buildFindingsBarOptions } from '@app/shared/widgets/chart-infra/echart-builders/bar-builders';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS, PERIOD_OPTIONS, ReportPeriod } from '../reports.constants';
import type { FindingsBarData } from '@app/shared/widgets/echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-report',
    imports: [
        CommonModule, StatCardComponent, WidgetShellComponent,
        FindingsBarComponent, AppEchartComponent,
        PageHeaderComponent, ModuleTabsBarComponent, AppNumberPipe,
    ],
    template: `
    <div class="rp-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Audit Analytics"
        titleAr="تحليلات التدقيق"
        subtitleEn="Findings by severity, audit pack readiness, exceptions aging and control drift"
        subtitleAr="النتائج حسب الخطورة وجاهزية حزمة التدقيق وتقادم الاستثناءات وانحراف الضوابط"
        icon="search"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','التدقيق'] : ['Dashboard','Reports','Audit']"
        [actions]="headerActions"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rp-period-bar">
        <span class="period-label">{{ i18n.isAr() ? 'الفترة:' : 'Period:' }}</span>
        @for (p of periods; track p.value) {
          <button class="period-btn" [class.active]="period() === p.value" (click)="period.set(p.value)">
            {{ i18n.isAr() ? p.labelAr : p.labelEn }}
          </button>
        }
      </div>

      <div class="rp-body">

        <section class="kpi-grid">
          <app-stat-card icon="exclamation-circle"
            [label]="i18n.isAr() ? 'النتائج الحرجة' : 'Critical Findings'"
            [value]="findings()?.criticalOpen ?? '--'"
            accentColor="var(--error)"
            (click)="drill('/audit/findings', {severity: 'critical'})" class="clickable" />
          <app-stat-card icon="check-circle"
            [label]="i18n.isAr() ? 'مغلقة' : 'Closed Findings'"
            [value]="findings()?.closed ?? '--'"
            accentColor="#22c55e"
            (click)="drill('/audit/findings', {status: 'closed'})" class="clickable" />
          <app-stat-card icon="list"
            [label]="i18n.isAr() ? 'إجمالي النتائج' : 'Total Findings'"
            [value]="findings()?.total ?? '--'"
            accentColor="#6366f1"
            (click)="drill('/audit/findings')" class="clickable" />
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'النتائج حسب الخطورة' : 'Findings by Severity'" [state]="findingsBarState()">
            @if (findingsBarData()) {
              <div class="chart-h"><app-findings-bar [data]="findingsBarData()!" /></div>
            }
          </app-widget-shell>

          <app-widget-shell [title]="i18n.isAr() ? 'جاهزية التدقيق' : 'Audit Pack Readiness'" [state]="auditPackState()">
            @if (auditPack()?.length) {
              <div class="audit-pack-list">
                @for (item of auditPack(); track item.assessmentId || $index) {
                  <div tabindex="0" role="button" (keyup.enter)="drill('/audit')" class="ap-row" (click)="drill('/audit')">
                    <span class="ap-name">{{ item.name || item.assessmentName || 'Assessment' }}</span>
                    <div class="ap-bar-track"><div class="ap-bar-fill" [style.width.%]="item.progressPct ?? 0"></div></div>
                    <span class="ap-pct">{{ item.progressPct ?? 0 | appNumber:'decimal':'1.0-0' }}%</span>
                  </div>
                }
              </div>
            }
          </app-widget-shell>
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'تقادم الاستثناءات' : 'Exceptions Aging'" [state]="agingState()">
            @if (agingChartOpts) {
              <div class="chart-h"><app-echart [options]="agingChartOpts" ariaLabel="Exceptions Aging" /></div>
            }
          </app-widget-shell>

          <app-widget-shell [title]="i18n.isAr() ? 'انحراف الضوابط' : 'Control Drift'" [state]="driftState()">
            @if (driftItems()?.length) {
              <div class="drift-list">
                @for (d of driftItems()!.slice(0, 10); track d.controlId || $index) {
                  <div class="drift-row">
                    <span class="drift-name">{{ d.controlId || d.control_id }}</span>
                    <span class="drift-from">{{ d.baselineStatus || d.baseline_status }}</span>
                    <i class="pi pi-arrow-right drift-arrow" aria-hidden="true"></i>
                    <span class="drift-to">{{ d.currentStatus || d.current_status }}</span>
                  </div>
                }
              </div>
            }
          </app-widget-shell>
        </section>

      </div>
    </div>
  `,
    styles: [`
    .rp-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .rp-period-bar {
      display: flex; align-items: center; gap: 6px; padding: 10px 28px;
      background: var(--surface-card, #fff); border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .clickable { cursor: pointer; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .chart-h { height: 280px; }
    .audit-pack-list { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .ap-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .ap-name { font-size: var(--font-size-sm); font-weight: 500; min-width: 120px; }
    .ap-bar-track { flex: 1; height: 8px; border-radius: var(--radius-xs); background: var(--surface-200, var(--border-subtle)); }
    .ap-bar-fill { height: 100%; border-radius: var(--radius-xs); background: var(--primary-500, var(--primary)); transition: width .3s; }
    .ap-pct { font-size: var(--font-size-sm); font-weight: 700; min-width: 40px; text-align: end; }
    .drift-list { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    .drift-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 6px 0; border-bottom: 1px solid var(--surface-border, var(--surface-ice)); }
    .drift-name { font-weight: 600; min-width: 100px; }
    .drift-from { color: var(--text-muted); }
    .drift-arrow { font-size: var(--font-size-xs); color: var(--text-muted); }
    .drift-to { font-weight: 600; color: var(--error); }
    @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .rp-body { padding: 16px 16px 32px; } .rp-period-bar { padding: 10px 16px; flex-wrap: wrap; } }
  `]
})
export class AuditReportComponent implements OnInit {
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

  period = signal<ReportPeriod>('30d');

  findings         = signal<GrcRecord | null>(null);
  findingsBarData  = signal<FindingsBarData | null>(null);
  findingsBarState = signal<LoadState>('loading');
  auditPack        = signal<GrcRecord[]>([]);
  auditPackState   = signal<LoadState>('loading');
  agingChartOpts: EChartsOption | null = null;
  agingState       = signal<LoadState>('loading');
  driftItems       = signal<GrcRecord[]>([]);
  driftState       = signal<LoadState>('loading');

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadFindings(), this.loadAuditPack(), this.loadAging(), this.loadDrift()]);
  }

  private async loadFindings(): Promise<void> {
    try {
      const board = await firstValueFrom(this.reportsApi.getBoardReport());
      if (board?.findings) {
        this.findings.set(board.findings);
        this.findingsBarData.set({
          categories: ['Critical', 'High', 'Medium', 'Low'],
          severities: [
            { name: 'Open',   values: [board.findings.criticalOpen ?? 0, 0, 0, 0], color: '#ef4444' },
            { name: 'Closed', values: [0, 0, 0, board.findings.closed ?? 0],       color: '#22c55e' },
          ],
        });
        this.findingsBarState.set('ready');
      } else { this.findingsBarState.set('empty'); }
    } catch { this.findingsBarState.set('error'); }
  }

  private async loadAuditPack(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>('/api/dashboard/audit-pack')) as Record<string, unknown> | unknown[];
      const items = (Array.isArray(data) ? data : ((data as Record<string, unknown>)?.assessments ?? [])) as GrcRecord[];
      this.auditPack.set(items);
      this.auditPackState.set(items.length ? 'ready' : 'empty');
    } catch { this.auditPackState.set('error'); }
  }

  private async loadAging(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>('/api/dashboard/exceptions-aging')) as Record<string, unknown>;
      const buckets = (data?.['buckets'] ?? data) as Record<string, unknown>;
      if (buckets && typeof buckets === 'object') {
        const cats = ['0-30d', '31-60d', '61-90d', '90d+'];
        const vals = [Number(buckets['0-30'] ?? 0), Number(buckets['31-60'] ?? 0), Number(buckets['61-90'] ?? 0), Number(buckets['90+'] ?? 0)];
        this.agingChartOpts = buildFindingsBarOptions({
          categories: cats,
          severities: [{ name: 'Exceptions', values: vals, color: '#f59e0b' }],
        });
        this.agingState.set('ready');
      } else { this.agingState.set('empty'); }
    } catch { this.agingState.set('error'); }
  }

  private async loadDrift(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>('/api/dashboard/control-drift')) as Record<string, unknown> | unknown[];
      const items = (Array.isArray(data) ? data : ((data as Record<string, unknown>)?.drifted ?? [])) as GrcRecord[];
      this.driftItems.set(items);
      this.driftState.set(items.length ? 'ready' : 'empty');
    } catch { this.driftState.set('error'); }
  }

  drill(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  onHeaderAction(id: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    if (id === 'export-pdf')        { this.reportsApi.generateReport('audit-summary', 'pdf', lang).subscribe(b => this.download(b, 'audit-report', 'pdf')); }
    else if (id === 'export-excel') { this.reportsApi.generateReport('audit-summary', 'excel', lang).subscribe(b => this.download(b, 'audit-report', 'xlsx')); }
    else if (id === 'print')        { window.print(); }
    else if (id === 'builder')      { this.router.navigate(['/reports/builder']); }
  }

  private download(blob: Blob, name: string, ext: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }
}
