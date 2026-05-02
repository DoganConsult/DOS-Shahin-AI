// DosLanguageSwitcher — canonical language toggle for product UIs.
//
// Lifted from `platform/config-center/shared/layout/header/language-switcher.component.ts`
// during the UI-OS canonicalization (2026-05-01). Selector renamed
// `app-language-switcher` → `dos-language-switcher`. Product-specific
// I18nService dependency exposed via the `DOS_LANGUAGE_SWITCHER_I18N`
// injection token so the component is product-neutral — Shahin (or any
// other product) provides its concrete I18nService implementation at
// bootstrap.
//
// Variants: 'dark' (overlay buttons on dark backgrounds) and 'light'
// (auth/public pages with light backgrounds). Styling references
// @dos/design-tokens vars (--radius, --font-size-*, --text-heading) so
// no product-local styling bleed.

import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Minimal I18n contract DosLanguageSwitcher requires from the host product.
 * Products provide their concrete I18nService implementation via this token.
 */
export interface DosLanguageSwitcherI18n {
  currentLang(): 'ar' | 'en' | string;
  switchLanguage(lang: 'ar' | 'en' | string): void;
  translate(key: string): string;
}

export const DOS_LANGUAGE_SWITCHER_I18N = new InjectionToken<DosLanguageSwitcherI18n>(
  'DOS_LANGUAGE_SWITCHER_I18N',
);

@Component({
  selector: 'dos-language-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <button
      class="dos-lang"
      [class.dos-lang--light]="variant === 'light'"
      (click)="toggle()"
      [attr.aria-label]="i18n.translate('common.language')"
      [title]="i18n.translate('languageSwitcher.switchTooltip')">
      <i class="pi pi-globe"></i>
      <span class="dos-lang__code">{{ i18n.translate('languageSwitcher.langCode') }}</span>
    </button>
  `,
  styles: [`
    .dos-lang {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.16);
      border: 1px solid rgba(255,255,255,0.32);
      color: rgba(255,255,255,0.96);
      padding: 6px 12px;
      border-radius: var(--radius, 6px);
      cursor: pointer;
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      transition: background-color .2s, border-color .2s, color .2s;
      font-family: inherit;
      line-height: 1;
    }
    .dos-lang:hover {
      background: rgba(255,255,255,0.24);
      border-color: rgba(255,255,255,0.45);
    }
    .dos-lang .pi-globe { font-size: var(--font-size-base, 14px); }
    .dos-lang__code { font-size: var(--font-size-sm, 13px); letter-spacing: 0.02em; }

    .dos-lang--light {
      background: rgba(0,0,0,0.04);
      border-color: rgba(0,0,0,0.12);
      color: #475569;
    }
    .dos-lang--light:hover {
      background: rgba(0,0,0,0.08);
      border-color: rgba(0,0,0,0.2);
      color: var(--text-heading, #0f172a);
    }
  `],
})
export class DosLanguageSwitcherComponent {
  @Input() variant: 'dark' | 'light' = 'dark';
  protected readonly i18n = inject(DOS_LANGUAGE_SWITCHER_I18N);

  toggle(): void {
    this.i18n.switchLanguage(this.i18n.currentLang() === 'ar' ? 'en' : 'ar');
  }
}
