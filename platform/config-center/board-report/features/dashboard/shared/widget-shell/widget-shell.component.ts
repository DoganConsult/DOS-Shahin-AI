import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export type WidgetState = 'ready' | 'loading' | 'empty' | 'error';

/**
 * Canonical Widget Shell Component
 * 
 * This is the single source of truth for widget shells across the platform.
 * Supports:
 * - State management (ready, loading, empty, error)
 * - Actions (refresh, export, pin)
 * - i18n support
 * - Backward compatibility with fetchedAt input
 * 
 * @see STATE_PATTERNS.md for widget state management policy
 * 
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Do not create new widget-shell implementations. Use this component.
 */
@Component({
    selector: 'app-widget-shell',
    imports: [AppDatePipe],
    templateUrl: './widget-shell.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetShellComponent {
  i18n = inject(I18nService);

  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;

  @Input() state: WidgetState = 'ready';
  @Input() lastUpdatedUtc?: string;
  
  /**
   * Backward compatibility: maps to lastUpdatedUtc
   * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use lastUpdatedUtc instead
   */
  @Input() fetchedAt?: string | null;

  @Input() canExport = true;
  @Input() canRefresh = true;
  @Input() canPin = true;

  @Output() refresh = new EventEmitter<void>();
  @Output() export = new EventEmitter<'png' | 'csv' | 'pdf'>();
  @Output() pin = new EventEmitter<void>();

  /**
   * Get the display timestamp, preferring lastUpdatedUtc over fetchedAt for backward compatibility
   */
  get displayTimestamp(): string | undefined {
    return this.lastUpdatedUtc || (this.fetchedAt || undefined);
  }

  onAction(value: string): void {
    if (value === 'refresh') this.refresh.emit();
    else if (value === 'export') this.export.emit('png');
    else if (value === 'pin') this.pin.emit();
  }
}
