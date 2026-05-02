import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { transformToChartData } from '../../chart-infra/chart-utils';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compliance-trend-widget',
  standalone: true,
  imports: [CommonModule, ChartModule, SelectButtonModule, FormsModule],
  template: `
    <div class="compliance-trend-widget">
      <div class="range-selector">
        <p-selectButton [options]="rangeOptions" [(ngModel)]="selectedRange"
          (onChange)="onRangeChange()" optionLabel="label" optionValue="value">
        </p-selectButton>
      </div>
      <div *ngIf="chartData; else emptyState">
        <p-chart type="line" [data]="chartData" [options]="chartOptions"
          (onDataSelect)="onChartClick($event)">
        </p-chart>
      </div>
      <ng-template #emptyState>
        <div class="empty-state">{{ i18n.translate('charts.noData') }}</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .compliance-trend-widget { display: flex; flex-direction: column; gap: 12px; }
    .range-selector { display: flex; justify-content: flex-end; }
    .empty-state {
      text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      border-radius: var(--radius, 12px);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    }
  `]
})
export class ComplianceTrendWidget implements OnInit {
  chartData: unknown = null;
  selectedRange = 30;
  rangeOptions: unknown[] = [];
  chartOptions: Record<string, unknown> = {};

  constructor(public i18n: I18nService, private router: Router, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.rangeOptions = [
      { label: this.i18n.translate('charts.days30'), value: 30 },
      { label: this.i18n.translate('charts.days90'), value: 90 },
      { label: this.i18n.translate('charts.days180'), value: 180 },
    ];
    this.chartOptions = {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { min: 0, max: 100 } },
      onClick: (_: unknown, elements: unknown[]) => {
        if (elements.length > 0) this.router.navigate(['/compliance']);
      }
    };
    this.loadData();
  }

  onRangeChange(): void { this.loadData(); }

  private loadData(): void {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - this.selectedRange * 86400000).toISOString().split('T')[0];
    this.operationsSvc.getKPITrends(startDate, endDate).subscribe({
      next: (points: unknown[]) => {
        if (points.length === 0) { this.chartData = null; return; }
        this.chartData = transformToChartData(
          points.map((p: any) => ({
            snapshotDate: p.snapshotDate || p.snapshot_date,
            complianceScore: p.complianceScore ?? p.compliance_score ?? 0
          })),
          this.i18n.translate('charts.complianceTrend')
        );
      },
      error: () => { this.chartData = null; }
    });
  }

  onChartClick(_event: unknown): void {
    this.router.navigate(['/compliance']);
  }
}
