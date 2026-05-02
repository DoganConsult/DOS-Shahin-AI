import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface RiskPredictorPoint {
  score: number;
}

interface RiskPredictorData {
  insufficientData?: boolean;
  historical?: RiskPredictorPoint[];
  projected?: RiskPredictorPoint[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-risk-predictor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-predictor-widget">
      <div *ngIf="data?.insufficientData" class="insufficient">
        {{ i18n.translate('widgets.riskPredictor.insufficientData') }}
      </div>
      <div *ngIf="!data?.insufficientData" class="trend">
        <div class="section-label">{{ i18n.translate('widgets.riskPredictor.historical') }}</div>
        <div class="data-points">
          <span *ngFor="let p of data?.historical" class="point historical">{{ p.score }}</span>
        </div>
        <div class="section-label projected-label">{{ i18n.translate('widgets.riskPredictor.projected') }}</div>
        <div class="data-points">
          <span *ngFor="let p of data?.projected" class="point projected">{{ p.score }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .insufficient {
      text-align: center; color: var(--text-muted, var(--text-muted)); padding: 20px; font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      border-radius: var(--radius, 12px);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .section-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted, var(--text-muted)); margin-bottom: 4px; letter-spacing: 0.04em; }
    .projected-label { margin-top: 8px; }
    .data-points { display: flex; gap: 4px; flex-wrap: wrap; }
    .point {
      padding: 3px 10px; border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm); font-weight: 700;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .historical {
      background: rgba(14,165,233,0.08); color: var(--primary, var(--primary));
      border: 1px solid rgba(14,165,233,0.15);
    }
    .projected {
      background: rgba(254,243,199,0.6); color: #92400e;
      border: 1px dashed rgba(245,158,11,0.4);
    }
  `]
})
export class RiskPredictorWidget implements OnInit {
  data: RiskPredictorData | null = null;
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get('/dashboard/risk-prediction').subscribe({ next: (d: RiskPredictorData) => this.data = d, error: (e: unknown) => devError("[API]", e) });
  }

}
