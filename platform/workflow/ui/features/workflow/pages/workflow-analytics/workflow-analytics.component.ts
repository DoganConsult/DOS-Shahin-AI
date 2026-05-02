import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WorkflowSankeyComponent } from '@app/shared/widgets/echart-components/sankey/workflow-sankey.component';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import type { SankeyData } from '@app/shared/widgets/echart-builders/builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-analytics',
    imports: [CommonModule, FormsModule, StatCardComponent, WorkflowSankeyComponent, AppEchartComponent, TagModule, ToastModule, ButtonModule, DropdownModule, CalendarModule],
    providers: [MessageService],
    template: `
    <p-toast />
    <div class="wfa-toolbar">
      <h3 style="margin:0">{{ i18n.currentLang()==='ar' ? 'تحليلات سير العمل' : 'Workflow Analytics' }}</h3>
      <div class="wfa-toolbar-actions">
        <div class="wfa-date-filters">
          <button *ngFor="let f of dateFilters" pButton [label]="f.label" class="p-button-sm" [ngClass]="activeDateFilter === f.key ? 'p-button-primary' : 'p-button-outlined'" (click)="applyDateFilter(f.key)"></button>
          <div class="wfa-custom-range" *ngIf="activeDateFilter === 'custom'">
            <p-calendar [(ngModel)]="customFrom" [showIcon]="true" dateFormat="yy-mm-dd" placeholder="From" [style]="{'width':'130px'}" inputStyleClass="p-inputtext-sm" (onSelect)="applyCustomRange()" />
            <p-calendar [(ngModel)]="customTo" [showIcon]="true" dateFormat="yy-mm-dd" placeholder="To" [style]="{'width':'130px'}" inputStyleClass="p-inputtext-sm" (onSelect)="applyCustomRange()" />
          </div>
        </div>
        <button pButton icon="pi pi-refresh" class="p-button-text" (click)="load()"></button>
      </div>
    </div>

    <div class="wfa-workflow-selector">
      <p-dropdown [(ngModel)]="selectedWorkflow" [options]="workflowOptions()" optionLabel="label" optionValue="value" [placeholder]="i18n.currentLang()==='ar' ? 'الكل (إجمالي)' : 'All Workflows (Aggregate)'" [showClear]="true" (onChange)="onWorkflowSelect()" [style]="{'min-width':'260px'}" />
      <span *ngIf="selectedWorkflowName" class="wfa-drill-label">
        <i class="pi pi-filter"></i> {{ selectedWorkflowName }}
      </span>
    </div>

    <div *ngIf="loading()" class="wfa-loading">
      <i class="pi pi-spin pi-spinner" style="font-size:2rem;color:var(--primary-color)"></i>
    </div>

    <div *ngIf="error()" class="wfa-error">
      <i class="pi pi-exclamation-triangle" style="font-size:1.5rem;color:var(--red-500)"></i>
      <span>{{ error() }}</span>
      <button pButton label="Retry" icon="pi pi-refresh" class="p-button-text p-button-sm" (click)="load()"></button>
    </div>

    <ng-container *ngIf="!loading() && !error()">
      <div class="wfa-kpi-grid">
        <app-stat-card [label]="i18n.currentLang()==='ar' ? 'إجمالي التنفيذات' : 'Total Executions'" [value]="data()?.totalExecutions || 0" icon="pi-play" color="var(--primary-color)" />
        <app-stat-card [label]="i18n.currentLang()==='ar' ? 'المحاكاة' : 'Simulations'" [value]="data()?.totalSimulations || 0" icon="pi-gauge" color="var(--blue-500)" />
        <app-stat-card [label]="i18n.currentLang()==='ar' ? 'نسبة الفشل' : 'Failure Rate'" [value]="(data()?.failureRate || 0) + '%'" icon="pi-times-circle" color="var(--red-500)" />
        <app-stat-card [label]="i18n.currentLang()==='ar' ? 'نسبة الإيقاف المؤقت' : 'Pause Rate'" [value]="(data()?.pauseRate || 0) + '%'" icon="pi-pause-circle" color="var(--orange-500)" />
        <app-stat-card [label]="i18n.currentLang()==='ar' ? 'متوسط المدة' : 'Avg Duration'" [value]="formatDuration(data()?.avgDurationMs)" icon="pi-clock" color="var(--green-500)" />
      </div>

      <div class="wfa-sla-section" *ngIf="data()?.slaMetrics?.total > 0">
        <h4>{{ i18n.currentLang()==='ar' ? 'امتثال SLA' : 'SLA Compliance' }}</h4>
        <div class="wfa-sla-grid">
          <div class="wfa-sla-card wfa-sla--compliance">
            <div class="wfa-sla-value">{{ data()?.slaMetrics?.complianceRate || 0 }}%</div>
            <div class="wfa-sla-label">{{ i18n.currentLang()==='ar' ? 'نسبة الامتثال' : 'Compliance Rate' }}</div>
          </div>
          <div class="wfa-sla-card wfa-sla--ontrack">
            <div class="wfa-sla-value">{{ data()?.slaMetrics?.onTrack || 0 }}</div>
            <div class="wfa-sla-label">{{ i18n.currentLang()==='ar' ? 'في الموعد' : 'On Track' }}</div>
          </div>
          <div class="wfa-sla-card wfa-sla--atrisk">
            <div class="wfa-sla-value">{{ data()?.slaMetrics?.atRisk || 0 }}</div>
            <div class="wfa-sla-label">{{ i18n.currentLang()==='ar' ? 'في خطر' : 'At Risk' }}</div>
          </div>
          <div class="wfa-sla-card wfa-sla--breached">
            <div class="wfa-sla-value">{{ data()?.slaMetrics?.breached || 0 }}</div>
            <div class="wfa-sla-label">{{ i18n.currentLang()==='ar' ? 'تم التجاوز' : 'Breached' }}</div>
          </div>
        </div>
      </div>
      <div class="wfa-sla-section wfa-sla-empty" *ngIf="!data()?.slaMetrics?.total || data()?.slaMetrics?.total === 0">
        <h4>{{ i18n.currentLang()==='ar' ? 'امتثال SLA' : 'SLA Compliance' }}</h4>
        <p class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد بيانات SLA متاحة' : 'No SLA data available for this period' }}</p>
      </div>

      <div class="wfa-charts-grid">
        <div class="wfa-chart-card">
          <h4>{{ i18n.currentLang()==='ar' ? 'التنفيذات حسب الحالة' : 'Executions by Status' }}</h4>
          <div class="wfa-status-bars" *ngIf="statusEntries().length > 0">
            <div *ngFor="let s of statusEntries()" class="wfa-status-row">
              <span class="wfa-status-label">
                <p-tag [value]="s.key" [severity]="statusSeverity(s.key)" />
              </span>
              <div class="wfa-bar-track">
                <div class="wfa-bar-fill" [style.width.%]="s.pct" [style.background]="statusColor(s.key)"></div>
              </div>
              <span class="wfa-bar-count">{{ s.count }}</span>
            </div>
          </div>
          <p *ngIf="statusEntries().length === 0" class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد بيانات تنفيذ' : 'No execution data' }}</p>
        </div>

        <div class="wfa-chart-card" *ngIf="!selectedWorkflow">
          <h4>{{ i18n.currentLang()==='ar' ? 'التنفيذات حسب سير العمل' : 'Executions by Workflow' }}</h4>
          <div class="wfa-wf-list" *ngIf="workflowEntries().length > 0">
            <div *ngFor="let w of workflowEntries()" class="wfa-wf-row wfa-wf-clickable" (click)="drillIntoWorkflow(w)">
              <span class="wfa-wf-name">{{ w.key }}</span>
              <div class="wfa-bar-track">
                <div class="wfa-bar-fill" [style.width.%]="w.pct" style="background:var(--primary-color)"></div>
              </div>
              <span class="wfa-bar-count">{{ w.count }}</span>
              <i class="pi pi-chevron-right wfa-wf-drill-icon"></i>
            </div>
          </div>
          <p *ngIf="workflowEntries().length === 0" class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد بيانات سير العمل' : 'No workflow data' }}</p>
        </div>
      </div>

      <div class="wfa-chart-card wfa-trend-card">
        <h4>{{ i18n.currentLang()==='ar' ? 'اتجاهات التنفيذ بمرور الوقت' : 'Execution Trends Over Time' }}</h4>
        <div *ngIf="trendChartOptions()" style="height:280px">
          <app-echart [options]="trendChartOptions()!" />
        </div>
        <p *ngIf="!trendChartOptions()" class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد بيانات اتجاه كافية' : 'Not enough trend data available' }}</p>
      </div>

      <div class="wfa-bottleneck-section">
        <h4>{{ i18n.currentLang()==='ar' ? 'تحليل الاختناقات' : 'Bottleneck Analysis' }}</h4>
        <div class="wfa-bottleneck-grid">
          <div class="wfa-chart-card">
            <h5>{{ i18n.currentLang()==='ar' ? 'أبطأ الخطوات' : 'Slowest Steps' }}</h5>
            <div *ngIf="data()?.bottlenecks?.slowest?.length > 0" class="wfa-bottleneck-list">
              <div *ngFor="let b of data()?.bottlenecks?.slowest; let idx = index" class="wfa-bottleneck-item">
                <span class="wfa-bottleneck-rank">{{ idx + 1 }}</span>
                <div class="wfa-bottleneck-info">
                  <span class="wfa-bottleneck-name">{{ b.step }}</span>
                  <span class="wfa-bottleneck-meta">{{ formatDuration(b.avgDurationMs) }} avg · {{ b.count }} runs</span>
                </div>
                <div class="wfa-bar-track wfa-bottleneck-bar">
                  <div class="wfa-bar-fill" [style.width.%]="getBottleneckPct(b.avgDurationMs, 'slowest')" style="background:var(--orange-500)"></div>
                </div>
              </div>
            </div>
            <p *ngIf="!data()?.bottlenecks?.slowest?.length" class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد بيانات مدة الخطوة' : 'No step duration data' }}</p>
          </div>
          <div class="wfa-chart-card">
            <h5>{{ i18n.currentLang()==='ar' ? 'أكثر الخطوات فشلاً' : 'Most Failed Steps' }}</h5>
            <div *ngIf="data()?.bottlenecks?.mostFailed?.length > 0" class="wfa-bottleneck-list">
              <div *ngFor="let b of data()?.bottlenecks?.mostFailed; let idx = index" class="wfa-bottleneck-item">
                <span class="wfa-bottleneck-rank wfa-bottleneck-rank--fail">{{ idx + 1 }}</span>
                <div class="wfa-bottleneck-info">
                  <span class="wfa-bottleneck-name">{{ b.step }}</span>
                  <span class="wfa-bottleneck-meta">{{ b.failures }} failures / {{ b.count }} runs ({{ b.failureRate }}%)</span>
                </div>
                <div class="wfa-bar-track wfa-bottleneck-bar">
                  <div class="wfa-bar-fill" [style.width.%]="b.failureRate" style="background:var(--red-500)"></div>
                </div>
              </div>
            </div>
            <p *ngIf="!data()?.bottlenecks?.mostFailed?.length" class="wfa-empty">{{ i18n.currentLang()==='ar' ? 'لا توجد حالات فشل' : 'No step failures detected' }}</p>
          </div>
        </div>
      </div>

      <div class="wfa-chart-card wfa-sankey-card" *ngIf="sankeyData() && !selectedWorkflow">
        <h4>{{ i18n.currentLang()==='ar' ? 'مخطط سانكي — تدفق حالات التنفيذ' : 'Sankey — Execution Flow by Status' }}</h4>
        <div style="height:320px">
          <app-workflow-sankey [data]="sankeyData()!" />
        </div>
      </div>
    </ng-container>
  `,
    styles: [`
    .wfa-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 12px; }
    .wfa-toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .wfa-date-filters { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .wfa-custom-range { display: flex; gap: 4px; align-items: center; }
    .wfa-workflow-selector { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .wfa-drill-label { font-size: var(--font-size-caption); color: var(--primary-color); font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .wfa-loading, .wfa-error { text-align: center; padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .wfa-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .wfa-sla-section { margin-bottom: 24px; }
    .wfa-sla-section h4 { margin: 0 0 12px; font-size: var(--font-size-body-sm); font-weight: 600; }
    .wfa-sla-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .wfa-sla-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius); padding: 16px; text-align: center; }
    .wfa-sla-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .wfa-sla-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 4px; }
    .wfa-sla--compliance { border-left: 4px solid var(--blue-500); }
    .wfa-sla--compliance .wfa-sla-value { color: var(--blue-600); }
    .wfa-sla--ontrack { border-left: 4px solid var(--green-500); }
    .wfa-sla--ontrack .wfa-sla-value { color: var(--green-600); }
    .wfa-sla--atrisk { border-left: 4px solid var(--orange-500); }
    .wfa-sla--atrisk .wfa-sla-value { color: var(--orange-600); }
    .wfa-sla--breached { border-left: 4px solid var(--red-500); }
    .wfa-sla--breached .wfa-sla-value { color: var(--red-600); }
    .wfa-sla-empty { }
    .wfa-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .wfa-chart-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius); padding: 20px; }
    .wfa-chart-card h4 { margin: 0 0 16px; font-size: var(--font-size-body-sm); font-weight: 600; }
    .wfa-chart-card h5 { margin: 0 0 12px; font-size: var(--font-size-tag); font-weight: 600; color: var(--text-color-secondary); }
    .wfa-trend-card { margin-bottom: 24px; }
    .wfa-sankey-card { margin-bottom: 24px; }
    .wfa-status-bars, .wfa-wf-list { display: flex; flex-direction: column; gap: 10px; }
    .wfa-status-row, .wfa-wf-row { display: flex; align-items: center; gap: 12px; }
    .wfa-wf-clickable { cursor: pointer; padding: 4px 6px; border-radius: var(--radius-xs); transition: background 0.15s; }
    .wfa-wf-clickable:hover { background: var(--surface-hover); }
    .wfa-wf-drill-icon { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .wfa-status-label { min-width: 90px; }
    .wfa-wf-name { min-width: 140px; font-size: var(--font-size-tag); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wfa-bar-track { flex: 1; height: 18px; background: var(--surface-100); border-radius: var(--radius-xs); overflow: hidden; }
    .wfa-bar-fill { height: 100%; border-radius: var(--radius-xs); transition: width 0.3s; min-width: 2px; }
    .wfa-bar-count { font-size: var(--font-size-tag); font-weight: 600; min-width: 32px; text-align: right; }
    .wfa-empty { text-align: center; color: var(--text-color-secondary); font-style: italic; padding: 16px; }
    .wfa-bottleneck-section { margin-bottom: 24px; }
    .wfa-bottleneck-section > h4 { margin: 0 0 12px; font-size: var(--font-size-body-sm); font-weight: 600; }
    .wfa-bottleneck-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .wfa-bottleneck-list { display: flex; flex-direction: column; gap: 8px; }
    .wfa-bottleneck-item { display: flex; align-items: center; gap: 10px; }
    .wfa-bottleneck-rank { width: 24px; height: 24px; border-radius: 50%; background: var(--orange-100); color: var(--orange-700); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: 700; flex-shrink: 0; }
    .wfa-bottleneck-rank--fail { background: var(--red-100); color: var(--red-700); }
    .wfa-bottleneck-info { flex: 1; display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
    .wfa-bottleneck-name { font-size: var(--font-size-tag); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wfa-bottleneck-meta { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .wfa-bottleneck-bar { max-width: 100px; height: 10px; }
  `]
})
export class WorkflowAnalyticsComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  error = signal('');
  data = signal<GrcRecord | null>(null);
  statusEntries = signal<{ key: string; count: number; pct: number }[]>([]);
  workflowEntries = signal<{ key: string; count: number; pct: number; id?: string }[]>([]);
  workflowOptions = signal<{ label: string; value: string }[]>([]);
  sankeyData = signal<SankeyData | null>(null);
  trendChartOptions = signal<GrcRecord | null>(null);

  selectedWorkflow: string | null = null;
  selectedWorkflowName = '';
  activeDateFilter = 'all';
  customFrom: Date | null = null;
  customTo: Date | null = null;

  dateFilters = [
    { key: 'all', label: 'All' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    if (this.selectedWorkflow) {
      this.operationsSvc.getWorkflowAnalytics(this.selectedWorkflow).subscribe({
        next: (res) => this.processData(res),
        error: () => this.handleError(),
      });
    } else {
      const params = this.getDateParams();
      this.operationsSvc.getWorkflowAnalyticsAggregate(params).subscribe({
        next: (res) => this.processData(res),
        error: () => this.handleError(),
      });
    }
  }

  private processData(res: GrcRecord): void {
    this.data.set(res);

    const bs = (res.byStatus || {}) as Record<string, number>;
    const total = Object.values(bs).reduce((a: number, b: number) => a + b, 0);
    this.statusEntries.set(
      Object.entries(bs).map(([key, count]) => ({ key, count: count as number, pct: total > 0 ? ((count as number) / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count)
    );

    const bw = (res.byWorkflow || {}) as Record<string, number>;
    const bwId = res.byWorkflowId || {};
    const wTotal = Object.values(bw).reduce((a: number, b: number) => a + b, 0);
    const wEntries = Object.entries(bw).map(([key, count]) => ({
      key, count: count as number, pct: wTotal > 0 ? ((count as number) / wTotal) * 100 : 0, id: bwId[key],
    })).sort((a, b) => b.count - a.count).slice(0, 10);
    this.workflowEntries.set(wEntries);

    if (!this.selectedWorkflow) {
      this.workflowOptions.set(
        wEntries.filter(w => w.id).map(w => ({ label: w.key, value: w.id! }))
      );
    }

    this.buildTrendChart(res.timeSeries || []);
    this.buildSankey(res);
    this.loading.set(false);
  }

  private handleError(): void {
    this.error.set('Failed to load workflow analytics');
    this.loading.set(false);
  }

  private getDateParams(): { from?: string; to?: string } | undefined {
    const now = new Date();
    switch (this.activeDateFilter) {
      case '7d': {
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: from.toISOString(), to: now.toISOString() };
      }
      case '30d': {
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: from.toISOString(), to: now.toISOString() };
      }
      case 'month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: from.toISOString(), to: now.toISOString() };
      }
      case 'custom': {
        const params: { from?: string; to?: string } = {};
        if (this.customFrom) params.from = this.customFrom.toISOString();
        if (this.customTo) params.to = this.customTo.toISOString();
        return Object.keys(params).length ? params : undefined;
      }
      default:
        return undefined;
    }
  }

  applyDateFilter(key: string): void {
    this.activeDateFilter = key;
    if (key !== 'custom') this.load();
  }

  applyCustomRange(): void {
    if (this.customFrom || this.customTo) this.load();
  }

  onWorkflowSelect(): void {
    if (this.selectedWorkflow) {
      const wf = this.workflowOptions().find(w => w.value === this.selectedWorkflow);
      this.selectedWorkflowName = wf?.label || '';
    } else {
      this.selectedWorkflowName = '';
    }
    this.load();
  }

  drillIntoWorkflow(w: { key: string; id?: string }): void {
    if (!w.id) return;
    this.selectedWorkflow = w.id;
    this.selectedWorkflowName = w.key;
    this.load();
  }

  private buildTrendChart(timeSeries: { date: string; total: number; success: number; failed: number }[]): void {
    if (!timeSeries || timeSeries.length < 2) { this.trendChartOptions.set(null); return; }
    this.trendChartOptions.set({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Total', 'Success', 'Failed'], bottom: 0 },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: timeSeries.map(t => t.date), axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'Total', type: 'line', data: timeSeries.map(t => t.total), smooth: true, lineStyle: { width: 2, color: '#3B82F6' }, itemStyle: { color: '#3B82F6' } },
        { name: 'Success', type: 'line', data: timeSeries.map(t => t.success), smooth: true, lineStyle: { width: 2, color: '#22C55E' }, itemStyle: { color: '#22C55E' }, areaStyle: { color: 'rgba(var(--module-accent-green-rgb), 0.1)' } },
        { name: 'Failed', type: 'line', data: timeSeries.map(t => t.failed), smooth: true, lineStyle: { width: 2, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, areaStyle: { color: 'rgba(var(--module-accent-red-rgb), 0.1)' } },
      ],
    });
  }

  private buildSankey(res: GrcRecord): void {
    const bw = (res.byWorkflow || {}) as Record<string, number>;
    const bs = (res.byStatus || {}) as Record<string, number>;
    if (Object.keys(bw).length === 0 || Object.keys(bs).length === 0) { this.sankeyData.set(null); return; }
    const nodes: { name: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const wfNames = Object.keys(bw).slice(0, 8);
    const statuses = Object.keys(bs);
    for (const n of wfNames) nodes.push({ name: n });
    for (const s of statuses) nodes.push({ name: s });
    const recent = res.recentExecutions || [];
    const linkMap: Record<string, number> = {};
    for (const ex of recent) {
      const wn = ex.workflow_name || this.i18n.translate('common.unknown');
      if (!wfNames.includes(wn)) continue;
      const key = `${wn}→${ex.status}`;
      linkMap[key] = (linkMap[key] || 0) + 1;
    }
    for (const [key, value] of Object.entries(linkMap)) {
      const [source, target] = key.split('→');
      links.push({ source, target, value });
    }
    if (links.length > 0) this.sankeyData.set({ nodes, links }); else this.sankeyData.set(null);
  }

  getBottleneckPct(value: number, type: string): number {
    const list = type === 'slowest' ? this.data()?.bottlenecks?.slowest : this.data()?.bottlenecks?.mostFailed;
    if (!list || list.length === 0) return 0;
    const max = type === 'slowest' ? Math.max(...list.map((b) => b.avgDurationMs)) : Math.max(...list.map((b) => b.failures));
    return max > 0 ? (value / max) * 100 : 0;
  }

  formatDuration(ms?: number): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'paused': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'secondary';
      default: return undefined;
    }
  }

  statusColor(status: string): string {
    switch (status) {
      case 'completed': return 'var(--green-500)';
      case 'running': return 'var(--blue-500)';
      case 'paused': return 'var(--orange-500)';
      case 'failed': return 'var(--red-500)';
      case 'cancelled': return 'var(--text-color-secondary)';
      default: return 'var(--primary-color)';
    }
  }
}
