import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgFor, DecimalPipe } from '@angular/common';
import type { DashboardFilters } from '../../dashboard-filters.service';

export interface AiActionRow {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
  traceLinks: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-insights',
  standalone: true,
  imports: [WidgetShellComponent, NgFor, DecimalPipe],
  template: `
    <app-widget-shell title="AI Insights" subtitle="Recommended actions" [canExport]="false">
      <div class="space-y-3">
        @for (a of actions; track a.id) {
          <div class="rounded-xl bg-[var(--bg-2)] border border-[var(--border)] p-3">
            <div class="text-sm font-medium">{{ a.title }}</div>
            <div class="text-xs text-[var(--text-1)] mt-1">{{ a.rationale }}</div>
            <div class="flex items-center justify-between mt-2 gap-2">
              <span class="text-xs text-[var(--text-1)]">Confidence: {{ a.confidence | appNumber:'decimal':'1.0-0' }}</span>
              <div class="flex gap-2">
                <button type="button" (click)="apply.emit(a.id)" class="px-2 py-1 text-xs rounded-lg bg-[var(--success)] text-white">Apply</button>
                <button type="button" (click)="dismiss.emit(a.id)" class="px-2 py-1 text-xs rounded-lg bg-[var(--bg-1)] border border-[var(--border)]">Dismiss</button>
              </div>
            </div>
          </div>
        }
        @empty {
          <p class="text-sm text-[var(--text-1)]">No insights right now.</p>
        }
      </div>
    </app-widget-shell>
  `,
})
export class AiInsightsComponent {
  @Input() actions: AiActionRow[] = [];
  /** Shared dashboard filter context. */
  @Input() filterContext?: DashboardFilters | null;
  @Output() apply = new EventEmitter<string>();
  @Output() dismiss = new EventEmitter<string>();
}
