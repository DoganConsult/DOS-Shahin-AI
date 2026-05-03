/**
 * ShellPreferencesService — §B.9 items #7 (language) and #8 (theme).
 *
 * Two user-scoped preferences persisted in localStorage (with SSR-safe
 * fallbacks) and reflected on the document so Carbon + RTL CSS layers
 * react automatically:
 *
 *   language ('en' | 'ar')
 *     → <html lang="..">
 *     → <html dir="ltr|rtl">  (feeds ShellHostComponent.sidebarDir())
 *
 *   theme ('g10' | 'g100')  (light / dark Carbon themes)
 *     → <html data-carbon-theme="g10|g100">
 *
 * No Carbon import needed — theme swap is a data-attribute hook that the
 * `@carbon/styles` cascade keys against. ShellHost exposes two handlers
 * (`toggleLanguage`, `toggleTheme`) that call the setters here.
 */
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type DosShellLanguage = 'en' | 'ar';
export type DosShellTheme    = 'g10' | 'g100';

const LS_KEY_LANG  = 'dos.shell.language';
const LS_KEY_THEME = 'dos.shell.theme';

@Injectable({ providedIn: 'root' })
export class ShellPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);

  private readonly _language = signal<DosShellLanguage>(this.readStoredLanguage());
  private readonly _theme    = signal<DosShellTheme>(this.readStoredTheme());

  readonly language = this._language.asReadonly();
  readonly theme    = this._theme.asReadonly();
  readonly dir      = computed<'ltr' | 'rtl'>(() => this._language() === 'ar' ? 'rtl' : 'ltr');
  readonly isDark   = computed(() => this._theme() === 'g100');

  /** Apply language + theme to <html> whenever either signal flips. */
  private readonly _syncDomEffect = effect(() => {
    const lang = this._language();
    const theme = this._theme();
    if (!this.isBrowser) return;
    try {
      const html = document.documentElement;
      html.setAttribute('lang', lang);
      html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      html.setAttribute('data-carbon-theme', theme);
    } catch { /* no-op */ }
  });

  setLanguage(lang: DosShellLanguage): void {
    if (this._language() === lang) return;
    this._language.set(lang);
    this.persist(LS_KEY_LANG, lang);
  }

  setTheme(theme: DosShellTheme): void {
    if (this._theme() === theme) return;
    this._theme.set(theme);
    this.persist(LS_KEY_THEME, theme);
  }

  toggleLanguage(): void {
    this.setLanguage(this._language() === 'ar' ? 'en' : 'ar');
  }

  toggleTheme(): void {
    this.setTheme(this._theme() === 'g100' ? 'g10' : 'g100');
  }

  private readStoredLanguage(): DosShellLanguage {
    if (!this.isBrowser) return 'en';
    try {
      const raw = window.localStorage?.getItem(LS_KEY_LANG);
      if (raw === 'ar' || raw === 'en') return raw;
      const htmlLang = document.documentElement.getAttribute('lang') || '';
      if (htmlLang.toLowerCase().startsWith('ar')) return 'ar';
    } catch { /* no-op */ }
    return 'en';
  }

  private readStoredTheme(): DosShellTheme {
    if (!this.isBrowser) return 'g10';
    try {
      const raw = window.localStorage?.getItem(LS_KEY_THEME);
      if (raw === 'g10' || raw === 'g100') return raw;
      const attr = document.documentElement.getAttribute('data-carbon-theme');
      if (attr === 'g10' || attr === 'g100') return attr;
      if (typeof window.matchMedia === 'function'
          && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'g100';
    } catch { /* no-op */ }
    return 'g10';
  }

  private persist(key: string, value: string): void {
    if (!this.isBrowser) return;
    try { window.localStorage?.setItem(key, value); } catch { /* no-op */ }
  }
}
