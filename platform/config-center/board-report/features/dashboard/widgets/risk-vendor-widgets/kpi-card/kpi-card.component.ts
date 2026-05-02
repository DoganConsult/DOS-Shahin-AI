import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import type { DashboardFilters } from '../../../../../../shared/services/dashboard-filters.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kpi-card',
  standalone: true,
  imports: [WidgetShellComponent],
  template: `
    <app-widget-shell [title]="title" [subtitle]="subtitle" [canExport]="false" [canPin]="false">
      <div class="flex flex-col gap-1">
        <div class="text-2xl font-bold">{{ value }}</div>
        @if (badge) {
          <span class="text-xs text-[var(--primary)]">{{ badge }}</span>
        }
        @if (deltaText) {
          <span class="text-xs text-[var(--text-1)]">{{ deltaText }}</span>
        }
        @if (status) {
          <span class="text-xs" [class]="statusClass">{{ status }}</span>
        }
      </div>
    </app-widget-shell>
  `,
})
export class KpiCardComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input({ required: true }) value!: string | number;
  @Input() deltaText?: string;
  @Input() status?: 'Good' | 'Watch' | 'Critical';
  @Input() badge?: string;
  /** Shared dashboard filter context (from DashboardFiltersService). When provided, widget is driven by the same filters as other widgets. */
  @Input() filterContext?: DashboardFilters | null;

  get statusClass(): string {
    switch (this.status) {
      case 'Good': return 'text-[var(--success)]';
      case 'Watch': return 'text-[var(--warning)]';
      case 'Critical': return 'text-[var(--danger)]';
      default: return 'text-[var(--text-1)]';
    }
  }
}
