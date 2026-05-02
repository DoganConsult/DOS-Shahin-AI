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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, InjectionToken, Input, inject, } from '@angular/core';
import { CommonModule } from '@angular/common';
export const DOS_LANGUAGE_SWITCHER_I18N = new InjectionToken('DOS_LANGUAGE_SWITCHER_I18N');
let DosLanguageSwitcherComponent = class DosLanguageSwitcherComponent {
    variant = 'dark';
    i18n = inject(DOS_LANGUAGE_SWITCHER_I18N);
    toggle() {
        this.i18n.switchLanguage(this.i18n.currentLang() === 'ar' ? 'en' : 'ar');
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosLanguageSwitcherComponent.prototype, "variant", void 0);
DosLanguageSwitcherComponent = __decorate([
    Component({
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
], DosLanguageSwitcherComponent);
export { DosLanguageSwitcherComponent };
//# sourceMappingURL=dos-language-switcher.component.js.map