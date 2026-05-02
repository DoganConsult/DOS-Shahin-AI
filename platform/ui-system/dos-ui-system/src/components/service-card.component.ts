import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosIconComponent } from './icon.component';

/**
 * DosServiceCard — workspace tile for a module, quick-action, or service.
 *
 * Refined enterprise styling: generous padding, optional icon badge, hover
 * lift, primary CTA at the bottom. Class hierarchy is its own (no longer
 * borrows .dos-metric-card) so the visual contract is independent.
 *
 * Inputs:
 *   title       — primary label
 *   subtitle    — caption / category (e.g. module code)
 *   description — short body copy
 *   icon        — DosIcon name (optional). Renders an icon badge in the corner.
 *   tone        — visual tone of the icon badge ('brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral')
 *   ctaLabel    — primary button label
 *   ctaKind     — 'primary' (default) | 'ghost' (less-emphasized variant)
 *   disabled    — true to render disabled
 *   badge       — optional small text badge (e.g. "soon", "trial")
 *
 * Output:
 *   open — fires when the user activates the CTA
 */
@Component({
  selector: 'dos-service-card',
  standalone: true,
  imports: [CommonModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="dos-service-card"
      [class.dos-service-card--disabled]="disabled"
    >
      <header class="dos-service-card__header">
        @if (icon) {
          <span
            class="dos-service-card__icon-badge"
            [attr.data-tone]="tone"
            aria-hidden="true"
          >
            <dos-icon [name]="icon" [size]="20"></dos-icon>
          </span>
        }
        @if (badge) {
          <span class="dos-service-card__badge">{{ badge }}</span>
        }
      </header>

      <div class="dos-service-card__body">
        @if (subtitle) {
          <span class="dos-service-card__subtitle">{{ subtitle }}</span>
        }
        <strong class="dos-service-card__title">{{ title }}</strong>
        @if (description) {
          <p class="dos-service-card__description">{{ description }}</p>
        }
      </div>

      <footer class="dos-service-card__footer">
        <button
          type="button"
          class="dos-service-card__cta dos-service-card__cta--{{ ctaKind }}"
          [disabled]="disabled"
          (click)="open.emit()"
        >
          <span>{{ ctaLabel }}</span>
          <dos-icon name="arrow-right" [size]="14"></dos-icon>
        </button>
      </footer>
    </article>
  `,
  styles: [`
    .dos-service-card {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-4) var(--dos-space-5);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle, var(--dos-color-border));
      border-radius: var(--dos-radius-lg, 12px);
      box-shadow: var(--dos-shadow-xs, none);
      transition:
        transform var(--dos-transition-fast, 130ms ease-out),
        box-shadow var(--dos-transition-fast, 130ms ease-out),
        border-color var(--dos-transition-fast, 130ms ease-out);
      height: 100%;
    }
    .dos-service-card:hover {
      transform: translateY(-1px);
      box-shadow: var(--dos-shadow-sm);
      border-color: var(--dos-color-border, #e2e6ec);
    }
    .dos-service-card--disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    .dos-service-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--dos-space-2);
    }
    .dos-service-card__icon-badge {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--dos-radius-md, 8px);
      background: var(--dos-color-primary-soft);
      color: var(--dos-color-primary-strong);
    }
    .dos-service-card__icon-badge[data-tone='accent']  { background: var(--dos-color-accent-soft); color: var(--dos-color-accent-text); }
    .dos-service-card__icon-badge[data-tone='success'] { background: var(--dos-color-success-soft); color: var(--dos-color-success-strong); }
    .dos-service-card__icon-badge[data-tone='warning'] { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-strong); }
    .dos-service-card__icon-badge[data-tone='danger']  { background: var(--dos-color-danger-soft); color: var(--dos-color-danger-strong); }
    .dos-service-card__icon-badge[data-tone='neutral'] { background: var(--dos-color-surface-muted); color: var(--dos-color-text-muted); }
    .dos-service-card__badge {
      font-size: var(--dos-font-size-2xs, 0.6875rem);
      font-weight: var(--dos-font-weight-semibold);
      letter-spacing: var(--dos-letter-spacing-caps, 0.06em);
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-accent-bg);
      color: var(--dos-color-accent-text);
    }
    .dos-service-card__body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 auto;
    }
    .dos-service-card__subtitle {
      font-size: var(--dos-font-size-xs);
      color: var(--dos-color-text-subtle);
      letter-spacing: var(--dos-letter-spacing-caps, 0.06em);
      text-transform: uppercase;
      font-weight: var(--dos-font-weight-medium);
    }
    .dos-service-card__title {
      font-size: var(--dos-font-size-lg);
      line-height: 1.3;
      font-weight: var(--dos-font-weight-bold);
      letter-spacing: -0.005em;
      color: var(--dos-color-text-strong);
    }
    .dos-service-card__description {
      margin: 0;
      font-size: var(--dos-font-size-md);
      line-height: var(--dos-line-height-relaxed, 1.6);
      color: var(--dos-color-text-muted);
    }
    .dos-service-card__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .dos-service-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: var(--dos-font-size-md);
      font-weight: var(--dos-font-weight-semibold);
      border-radius: var(--dos-radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition:
        background var(--dos-transition-fast, 130ms ease-out),
        color var(--dos-transition-fast, 130ms ease-out),
        border-color var(--dos-transition-fast, 130ms ease-out);
    }
    .dos-service-card__cta--primary {
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
    }
    .dos-service-card__cta--primary:hover:not(:disabled) {
      background: var(--dos-color-primary-hover, var(--dos-color-primary-strong));
    }
    .dos-service-card__cta--ghost {
      background: transparent;
      color: var(--dos-color-text);
      border-color: var(--dos-color-border);
    }
    .dos-service-card__cta--ghost:hover:not(:disabled) {
      background: var(--dos-color-surface-muted);
    }
    .dos-service-card__cta:focus-visible {
      outline: none;
      box-shadow: var(--dos-shadow-focus);
    }
    .dos-service-card__cta:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `],
})
export class DosServiceCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() description = '';
  @Input() icon: string | null = null;
  @Input() tone: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral' = 'brand';
  @Input() ctaLabel = 'Open';
  @Input() ctaKind: 'primary' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() badge: string | null = null;
  @Output() open = new EventEmitter<void>();
}
