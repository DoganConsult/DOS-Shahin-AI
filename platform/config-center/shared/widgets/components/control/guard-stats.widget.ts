import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface GuardStatItem {
  check_type: string;
  decision: string;
  count: number;
}

interface GuardStatsResponse {
  stats?: GuardStatItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-widget-guard-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guard-stats-widget">
      <div class="stat-row">
        <div class="stat-card allow">
          <span class="stat-value">{{ allowCount }}</span>
          <span class="stat-label">{{ i18n.translate('aiOs.allow') }}</span>
        </div>
        <div class="stat-card block">
          <span class="stat-value">{{ blockCount }}</span>
          <span class="stat-label">{{ i18n.translate('aiOs.block') }}</span>
        </div>
      </div>
      <div class="breakdown" *ngIf="stats.length">
        <div class="breakdown-row" *ngFor="let s of stats">
          <span class="type-label">{{ s.check_type }}</span>
          <span class="type-badge" [class.allow-bg]="s.decision === 'allow'" [class.block-bg]="s.decision !== 'allow'">
            {{ s.decision }}: {{ s.count }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .guard-stats-widget { display: flex; flex-direction: column; gap: 10px; }
    .stat-row { display: flex; gap: 10px; }
    .stat-card {
      flex: 1; padding: 12px; border-radius: var(--radius-sm, 8px); text-align: center;
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-card.allow { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); }
    .stat-card.block { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
    .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-body); }
    .breakdown { display: flex; flex-direction: column; gap: 4px; }
    .breakdown-row { display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-sm); }
    .type-label { color: var(--text-body); text-transform: capitalize; }
    .type-badge { padding: 2px 8px; border-radius: var(--radius-pill, 99px); font-size: var(--font-size-xs); }
    .allow-bg { background: rgba(16,185,129,0.12); color: #059669; }
    .block-bg { background: rgba(239,68,68,0.12); color: #dc2626; }
  `]
})
export class GuardStatsWidget implements OnInit {
  stats: GuardStatItem[] = [];
  allowCount = 0;
  blockCount = 0;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit() {
    this.http.get<GuardStatsResponse>(`${environment.apiUrl}/ai-enhanced/guard-decisions/stats`).subscribe({
      next: (d) => {
        this.stats = d.stats ?? [];
        this.allowCount = this.stats.filter((s) => s.decision === 'allow').reduce((sum, s) => sum + s.count, 0);
        this.blockCount = this.stats.filter((s) => s.decision !== 'allow').reduce((sum, s) => sum + s.count, 0);
      },
      error: (e) => devError('[GuardStatsWidget]', e),
    });
  }
}
