import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SparklineChartComponent } from '../d3-charts';
import { ApiClientService } from "@app/core/services/api-client.service";

interface MomentumMetric {
  label: string;
  trend: number;
  sparkData?: number[];
}

interface MomentumIndicatorResponse {
  direction?: 'forward' | 'stagnant' | 'backward';
  metrics?: MomentumMetric[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-momentum-indicator',
  standalone: true,
  imports: [CommonModule, SparklineChartComponent],
  template: `
    <div class="momentum">
      <div class="mom-visual">
        <span class="mom-arrow" [class.forward]="direction === 'forward'" [class.stagnant]="direction === 'stagnant'" [class.backward]="direction === 'backward'">
          {{ direction === 'forward' ? '🚀' : direction === 'backward' ? '📉' : '🔄' }}
        </span>
        <span class="mom-label" [class.forward]="direction === 'forward'" [class.stagnant]="direction === 'stagnant'" [class.backward]="direction === 'backward'">
          {{ direction === 'forward' ? i18n.translate('widgets.momentumIndicator.forward') : direction === 'backward' ? i18n.translate('widgets.momentumIndicator.backward') : i18n.translate('widgets.momentumIndicator.stagnant') }}
        </span>
      </div>
      <div class="mom-metrics">
        <div *ngFor="let m of metrics" class="mom-metric">
          <span class="mm-label">{{ m.label }}</span>
          <span class="mm-val" [class.up]="m.trend > 0" [class.down]="m.trend < 0">{{ m.trend > 0 ? '+' : '' }}{{ m.trend }}%</span>
          <app-sparkline-chart *ngIf="m.sparkData?.length" [data]="m.sparkData!" [width]="80" [height]="24" [color]="m.trend > 0 ? 'var(--success)' : m.trend < 0 ? 'var(--error)' : 'var(--text-muted)'"></app-sparkline-chart>
        </div>
      </div>
      <p class="mom-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .momentum { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .mom-visual { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mom-arrow { font-size: var(--font-size-4xl); }
    .mom-label { font-size: var(--font-size-base); font-weight: var(--font-black, 800); letter-spacing: -0.01em; }
    .mom-label.forward { color: var(--success); }
    .mom-label.stagnant { color: var(--warning); }
    .mom-label.backward { color: var(--error, var(--error)); }
    .mom-metrics { display: flex; gap: 12px; }
    .mom-metric {
      display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .mm-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .mm-val { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); }
    .mm-val.up { color: var(--success, var(--success)); }
    .mm-val.down { color: var(--error, var(--error)); }
    .mom-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-body); text-align: center; margin: 0; }
  `],
})
export class MomentumIndicatorWidget implements OnInit {
  direction: 'forward' | 'stagnant' | 'backward' = 'stagnant';
  metrics: MomentumMetric[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<MomentumIndicatorResponse>('/widgets/momentum-indicator').subscribe({
      next: (d) => { this.direction = d.direction ?? 'stagnant'; this.metrics = d.metrics ?? []; this.insight = d.insight ?? ''; },
      error: () => {
        this.direction = 'stagnant';
        this.metrics = [
          { label: this.i18n.translate('widgets.momentumIndicator.controls'), trend: 2, sparkData: [40, 42, 41, 44, 46, 48, 50] },
          { label: this.i18n.translate('widgets.momentumIndicator.evidence'), trend: -5, sparkData: [60, 58, 55, 52, 50, 48, 45] },
          { label: this.i18n.translate('widgets.momentumIndicator.risks'), trend: 0, sparkData: [30, 31, 30, 29, 30, 31, 30] },
        ];
        this.insight = this.i18n.translate('widgets.momentumIndicator.fallbackInsight');
      },
    });
  }

}
