import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface IfNothingChangesScenario {
  months: number;
  description: string;
  probability: number;
  severity: string;
}

interface IfNothingChangesResponse {
  scenarios?: IfNothingChangesScenario[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-if-nothing-changes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inc">
      <div class="inc-scenarios">
        <div *ngFor="let s of scenarios" class="inc-card" [class.bad]="s.severity === 'critical'" [class.warn]="s.severity === 'warning'">
          <span class="inc-month">{{ s.months }}{{ i18n.translate('widgets.ifNothingChanges.months') }}</span>
          <span class="inc-text">{{ s.description }}</span>
          <span class="inc-prob">{{ s.probability }}%</span>
        </div>
      </div>
      <p class="inc-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .inc { display: flex; flex-direction: column; gap: 6px; }
    .inc-scenarios { display: flex; flex-direction: column; gap: 6px; }
    .inc-card {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .inc-card.warn { background: rgba(255,251,235,0.6); border-color: rgba(254,240,138,0.5); }
    .inc-card.bad { background: rgba(254,242,242,0.6); border-color: rgba(254,202,202,0.5); }
    .inc-month { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); min-width: 36px; color: var(--text-heading); }
    .inc-text { font-size: var(--font-size-sm); flex: 1; color: var(--text-body); }
    .inc-prob { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); color: var(--error, var(--error)); min-width: 32px; text-align: end; }
    .inc-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 4px 0 0; }
  `],
})
export class IfNothingChangesWidget implements OnInit {
  scenarios: IfNothingChangesScenario[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<IfNothingChangesResponse>('/widgets/if-nothing-changes').subscribe({
      next: (d) => { this.scenarios = (d.scenarios ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => {
        this.scenarios = [
          { months: 6, description: this.i18n.translate('widgets.ifNothingChanges.scenario6mo'), probability: 45, severity: 'warning' },
          { months: 9, description: this.i18n.translate('widgets.ifNothingChanges.scenario9mo'), probability: 62, severity: 'critical' },
          { months: 12, description: this.i18n.translate('widgets.ifNothingChanges.scenario12mo'), probability: 38, severity: 'critical' },
        ];
        this.insight = this.i18n.translate('widgets.ifNothingChanges.fallbackInsight');
      },
    });
  }

}
