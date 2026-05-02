import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api';
import type { EvalSloItemDto, EvalSloStatusDto } from '@app/features/ai-governance/services/ai-enhanced-api.types';
import { devError } from '@app/runtime/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-widget-eval-slo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="eval-slo-widget">
      <div class="slo-summary" *ngIf="data">
        <span class="slo-badge" [class.passing]="breachCount === 0" [class.breach]="breachCount > 0">
          {{ breachCount === 0 ? i18n.translate('aiOs.allPassing') : breachCount + ' ' + i18n.translate('aiOs.breaches') }}
        </span>
      </div>
      <div class="slo-list" *ngIf="sloItems.length">
        <div class="slo-item" *ngFor="let item of sloItems">
          <span class="slo-name">{{ item.agentId || item.type }}</span>
          <span class="slo-status" [class.ok]="!item.breach" [class.bad]="item.breach">
            {{ item.breach ? '!' : '&#10003;' }}
          </span>
        </div>
      </div>
      <div class="empty" *ngIf="!data && !loading">{{ i18n.translate('common.noData') }}</div>
    </div>
  `,
  styles: [`
    .eval-slo-widget { display: flex; flex-direction: column; gap: 8px; }
    .slo-summary { text-align: center; }
    .slo-badge {
      display: inline-block; padding: 4px 14px; border-radius: var(--radius-pill, 99px);
      font-size: var(--font-size-sm); font-weight: 700;
    }
    .slo-badge.passing { background: rgba(16,185,129,0.12); color: #059669; }
    .slo-badge.breach { background: rgba(239,68,68,0.12); color: #dc2626; }
    .slo-list { display: flex; flex-direction: column; gap: 4px; }
    .slo-item { display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-sm); padding: 4px 0; }
    .slo-name { color: var(--text-body); }
    .slo-status { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .slo-status.ok { background: rgba(16,185,129,0.15); color: #059669; }
    .slo-status.bad { background: rgba(239,68,68,0.15); color: #dc2626; }
    .empty { text-align: center; color: var(--text-muted); font-size: var(--font-size-sm); }
  `]
})
export class EvalSloWidget implements OnInit {
  data: EvalSloStatusDto | null = null;
  sloItems: EvalSloItemDto[] = [];
  breachCount = 0;
  loading = true;

  constructor(private aiEnhancedApi: AiEnhancedApiService, public i18n: I18nService) {}

  ngOnInit() {
    this.aiEnhancedApi.getEvalSloStatus().subscribe({
      next: (d) => {
        this.data = d;
        this.sloItems = d.sloBreaches ?? d.items ?? d.agents ?? d.sloStatus ?? d.slos ?? [];
        this.breachCount = this.sloItems.filter((s) => s.breach === true).length;
        this.loading = false;
      },
      error: (e) => { devError('[EvalSloWidget]', e); this.loading = false; },
    });
  }
}
