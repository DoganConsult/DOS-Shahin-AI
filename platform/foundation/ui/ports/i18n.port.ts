/**
 * Foundation i18n port.
 *
 * Foundation pages need direction() and tr() but must not reach into the
 * product-layer I18nService at `@app/core/services/ui-infra/i18n.service`.
 *
 * The host product provides the real implementation at bootstrap:
 *   { provide: FOUNDATION_I18N, useExisting: I18nService }
 *
 * If no provider is registered (e.g. in unit tests), the NoopFoundationI18n
 * fallback is used automatically.
 */
import { InjectionToken, Signal, signal } from '@angular/core';

export type FoundationLang = 'ar' | 'en';
export type FoundationDir  = 'rtl' | 'ltr';

export interface FoundationI18n {
  /** Current language signal. */
  currentLang: Signal<FoundationLang>;
  /** Computed direction signal ('rtl' | 'ltr'). */
  direction: Signal<FoundationDir>;
  /** Alias for direction (boolean signal). */
  isArabic: Signal<boolean>;
  /** isAr is an alias for isArabic. */
  isAr: Signal<boolean>;
  /** Translate key with English fallback. */
  tr(key: string, fallback?: string | Record<string, unknown>): string;
  /** Alias for tr() — many legacy pages call i18n.t(). Second arg may be fallback or params. */
  t(key: string, fallback?: string | Record<string, unknown>): string;
  /** Alias for tr() — some legacy pages call i18n.translate(). */
  translate(key: string, fallback?: string | Record<string, unknown>): string;
  /** Pick best translation from a row that carries name/name_en/name_ar/labelEn/labelAr fields. */
  pbt(row: Record<string, unknown> | null | undefined, fallback?: string): string;
}

export const FOUNDATION_I18N = new InjectionToken<FoundationI18n>('FoundationI18n');

/** Used when the host has not provided a real I18nService. Defaults to Arabic (RTL). */
export class NoopFoundationI18n implements FoundationI18n {
  readonly currentLang = signal<FoundationLang>('ar');
  readonly direction   = signal<FoundationDir>('rtl');
  readonly isArabic    = signal(true);
  readonly isAr        = this.isArabic;

  tr(_key: string, fallback?: string | Record<string, unknown>): string {
    return typeof fallback === 'string' ? fallback : '';
  }
  t(key: string, fallback?: string | Record<string, unknown>): string {
    return this.tr(key, fallback);
  }
  translate(key: string, fallback?: string | Record<string, unknown>): string {
    return this.tr(key, fallback);
  }
  pbt(row: Record<string, unknown> | null | undefined, fallback = ''): string {
    if (!row) return fallback;
    const pick = (k: string) => (typeof row[k] === 'string' ? (row[k] as string) : '');
    return pick('name_en') || pick('nameEn') || pick('labelEn') || pick('label')
      || pick('name_ar') || pick('nameAr') || pick('labelAr') || pick('name') || fallback;
  }
}
