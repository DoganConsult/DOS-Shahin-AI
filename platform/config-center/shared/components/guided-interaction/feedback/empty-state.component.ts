/**
 * Canonical Empty State Component
 * 
 * This is the primary empty state component for pages, lists, and filtered views.
 * Also supports error states via variant="error".
 * 
 * @see STATE_PATTERNS.md for state pattern usage policy
 * 
 * Usage:
 * ```typescript
 * <app-empty-state
 *   [variant]="'default'"
 *   [title]="'No items yet'"
 *   [description]="'Get started by creating your first item'"
 *   [actionLabel]="'Create Item'"
 *   (action)="onCreate()" />
 * ```
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { IconComponent } from '../icon.component';

export type EmptyStateVariant = 'default' | 'error' | 'search' | 'success' | 'locked' | 'info';

const VARIANT_ICONS: Record<EmptyStateVariant, string> = {
  default: 'inbox',
  error: 'exclamation-circle',
  search: 'search',
  success: 'check-circle',
  locked: 'lock',
  info: 'info-circle',
};

const VARIANT_COLORS: Record<EmptyStateVariant, string> = {
  default: 'var(--text-muted)',
  error: 'var(--error)',
  search: 'var(--text-muted)',
  success: 'var(--success)',
  locked: 'var(--text-muted)',
  info: 'var(--cds-support-info)',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-empty-state',
    imports: [CommonModule, IconComponent],
    template: `
    <div class="empty-state" role="status" [attr.dir]="resolvedDir">
      <div class="empty-icon-wrap" [style.color]="iconColor">
        <app-icon [name]="resolvedIconName()" type="direct" size="xl" />
      </div>
      <h3 class="empty-title">{{ resolvedTitle }}</h3>
      <p class="empty-desc" *ngIf="description">{{ description }}</p>
      <button *ngIf="actionLabel" class="empty-action-btn" (click)="action.emit()">
        <app-icon name="plus" type="action" size="sm" />
        <span>{{ actionLabel }}</span>
      </button>
      <ng-content></ng-content>
    </div>
  `,
    styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--cds-layout-04) var(--cds-layout-03);
      text-align: center;
      animation: emptyFadeIn var(--cds-duration-moderate-02) var(--cds-easing-standard);
    }
    @keyframes emptyFadeIn {
      from { opacity: 0; transform: translateY(var(--cds-spacing-03)); }
      to { opacity: 1; transform: translateY(0); }
    }

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--cds-spacing-10);
      height: var(--cds-spacing-10);
      border-radius: var(--radius-pill);
      background: var(--cds-layer-01);
      border: var(--shell-border-width) solid var(--shell-card-border);
      margin-bottom: var(--cds-spacing-05);
      font-size: 0;
    }
    .empty-icon-wrap i {
      font-size: var(--font-size-3xl);
      color: inherit;
    }

    .empty-title {
      margin: 0 0 var(--cds-spacing-03);
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--text-heading);
    }

    .empty-desc {
      margin: 0 0 var(--cds-spacing-06);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      max-width: var(--shell-empty-desc-max-width);
      line-height: 1.6;
    }

    .empty-action-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-03) var(--cds-spacing-06);
      border: none;
      border-radius: var(--radius);
      background: var(--cds-button-primary);
      color: var(--shell-on-primary);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 600;
      transition: background var(--cds-duration-fast-02) var(--cds-easing-standard);
    }
    .empty-action-btn:hover { background: var(--cds-button-primary-hover); }
  `]
})
export class EmptyStateComponent {
  private i18n = inject(I18nService);

  @Input() icon = '';
  @Input() variant: EmptyStateVariant = 'default';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() dir: 'ltr' | 'rtl' | '' = '';
  @Output() action = new EventEmitter<void>();

  /** Resolved title: uses input or falls back to bilingual default. */
  get resolvedTitle(): string {
    if (this.title) return this.title;
    return this.i18n.translate('common.noData') || 'No items yet';
  }

  /** Resolved dir: uses input or falls back to current language direction. */
  get resolvedDir(): 'ltr' | 'rtl' {
    return (this.dir as 'ltr' | 'rtl') || this.i18n.direction();
  }

  resolvedIconName(): string {
    return this.icon || VARIANT_ICONS[this.variant];
  }

  get iconColor(): string {
    return VARIANT_COLORS[this.variant];
  }
}
