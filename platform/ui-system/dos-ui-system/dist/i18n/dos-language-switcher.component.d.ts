import { InjectionToken } from '@angular/core';
/**
 * Minimal I18n contract DosLanguageSwitcher requires from the host product.
 * Products provide their concrete I18nService implementation via this token.
 */
export interface DosLanguageSwitcherI18n {
    currentLang(): 'ar' | 'en' | string;
    switchLanguage(lang: 'ar' | 'en' | string): void;
    translate(key: string): string;
}
export declare const DOS_LANGUAGE_SWITCHER_I18N: InjectionToken<DosLanguageSwitcherI18n>;
export declare class DosLanguageSwitcherComponent {
    variant: 'dark' | 'light';
    protected readonly i18n: DosLanguageSwitcherI18n;
    toggle(): void;
}
