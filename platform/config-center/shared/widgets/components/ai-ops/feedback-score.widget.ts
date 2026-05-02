import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api';
import type { FeedbackSummaryDto } from '@app/features/ai-governance/services/ai-enhanced-api.types';
import { devError } from '@app/runtime/utils/dev-logger';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widget-feedback-score',
    imports: [CommonModule],
    template: `
    <div class="feedback-widget">
      <div class="score-circle">
        <span class="score-value">{{ avgRating | number:'1.1-1' }}</span>
        <span class="score-max">/ 5</span>
      </div>
      <div class="feedback-stats">
        <div class="stat-item">
          <span class="stat-num">{{ totalFeedback }}</span>
          <span class="stat-lbl">{{ i18n.translate('aiOs.totalFeedback') }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .feedback-widget { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .score-circle {
      width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.06));
      border: 3px solid var(--primary, #6366f1);
    }
    .score-value { font-size: 1.4rem; font-weight: 800; color: var(--text-heading); line-height: 1; }
    .score-max { font-size: var(--font-size-xs); color: var(--text-muted); }
    .feedback-stats { display: flex; gap: 16px; }
    .stat-item { display: flex; flex-direction: column; align-items: center; }
    .stat-num { font-size: var(--font-size-body-md); font-weight: 700; color: var(--text-heading); }
    .stat-lbl { font-size: var(--font-size-xs); color: var(--text-body); }
  `]
})
export class FeedbackScoreWidget implements OnInit {
  avgRating = 0;
  totalFeedback = 0;

  constructor(private aiEnhancedApi: AiEnhancedApiService, public i18n: I18nService) {}

  ngOnInit() {
    this.aiEnhancedApi.getFeedbackSummary().subscribe({
      next: (d: FeedbackSummaryDto) => {
        this.avgRating = d.averageRating ?? d.avgRating ?? 0;
        this.totalFeedback = d.totalFeedback ?? d.totalSubmissions ?? d.totalCount ?? d.total ?? 0;
      },
      error: (e) => devError('[FeedbackScoreWidget]', e),
    });
  }
}
