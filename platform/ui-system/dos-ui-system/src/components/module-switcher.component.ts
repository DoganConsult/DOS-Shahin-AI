import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosModuleSwitcher — platform-tier UI primitive.
 *
 * Renders a compact horizontal/vertical strip of module entries. The set
 * of modules and the active selection are inputs; emitting `select` is
 * the only side effect. **Zero hardcoded modules**, no PrimeNG, no
 * product-specific I18n service.
 *
 * Lifted from `platform/config-center/shared/layout/header/module-switcher.component.ts`
 * (which had GRC/Qiyas baked in). That component should now wrap this one
 * with its own static module list + i18n adapter; products can also
 * consume this directly.
 *
 * Locale: optional `localize` input function `(en, ar?) => string` so
 * downstream products inject their I18nService without coupling. When
 * omitted the EN label is rendered.
 *
 * Density variants: `compact` (icon-only, 32px), `comfortable` (default,
 * icon + label), `expanded` (icon + label + active dot).
 */
export interface DosModuleEntry {
  id: string;
  labelEn: string;
  labelAr?: string;
  icon?: string;        // icon class name (lucide / pi / mdi). Caller decides icon system.
  rootRoute?: string;
  color?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'dos-module-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (visibleModules().length > 1) {
      <div class="dos-module-switcher dos-module-switcher--{{ density }}"
           role="tablist"
           [attr.aria-label]="ariaLabel"
           [attr.dir]="dir">
        @for (mod of visibleModules(); track mod.id) {
          <button
            type="button"
            class="dos-module-switcher__tab"
            [class.is-active]="mod.id === activeId"
            [class.is-disabled]="!!mod.disabled"
            [disabled]="!!mod.disabled"
            role="tab"
            [attr.aria-selected]="mod.id === activeId"
            [attr.title]="label(mod)"
            [style.--dos-mod-color]="mod.color || ''"
            (click)="onSelect(mod)">
            @if (mod.icon) {
              <i class="dos-module-switcher__icon {{ mod.icon }}" aria-hidden="true"></i>
            }
            @if (showLabel()) {
              <span class="dos-module-switcher__label">{{ label(mod) }}</span>
            }
            @if (mod.badge) {
              <span class="dos-module-switcher__badge">{{ mod.badge }}</span>
            }
            @if (mod.id === activeId) {
              <span class="dos-module-switcher__dot" aria-hidden="true"></span>
            }
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .dos-module-switcher {
      display: flex; gap: 4px; padding: 6px;
      background: var(--dos-color-surface-muted, #f0f4f8);
      border-radius: var(--dos-radius-md, 8px);
    }
    .dos-module-switcher--compact .dos-module-switcher__label { display: none; }
    .dos-module-switcher--expanded { flex-direction: column; }
    .dos-module-switcher__tab {
      position: relative;
      display: inline-flex; align-items: center; gap: 6px;
      flex: 0 1 auto;
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: var(--dos-radius-sm, 6px);
      background: transparent;
      color: var(--dos-color-text, #111827);
      font: inherit;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    }
    .dos-module-switcher__tab:hover:not(.is-disabled) {
      background: var(--dos-color-surface, #fff);
      border-color: var(--dos-color-border, #e5e7eb);
    }
    .dos-module-switcher__tab.is-active {
      background: var(--dos-color-surface, #fff);
      border-color: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
      color: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
      font-weight: 600;
    }
    .dos-module-switcher__tab.is-disabled {
      opacity: 0.4; cursor: not-allowed;
    }
    .dos-module-switcher__tab:focus-visible {
      outline: 2px solid var(--dos-color-focus, #2563eb);
      outline-offset: 2px;
    }
    .dos-module-switcher__icon { font-size: 1rem; line-height: 1; }
    .dos-module-switcher__label {
      font-size: var(--dos-font-size-sm, 0.85rem);
      white-space: nowrap;
    }
    .dos-module-switcher__badge {
      display: inline-flex;
      align-items: center;
      padding: 0 6px;
      height: 16px;
      border-radius: 8px;
      font-size: 0.7rem;
      background: var(--dos-color-accent-bg, #fffbeb);
      color: var(--dos-color-accent-text, #92400e);
    }
    .dos-module-switcher__dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
    }
    [dir="rtl"] .dos-module-switcher { direction: rtl; }
  `],
})
export class DosModuleSwitcherComponent {
  /** Module catalog. Caller filters by entitlement / readiness BEFORE handing to this component. */
  @Input() modules: ReadonlyArray<DosModuleEntry> = [];

  /** Currently-selected module id. */
  @Input() activeId: string | null = null;

  /** Display density. */
  @Input() density: 'compact' | 'comfortable' | 'expanded' = 'comfortable';

  /** Locale code; the component reads `labelAr` only when this starts with 'ar'. */
  @Input() locale: string = 'en';

  /** Document direction; usually inherited from `<html dir>`. */
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  /** Optional aria label override. */
  @Input() ariaLabel: string = 'Switch module';

  /** Optional localize override `(en, ar?) => string`. When provided takes precedence over `locale`. */
  @Input() localize: ((en: string, ar?: string) => string) | null = null;

  /** Emits the chosen module entry on click (after disabled-check). */
  @Output() select = new EventEmitter<DosModuleEntry>();

  readonly visibleModules = computed(() => this.modules.filter(m => !!m && !!m.id));

  readonly showLabel = (): boolean => this.density !== 'compact';

  label(m: DosModuleEntry): string {
    if (this.localize) return this.localize(m.labelEn, m.labelAr);
    return (this.locale.startsWith('ar') && m.labelAr) ? m.labelAr : m.labelEn;
  }

  onSelect(m: DosModuleEntry): void {
    if (m.disabled) return;
    if (m.id === this.activeId) return;
    this.select.emit(m);
  }
}
