import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface SummaryLocalizedText {
  en: string;
  ar: string;
}

interface AISummaryDto {
  priorities?: SummaryLocalizedText[];
  weeklyChanges?: SummaryLocalizedText[];
  recommendedActions?: SummaryLocalizedText[];
  generatedAt?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-ai-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-summary-widget">
      <div class="section">
        <div class="section-title">🎯 {{ i18n.translate('widgets.aiSummary.priorities') }}</div>
        <ul>
          <li *ngFor="let p of data?.priorities">{{ i18n.localize(p.en, p.ar) }}</li>
        </ul>
      </div>
      <div class="section">
        <div class="section-title">📊 {{ i18n.translate('widgets.aiSummary.weeklyChanges') }}</div>
        <ul>
          <li *ngFor="let w of data?.weeklyChanges">{{ i18n.localize(w.en, w.ar) }}</li>
        </ul>
      </div>
      <div class="section" *ngIf="data?.recommendedActions?.length">
        <div class="section-title">⚡ {{ i18n.translate('widgets.aiSummary.recommendedActions') }}</div>
        <ul>
          <li *ngFor="let a of data?.recommendedActions">{{ i18n.localize(a.en, a.ar) }}</li>
        </ul>
      </div>
      <div class="stale" *ngIf="isStale">{{ i18n.translate('widgets.aiSummary.staleData') }}</div>
    </div>
  `,
  styles: [`
    .ai-summary-widget { display: flex; flex-direction: column; gap: 10px; }
    .section {
      padding: 10px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .section-title { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); margin-bottom: 6px; color: var(--text-heading); letter-spacing: -0.01em; }
    ul { margin: 0; padding-inline-start: 16px; }
    li { font-size: var(--font-size-sm); line-height: 1.7; color: var(--text-body); }
    .stale {
      font-size: var(--font-size-xs); color: var(--warning, var(--warning)); text-align: center; margin-top: 4px;
      padding: 4px 10px; border-radius: var(--radius-pill, 99px);
      background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.18);
    }
  `]
})
export class AISummaryWidget implements OnInit {
  data: AISummaryDto | null = null;
  isStale = false;
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<AISummaryDto>('/dashboard/ai-summary').subscribe({
      next: (d) => {
        this.data = d;
        if (d.generatedAt) {
          const age = Date.now() - new Date(d.generatedAt).getTime();
          this.isStale = age > 10 * 60 * 1000;
        }
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
