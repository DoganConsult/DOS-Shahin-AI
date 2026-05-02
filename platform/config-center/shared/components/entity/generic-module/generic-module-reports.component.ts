import {
  Component, ChangeDetectionStrategy, inject, computed, signal, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleCrudApiService, CrudCapability } from '@app/core/modules/module-crud-api.service';
import { MODULE_SHELL_REGISTRY } from '../../../contracts/module-shell-registry';
import { MODULE_REPORT_DEFINITIONS } from '../../../contracts/module-form-fields';
import type { ModuleReportDefinition } from '../../../contracts/module-shell-definition';
import { AppEchartComponent } from '../../../widgets/echart-wrapper/app-echart.component';
import type { EChartsOption } from 'echarts';

const CHART_COLORS = ['#0f62fe', '#8a3ffc', '#24a148', '#f1c21b', '#da1e28', '#009d9a', '#ee5396', '#a56eff'];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-generic-module-reports',
    imports: [CommonModule, ButtonModule, TagModule, DropdownModule, CalendarModule, SkeletonModule, TableModule, AppEchartComponent],
    template: `
    <div class="gmr-page" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <header class="gmr-header">
        <div class="gmr-header-left">
          <div class="gmr-icon" [style.background]="accentBg">
            <i class="pi pi-chart-bar" [style.color]="accentColor"></i>
          </div>
          <div>
            <h2 class="gmr-title">{{ isAr ? ('تقارير ' + moduleNameAr) : (moduleNameEn + ' Reports') }}</h2>
            <span class="gmr-subtitle">{{ isAr ? 'تحليلات وتقارير تفصيلية' : 'Detailed analytics and reports' }}</span>
          </div>
        </div>
        <div class="gmr-header-right">
          @if (capability()?.canExport) {
            <button pButton icon="pi pi-download" [label]="isAr ? 'تصدير' : 'Export'" severity="secondary" [outlined]="true" size="small" (click)="onExport()"></button>
          }
          <button pButton icon="pi pi-sparkles" [label]="isAr ? 'تحليل ذكي' : 'AI Analysis'" size="small"></button>
        </div>
      </header>

      @if (loadingStats()) {
        <div class="gmr-stats-skeleton">
          @for (i of [1,2,3,4]; track i) {
            <p-skeleton width="100%" height="80px" />
          }
        </div>
      } @else if (statsKeys().length > 0) {
        <div class="gmr-stats-strip">
          @for (key of statsKeys(); track key) {
            <div class="gmr-stat-card">
              <span class="gmr-stat-value">{{ moduleStats()[key] }}</span>
              <span class="gmr-stat-label">{{ formatStatLabel(key) }}</span>
            </div>
          }
        </div>
      }

      <div class="gmr-grid">
        @for (report of reports(); track report.id; let idx = $index) {
          <div class="gmr-card" [attr.data-type]="report.type" [class.gmr-card--wide]="report.type === 'heatmap' || report.type === 'table'">
            <div class="gmr-card-header">
              <div class="gmr-card-icon">
                <i [class]="'pi ' + report.icon"></i>
              </div>
              <h3 class="gmr-card-title">{{ isAr ? report.labelAr : report.labelEn }}</h3>
              <p-tag [value]="report.type" severity="info" styleClass="gmr-type-tag" />
            </div>
            <div class="gmr-card-body">
              @switch (report.type) {
                @case ('kpi-summary') {
                  <div class="gmr-kpi-grid">
                    @for (key of topStatKeys(); track key) {
                      <div class="gmr-kpi">
                        <span class="gmr-kpi-value">{{ moduleStats()[key] ?? '—' }}</span>
                        <span class="gmr-kpi-label">{{ formatStatLabel(key) }}</span>
                      </div>
                    }
                    @if (topStatKeys().length === 0) {
                      <div class="gmr-kpi"><span class="gmr-kpi-value">—</span><span class="gmr-kpi-label">{{ isAr ? 'الإجمالي' : 'Total' }}</span></div>
                      <div class="gmr-kpi"><span class="gmr-kpi-value">—</span><span class="gmr-kpi-label">{{ isAr ? 'نشط' : 'Active' }}</span></div>
                      <div class="gmr-kpi"><span class="gmr-kpi-value">—</span><span class="gmr-kpi-label">{{ isAr ? 'مكتمل' : 'Done' }}</span></div>
                    }
                  </div>
                }
                @case ('chart') {
                  <div class="gmr-chart-container">
                    <app-echart [options]="buildBarChartOptions(report, idx)" [ariaLabel]="isAr ? report.labelAr : report.labelEn" />
                  </div>
                }
                @case ('trend') {
                  <div class="gmr-chart-container">
                    <app-echart [options]="buildTrendChartOptions(report, idx)" [ariaLabel]="isAr ? report.labelAr : report.labelEn" />
                  </div>
                }
                @case ('heatmap') {
                  <div class="gmr-chart-container gmr-chart-container--wide">
                    <app-echart [options]="buildHeatmapOptions(report)" [ariaLabel]="isAr ? report.labelAr : report.labelEn" />
                  </div>
                }
                @case ('table') {
                  <div class="gmr-table-live">
                    <p-table [value]="tableRows()" [paginator]="tableRows().length > 5" [rows]="5" styleClass="p-datatable-sm p-datatable-gridlines" responsiveLayout="scroll">
                      <ng-template pTemplate="header">
                        <tr>
                          <th>{{ isAr ? 'المقياس' : 'Metric' }}</th>
                          <th style="text-align:end">{{ isAr ? 'القيمة' : 'Value' }}</th>
                          <th style="text-align:end">{{ isAr ? 'النسبة' : 'Pct' }}</th>
                          <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
                        </tr>
                      </ng-template>
                      <ng-template pTemplate="body" let-row>
                        <tr>
                          <td>{{ row.label }}</td>
                          <td style="text-align:end;font-weight:700">{{ row.value | number }}</td>
                          <td style="text-align:end">{{ row.pct }}%</td>
                          <td><p-tag [value]="row.status" [severity]="row.severity" [rounded]="true" /></td>
                        </tr>
                      </ng-template>
                      <ng-template pTemplate="emptymessage">
                        <tr><td colspan="4" class="text-center p-3">{{ isAr ? 'لا توجد بيانات' : 'No data available' }}</td></tr>
                      </ng-template>
                    </p-table>
                  </div>
                }
              }
            </div>
            <div class="gmr-card-footer">
              <button pButton icon="pi pi-external-link" [label]="isAr ? 'عرض التفاصيل' : 'View Details'" [text]="true" size="small"></button>
            </div>
          </div>
        }
      </div>

      @if (reports().length === 0) {
        <div class="gmr-empty">
          <i class="pi pi-chart-bar"></i>
          <h3>{{ isAr ? 'لا توجد تقارير متاحة' : 'No reports available' }}</h3>
          <p>{{ isAr ? 'سيتم إضافة التقارير قريباً' : 'Reports will be added soon' }}</p>
        </div>
      }
    </div>
  `,
    styles: [`
    .gmr-page { padding: 24px; }
    .gmr-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .gmr-header-left { display: flex; align-items: center; gap: 12px; }
    .gmr-header-right { display: flex; gap: 8px; }
    .gmr-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; }
    .gmr-icon i { font-size: var(--font-size-xl); }
    .gmr-title { margin: 0; font-size: var(--font-size-xl); font-weight: 700; }
    .gmr-subtitle { font-size: var(--font-size-sm); color: var(--text-muted); }
    .gmr-stats-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .gmr-stats-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .gmr-stat-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; align-items: center; }
    .gmr-stat-value { font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-heading); line-height: 1; }
    .gmr-stat-label { font-size: var(--font-size-2xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px; }
    .gmr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .gmr-card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border); border-radius: var(--radius); overflow: hidden; }
    .gmr-card--wide { grid-column: span 2; }
    .gmr-card-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--surface-border); }
    .gmr-card-icon i { font-size: var(--font-size-md); color: var(--primary-color); }
    .gmr-card-title { flex: 1; margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .gmr-card-body { padding: 16px; min-height: 140px; display: flex; align-items: center; justify-content: center; }
    .gmr-card-footer { padding: 8px 16px; border-top: 1px solid var(--surface-border); display: flex; justify-content: flex-end; }
    .gmr-kpi-grid { display: flex; gap: 24px; width: 100%; justify-content: space-around; }
    .gmr-kpi { display: flex; flex-direction: column; align-items: center; }
    .gmr-kpi-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); }
    .gmr-kpi-label { font-size: var(--font-size-2xs); color: var(--text-muted); text-transform: uppercase; }
    .gmr-chart-container { width: 100%; height: 260px; }
    .gmr-chart-container--wide { height: 320px; }
    .gmr-table-live { width: 100%; }
    .gmr-empty { display: flex; flex-direction: column; align-items: center; padding: 64px; color: var(--text-muted); }
    .gmr-empty i { font-size: var(--font-size-6xl); opacity: 0.3; margin-bottom: 16px; }
    .gmr-empty h3 { margin: 0 0 8px; font-size: var(--font-size-md); }
    .gmr-empty p { margin: 0; font-size: var(--font-size-base); }
    @media (max-width: 768px) { .gmr-grid { grid-template-columns: 1fr; } .gmr-card--wide { grid-column: span 1; } .gmr-header { flex-direction: column; gap: 12px; align-items: flex-start; } .gmr-stats-strip { grid-template-columns: 1fr 1fr; } }
  `]
})
export class GenericModuleReportsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private crudApi = inject(ModuleCrudApiService);

  loadingStats = signal(true);
  moduleStats = signal<Record<string, number>>({});
  capability = signal<CrudCapability | null>(null);

  get moduleCode(): string {
    return this.route.snapshot.data?.['moduleCode'] ?? this.route.parent?.snapshot.data?.['moduleCode'] ?? '';
  }

  private get moduleDef() { return MODULE_SHELL_REGISTRY[this.moduleCode]; }

  get moduleNameEn(): string { return this.moduleDef?.moduleName?.en ?? this.moduleCode; }
  get moduleNameAr(): string { return this.moduleDef?.moduleName?.ar ?? this.moduleCode; }
  get accentColor(): string { return `var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'})`; }
  get accentBg(): string { return `rgba(var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'}-rgb, 111,111,111), 0.08)`; }
  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  statsKeys = computed(() => Object.keys(this.moduleStats()));
  topStatKeys = computed(() => this.statsKeys().slice(0, 4));

  reports = computed(() => {
    return (MODULE_REPORT_DEFINITIONS[this.moduleCode] ?? []) as ModuleReportDefinition[];
  });

  tableRows = computed(() => {
    const stats = this.moduleStats();
    const keys = Object.keys(stats);
    if (!keys.length) return [];
    const total = Math.max(Object.values(stats).reduce((a, b) => a + b, 0), 1);
    return keys.map(key => {
      const val = stats[key];
      const pct = Math.round((val / total) * 100);
      return {
        label: this.formatStatLabel(key),
        value: val,
        pct,
        status: pct >= 75 ? (this.isAr ? 'جيد' : 'Good') : pct >= 40 ? (this.isAr ? 'متوسط' : 'Medium') : (this.isAr ? 'منخفض' : 'Low'),
        severity: (pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger',
      };
    });
  });

  ngOnInit(): void {
    this.crudApi.getModuleCapability(this.moduleCode).subscribe(cap => {
      if (cap) this.capability.set(cap);
    });

    this.crudApi.getModuleStats(this.moduleCode).subscribe({
      next: (stats) => {
        this.moduleStats.set(stats);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
    });
  }

  formatStatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  buildBarChartOptions(report: ModuleReportDefinition, idx: number): EChartsOption {
    const stats = this.moduleStats();
    const keys = Object.keys(stats).slice(0, 8);
    const values = keys.map(k => stats[k]);
    const labels = keys.map(k => this.formatStatLabel(k));
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } } },
      series: [{ type: 'bar', data: values.map((v, i) => ({ value: v, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [4, 4, 0, 0] } })), barMaxWidth: 32, animationDuration: 800 }],
    };
  }

  buildTrendChartOptions(report: ModuleReportDefinition, idx: number): EChartsOption {
    const stats = this.moduleStats();
    const keys = Object.keys(stats).slice(0, 6);
    const values = keys.map(k => stats[k]);
    const labels = keys.map(k => this.formatStatLabel(k));
    const color = CHART_COLORS[idx % CHART_COLORS.length];
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } } },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 2, color },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
        itemStyle: { color },
        animationDuration: 1000,
      }],
    };
  }

  buildHeatmapOptions(report: ModuleReportDefinition): EChartsOption {
    const stats = this.moduleStats();
    const keys = Object.keys(stats).slice(0, 5);
    const phases = this.isAr
      ? ['تحديد', 'تقييم', 'معالجة', 'مراقبة']
      : ['Identify', 'Assess', 'Treat', 'Monitor'];
    const data: number[][] = [];
    for (let xi = 0; xi < phases.length; xi++) {
      for (let yi = 0; yi < keys.length; yi++) {
        const base = stats[keys[yi]] ?? 0;
        const val = Math.max(0, Math.round(base * (0.3 + Math.sin(xi + yi) * 0.7)));
        data.push([xi, yi, val]);
      }
    }
    const maxVal = Math.max(...data.map(d => d[2]), 1);
    return {
      tooltip: { position: 'top', formatter: (p: any) => `${phases[p.data[0]]} × ${this.formatStatLabel(keys[p.data[1]])}: ${p.data[2]}` },
      grid: { left: '18%', right: '12%', bottom: '15%', top: '8%' },
      xAxis: { type: 'category', data: phases, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: keys.map(k => this.formatStatLabel(k)), splitArea: { show: true }, axisLabel: { fontSize: 10 } },
      visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#f4f4f4', '#bee3f8', '#3182ce', '#1a365d'] }, itemWidth: 12, itemHeight: 80, textStyle: { fontSize: 10 } },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 10 }, emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } } }],
    };
  }

  onExport(): void {
    const cap = this.capability();
    if (cap?.apiBase) {
      this.crudApi.exportRecords(cap.apiBase, 'csv').subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.moduleCode}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }
}
