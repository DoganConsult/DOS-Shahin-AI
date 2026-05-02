import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ChangeLeverageAction {
  description: string;
  effort: string;
  impactCount: number;
}

interface ChangeLeverageResponse {
  actions?: ChangeLeverageAction[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-change-leverage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leverage">
      <div *ngFor="let a of actions" class="lev-row">
        <div class="lev-effort" [class.low]="a.effort === 'low'" [class.med]="a.effort === 'medium'" [class.high]="a.effort === 'high'">{{ a.effort }}</div>
        <span class="lev-desc">{{ a.description }}</span>
        <span class="lev-impact">{{ a.impactCount }} {{ i18n.translate('widgets.changeLeverage.issuesFixed') }}</span>
      </div>
      <p class="lev-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="actions.length === 0" class="lev-empty">{{ i18n.translate('widgets.changeLeverage.empty') }}</p>
    </div>
  `,
  styles: [`
    .leverage { display: flex; flex-direction: column; gap: 6px; }
    .lev-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      transition: all 200ms;
    }
    .lev-row:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .lev-effort {
      font-size: var(--font-size-xs); font-weight: var(--font-black, 800); text-transform: uppercase; padding: 2px 8px;
      border-radius: var(--radius-pill, 99px); backdrop-filter: blur(4px); letter-spacing: 0.04em;
    }
    .lev-effort.low { background: rgba(220,252,231,0.7); color: #166534; border: 1px solid rgba(34,197,94,0.18); }
    .lev-effort.med { background: rgba(254,249,195,0.7); color: #854d0e; border: 1px solid rgba(234,179,8,0.18); }
    .lev-effort.high { background: rgba(254,226,226,0.7); color: #991b1b; border: 1px solid rgba(239,68,68,0.18); }
    .lev-desc { font-size: var(--font-size-sm); font-weight: 600; flex: 1; color: var(--text-body); }
    .lev-impact { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); color: var(--success, var(--success)); min-width: 70px; text-align: end; }
    .lev-insight { font-size: var(--font-size-sm); font-weight: 600; color: #166534; text-align: center; margin: 4px 0 0; }
    .lev-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class ChangeLeverageWidget implements OnInit {
  actions: ChangeLeverageAction[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<ChangeLeverageResponse>('/widgets/change-leverage').subscribe({
      next: (d) => { this.actions = (d.actions ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.changeLeverage.fallbackInsight'); },
    });
  }

}
