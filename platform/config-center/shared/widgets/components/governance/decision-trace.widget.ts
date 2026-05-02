import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface DecisionTraceItem {
  type: string;
  date: string;
  description: string;
  hasRationale: boolean;
}

interface DecisionTraceResponse {
  decisions?: DecisionTraceItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-decision-trace',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dt">
      <div *ngFor="let d of decisions" class="dt-card" [class.missing]="!d.hasRationale">
        <div class="dt-header">
          <span class="dt-type">{{ d.type }}</span>
          <span class="dt-date">{{ d.date }}</span>
        </div>
        <p class="dt-desc">{{ d.description }}</p>
        <span class="dt-badge" [class.ok]="d.hasRationale" [class.gap]="!d.hasRationale">
          {{ d.hasRationale ? i18n.translate('widgets.decisionTrace.documented') : i18n.translate('widgets.decisionTrace.noRationale') }}
        </span>
      </div>
      <p class="dt-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .dt { display: flex; flex-direction: column; gap: 6px; }
    .dt-card {
      padding: 10px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .dt-card.missing { border-color: rgba(254,202,202,0.5); background: rgba(254,242,242,0.5); }
    .dt-header { display: flex; justify-content: space-between; align-items: center; }
    .dt-type { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.04em; }
    .dt-date { font-size: var(--font-size-xs); color: var(--text-muted); }
    .dt-desc { font-size: var(--font-size-sm); margin: 4px 0; color: var(--text-body); }
    .dt-badge {
      font-size: var(--font-size-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill, 99px);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .dt-badge.ok { background: rgba(220,252,231,0.7); color: #166534; border: 1px solid rgba(34,197,94,0.18); }
    .dt-badge.gap { background: rgba(254,226,226,0.7); color: #991b1b; border: 1px solid rgba(239,68,68,0.18); }
    .dt-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 4px 0 0; }
  `],
})
export class DecisionTraceWidget implements OnInit {
  decisions: DecisionTraceItem[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<DecisionTraceResponse>('/widgets/decision-trace').subscribe({
      next: (d) => { this.decisions = (d.decisions ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.decisionTrace.fallbackInsight'); },
    });
  }

}
