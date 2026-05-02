// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-strategy-kpi-kri', changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterModule, TabViewModule, TableModule, TagModule, ButtonModule, SkeletonModule, PageHeaderComponent, EmptyStateComponent],
    template: `
    <app-page-header titleEn="KPI / KRI Workspace" titleAr="مساحة عمل المؤشرات" icon="pi-chart-line"
                     subtitleEn="Key Performance and Risk Indicators with trend analysis" subtitleAr="مؤشرات الأداء والمخاطر مع تحليل الاتجاهات" />
    @if (loading()) { <p-skeleton width="100%" height="400px" /> }
    @else {
      <p-tabView>
        <p-tabPanel header="KPIs ({{ kpis().length }})">
          @if (kpis().length) {
            <p-table [value]="kpis()" styleClass="p-datatable-sm" [paginator]="kpis().length > 20" [rows]="20">
              <ng-template pTemplate="header"><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Target</th><th>Trend</th><th>Captured</th></tr></ng-template>
              <ng-template pTemplate="body" let-m>
                <tr><td>{{ m.metric_label || m.metric_key }}</td><td class="val">{{ m.value }}</td><td>{{ m.previous_value || '—' }}</td>
                <td>{{ m.target_value || '—' }}</td>
                <td><i [class]="m.value > (m.previous_value || 0) ? 'pi pi-arrow-up text-success' : m.value < (m.previous_value || 0) ? 'pi pi-arrow-down text-error' : 'pi pi-minus text-muted'"></i></td>
                <td>{{ m.captured_at | date:'mediumDate' }}</td></tr>
              </ng-template>
            </p-table>
          } @else { <app-empty-state variant="info" titleEn="No KPI snapshots yet" titleAr="لا توجد لقطات مؤشرات أداء" /> }
        </p-tabPanel>
        <p-tabPanel header="KRIs ({{ kris().length }})">
          @if (kris().length) {
            <p-table [value]="kris()" styleClass="p-datatable-sm" [paginator]="kris().length > 20" [rows]="20">
              <ng-template pTemplate="header"><tr><th>Name</th><th>Current Value</th><th>Red Threshold</th><th>Amber</th><th>Green</th><th>Status</th></tr></ng-template>
              <ng-template pTemplate="body" let-k>
                <tr><td>{{ k.name }}</td><td class="val">{{ k.current_value || k.value || '—' }}</td>
                <td>{{ k.red_threshold }}</td><td>{{ k.amber_threshold }}</td><td>{{ k.green_threshold }}</td>
                <td><p-tag [value]="k.status || 'normal'" [severity]="k.status === 'breached' ? 'danger' : k.status === 'warning' ? 'warning' : 'success'" /></td></tr>
              </ng-template>
            </p-table>
          } @else { <app-empty-state variant="info" titleEn="No KRIs configured yet" titleAr="لا توجد مؤشرات مخاطر" /> }
        </p-tabPanel>
        <p-tabPanel header="Metric Snapshots ({{ snapshots().length }})">
          @if (snapshots().length) {
            <p-table [value]="snapshots()" styleClass="p-datatable-sm" [paginator]="snapshots().length > 25" [rows]="25">
              <ng-template pTemplate="header"><tr><th>Type</th><th>Key</th><th>Value</th><th>Target</th><th>Scope</th><th>Captured</th></tr></ng-template>
              <ng-template pTemplate="body" let-s>
                <tr><td><p-tag [value]="s.metric_type" /></td><td>{{ s.metric_label || s.metric_key }}</td><td class="val">{{ s.value }}</td>
                <td>{{ s.target_value || '—' }}</td><td>{{ s.scope_type }}</td><td>{{ s.captured_at | date:'medium' }}</td></tr>
              </ng-template>
            </p-table>
          } @else { <app-empty-state variant="info" titleEn="No snapshots recorded" titleAr="لا توجد لقطات" /> }
        </p-tabPanel>
      </p-tabView>
    }
  `,
    styles: [`:host { display: block; padding: 0 16px 24px; } .val { font-weight: 700; } .text-success { color: var(--success); } .text-error { color: var(--error); } .text-muted { color: var(--text-muted); }`]
})
export class StrategyKpiKriComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  private readonly http = inject(HttpClient);
  loading = signal(true);
  kpis = signal<any[]>([]);
  kris = signal<any[]>([]);
  snapshots = signal<any[]>([]);

  ngOnInit(): void {
    Promise.allSettled([
      this.api.getMetricSnapshots({ metricType: 'kpi' }).toPromise(),
      this.http.get<any>('/api/risk-kri').toPromise(),
      this.api.getMetricSnapshots().toPromise(),
    ]).then(([kpiR, kriR, snapR]) => {
      if (kpiR.status === 'fulfilled') this.kpis.set(kpiR.value?.snapshots || []);
      if (kriR.status === 'fulfilled') this.kris.set(Array.isArray(kriR.value) ? kriR.value : kriR.value?.kris || []);
      if (snapR.status === 'fulfilled') this.snapshots.set(snapR.value?.snapshots || []);
      this.loading.set(false);
    });
  }
}
