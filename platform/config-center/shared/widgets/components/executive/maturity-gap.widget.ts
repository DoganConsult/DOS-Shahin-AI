import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface MaturityGapResponse {
  perceived?: number;
  actual?: number;
  gap?: number;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-maturity-gap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mg">
      <div class="mg-bars">
        <div class="mg-row">
          <span class="mg-label">{{ i18n.translate('widgets.maturityGap.whatYouThink') }}</span>
          <div class="mg-track"><div class="mg-fill perceived" [style.width.%]="perceived"></div></div>
          <span class="mg-val">{{ perceived }}%</span>
        </div>
        <div class="mg-row">
          <span class="mg-label">{{ i18n.translate('widgets.maturityGap.reality') }}</span>
          <div class="mg-track"><div class="mg-fill actual" [style.width.%]="actual"></div></div>
          <span class="mg-val">{{ actual }}%</span>
        </div>
      </div>
      <div class="mg-gap-display" *ngIf="gap > 0">
        <span class="mg-gap-text">{{ i18n.translate('widgets.maturityGap.gapIsHere') }}: {{ gap }}%</span>
      </div>
      <p class="mg-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .mg { display: flex; flex-direction: column; gap: 10px; }
    .mg-bars { display: flex; flex-direction: column; gap: 10px; }
    .mg-row { display: flex; align-items: center; gap: 8px; }
    .mg-label { font-size: var(--font-size-xs); font-weight: 700; min-width: 80px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .mg-track {
      flex: 1; height: 14px; border-radius: var(--radius); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .mg-fill { height: 100%; border-radius: var(--radius); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .mg-fill.perceived { background: linear-gradient(90deg, #60a5fa, var(--primary)); }
    .mg-fill.actual { background: linear-gradient(90deg, var(--risk-high), #ea580c); }
    .mg-val { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); min-width: 36px; text-align: end; color: var(--text-heading); }
    .mg-gap-display {
      text-align: center; padding: 10px;
      background: rgba(255,247,237,0.6); border: 1px solid rgba(254,215,170,0.5); border-radius: var(--radius-sm, 8px);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .mg-gap-text { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); color: #c2410c; }
    .mg-insight { font-size: var(--font-size-sm); font-weight: 600; color: #9a3412; text-align: center; margin: 0; }
  `],
})
export class MaturityGapWidget implements OnInit {
  perceived = 0; actual = 0; gap = 0; insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<MaturityGapResponse>('/widgets/maturity-gap').subscribe({
      next: (d) => { this.perceived = d.perceived ?? 0; this.actual = d.actual ?? 0; this.gap = d.gap ?? Math.max(0, this.perceived - this.actual); this.insight = d.insight ?? ''; },
      error: () => { this.perceived = 75; this.actual = 48; this.gap = 27; this.insight = this.i18n.translate('widgets.maturityGap.fallbackInsight'); },
    });
  }
}
