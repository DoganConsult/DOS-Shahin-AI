import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ShellPreferencesService } from '../../platform/shell/shell-preferences.service';

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export type Lang = 'ar' | 'en';
export type Dir = 'rtl' | 'ltr';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * I18nService — translation + locale-derived formatters.
 *
 * Direction & language are NOT owned here. The single source of truth is
 * `ShellPreferencesService` (see `<html dir/lang>` writer). I18n consumes
 * that signal so language toggles flow through one path, no race.
 *
 * Default locale is `en` (LTR) per the Workspace doctrine: Arabic is
 * applied only when the persisted preference or tenant/user locale
 * explicitly says Arabic.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private prefs = inject(ShellPreferencesService);

  private readonly _translations = signal<TranslationTree>({});
  private readonly _translationsVersion = signal(0);

  private readonly _lang = computed<Lang>(() => this.prefs.language());
  readonly currentLang = this._lang;
  readonly isArabic = computed(() => this._lang() === 'ar');
  readonly isAr = this.isArabic;
  readonly isRtl = this.isArabic;
  readonly dir = this.prefs.dir;
  readonly direction = this.dir;
  readonly ready = computed(() => this._translationsVersion() > 0);

  constructor() {
    this.loadTranslations(this._lang());
    effect(() => {
      const next = this._lang();
      void this.loadTranslations(next);
    });
  }

  async loadTranslations(lang: Lang): Promise<void> {
    try {
      const payload = await firstValueFrom(
        this.http.get<TranslationTree | null>(`/assets/i18n/${lang}.json`)
      );
      this._translations.set(payload && typeof payload === 'object' ? payload : {});
    } catch {
      this._translations.set({});
    }
    this._translationsVersion.update(v => v + 1);
  }

  switchLanguage(lang: Lang): void {
    // Single source of truth: writes flow through ShellPreferencesService.
    // The reactive `_lang` computed and the effect in the constructor will
    // re-fire `loadTranslations(lang)` automatically.
    this.prefs.setLanguage(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    this._translationsVersion();
    const resolved = this.resolveTranslation(key);
    let text = typeof resolved === 'string' ? resolved : this.humanizeMissingKey(key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  private humanizeMissingKey(key: string): string {
    if (!key || typeof key !== 'string') return '';
    if (!key.includes('.') && !/[A-Z_-]/.test(key)) return key;
    const last = key.split('.').filter(Boolean).pop() ?? key;
    const spaced = last
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .trim();
    if (!spaced) return key;
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  private resolveTranslation(key: string): string | undefined {
    const parts = key.split('.');
    let current: string | TranslationTree | undefined = this._translations();

    for (const part of parts) {
      if (!current || typeof current !== 'object' || Array.isArray(current) || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }

  tr(key: string, fallback?: string, params?: Record<string, string | number>): string {
    this._translationsVersion();
    const resolved = this.resolveTranslation(key);
    let text = typeof resolved === 'string' ? resolved : (fallback ?? this.humanizeMissingKey(key));
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  localize(en: string, ar?: string | Record<string, string | number>): string {
    if (typeof ar === 'string') {
      return this._lang() === 'ar' ? ar : en;
    }
    return this.translate(en, ar);
  }

  pbt<T extends Record<string, unknown>>(obj: T, fieldBase: string): string {
    const lang = this._lang();
    const enKey = `${fieldBase}_en` as keyof T;
    const arKey = `${fieldBase}_ar` as keyof T;
    const enField = `${fieldBase}En` as keyof T;
    const arField = `${fieldBase}Ar` as keyof T;
    if (lang === 'ar') {
      return (obj[arKey] || obj[arField] || obj[enKey] || obj[enField] || '') as string;
    }
    return (obj[enKey] || obj[enField] || obj[arKey] || obj[arField] || '') as string;
  }

  getBilingualField<T extends Record<string, unknown>>(obj: T, fieldBase: string): string {
    return this.pbt(obj, fieldBase);
  }

  formatNumber(value: number): string {
    if (this._lang() === 'ar') {
      return String(value).replace(/\d/g, d => AR_DIGITS[parseInt(d)]);
    }
    return String(value);
  }

  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = this._lang() === 'ar' ? 'ar-SA' : 'en-US';
    return d.toLocaleDateString(locale, options || { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
