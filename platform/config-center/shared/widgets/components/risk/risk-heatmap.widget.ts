import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { buildHeatmapDrillUrl } from '../../chart-infra/chart-utils';
import { RiskHeatmapChartComponent, HeatmapCell } from '../d3-charts';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

interface RiskHeatmapMatrixEntry {
  likelihood: string | number;
  impact: string | number;
  count: number;
  riskIds?: string[];
}

const toNumber = (value: string | number): number =>
  typeof value === 'number' ? value : Number(value);

interface RiskHeatmapResponse {
  matrix?: RiskHeatmapMatrixEntry[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-risk-heatmap',
  standalone: true,
  imports: [CommonModule, RiskHeatmapChartComponent],
  template: `
    <div class="heatmap-widget">
      <app-risk-heatmap-chart
        *ngIf="cells.length"
        [cells]="cells"
        [width]="360"
        [height]="320"
        (cellClicked)="onCellClick($event)">
      </app-risk-heatmap-chart>
      <div *ngIf="!cells.length" class="empty-state">{{ i18n.translate('charts.noData') }}</div>
    </div>
  `,
  styles: [`
    .heatmap-widget { display: flex; justify-content: center; }
    .empty-state {
      text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      border-radius: var(--radius, 12px);
    }
  `],
})
export class RiskHeatmapWidget implements OnInit {
  cells: HeatmapCell[] = [];

  constructor(public i18n: I18nService, private router: Router, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.riskSvc.getRiskMatrix().subscribe({
      next: (r: RiskHeatmapResponse) => {
        const matrix = r.matrix ?? [];
        this.cells = matrix.filter((m) => m.count > 0).map((m) => ({
          likelihood: toNumber(m.likelihood),
          impact: toNumber(m.impact),
          count: m.count,
          riskIds: m.riskIds ?? [],
        }));
      },
      error: () => { this.cells = []; }
    });
  }

  onCellClick(cell: HeatmapCell): void {
    if (cell.count > 0) {
      const url = buildHeatmapDrillUrl(String(cell.likelihood), String(cell.impact));
      this.router.navigateByUrl(url);
    }
  }
}
