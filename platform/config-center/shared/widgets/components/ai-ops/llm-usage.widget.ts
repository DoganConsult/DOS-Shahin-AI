import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import type { BudgetStatus } from '@app/core/models/ai-api.types';

export interface LlmBudgetResponse {
  usedTokens: number;
  monthlyTokenLimit: number;
  usedCost: number;
}

import { devError } from '@app/runtime/utils/dev-logger';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widget-llm-usage',
    imports: [CommonModule],
    template: `
    <div class="llm-usage-widget">
      <div class="usage-bar-wrap">
        <div class="usage-label">
          <span>{{ i18n.translate('aiOs.tokenUsage') }}</span>
          <span class="usage-pct">{{ tokenPct | number:'1.0-0' }}%</span>
        </div>
        <div class="usage-bar">
          <div class="usage-fill" [style.width.%]="tokenPct" [class.warn]="tokenPct > 80" [class.danger]="tokenPct > 95"></div>
        </div>
        <div class="usage-detail">{{ tokensUsed | number }} / {{ tokenLimit | number }}</div>
      </div>
      <div class="cost-row" *ngIf="costUsed > 0">
        <span class="cost-label">{{ i18n.translate('aiOs.costThisMonth') }}</span>
        <span class="cost-value">\${{ costUsed | number:'1.2-2' }}</span>
      </div>
    </div>
  `,
    styles: [`
    .llm-usage-widget { display: flex; flex-direction: column; gap: 10px; }
    .usage-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
    .usage-label { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--text-body); }
    .usage-pct { font-weight: 700; color: var(--text-heading); }
    .usage-bar { height: 8px; border-radius: var(--radius-xs); background: var(--surface-200, #e2e8f0); overflow: hidden; }
    .usage-fill { height: 100%; border-radius: var(--radius-xs); background: var(--primary, #6366f1); transition: width 0.3s ease; }
    .usage-fill.warn { background: #f59e0b; }
    .usage-fill.danger { background: #ef4444; }
    .usage-detail { font-size: var(--font-size-xs); color: var(--text-muted); text-align: right; }
    .cost-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-top: 1px solid var(--surface-200, #e2e8f0); }
    .cost-label { font-size: var(--font-size-sm); color: var(--text-body); }
    .cost-value { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); }
  `]
})
export class LlmUsageWidget implements OnInit {
  tokensUsed = 0;
  tokenLimit = 1;
  tokenPct = 0;
  costUsed = 0;

  constructor(private aiEnhancedApi: AiEnhancedApiService, public i18n: I18nService, private http: HttpClient) {}

  ngOnInit() {
    this.http.get<LlmBudgetResponse>(`${environment.apiUrl}/ai-enhanced/budget`).subscribe({
      next: (d: LlmBudgetResponse) => {
        this.tokensUsed = d.usedTokens ?? 0;
        this.tokenLimit = d.monthlyTokenLimit ?? 10000000;
        this.tokenPct = this.tokenLimit > 0 ? (this.tokensUsed / this.tokenLimit) * 100 : 0;
        this.costUsed = d.usedCost ?? 0;
      },
      error: (e) => devError('[LlmUsageWidget]', e),
    });
  }
}
