import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface FalseComfortKpi {
  label: string;
  displayValue: string;
  displayColor: string;
}

interface FalseComfortResponse {
  kpis?: FalseComfortKpi[];
  warningCount?: number;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-false-comfort',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fc">
      <div class="fc-dashboard">
        <div class="fc-kpi" *ngFor="let k of kpis">
          <span class="fc-kpi-val" [class.green]="k.displayColor === 'green'" [class.red]="k.displayColor === 'red'">{{ k.displayValue }}</span>
          <span class="fc-kpi-label">{{ k.label }}</span>
        </div>
      </div>
      <div class="fc-overlay" *ngIf="warningCount > 0">
        <span class="fc-warn-icon">⚠️</span>
        <span class="fc-warn-text">{{ warningCount }} {{ i18n.translate('widgets.falseComfort.deepIndicatorsContradict') }}</span>
      </div>
      <p class="fc-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .fc { display: flex; flex-direction: column; gap: 10px; }
    .fc-dashboard { display: flex; justify-content: center; gap: 16px; }
    .fc-kpi {
      display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 16px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .fc-kpi-val { font-size: var(--font-size-xl); font-weight: var(--font-black, 800); letter-spacing: -0.02em; }
    .fc-kpi-val.green { color: var(--success, var(--success)); }
    .fc-kpi-val.red { color: var(--error, var(--error)); }
    .fc-kpi-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .fc-overlay {
      display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px;
      background: rgba(254,242,242,0.6); border: 1px solid rgba(254,202,202,0.4); border-radius: var(--radius-sm, 8px);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .fc-warn-icon { font-size: var(--font-size-base); }
    .fc-warn-text { font-size: var(--font-size-xs); font-weight: 700; color: #991b1b; }
    .fc-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 0; }
  `],
})
export class FalseComfortWidget implements OnInit {
  kpis: FalseComfortKpi[] = [];
  warningCount = 0; insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<FalseComfortResponse>('/widgets/false-comfort').subscribe({
      next: (d) => { this.kpis = d.kpis ?? []; this.warningCount = d.warningCount ?? 0; this.insight = d.insight ?? ''; },
      error: () => {
        this.kpis = [
          { label: this.i18n.translate('widgets.falseComfort.compliance'), displayValue: '92%', displayColor: 'green' },
          { label: this.i18n.translate('widgets.falseComfort.evidence'), displayValue: '47%', displayColor: 'red' },
        ];
        this.warningCount = 3;
        this.insight = this.i18n.translate('widgets.falseComfort.fallbackInsight');
      },
    });
  }

}
