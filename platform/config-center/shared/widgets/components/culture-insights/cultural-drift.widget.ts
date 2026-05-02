import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface CulturalDriftFactor {
  label: string;
  trend: string;
}

interface CulturalDriftResponse {
  score?: number;
  factors?: CulturalDriftFactor[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-cultural-drift',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drift">
      <div class="drift-gauge">
        <div class="drift-track"><div class="drift-fill" [style.width.%]="score" [class.healthy]="score >= 70" [class.warn]="score >= 40 && score < 70" [class.critical]="score < 40"></div></div>
        <span class="drift-val">{{ score }}%</span>
      </div>
      <div class="drift-factors">
        <div *ngFor="let f of factors" class="drift-factor">
          <span class="df-label">{{ f.label }}</span>
          <span class="df-trend" [class.up]="f.trend === 'up'" [class.down]="f.trend === 'down'">{{ f.trend === 'up' ? '↑' : f.trend === 'down' ? '↓' : '→' }}</span>
        </div>
      </div>
      <p class="drift-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .drift { display: flex; flex-direction: column; gap: 10px; }
    .drift-gauge { display: flex; align-items: center; gap: 8px; }
    .drift-track {
      flex: 1; height: 12px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .drift-fill { height: 100%; border-radius: var(--radius-sm); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .drift-fill.healthy { background: var(--success, var(--success)); }
    .drift-fill.warn { background: var(--warning, var(--warning)); }
    .drift-fill.critical { background: var(--error, var(--error)); }
    .drift-val { font-size: var(--font-size-base); font-weight: var(--font-black, 800); min-width: 40px; color: var(--text-heading); }
    .drift-factors { display: flex; flex-wrap: wrap; gap: 6px; }
    .drift-factor {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); font-size: var(--font-size-xs);
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .df-label { font-weight: 600; color: var(--text-body); }
    .df-trend { font-weight: 900; font-size: var(--font-size-base); }
    .df-trend.up { color: var(--success, var(--success)); }
    .df-trend.down { color: var(--error, var(--error)); }
    .drift-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--warning); text-align: center; margin: 0; }
  `],
})
export class CulturalDriftWidget implements OnInit {
  score = 0;
  factors: CulturalDriftFactor[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<CulturalDriftResponse>('/widgets/cultural-drift').subscribe({
      next: (d) => { this.score = d.score ?? 50; this.factors = d.factors ?? []; this.insight = d.insight ?? ''; },
      error: () => { this.score = 45; this.insight = this.i18n.translate('widgets.culturalDrift.fallbackInsight'); },
    });
  }

}
