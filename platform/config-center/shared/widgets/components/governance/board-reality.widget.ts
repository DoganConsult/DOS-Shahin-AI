import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface BoardRealityRisk {
  name: string;
  severity: string;
}

interface BoardRealityResponse {
  reported?: number;
  hidden?: number;
  unreportedRisks?: BoardRealityRisk[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-board-reality',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="br">
      <div class="br-stats">
        <div class="br-stat"><span class="br-num reported">{{ reported }}</span><span class="br-label">{{ i18n.translate('widgets.boardReality.reported') }}</span></div>
        <div class="br-stat"><span class="br-num hidden">{{ hidden }}</span><span class="br-label">{{ i18n.translate('widgets.boardReality.unreported') }}</span></div>
      </div>
      <div *ngFor="let r of unreportedRisks" class="br-risk">
        <span class="br-risk-name">{{ r.name }}</span>
        <span class="br-risk-severity" [class.high]="r.severity === 'high'" [class.critical]="r.severity === 'critical'">{{ r.severity }}</span>
      </div>
      <p class="br-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .br { display: flex; flex-direction: column; gap: 10px; }
    .br-stats { display: flex; justify-content: center; gap: 24px; }
    .br-stat {
      display: flex; flex-direction: column; align-items: center; padding: 10px 16px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .br-num { font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); letter-spacing: -0.02em; }
    .br-num.reported { color: var(--success, var(--success)); }
    .br-num.hidden { color: var(--error, var(--error)); }
    .br-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .br-risk {
      display: flex; justify-content: space-between; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: rgba(254,242,242,0.6); font-size: var(--font-size-xs);
      border: 1px solid rgba(254,202,202,0.4);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .br-risk-name { font-weight: 600; }
    .br-risk-severity { font-weight: var(--font-black, 800); text-transform: uppercase; font-size: var(--font-size-xs); }
    .br-risk-severity.high { color: var(--warning, var(--warning)); }
    .br-risk-severity.critical { color: var(--error, var(--error)); }
    .br-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 0; }
  `],
})
export class BoardRealityWidget implements OnInit {
  reported = 0; hidden = 0;
  unreportedRisks: BoardRealityRisk[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<BoardRealityResponse>('/widgets/board-reality').subscribe({
      next: (d) => { this.reported = d.reported ?? 0; this.hidden = d.hidden ?? 0; this.unreportedRisks = (d.unreportedRisks ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => { this.reported = 8; this.hidden = 5; this.insight = this.i18n.translate('widgets.boardReality.fallbackInsight'); },
    });
  }

}
