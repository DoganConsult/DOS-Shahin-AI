/**
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) This component is deprecated. Use the canonical WidgetShellComponent from:
 * @app/dashboard/shared/widget-shell/widget-shell.component
 * 
 * This file is kept temporarily for backward compatibility during migration.
 * All report pages have been migrated to use the canonical implementation.
 * This file will be removed in the next major version.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  selector: 'app-widget-shell-deprecated',
  standalone: true,
  imports: [NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="widget-shell rounded-xl border border-[var(--border-1,var(--border-subtle))] bg-[var(--surface-card,#fff)] shadow-sm overflow-hidden flex flex-col h-full">
      <header class="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h3 class="text-sm font-semibold text-[var(--text-1,#111)]">{{ title }}</h3>
          <p *ngIf="subtitle" class="text-xs text-[var(--text-2,#666)] mt-0.5">{{ subtitle }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button [attr.aria-label]="i18n.translate('common.refresh')" *ngIf="canRefresh" (click)="refresh.emit()"
            class="p-1 rounded hover:bg-[var(--surface-2,var(--surface-ice))] transition-colors"
            [title]="i18n.translate('common.refresh')">
            <i class="pi pi-refresh text-xs text-[var(--text-2,#666)]"></i>
          </button>
        </div>
      </header>

      <div class="flex-1 px-4 pb-3">
        <ng-container [ngSwitch]="state">
          <div *ngSwitchCase="'loading'" class="h-full flex items-center justify-center">
            <div class="animate-pulse text-sm text-[var(--text-2)]">{{ i18n.translate('common.loading') }}</div>
          </div>
          <div *ngSwitchCase="'error'" class="h-full flex items-center justify-center text-red-500 text-sm">
            {{ i18n.translate('common.failedToLoad') }}
          </div>
          <div *ngSwitchCase="'empty'" class="h-full flex items-center justify-center text-[var(--text-2)] text-sm">
            {{ i18n.translate('common.noDataAvailable') }}
          </div>
          <ng-container *ngSwitchDefault>
            <ng-content></ng-content>
          </ng-container>
        </ng-container>
      </div>
    </div>
  `,
})
export class WidgetShellComponent {
  i18n = inject(I18nService);
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';
  @Input() canRefresh = false;
  @Output() refresh = new EventEmitter<void>();
}
