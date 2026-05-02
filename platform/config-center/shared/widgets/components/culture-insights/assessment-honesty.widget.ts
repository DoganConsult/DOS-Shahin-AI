import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface AssessmentHonestyResponse {
  selfScore?: number;
  evidenceScore?: number;
  gap?: number;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-assessment-honesty',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="honesty">
      <div class="honesty-bars">
        <div class="h-bar">
          <span class="h-label">{{ i18n.translate('widgets.assessmentHonesty.selfScore') }}</span>
          <div class="h-track"><div class="h-fill self" [style.width.%]="selfScore"></div></div>
          <span class="h-val">{{ selfScore }}%</span>
        </div>
        <div class="h-bar">
          <span class="h-label">{{ i18n.translate('widgets.assessmentHonesty.evidenceScore') }}</span>
          <div class="h-track"><div class="h-fill evidence" [style.width.%]="evidenceScore"></div></div>
          <span class="h-val">{{ evidenceScore }}%</span>
        </div>
      </div>
      <div class="honesty-gap" *ngIf="gap > 0">
        <span class="gap-icon">⚠️</span>
        <span class="gap-text">{{ gap }}% {{ i18n.translate('widgets.assessmentHonesty.optimismBias') }}</span>
      </div>
      <p class="h-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .honesty { display: flex; flex-direction: column; gap: 10px; }
    .honesty-bars { display: flex; flex-direction: column; gap: 10px; }
    .h-bar { display: flex; align-items: center; gap: 8px; }
    .h-label { font-size: var(--font-size-xs); font-weight: 700; min-width: 80px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .h-track {
      flex: 1; height: 12px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .h-fill { height: 100%; border-radius: var(--radius-sm); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .h-fill.self { background: linear-gradient(90deg, var(--primary), #60a5fa); }
    .h-fill.evidence { background: linear-gradient(90deg, var(--success), var(--success)); }
    .h-val { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); min-width: 36px; text-align: end; color: var(--text-heading); }
    .honesty-gap {
      display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px;
      background: rgba(254,252,232,0.7); border-radius: var(--radius-sm, 8px);
      border: 1px solid rgba(254,240,138,0.5);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .gap-icon { font-size: var(--font-size-base); }
    .gap-text { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); color: #92400e; }
    .h-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--warning); text-align: center; margin: 0; }
  `],
})
export class AssessmentHonestyWidget implements OnInit {
  selfScore = 0; evidenceScore = 0; gap = 0; insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<AssessmentHonestyResponse>('/widgets/assessment-honesty').subscribe({
      next: (d) => {
        this.selfScore = d.selfScore ?? 0;
        this.evidenceScore = d.evidenceScore ?? 0;
        this.gap = d.gap ?? Math.max(0, this.selfScore - this.evidenceScore);
        this.insight = d.insight ?? '';
      },
      error: () => { this.selfScore = 82; this.evidenceScore = 59; this.gap = 23; this.insight = this.i18n.translate('widgets.assessmentHonesty.fallbackInsight'); },
    });
  }
}
