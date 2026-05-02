import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface RiskDenialItem {
  name: string;
  yearsDeferred: number;
}

interface RiskDenialResponse {
  risks?: RiskDenialItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-risk-denial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="denial">
      <div *ngFor="let r of risks" class="denial-row">
        <span class="denial-name">{{ r.name }}</span>
        <span class="denial-years">{{ r.yearsDeferred }} {{ i18n.translate('widgets.riskDenial.yrsDeferred') }}</span>
      </div>
      <p class="denial-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="risks.length === 0" class="denial-empty">{{ i18n.translate('widgets.riskDenial.empty') }}</p>
    </div>
  `,
  styles: [`
    .denial { display: flex; flex-direction: column; gap: 6px; }
    .denial-row {
      display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: var(--radius-sm, 8px);
      background: rgba(254,252,232,0.6); border: 1px solid rgba(254,240,138,0.4);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .denial-name { font-size: var(--font-size-sm); font-weight: 600; flex: 1; color: var(--text-body); }
    .denial-years { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); color: var(--warning); }
    .denial-insight { font-size: var(--font-size-sm); font-weight: 600; color: #92400e; text-align: center; margin: 6px 0 0; }
    .denial-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class RiskDenialWidget implements OnInit {
  risks: RiskDenialItem[] = [];
  insight = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.apiclientSvc.get<RiskDenialResponse>('/widgets/risk-denial').subscribe({
      next: (d) => { this.risks = (d.risks ?? []).slice(0, 5); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.riskDenial.fallbackInsight'); },
    });
  }

}
