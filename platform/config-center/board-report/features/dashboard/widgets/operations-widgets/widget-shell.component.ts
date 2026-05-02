/**
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) This component is deprecated. Use the canonical WidgetShellComponent from:
 * @app/dashboard/shared/widget-shell/widget-shell.component
 * 
 * This file is kept temporarily for backward compatibility during migration.
 * All widgets have been migrated to use the canonical implementation.
 * This file will be removed in the next major version.
 */
import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widget-shell',
    imports: [CommonModule, AppDatePipe],
    template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="font-medium">{{ title }}</div>
        <div class="text-xs text-gray-500" *ngIf="fetchedAt">
          {{ fetchedAt | appDate:'short' }}
        </div>
      </div>

      <ng-content></ng-content>
    </div>
  `
})
export class WidgetShellComponent {
  @Input() title = '';
  @Input() fetchedAt: string | null = null;
}
