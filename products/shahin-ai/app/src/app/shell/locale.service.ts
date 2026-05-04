import { Injectable, signal } from '@angular/core';

export type SupportedLocale = 'en' | 'ar';

const STORAGE_KEY = 'shahin.locale';
const SUPPORTED: readonly SupportedLocale[] = ['en', 'ar'] as const;

function isSupported(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED as readonly string[]).includes(value);
}

/**
 * Workspace locale + page direction.
 *
 * Source of truth (B0): localStorage[shahin.locale].
 * Default: 'en' (matches products/shahin-ai/product.manifest.json#i18n.defaultLocale).
 *
 * When Foundation is wired (B2+), the initial locale should be hydrated
 * from `/api/tenants/me` → tenant.settings.locale and the user-prefs API,
 * with localStorage acting only as a same-session override.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly _locale = signal<SupportedLocale>(this.readInitial());
  readonly locale = this._locale.asReadonly();

  constructor() {
    this.applyToDocument(this._locale());
  }

  set(locale: SupportedLocale): void {
    if (!isSupported(locale) || locale === this._locale()) return;
    this._locale.set(locale);
    this.persist(locale);
    this.applyToDocument(locale);
  }

  toggle(): void {
    this.set(this._locale() === 'en' ? 'ar' : 'en');
  }

  private readInitial(): SupportedLocale {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = window.localStorage?.getItem(STORAGE_KEY);
      if (isSupported(stored)) return stored;
    } catch {
      // localStorage may be unavailable (private mode, sandbox); fall through.
    }
    return 'en';
  }

  private persist(locale: SupportedLocale): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem(STORAGE_KEY, locale);
    } catch {
      // best-effort
    }
  }

  private applyToDocument(locale: SupportedLocale): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.setAttribute('lang', locale);
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    // Item 4: Activate brand-overlay CSS tokens (dos-design-tokens/brand-overlays.css).
    // This applies --dos-color-brand-primary (#0f1f3d navy) and --dos-color-brand-accent
    // (#c9a14a gold) on :root via [data-brand='shahin-ai'] selector.
    if (!html.hasAttribute('data-brand')) {
      html.setAttribute('data-brand', 'shahin-ai');
    }
  }
}
