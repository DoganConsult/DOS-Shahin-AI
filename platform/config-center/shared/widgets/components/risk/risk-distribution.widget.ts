import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { computeRiskDistribution } from '../../chart-infra/chart-utils';
import { AnimatedDonutChartComponent, DonutSegment } from '../d3-charts';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--error)',
  high: '#f97316',
  medium: '#eab308',
  low: 'var(--success)',
};
const SEVERITY_KEYS = ['critical', 'high', 'medium', 'low'] as const;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-distribution-widget',
    imports: [CommonModule, AnimatedDonutChartComponent],
    template: `
    <div class="risk-distribution-widget">
      <app-animated-donut-chart
        *ngIf="segments.length"
        [segments]="segments"
        [size]="220"
        [thickness]="32"
        [centerValue]="totalCount.toString()"
        [centerLabel]="i18n.translate('risk.total')"
        (segmentClicked)="onSegmentClick($event)">
      </app-animated-donut-chart>
      <div *ngIf="!segments.length" class="empty-state">{{ i18n.translate('charts.noData') }}</div>
    </div>
  `,
    styles: [`
    .risk-distribution-widget { display: flex; flex-direction: column; gap: 12px; }
    .empty-state {
      text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.04));
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.10));
      border-radius: var(--radius, 12px);
    }
  `]
})
export class RiskDistributionWidget implements OnInit {
  segments: DonutSegment[] = [];
  totalCount = 0;

  constructor(public i18n: I18nService, private router: Router, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.riskSvc.getRisks().subscribe({
      next: (risks) => {
        if (!risks || risks.length === 0) { this.segments = []; return; }
        const dist = computeRiskDistribution(risks);
        this.totalCount = risks.length;
        this.segments = SEVERITY_KEYS
          .filter(k => dist[k] > 0)
          .map(k => ({
            label: this.i18n.translate(`charts.${k}`),
            value: dist[k],
            color: SEVERITY_COLORS[k],
            filterKey: k,
          }));
      },
      error: () => { this.segments = []; }
    });
  }

  onSegmentClick(seg: DonutSegment): void {
    if (seg.filterKey) {
      this.router.navigate(['/risk/register'], { queryParams: { severity: seg.filterKey } });
    }
  }
}
