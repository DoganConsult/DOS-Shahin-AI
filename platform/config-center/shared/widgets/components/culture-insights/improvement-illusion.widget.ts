import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ImprovementIllusionResponse {
  cosmetic?: number;
  operational?: number;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-improvement-illusion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="illusion">
      <div class="bars">
        <div class="bar-row">
          <span class="bar-label">{{ i18n.translate('widgets.improvementIllusion.cosmetic') }}</span>
          <div class="bar-track"><div class="bar-fill cosmetic" [style.width.%]="cosmetic"></div></div>
          <span class="bar-val">{{ cosmetic }}%</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">{{ i18n.translate('widgets.improvementIllusion.operational') }}</span>
          <div class="bar-track"><div class="bar-fill operational" [style.width.%]="operational"></div></div>
          <span class="bar-val">{{ operational }}%</span>
        </div>
      </div>
      <p class="insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .illusion { padding: 4px 0; }
    .bars { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
    .bar-row { display: flex; align-items: center; gap: 8px; }
    .bar-label { font-size: var(--font-size-xs); font-weight: 700; min-width: 72px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .bar-track {
      flex: 1; height: 14px; border-radius: var(--radius); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .bar-fill { height: 100%; border-radius: var(--radius); transition: width 600ms ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .bar-fill.cosmetic { background: linear-gradient(90deg, var(--risk-high), var(--error)); }
    .bar-fill.operational { background: linear-gradient(90deg, var(--success), var(--success)); }
    .bar-val { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); min-width: 36px; text-align: end; color: var(--text-heading); }
    .insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--error, var(--error)); margin: 0; text-align: center; }
  `],
})
export class ImprovementIllusionWidget implements OnInit {
  cosmetic = 0;
  operational = 0;
  insight = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.apiclientSvc.get<ImprovementIllusionResponse>('/widgets/improvement-illusion').subscribe({
      next: (d) => { this.cosmetic = d.cosmetic ?? 80; this.operational = d.operational ?? 20; this.insight = d.insight ?? ''; },
      error: () => {
        this.cosmetic = 78; this.operational = 22;
        this.insight = this.i18n.translate('widgets.improvementIllusion.fallbackInsight');
      },
    });
  }
}
