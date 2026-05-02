import { Component, inject, signal, OnInit, OnDestroy, NgZone, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { filter } from 'rxjs';
import { devError } from '../../../core/utils/dev-logger';
import { StorageService } from '@app/infrastructure';

const IDLE_THRESHOLD_MS = 60_000;
const AUTO_DISMISS_MS = 15_000;
const SHOWN_ROUTES_KEY = 'proactive_tip_shown_routes';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-proactive-assistance',
    imports: [CommonModule],
    template: `
    @if (suggestion()) {
      <div class="proactive-toast" [attr.dir]="i18n.direction()" role="alert">
        <div class="toast-header">
          <i class="pi pi-lightbulb"></i>
          <span class="toast-title">{{ i18n.translate('guidance.proactiveTip') }}</span>
          <button class="toast-close" (click)="dismiss()" [attr.aria-label]="i18n.translate('common.close')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <p class="toast-body">{{ suggestion() }}</p>
        <div class="toast-progress">
          <div class="toast-progress-bar"></div>
        </div>
      </div>
    }
  `,
    styles: [`
    .proactive-toast {
      position: fixed; bottom: 24px; inset-inline-start: 24px;
      background: var(--surface-card, #fff);
      border-radius: var(--radius-md); padding: 12px 14px;
      box-shadow: var(--shadow-md);
      max-width: 300px; z-index: var(--z-splash);
      animation: toastIn .25s ease-out;
      border-inline-start: 3px solid var(--primary, #4f46e5);
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .proactive-toast { display: none; }
    }
    .toast-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .toast-header .pi-lightbulb { color: var(--primary, #4f46e5); font-size: var(--font-size-sm); }
    .toast-title { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-heading, var(--text-heading)); flex: 1; }
    .toast-close { background: none; border: none; cursor: pointer; color: var(--text-muted, var(--text-muted)); padding: 2px; border-radius: var(--radius-xs); }
    .toast-close:hover { background: var(--surface-100, var(--surface-ice)); }
    .toast-body { font-size: var(--font-size-sm); color: var(--text-body, #475569); line-height: 1.5; margin: 0; }
    .toast-progress { height: 2px; background: var(--surface-200, var(--border-subtle)); border-radius: 1px; margin-top: 8px; overflow: hidden; }
    .toast-progress-bar { height: 100%; background: var(--primary, #4f46e5); animation: progressShrink 15s linear forwards; }
    @keyframes toastIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes progressShrink { from { width: 100%; } to { width: 0%; } }
  `]
})
export class ProactiveAssistanceComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private zone = inject(NgZone);
  private _storage = inject(StorageService);
  i18n = inject(I18nService);

  /** Navigation end events as a signal via toSignal() */
  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  suggestion = signal<string>('');
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRoute = '';
  private activityEvents = ['mousemove', 'keydown', 'scroll', 'click'];

  /** React to navigation end events */
  private readonly navEffect = effect(() => {
    const e = this.navEnd();
    if (e) {
      this.currentRoute = e.urlAfterRedirects;
      this.resetIdleTimer();
      this.dismiss();
    }
  });

  ngOnInit() {
    this.zone.runOutsideAngular(() => {
      for (const event of this.activityEvents) {
        document.addEventListener(event, this.onActivity, { passive: true });
      }
    });

    this.resetIdleTimer();
  }

  ngOnDestroy() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.autoDismissTimer);
    for (const event of this.activityEvents) {
      document.removeEventListener(event, this.onActivity);
    }
  }

  private onActivity = () => {
    this.resetIdleTimer();
    if (this.suggestion()) {
      this.dismiss();
    }
  };

  private resetIdleTimer() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.fetchSuggestion();
    }, IDLE_THRESHOLD_MS);
  }

  private hasShownForRoute(route: string): boolean {
    try {
      const shown = JSON.parse(this._storage.get(SHOWN_ROUTES_KEY) || '[]');
      return shown.includes(route);
    } catch { return false; }
  }

  private markRouteShown(route: string): void {
    try {
      const shown = JSON.parse(this._storage.get(SHOWN_ROUTES_KEY) || '[]');
      if (!shown.includes(route)) {
        shown.push(route);
        this._storage.set(SHOWN_ROUTES_KEY, JSON.stringify(shown.slice(-50)));
      }
    } catch (e) { devError("[catch]", e); }
  }

  private fetchSuggestion() {
    const routeBase = '/' + (this.currentRoute.split('?')[0].split('/').filter(Boolean)[0] || '');
    if (this.hasShownForRoute(routeBase)) return;

    this.http.post<Record<string, any>>(`${environment.apiUrl}/guidance/proactive`, {
      currentModule: this.currentRoute,
    }).subscribe({
      next: res => {
        const lang = this.i18n.currentLang();
        const text = lang === 'ar' ? (res.suggestionAr || res.suggestionEn) : (res.suggestionEn || res.suggestionAr);
        if (text) {
          this.markRouteShown(routeBase);
          this.zone.run(() => {
            this.suggestion.set(text);
            clearTimeout(this.autoDismissTimer);
            this.autoDismissTimer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
          });
        }
      },
      error: () => {},
    });
  }

  dismiss() {
    this.suggestion.set('');
    clearTimeout(this.autoDismissTimer);
  }
}
