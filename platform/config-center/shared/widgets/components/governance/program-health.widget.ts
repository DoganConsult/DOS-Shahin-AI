import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GaugeChartComponent } from '../d3-charts';
import { ProgressRingChartComponent } from '../d3-charts';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ProgramHealthBreakdown {
  complianceScore: number;
  inverseRiskScore: number;
  evidenceCoverage: number;
  remediationClosureRate: number;
}

interface ProgramHealthDelta {
  direction: 'up' | 'down';
  magnitude: string | number;
}

interface ProgramHealthData {
  overallScore: number;
  breakdown?: ProgramHealthBreakdown;
  delta?: ProgramHealthDelta;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-program-health',
  standalone: true,
  imports: [CommonModule, GaugeChartComponent, ProgressRingChartComponent],
  template: `
    <div class="health-widget">
      <app-gauge-chart
        [value]="data?.overallScore ?? 0"
        [max]="100"
        [size]="160"
        [label]="i18n.translate('widgets.programHealth.title')"
        [thresholds]="gaugeThresholds">
      </app-gauge-chart>
      <div class="rings-row" *ngIf="data?.breakdown">
        <app-progress-ring-chart [value]="data.breakdown.complianceScore" [max]="100" [size]="56" [strokeWidth]="5" color="#3b82f6" [label]="i18n.translate('widgets.programHealth.compliance')"></app-progress-ring-chart>
        <app-progress-ring-chart [value]="data.breakdown.inverseRiskScore" [max]="100" [size]="56" [strokeWidth]="5" color="#22c55e" [label]="i18n.translate('widgets.programHealth.risk')"></app-progress-ring-chart>
        <app-progress-ring-chart [value]="data.breakdown.evidenceCoverage" [max]="100" [size]="56" [strokeWidth]="5" color="#8b5cf6" [label]="i18n.translate('widgets.programHealth.evidence')"></app-progress-ring-chart>
        <app-progress-ring-chart [value]="data.breakdown.remediationClosureRate" [max]="100" [size]="56" [strokeWidth]="5" color="#f59e0b" [label]="i18n.translate('widgets.programHealth.remediation')"></app-progress-ring-chart>
      </div>
      <div class="delta" *ngIf="data?.delta">
        <span [class]="data.delta.direction">{{ data.delta.direction === 'up' ? '↑' : '↓' }} {{ data.delta.magnitude }}</span>
      </div>
    </div>
  `,
  styles: [`
    .health-widget { text-align: center; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .rings-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .delta { font-size: var(--font-size-base); font-weight: 700; }
    .up { color: var(--success, var(--success)); }
    .down { color: var(--error, var(--error)); }
  `]
})
export class ProgramHealthWidget implements OnInit {
  data: ProgramHealthData | null = null;
  gaugeThresholds = [
    { color: '#ef4444', upTo: 40 },
    { color: '#f59e0b', upTo: 70 },
    { color: '#22c55e', upTo: 100 },
  ];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<ProgramHealthData>('/dashboard/program-health').subscribe({ next: (d) => this.data = d, error: (e: unknown) => devError("[API]", e) });
  }
}
