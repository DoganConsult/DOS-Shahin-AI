/**
 * ShellStateService — single source of truth for workspace shell
 * interaction state. The shell host, topbar, sidebar, drawer, and
 * every overlay component read state from here; no component owns
 * its own copy of "is it open / which viewport / what direction".
 *
 * State signals
 *   viewportMode  : 'desktop' | 'tablet' | 'mobile'   (driven by window width)
 *   dir           : 'ltr' | 'rtl'                     (driven by html.dir)
 *   activeRoute   : string                            (driven by Router events)
 *   drawerOpen    : boolean                           (only meaningful on mobile)
 *   openMenu      : null | 'profile' | 'settings'     (one-at-a-time)
 *                 | 'notifications' | 'command'
 *   sidebarMode   : 'expanded' | 'rail' | 'hidden'    (computed from viewportMode)
 *
 * Doctrine:
 *   • At most one menu open at a time. opening one closes the previous.
 *   • Route navigation closes every overlay AND the drawer.
 *   • Desktop viewport ⇒ drawerOpen is forced false (no drawer DOM).
 *   • Click-outside the open menu's panel/trigger closes it.
 *   • Escape closes the active overlay (menu first, then drawer).
 *   • Components must NOT add their own document listeners or track
 *     local open state — they call into this service.
 */
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export type ShellViewportMode = 'desktop' | 'tablet' | 'mobile';
export type ShellDir = 'ltr' | 'rtl';
export type ShellSidebarMode = 'expanded' | 'rail' | 'hidden';
export type ShellMenuId = 'profile' | 'settings' | 'notifications' | 'command';

// Sentinel: both breakpoints start unbound (0). The shell-host pushes
// the resolver-emitted shell.breakpoints values via setBreakpoints()
// during bootstrap. Until those arrive, viewportMode reports 'mobile'
// (most defensive layout — drawer rather than sidebar, no clipping).
// No DEFAULT_TABLET_MIN_PX / DEFAULT_DESKTOP_MIN_PX constants —
// breakpoints come from DB → UI-OS → shell.breakpoints only.
const UNBOUND_PX = 0;

const OVERLAY_ATTR = 'data-shell-overlay';
const OVERLAY_TRIGGER_ATTR = 'data-shell-overlay-trigger';

@Injectable({ providedIn: 'root' })
export class ShellStateService {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  // ── Backing signals ───────────────────────────────────────────────
  private readonly _viewportWidth = signal<number>(this.readViewportWidth());
  private readonly _desktopMinPx = signal<number>(UNBOUND_PX);
  private readonly _tabletMinPx = signal<number>(UNBOUND_PX);
  private readonly _viewportMode = computed<ShellViewportMode>(() => {
    const w = this._viewportWidth();
    const desktopMin = this._desktopMinPx();
    const tabletMin = this._tabletMinPx();
    // Until shell.breakpoints arrives from the resolver, both pivots
    // are 0 and we report 'mobile' (defensive layout — never clip
    // sidebar). Once real breakpoints arrive via setBreakpoints(),
    // the comparison kicks in.
    if (desktopMin > 0 && w >= desktopMin) return 'desktop';
    if (tabletMin > 0 && w >= tabletMin) return 'tablet';
    return 'mobile';
  });
  private readonly _dir = signal<ShellDir>(this.detectDir());
  private readonly _activeRoute = signal<string>(this.normalize(this.router.url));
  private readonly _drawerOpen = signal<boolean>(false);
  private readonly _openMenu = signal<ShellMenuId | null>(null);

  // ── Public read-only signals ──────────────────────────────────────
  readonly viewportWidth = this._viewportWidth.asReadonly();
  readonly viewportMode = this._viewportMode;
  readonly dir = this._dir.asReadonly();
  readonly activeRoute = this._activeRoute.asReadonly();
  readonly drawerOpen = this._drawerOpen.asReadonly();
  readonly openMenu = this._openMenu.asReadonly();
  readonly sidebarMode = computed<ShellSidebarMode>(() => {
    const vp = this._viewportMode();
    if (vp === 'desktop') return 'expanded';
    if (vp === 'tablet') return 'rail';
    return 'hidden';
  });

  constructor() {
    this.wireViewportTracker();
    this.wireDirTracker();
    this.wireRouteTracker();
    this.wireOverlayDocumentGuards();

    // Doctrine guard: desktop viewport ⇒ drawer can never be open.
    // Any stray drawerOpen=true on resize-up is hard-cleared.
    effect(() => {
      if (this._viewportMode() === 'desktop' && this._drawerOpen()) {
        this._drawerOpen.set(false);
      }
    });
  }

  // ── Menu API (one-at-a-time) ──────────────────────────────────────
  isMenuOpen(id: ShellMenuId): boolean {
    return this._openMenu() === id;
  }
  openMenuFor(id: ShellMenuId): void {
    this._openMenu.set(id);
  }
  closeMenuFor(id?: ShellMenuId): void {
    if (!id || this._openMenu() === id) this._openMenu.set(null);
  }
  toggleMenu(id: ShellMenuId): void {
    this._openMenu.update((cur) => (cur === id ? null : id));
  }
  closeAllMenus(): void {
    this._openMenu.set(null);
  }

  // ── Drawer API (mobile only) ──────────────────────────────────────
  setDrawerOpen(open: boolean): void {
    if (open && this._viewportMode() === 'desktop') return; // doctrine
    this._drawerOpen.set(open);
  }
  toggleDrawer(): void {
    if (this._viewportMode() === 'desktop') {
      this._drawerOpen.set(false);
      return;
    }
    this._drawerOpen.update((v) => !v);
  }

  // ── Internal: viewport detection ──────────────────────────────────
  private readViewportWidth(): number {
    if (typeof window === 'undefined' || !window.innerWidth) return 1440;
    return window.innerWidth;
  }
  private wireViewportTracker(): void {
    if (typeof window === 'undefined') return;
    const onResize = () => this._viewportWidth.set(this.readViewportWidth());
    window.addEventListener('resize', onResize, { passive: true });
    onResize();
  }

  /**
   * Push the resolver-emitted shell.breakpoints values into the single
   * state source. Source of truth is `workspace-runtime.shell.breakpoints`
   * (rows from `dos.mobile_breakpoint_config`). Calls with 0/undefined
   * leave the corresponding signal at its current value — the resolver
   * is the only writer; there is no static fallback.
   */
  setBreakpoints(opts: { desktopMinPx?: number; tabletMinPx?: number }): void {
    if (typeof opts.desktopMinPx === 'number' && opts.desktopMinPx > 0) {
      this._desktopMinPx.set(opts.desktopMinPx);
    }
    if (typeof opts.tabletMinPx === 'number' && opts.tabletMinPx > 0) {
      this._tabletMinPx.set(opts.tabletMinPx);
    }
  }

  // ── Internal: direction detection ─────────────────────────────────
  private detectDir(): ShellDir {
    if (!this.doc?.documentElement) return 'ltr';
    return this.doc.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
  }
  private wireDirTracker(): void {
    if (!this.doc?.documentElement || typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => this._dir.set(this.detectDir()));
    obs.observe(this.doc.documentElement, { attributes: true, attributeFilter: ['dir'] });
  }

  // ── Internal: route tracker — closes every overlay on nav ─────────
  private wireRouteTracker(): void {
    this._activeRoute.set(this.normalize(this.router.url));
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((ev) => {
        this._activeRoute.set(this.normalize(ev.urlAfterRedirects ?? ev.url));
        // Doctrine: route change closes every menu and the drawer.
        this._openMenu.set(null);
        this._drawerOpen.set(false);
      });
  }

  /** Normalize a router URL: strip query/hash, drop trailing '/'. */
  normalize(url: string): string {
    if (!url) return '';
    const q = url.indexOf('?');
    const u = q === -1 ? url : url.slice(0, q);
    const h = u.indexOf('#');
    const v = h === -1 ? u : u.slice(0, h);
    return v.length > 1 && v.endsWith('/') ? v.slice(0, -1) : v;
  }

  /**
   * Sidebar active match: exact-or-prefix (boundary-checked) against
   * the current router URL. Single canonical matcher — every nav
   * surface should call this rather than reinventing the rule.
   */
  isRouteActive(path: string | null | undefined): boolean {
    if (!path) return false;
    const target = this.normalize(path);
    const url = this._activeRoute();
    if (url === target) return true;
    return url.startsWith(target + '/');
  }

  // ── Internal: document-level click-outside + Escape guards ────────
  private wireOverlayDocumentGuards(): void {
    if (!this.doc || typeof this.doc.addEventListener !== 'function') return;
    const onPointerDown = (ev: Event) => {
      const id = this._openMenu();
      if (!id) return;
      const target = ev.target as Element | null;
      if (!target) return;
      if (
        target.closest(`[${OVERLAY_ATTR}="${cssEscape(id)}"]`) ||
        target.closest(`[${OVERLAY_TRIGGER_ATTR}="${cssEscape(id)}"]`)
      ) {
        return;
      }
      this._openMenu.set(null);
    };
    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (this._openMenu() != null) {
        ev.stopPropagation();
        this._openMenu.set(null);
        return;
      }
      if (this._drawerOpen()) {
        ev.stopPropagation();
        this._drawerOpen.set(false);
      }
    };
    this.doc.addEventListener('pointerdown', onPointerDown, true);
    this.doc.addEventListener('keydown', onKeydown, true);
  }
}

function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.\-:]/g, '\\$&');
}
