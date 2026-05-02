import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgFor } from '@angular/common';
import type { DashboardFilters } from '../../../../../../shared/services/dashboard-filters.service';

export interface TopRiskRow {
  riskId: string;
  title: string;
  severity?: string;
  owner?: string;
  dueUtc?: string;
  score?: number;
  category?: string;
  trend?: string;
  lastUpdated?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-top-risks',
    imports: [WidgetShellComponent],
    template: `
    <app-widget-shell title="Top Risks" subtitle="By severity" [state]="state" [canExport]="true" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      <ul class="space-y-2">
        @for (row of rows; track row.riskId) {
          <li>
            <button type="button" (click)="open.emit(row.riskId)"
                    class="w-full text-left px-3 py-2 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors">
              <div class="text-sm font-medium truncate">{{ row.title }}</div>
              <div class="text-xs text-[var(--text-1)] flex justify-between mt-1">
                <span>{{ row.severity ?? row.category ?? '—' }}</span>
                <span>{{ row.owner ?? '—' }} · {{ formatDate(row.dueUtc ?? row.lastUpdated ?? '') }}</span>
              </div>
            </button>
          </li>
        }
        @empty {
          <p class="text-sm text-[var(--text-1)]">No open risks.</p>
        }
      </ul>
    </app-widget-shell>
  `
})
export class TopRisksComponent {
  @Input() rows: TopRiskRow[] = [];
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  /** Shared dashboard filter context. */
  @Input() filterContext?: DashboardFilters | null;
  @Output() open = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  get state(): 'ready' | 'loading' | 'empty' | 'error' {
    if (this.loading === true) return 'loading';
    return this.rows?.length ? 'ready' : 'empty';
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  formatDate(utc: string): string {
    try {
      return new Date(utc).toLocaleDateString();
    } catch {
      return utc;
    }
  }
}
