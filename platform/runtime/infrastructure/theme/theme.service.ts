import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '@env/environment';

export type ThemeName = 'light' | 'dark' | 'system';
export type UiDensity = 'compact' | 'comfortable' | 'spacious';

interface WorkspaceThemeConfig {
  theme: ThemeName;
  accentColor: string;
  fontFamily: string;
  density: UiDensity;
  animationsEnabled: boolean;
  logoOverride: string | null;
  faviconUrl: string | null;
  appTitle: string | null;
  toastPosition: string;
  sidebarCollapsed: boolean;
  sidebarWidth: string;
}

const DEFAULTS: WorkspaceThemeConfig = {
  theme: 'system',
  accentColor: '',
  fontFamily: '',
  density: 'comfortable',
  animationsEnabled: true,
  logoOverride: null,
  faviconUrl: null,
  appTitle: null,
  toastPosition: 'top-right',
  sidebarCollapsed: false,
  sidebarWidth: '280px',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private http = inject(HttpClient);

  private readonly _theme = signal<ThemeName>(DEFAULTS.theme);
  private readonly _accentColor = signal(DEFAULTS.accentColor);
  private readonly _fontFamily = signal(DEFAULTS.fontFamily);
  private readonly _density = signal<UiDensity>(DEFAULTS.density);
  private readonly _animationsEnabled = signal(DEFAULTS.animationsEnabled);
  private readonly _logoOverride = signal<string | null>(DEFAULTS.logoOverride);
  private readonly _faviconUrl = signal<string | null>(DEFAULTS.faviconUrl);
  private readonly _appTitle = signal<string | null>(DEFAULTS.appTitle);
  private readonly _toastPosition = signal(DEFAULTS.toastPosition);
  private readonly _sidebarCollapsed = signal(DEFAULTS.sidebarCollapsed);
  private readonly _sidebarWidth = signal(DEFAULTS.sidebarWidth);
  private readonly _loaded = signal(false);

  readonly theme = computed(() => this._theme());
  readonly accentColor = this._accentColor.asReadonly();
  readonly fontFamily = this._fontFamily.asReadonly();
  readonly density = this._density.asReadonly();
  readonly animationsEnabled = this._animationsEnabled.asReadonly();
  readonly logoOverride = this._logoOverride.asReadonly();
  readonly faviconUrl = this._faviconUrl.asReadonly();
  readonly appTitle = this._appTitle.asReadonly();
  readonly toastPosition = this._toastPosition.asReadonly();
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly sidebarWidth = this._sidebarWidth.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  readonly effectiveTheme = computed(() => {
    const t = this._theme();
    if (t !== 'system') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  loadFromGateway() {
    return this.http.get<{ config: Record<string, unknown> }>(
      `${environment.apiUrl}/config-center/gateway/workspace-config`,
      { withCredentials: true },
    ).pipe(
      tap(res => this.applyRemoteConfig(res.config)),
      catchError(() => {
        this._loaded.set(true);
        return of(null);
      }),
    );
  }

  private applyRemoteConfig(config: Record<string, unknown>): void {
    if (config['theme'] && ['light', 'dark', 'system'].includes(config['theme'] as string)) {
      this._theme.set(config['theme'] as ThemeName);
    }
    if (config['accent_color']) this._accentColor.set(String(config['accent_color']));
    if (config['font_family']) this._fontFamily.set(String(config['font_family']));
    if (config['density'] && ['compact', 'comfortable', 'spacious'].includes(config['density'] as string)) {
      this._density.set(config['density'] as UiDensity);
    }
    if (config['animations_enabled'] !== undefined) this._animationsEnabled.set(config['animations_enabled'] === true || config['animations_enabled'] === 'true');
    if (config['logo_override']) this._logoOverride.set(String(config['logo_override']));
    if (config['favicon_url']) this._faviconUrl.set(String(config['favicon_url']));
    if (config['app_title']) this._appTitle.set(String(config['app_title']));
    if (config['toast_position']) this._toastPosition.set(String(config['toast_position']));
    if (config['sidebar_collapsed'] !== undefined) this._sidebarCollapsed.set(config['sidebar_collapsed'] === true || config['sidebar_collapsed'] === 'true');
    if (config['sidebar_width']) this._sidebarWidth.set(String(config['sidebar_width']));

    this.applyToDom();
    this._loaded.set(true);
  }

  setTheme(theme: ThemeName): void {
    this._theme.set(theme);
    this.applyToDom();
  }

  setDensity(density: UiDensity): void {
    this._density.set(density);
    this.applyToDom();
  }

  setAccentColor(color: string): void {
    this._accentColor.set(color);
    this.applyToDom();
  }

  private applyToDom(): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.effectiveTheme());
    root.setAttribute('data-density', this._density());

    if (this._accentColor()) {
      root.style.setProperty('--dogan-accent', this._accentColor());
    }
    if (this._fontFamily()) {
      root.style.setProperty('--dogan-font-family', this._fontFamily());
    }
    if (!this._animationsEnabled()) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    if (this._faviconUrl()) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = this._faviconUrl()!;
    }
    if (this._appTitle()) {
      document.title = this._appTitle()!;
    }
  }
}
