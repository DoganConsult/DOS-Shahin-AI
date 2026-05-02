import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface RiskGravityItem {
  name: string;
  rating: string;
  cascadeScore: number;
}

interface RiskGravityResponse {
  risks?: RiskGravityItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-risk-gravity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gravity">
      <div *ngFor="let r of risks" class="grav-row">
        <div class="grav-bubble" [style.width.px]="20 + r.cascadeScore" [style.height.px]="20 + r.cascadeScore">{{ r.rating }}</div>
        <div class="grav-info">
          <span class="grav-name">{{ r.name }}</span>
          <span class="grav-cascade">{{ i18n.translate('widgets.riskGravity.cascade') }} {{ r.cascadeScore }}</span>
        </div>
      </div>
      <p class="grav-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="risks.length === 0" class="grav-empty">{{ i18n.translate('widgets.riskGravity.empty') }}</p>
    </div>
  `,
  styles: [`
    .gravity { display: flex; flex-direction: column; gap: 10px; }
    .grav-row { display: flex; align-items: center; gap: 10px; }
    .grav-bubble {
      display: flex; align-items: center; justify-content: center; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--error), var(--risk-high)); color: #fff; font-size: var(--font-size-xs); font-weight: var(--font-black, 800);
      min-width: 28px; min-height: 28px; max-width: 52px; max-height: 52px;
      box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.20);
    }
    .grav-info { display: flex; flex-direction: column; }
    .grav-name { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); }
    .grav-cascade { font-size: var(--font-size-xs); color: var(--text-muted); }
    .grav-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--error, var(--error)); text-align: center; margin: 0; }
    .grav-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class RiskGravityWidget implements OnInit {
  risks: RiskGravityItem[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<RiskGravityResponse>('/widgets/risk-gravity').subscribe({
      next: (d) => { this.risks = (d.risks ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.riskGravity.fallbackInsight'); },
    });
  }

}
