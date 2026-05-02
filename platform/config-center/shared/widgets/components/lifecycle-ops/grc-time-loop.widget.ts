import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface GrcTimeLoopYear {
  year: number;
  finding: string;
  repeated: boolean;
}

interface GrcTimeLoopResponse {
  years?: GrcTimeLoopYear[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-grc-time-loop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="time-loop">
      <div class="loop-icon">🔄</div>
      <div class="loop-timeline">
        <div *ngFor="let y of years" class="loop-year" [class.repeated]="y.repeated">
          <span class="year-label">{{ y.year }}</span>
          <span class="year-finding">{{ y.finding }}</span>
          <span *ngIf="y.repeated" class="repeat-badge">{{ i18n.translate('widgets.grcTimeLoop.repeated') }}</span>
        </div>
      </div>
      <p class="loop-insight" *ngIf="insight">{{ insight }}</p>
      <p class="loop-empty" *ngIf="!insight && years.length === 0">
        {{ i18n.translate('widgets.grcTimeLoop.empty') }}
      </p>
    </div>
  `,
  styles: [`
    .time-loop { text-align: center; }
    .loop-icon { font-size: var(--font-size-3xl); margin-bottom: 10px; }
    .loop-timeline { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .loop-year {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); font-size: var(--font-size-sm);
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .loop-year.repeated { background: rgba(254,242,242,0.5); border-color: rgba(254,202,202,0.4); }
    .year-label { font-weight: var(--font-black, 800); min-width: 40px; color: var(--text-heading); }
    .year-finding { flex: 1; text-align: start; color: var(--text-body); }
    .repeat-badge {
      font-size: var(--font-size-xs); font-weight: 700; color: var(--error);
      background: rgba(254,226,226,0.7); padding: 2px 8px; border-radius: var(--radius-pill, 99px);
      border: 1px solid rgba(239,68,68,0.18); backdrop-filter: blur(4px);
    }
    .loop-insight { font-size: var(--font-size-sm); font-weight: 700; color: var(--error, var(--error)); margin: 0; }
    .loop-empty { font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class GrcTimeLoopWidget implements OnInit {
  years: GrcTimeLoopYear[] = [];
  insight = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.apiclientSvc.get<GrcTimeLoopResponse>('/widgets/grc-time-loop').subscribe({
      next: (d) => {
        this.years = d.years ?? [];
        this.insight = d.insight ?? '';
      },
      error: () => {
        this.insight = this.i18n.translate('widgets.grcTimeLoop.fallbackInsight');
      },
    });
  }

}
