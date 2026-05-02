import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ReputationImpactRisk {
  name: string;
  technical: number;
  reputational: number;
}

interface ReputationImpactResponse {
  risks?: ReputationImpactRisk[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-reputation-impact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rep">
      <div *ngFor="let r of risks" class="rep-row">
        <span class="rep-name">{{ r.name }}</span>
        <div class="rep-bars">
          <div class="rep-bar tech" [style.width.%]="r.technical"><span>{{ i18n.translate('widgets.reputationImpact.tech') }}</span></div>
          <div class="rep-bar media" [style.width.%]="r.reputational"><span>{{ i18n.translate('widgets.reputationImpact.rep') }}</span></div>
        </div>
      </div>
      <p class="rep-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .rep { display: flex; flex-direction: column; gap: 10px; }
    .rep-row { display: flex; flex-direction: column; gap: 4px; }
    .rep-name { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); }
    .rep-bars { display: flex; flex-direction: column; gap: 3px; }
    .rep-bar {
      height: 14px; border-radius: var(--radius); font-size: var(--font-size-xs); font-weight: 700; color: #fff;
      display: flex; align-items: center; padding-inline-start: 8px; transition: width 500ms; min-width: 30px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .rep-bar.tech { background: linear-gradient(90deg, var(--primary), #60a5fa); }
    .rep-bar.media { background: linear-gradient(90deg, var(--error), var(--error)); }
    .rep-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 0; }
  `],
})
export class ReputationImpactWidget implements OnInit {
  risks: ReputationImpactRisk[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<ReputationImpactResponse>('/widgets/reputation-impact').subscribe({
      next: (d) => { this.risks = (d.risks ?? []).slice(0, 3); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.reputationImpact.fallbackInsight'); },
    });
  }

}
