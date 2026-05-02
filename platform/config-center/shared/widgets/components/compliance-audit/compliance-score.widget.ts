import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GaugeChartComponent } from '../d3-charts';
import { ProgressRingChartComponent } from '../d3-charts';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

interface ControlStatusSummary {
  implemented?: number;
  in_progress?: number;
  not_started?: number;
}

interface ComplianceDashboardSummary {
  controlStatus?: ControlStatusSummary;
}

interface ComplianceDashboardLike {
  summary?: ComplianceDashboardSummary;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-compliance-score',
  standalone: true,
  imports: [CommonModule, GaugeChartComponent, ProgressRingChartComponent],
  template: `
    <div class="score-widget">
      <div class="gauge-row">
        <app-gauge-chart
          [value]="score"
          [max]="100"
          [size]="160"
          label="Compliance"
          [thresholds]="gaugeThresholds">
        </app-gauge-chart>
      </div>
      <div class="rings-row">
        <app-progress-ring-chart [value]="implemented" [max]="total || 1" [size]="64" [strokeWidth]="6" color="#22c55e" [label]="i18n.translate('compliance.implemented')"></app-progress-ring-chart>
        <app-progress-ring-chart [value]="inProgress" [max]="total || 1" [size]="64" [strokeWidth]="6" color="#eab308" [label]="i18n.translate('dashboard.inProgress')"></app-progress-ring-chart>
        <app-progress-ring-chart [value]="gaps" [max]="total || 1" [size]="64" [strokeWidth]="6" color="#ef4444" [label]="i18n.translate('compliance.gaps')"></app-progress-ring-chart>
      </div>
    </div>
  `,
  styles: [`
    .score-widget { text-align: center; display: flex; flex-direction: column; gap: 16px; align-items: center; }
    .gauge-row { display: flex; justify-content: center; }
    .rings-row { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  `],
})
export class ComplianceScoreWidget implements OnInit {
  score = 0; implemented = 0; inProgress = 0; gaps = 0; total = 0;
  gaugeThresholds = [
    { color: '#ef4444', upTo: 40 },
    { color: '#eab308', upTo: 70 },
    { color: '#22c55e', upTo: 100 },
  ];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.operationsSvc.getDashboard().subscribe({
      next: (d) => {
        const summary = d as ComplianceDashboardLike;
        const cs = summary.summary?.controlStatus ?? {};
        this.implemented = cs.implemented ?? 0;
        this.inProgress = cs.in_progress ?? 0;
        this.gaps = cs.not_started ?? 0;
        this.total = this.implemented + this.inProgress + this.gaps;
        this.score = this.total > 0 ? Math.round((this.implemented / this.total) * 100) : 0;
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }
}
