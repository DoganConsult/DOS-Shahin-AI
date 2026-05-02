import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';
import { EmptyStateComponent } from '@app/shared/components';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/datepicker';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-metrics',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, ButtonModule, TagModule, TableModule, CalendarModule],
  template: `
    <app-page-shell icon="chart-bar" [title]="'Risk Metrics'"
      [subtitle]="'Risk KPIs and trend analysis over time'"
      [breadcrumbs]="['Dashboard', 'Risk Metrics']" [loading]="loading">
      <div class="grid mb-4" *ngIf="!error">
        @for (kpi of kpis; track kpi.label) {
          <div class="col-3">
            <p-card>
              <div class="text-center">
                <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
                <div class="text-color-secondary mt-1">{{ kpi.label }}</div>
              </div>
            </p-card>
          </div>
        }
      </div>
      <p-card header="Risk Trends" *ngIf="!error">
        <div class="flex gap-3 mb-3 align-items-center">
          <p-calendar [(ngModel)]="startDate" dateFormat="yy-mm-dd" placeholder="Start Date" />
          <p-calendar [(ngModel)]="endDate" dateFormat="yy-mm-dd" placeholder="End Date" />
          <p-button label="Load Trends" icon="pi pi-refresh" (onClick)="loadTrends()" />
        </div>
        <p-table aria-label="Trends table" [value]="trends" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>Date</th><th>Risk Score</th><th>Open Risks</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr></ng-template>
          <ng-template pTemplate="body" let-t>
            <tr>
              <td>{{ t.date || t.snapshotDate | appDate:'medium' }}</td>
              <td><p-tag [value]="t.riskScore + ''" [severity]="t.riskScore > 70 ? 'danger' : t.riskScore > 40 ? 'warning' : 'success'" /></td>
              <td>{{ t.openRisks || 0 }}</td>
              <td class="text-red-500 font-bold">{{ t.critical || 0 }}</td>
              <td class="text-orange-500">{{ t.high || 0 }}</td>
              <td class="text-yellow-500">{{ t.medium || 0 }}</td>
              <td class="text-green-500">{{ t.low || 0 }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">No trend data — select a date range</td></tr></ng-template>
        </p-table>
      </p-card>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
  styles: [`.error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}`]
})
export class RiskMetricsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  kpis: Record<string, unknown>[] = [];
  trends: Record<string, unknown>[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  private risk = inject(GrcRiskService);
  constructor(public i18n: I18nService) {}
  ngOnInit() {
    this.loading = true;
    const now = new Date();
    this.endDate = now;
    this.startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    this.risk.getRiskKPIs().subscribe({
      next: (d: Record<string, unknown>) => {
        this.kpis = [
          { label: 'Total Risks', value: d.totalRisks || 0, color: '#3b82f6' },
          { label: 'Critical', value: d.critical || 0, color: '#ef4444' },
          { label: 'Avg Risk Score', value: d.avgRiskScore || 0, color: '#f59e0b' },
          { label: 'Mitigated', value: d.mitigated || 0, color: '#22c55e' },
        ];
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
    this.loadTrends();
  }
  loadTrends() {
    if (!this.startDate || !this.endDate) return;
    this.risk.getRiskTrends(this.startDate.toISOString(), this.endDate.toISOString()).subscribe({
      next: (response: unknown) => {
        this.trends = Array.isArray(response)
          ? response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          : [];
      }
    });
  }
}
