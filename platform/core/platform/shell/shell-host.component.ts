/**
 * Shell host — render-only. All data from WorkspaceShellBindingService.
 * No hardcoded labels, routes, icons, fallback CSS, or local policy.
 *
 * Layout responsibility (Option A):
 *   - Provide ONLY the canonical workspace chrome grid containers:
 *     header / banners / sidebar / main / router-outlet. ShellHost owns NO
 *     visual rendering — every visible Carbon component is mounted by
 *     <dos-surface-renderer> off the resolver-emitted rendererKey.
 *   - For each zone, iterate visualSurfacesByZone(zone) and emit one
 *     <dos-surface-renderer> per surface. ShellHost never imports
 *     DosWorkspaceHeader / DosWorkspaceSidebar directly.
 *   - Structural shell-frame surfaces (componentType='shell-frame')
 *     are intentionally excluded from this iteration; ShellHost may
 *     consume them only for layout policy if/when needed.
 *   - The shell host never invents nav, labels, icons, or routes — if
 *     the resolver emits zero visual surfaces in a zone, the zone
 *     renders empty (no static fallback).
 */
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  DosSurfaceRendererComponent,
  DosShellBannerStripComponent,
  type WorkspaceSurfaceInput,
} from '@dos/ui-system';
import { WorkspaceShellBindingService, type WorkspaceShellSurface } from './workspace-shell-binding.service';
import { ShellPreferencesService } from './shell-preferences.service';
import { AuthLogoutService } from './auth-logout.service';
import { ShellErrorStateService } from './shell-error-state.service';
import type { ShellAction, ShellBanner } from '@dos/ui-contracts';

@Component({
  selector: 'app-shell-host',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DosSurfaceRendererComponent,
    DosShellBannerStripComponent,
  ],
  template: `
    <div
      class="dos-shell-host"
      [class.dos-shell-host--rtl]="isRtl()"
      [class.dos-shell-host--mobile]="isMobileViewport()"
      [class.dos-shell-host--no-sidebar]="visualSidebarSurfaces().length === 0"
      [attr.data-desktop-min-px]="desktopMinPx() || null"
      [attr.data-viewport-w]="viewportWidth()"
    >
      @if (skipToMainText()) {
        <a class="dos-shell-skip" href="#main-content">{{ skipToMainText() }}</a>
      }
      <header
        class="cds--header dos-shell-zone dos-shell-zone--header"
        data-zone="header"
        role="banner"
        [attr.aria-label]="ariaHeaderLabel() || null"
        [attr.data-surface-count]="headerSurfaces().length"
        [attr.data-visual-surface-count]="visualHeaderSurfaces().length"
      >
        <div class="dos-shell-zone__header-start">
          @for (s of visualHeaderStart(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
        </div>
        <div class="dos-shell-zone__header-end">
          @for (s of visualHeaderEnd(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
        </div>
      </header>
      @if (visualBannerSurfaces().length > 0 || shell.shellBannerCandidates().length > 0) {
        <div
          class="dos-shell-zone dos-shell-zone--banners"
          data-zone="banner"
          role="region"
          [attr.aria-label]="ariaBannersLabel() || null"
          [attr.data-surface-count]="bannerSurfaces().length"
          [attr.data-visual-surface-count]="visualBannerSurfaces().length"
        >
          @for (s of visualBannerSurfaces(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
          @if (shell.shellBannerCandidates().length > 0) {
            <dos-shell-banner-strip
              [banners]="shell.shellBannerCandidates()"
              (action)="onBannerAction($event)"
              (dismiss)="onBannerDismiss($event)"
            />
          }
        </div>
      }
      @if (visualSidebarSurfaces().length > 0) {
        <aside
          class="dos-shell-zone dos-shell-zone--sidebar"
          data-zone="sidebar"
          role="complementary"
          [attr.aria-label]="ariaSidebarLabel() || null"
          [attr.data-surface-count]="sidebarSurfaces().length"
          [attr.data-visual-surface-count]="visualSidebarSurfaces().length"
        >
          @for (s of visualSidebarSurfaces(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
        </aside>
      }
      <main
        class="cds--content dos-shell-zone dos-shell-zone--main"
        data-zone="main"
        role="main"
        id="main-content"
        [attr.aria-label]="ariaMainLabel() || null"
        [attr.data-surface-count]="mainSurfaces().length"
        [attr.data-visual-surface-count]="visualMainSurfaces().length"
      >
        @if (!shell.loaded() && loadingLabel()) {
          <div class="dos-shell-loading" role="status" aria-live="polite">
            {{ loadingLabel() }}
          </div>
        }
        <div class="dos-shell-zone__main-inner">
          @for (s of visualMainSurfaces(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
          @if (visualPageActionsSurfaces().length > 0) {
            <section class="dos-shell-zone__page-actions" data-zone="page-actions">
              @for (s of visualPageActionsSurfaces(); track surfaceTrack(s, $index)) {
                <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
              }
            </section>
          }
          @if (visualPageContentSurfaces().length > 0) {
            <section class="dos-shell-zone__page-content" data-zone="page-content">
              @for (s of visualPageContentSurfaces(); track surfaceTrack(s, $index)) {
                <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
              }
            </section>
          }
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════════════════════════════
       Workspace Auto-Layout System
       ────────────────────────────────────────────────────────────────
       Doctrine: side nav, page header, page body, and footer size
       automatically from viewport + content. No page may use hardcoded
       margin/top/height to compensate shell bugs.

       CSS variables drive every dimension:
         --workspace-topbar-height   — fixed topbar, 3rem
         --workspace-sidebar-width   — viewport-driven (15rem | 4.5rem | 0)
       Logical CSS only (inline-start / block-start / margin-inline)
       so RTL is a native flip, not an override.
       ════════════════════════════════════════════════════════════════ */

    :host {
      display: block;
      block-size: 100dvh;
      background: var(--cds-background);
      --workspace-topbar-height: 3rem;
      --workspace-sidebar-width: 15rem;
    }
    /* Tablet rail: collapse expanded sidebar to a 72px icon rail. */
    @media (max-width: 1199.98px) {
      :host { --workspace-sidebar-width: 4.5rem; }
    }
    /* Mobile: sidebar is hidden; drawer-only. The shell never reserves
       sidebar width on mobile. */
    @media (max-width: 767.98px) {
      :host { --workspace-sidebar-width: 0px; }
    }

    .dos-shell-skip {
      position: absolute;
      inset-inline-start: -9999px;
      inset-block-start: 0;
      z-index: 9999;
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      text-decoration: none;
    }
    .dos-shell-skip:focus {
      inset-inline-start: var(--cds-spacing-05);
      inset-block-start: var(--cds-spacing-05);
      outline: 2px solid var(--cds-focus);
    }

    /* Canonical workspace grid:
         row1 = topbar (fixed, --workspace-topbar-height)
         row2 = banners (auto, collapses to 0 when no banner DOM)
         row3 = content (1fr, fills remaining viewport)
         col1 = sidebar (--workspace-sidebar-width)
         col2 = main (1fr)
       LTR: [sidebar][main] · RTL: [main][sidebar] (auto via direction). */
    .dos-shell-host {
      display: grid;
      grid-template-columns: var(--workspace-sidebar-width) 1fr;
      grid-template-rows: var(--workspace-topbar-height) auto 1fr;
      grid-template-areas:
        'header  header'
        'banners banners'
        'sidebar main';
      block-size: 100dvh;
      min-block-size: 100dvh;
      inline-size: 100%;
      overflow: hidden;
    }
    /* Mobile: collapse to a single column (no sidebar reservation).
       The drawer overlays the viewport on demand and is mounted only
       when isMobile && drawerOpen — currently unused in shell-host. */
    @media (max-width: 767.98px) {
      .dos-shell-host {
        grid-template-columns: 1fr;
        grid-template-areas:
          'header'
          'banners'
          'main';
      }
      .dos-shell-zone--sidebar { display: none; }
    }
    /* Contract Gate: when UI-OS emits zero validated sidebar surfaces,
       collapse the sidebar column so main fills the full width. */
    .dos-shell-host--no-sidebar {
      grid-template-columns: 1fr;
      grid-template-areas:
        'header'
        'banners'
        'main';
    }

    /* Topbar — fixed height, no padding so embedded surfaces own spacing. */
    .dos-shell-zone--header {
      grid-area: header;
      display: flex; align-items: stretch;
      block-size: var(--workspace-topbar-height);
      background: var(--cds-background);
      border-block-end: 1px solid var(--cds-border-subtle);
      padding: 0;
    }
    .dos-shell-zone__header-start {
      display: inline-flex; align-items: stretch;
      flex: 0 0 auto;
      gap: var(--cds-spacing-05);
    }
    .dos-shell-zone__header-end {
      display: inline-flex; align-items: stretch;
      flex: 1 1 auto;
      margin-inline-start: auto;
      gap: var(--cds-spacing-03);
      padding-inline-end: var(--cds-spacing-03);
    }

    /* Banners — auto-height; row collapses to 0 when no DOM is rendered
       (the wrapper is gated by *ngIf in the template). */
    .dos-shell-zone--banners {
      grid-area: banners;
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-03);
    }

    /* Sidebar — fills the full content row, scrolls internally. */
    .dos-shell-zone--sidebar {
      grid-area: sidebar;
      inline-size: var(--workspace-sidebar-width);
      background: var(--cds-background);
      border-inline-end: 1px solid var(--cds-border-subtle);
      overflow: hidden auto;
      min-block-size: 0;
    }

    /* Main — flex column owning vertical scroll. min-block-size:0 lets
       the inner panel actually shrink and scroll instead of pushing the
       grid past the viewport. */
    .dos-shell-zone--main {
      grid-area: main;
      min-inline-size: 0; min-block-size: 0;
      display: flex; flex-direction: column;
      background: var(--cds-layer);
      overflow: hidden;
    }
    .dos-shell-loading {
      padding: var(--cds-spacing-05) var(--cds-spacing-05);
      color: var(--cds-text-secondary);
    }
    /* Inner main panel: scrollable region. No top padding so the
       page header sits flush against the topbar — pages own their
       own internal padding via their template. */
    .dos-shell-zone__main-inner {
      flex: 1 1 auto;
      min-block-size: 0;
      inline-size: 100%;
      overflow: auto;
      display: flex; flex-direction: column;
      gap: 0;
      padding: 0;
    }
    .dos-shell-zone__page-actions,
    .dos-shell-zone__page-content {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-04);
      min-inline-size: 0;
      padding-inline: var(--cds-spacing-05);
      padding-block: var(--cds-spacing-04);
    }
  `],
})
export class ShellHostComponent {
  private readonly router = inject(Router);
  private readonly prefs = inject(ShellPreferencesService);
  private readonly authLogout = inject(AuthLogoutService);
  private readonly shellError = inject(ShellErrorStateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly shell = inject(WorkspaceShellBindingService);

  /** DB-driven copy from workspace-runtime `chrome.tplStrings` (shell.tpl.*). */
  private readonly tplStrings = computed(() => {
    const chrome = this.shell.chrome() as Record<string, unknown>;
    const raw = chrome['tplStrings'];
    return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {};
  });

  readonly skipToMainText = computed(() => this.tplStrings()['shell.tpl.skip_to_main'] ?? '');
  readonly loadingLabel = computed(() => this.tplStrings()['shell.tpl.loading'] ?? '');
  readonly ariaHeaderLabel = computed(() => this.tplStrings()['shell.tpl.aria.header'] ?? '');
  readonly ariaSidebarLabel = computed(() => this.tplStrings()['shell.tpl.aria.sidebar'] ?? '');
  readonly ariaMainLabel = computed(() => this.tplStrings()['shell.tpl.aria.main'] ?? '');
  readonly ariaBannersLabel = computed(() => this.tplStrings()['shell.tpl.aria.banners'] ?? '');
  readonly isRtl = computed(() => this.prefs.dir() === 'rtl');

  /**
   * Wave 3 — mobile-first responsive shell.
   * Viewport tracker driven by window.innerWidth + the UI-OS policy
   * `layout.breakpoints.desktopMinPx`. When width < breakpoint we add
   * .dos-shell-host--mobile and the grid collapses to a single column
   * with a sticky sidebar. SSR-safe (defaults to a wide viewport so
   * server-rendered output assumes desktop and hydrates correctly).
   */
  readonly viewportWidth = signal<number>(
    typeof window === 'undefined' ? 1440 : window.innerWidth || 1440,
  );
  readonly desktopMinPx = computed<number>(() => this.shell.desktopMinPx() || 0);
  readonly isMobileViewport = computed<boolean>(() => {
    const min = this.desktopMinPx();
    if (!min) return false;
    return this.viewportWidth() < min;
  });

  readonly headerSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('header'));
  readonly bannerSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('banner'));
  readonly sidebarSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('sidebar'));
  readonly mainSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('main'));
  readonly pageActionsSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('page-actions'));
  readonly pageContentSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.structuralSurfacesByZone('page-content'));

  readonly visualHeaderSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('header'),
  );
  /** Header surfaces that anchor to the leading edge (brand, title, nav). */
  readonly visualHeaderStart = computed<WorkspaceShellSurface[]>(
    () => this.visualHeaderSurfaces().filter((s) => !this.isTrailingHeaderSurface(s)),
  );
  /** Header surfaces that anchor to the trailing edge (global actions). */
  readonly visualHeaderEnd = computed<WorkspaceShellSurface[]>(
    () => this.visualHeaderSurfaces().filter((s) => this.isTrailingHeaderSurface(s)),
  );

  /**
   * Trailing-edge classification — driven by resolver-emitted
   * `props.placement` metadata (NOT by hardcoded rendererKey list).
   * The DB seed/enricher sets `placement: 'trailing'` on header
   * surfaces that anchor to the trailing edge (settings, user-menu,
   * etc.). Anything without an explicit placement falls to leading.
   */
  private isTrailingHeaderSurface(s: WorkspaceShellSurface): boolean {
    const props = (s.props ?? {}) as Record<string, unknown>;
    return props['placement'] === 'trailing';
  }
  readonly visualSidebarSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('sidebar'),
  );
  readonly visualBannerSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('banner'),
  );
  readonly visualPageActionsSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('page-actions'),
  );
  readonly visualPageContentSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('page-content'),
  );
  readonly visualMainSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualStructuralSurfacesByZone('main'),
  );

  /**
   * Adapt the binding-row shape to the surface-renderer @Input contract.
   * Memoized: the same `WorkspaceShellSurface` reference must yield the
   * same `WorkspaceSurfaceInput` reference, otherwise change detection
   * triggers `surface-renderer.ngOnChanges` on every CD cycle (see
   * Debug-409426 evidence: 100+ mounts/surface in a single repro).
   */
  private readonly _surfaceInputCache = new WeakMap<WorkspaceShellSurface, WorkspaceSurfaceInput>();
  asSurfaceInput(s: WorkspaceShellSurface): WorkspaceSurfaceInput {
    const cached = this._surfaceInputCache.get(s);
    if (cached) return cached;
    const adapted: WorkspaceSurfaceInput = {
      enabled: s.enabled,
      position: s.position,
      props: (s.props ?? {}) as Record<string, unknown>,
      version: s.version ?? 0,
      zone: s.zone,
      surfaceId: s.surfaceId,
      slotKey: s.slotKey,
      componentKey: s.componentKey ?? null,
      componentType: s.componentType ?? null,
      rendererKey: s.rendererKey ?? null,
      carbonKey: s.carbonKey ?? null,
    };
    this._surfaceInputCache.set(s, adapted);
    return adapted;
  }

  surfaceTrack(s: WorkspaceShellSurface, index: number): string {
    return s.surfaceId ?? s.slotKey ?? `${s.zone ?? 'z'}#${index}`;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // STARTUP VERSION MARKER — lets us prove which bundle is loaded
      // without relying on cross-origin fetch (Chrome's Local Network
      // Access policy blocks fetch to localhost from https origins).
      // eslint-disable-next-line no-console
      console.info('[DOS_DEBUG] shell-host build=fail-closed-banner-gates+empty-strip-filter');
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as ShellAction | { kind?: string; eventName?: string } | null | undefined;
        this.executeShellAction(detail as ShellAction | null | undefined);
      };
      window.addEventListener('dos:shell-action', handler);
      this.destroyRef.onDestroy(() => window.removeEventListener('dos:shell-action', handler));

      // Wave 3 — viewport tracker for the policy-driven mobile breakpoint.
      const onResize = () => this.viewportWidth.set(window.innerWidth || 0);
      window.addEventListener('resize', onResize, { passive: true });
      onResize();
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    }
    // #region agent log
    effect(() => {
      const html = typeof document !== 'undefined' ? document.documentElement : null;
      const computed = {
        v: { header: this.visualHeaderSurfaces().length, banner: this.visualBannerSurfaces().length, sidebar: this.visualSidebarSurfaces().length, main: this.visualMainSurfaces().length, pageActions: this.visualPageActionsSurfaces().length, pageContent: this.visualPageContentSurfaces().length },
        s: { header: this.headerSurfaces().length, banner: this.bannerSurfaces().length, sidebar: this.sidebarSurfaces().length, main: this.mainSurfaces().length, pageActions: this.pageActionsSurfaces().length, pageContent: this.pageContentSurfaces().length },
        isMobile: this.isMobileViewport(), vw: this.viewportWidth(), desktopMin: this.desktopMinPx(),
        spaScript: typeof document !== 'undefined' ? (document.querySelector('script[src*="main"]') as HTMLScriptElement | null)?.src ?? null : null,
        rtl: { isRtl: this.isRtl(), prefsDir: this.prefs.dir(), prefsLang: this.prefs.language(), htmlDir: html?.getAttribute('dir') ?? null, htmlLang: html?.getAttribute('lang') ?? null },
        bannerCandidates: this.shell.shellBannerCandidates().length,
      };
      const reportDom = () => {
        if (typeof document === 'undefined') return;
        const headerEl = document.querySelector('.dos-shell-zone--header') as HTMLElement | null;
        const sidebarEl = document.querySelector('.dos-shell-zone--sidebar') as HTMLElement | null;
        const bannersEl = document.querySelector('.dos-shell-zone--banners') as HTMLElement | null;
        const mainEl = document.querySelector('.dos-shell-zone--main') as HTMLElement | null;
        const headerRect = headerEl?.getBoundingClientRect() ?? null;
        const sidebarRect = sidebarEl?.getBoundingClientRect() ?? null;
        const bannersRect = bannersEl?.getBoundingClientRect() ?? null;
        const mainRect = mainEl?.getBoundingClientRect() ?? null;
        const dom = {
          cdsHeaderCount: document.querySelectorAll('.cds--header').length,
          bannerZoneCount: document.querySelectorAll('.dos-shell-zone--banners').length,
          cdsBannerCount: document.querySelectorAll('.cds--inline-notification, .cds--toast-notification, .cds--actionable-notification').length,
          closeButtonCount: document.querySelectorAll('button[aria-label*="lose" i], button[aria-label*="إغلاق"], button.cds--header__action.cds--header__menu-trigger, .cds--inline-notification__close-button, .cds--toast-notification__close-button').length,
          shellHasRtlClass: !!document.querySelector('.dos-shell-host--rtl'),
          shellHasMobileClass: !!document.querySelector('.dos-shell-host--mobile'),
          shellHasNoSidebarClass: !!document.querySelector('.dos-shell-host--no-sidebar'),
          headerRect: headerRect ? { l: Math.round(headerRect.left), w: Math.round(headerRect.width), h: Math.round(headerRect.height) } : null,
          bannersRect: bannersRect ? { l: Math.round(bannersRect.left), w: Math.round(bannersRect.width), h: Math.round(bannersRect.height) } : null,
          sidebarRect: sidebarRect ? { l: Math.round(sidebarRect.left), w: Math.round(sidebarRect.width), r: Math.round(sidebarRect.right) } : null,
          mainRect: mainRect ? { l: Math.round(mainRect.left), w: Math.round(mainRect.width) } : null,
          viewportWidthPx: typeof window !== 'undefined' ? window.innerWidth : null,
          // Capture text fragments inside header to identify the "× × stack" source.
          headerSnippets: headerEl ? Array.from(headerEl.querySelectorAll('button, a')).slice(0, 8).map((el) => ({ tag: el.tagName, label: el.getAttribute('aria-label'), text: (el.textContent || '').trim().slice(0, 40), cls: el.className.slice(0, 80) })) : [],
          bannerSnippets: bannersEl ? Array.from(bannersEl.querySelectorAll('button, .cds--actionable-notification__title')).slice(0, 8).map((el) => ({ tag: el.tagName, label: el.getAttribute('aria-label'), text: (el.textContent || '').trim().slice(0, 40), cls: el.className.slice(0, 80) })) : [],
          // DOM TREE PROBE: count app-shell-host instances and dump direct
          // children of each .dos-shell-host inner wrapper. Lets us prove
          // whether the user is seeing a duplicate shell mount, a duplicate
          // banner zone, or a stray injected node from outside the shell tree.
          shellHostElCount: document.querySelectorAll('app-shell-host').length,
          shellInnerCount: document.querySelectorAll('app-shell-host > div.dos-shell-host').length,
          shellInnerChildren: Array.from(document.querySelectorAll('app-shell-host > div.dos-shell-host')).map((host) => Array.from(host.children).map((c) => ({ tag: c.tagName, cls: (c.className || '').slice(0, 80), id: c.id || null, dataZone: c.getAttribute('data-zone') || null, role: c.getAttribute('role') || null, hidden: (c as HTMLElement).hidden || (c as HTMLElement).offsetParent === null }))),
          // Same probe but at app-shell-host level: whose direct child is
          // `<div>`? Reveals if there is a 2nd `<div>` SIBLING outside the
          // canonical .dos-shell-host wrapper.
          appShellChildren: Array.from(document.querySelectorAll('app-shell-host')).map((sh) => Array.from(sh.children).map((c) => ({ tag: c.tagName, cls: (c.className || '').slice(0, 80) }))),
          headerCountInsideShell: document.querySelectorAll('app-shell-host header').length,
          divCountInsideShellInner: document.querySelectorAll('app-shell-host > div.dos-shell-host > div').length,
        };
        // Same-origin debug side-channel: Chrome's Local Network Access
        // policy blocks fetch() to localhost from https://shahin-ai.com,
        // so we publish the snapshot to console + window.__dosShellProbe
        // and the user can `copy(window.__dosShellProbe)` from DevTools.
        try {
          const payload = { runId: 'dup-probe', location: 'shell-host.component.ts:effect:VISUAL_SNAPSHOT', data: { ...computed, dom }, t: Date.now() };
          const w = window as unknown as { __dosShellProbe?: unknown[]; __dosShellProbeLast?: unknown };
          if (!Array.isArray(w.__dosShellProbe)) w.__dosShellProbe = [];
          (w.__dosShellProbe as unknown[]).push(payload);
          w.__dosShellProbeLast = payload;
          // eslint-disable-next-line no-console
          console.info('[DOS_DEBUG] shell host snapshot', payload);
        } catch { /* no-op */ }
      };
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => window.requestAnimationFrame(reportDom));
      } else {
        reportDom();
      }
    });
    // #endregion
  }

  onBannerAction(b: ShellBanner): void {
    const a = b.action;
    if (a) this.executeShellAction(a);
  }

  onBannerDismiss(b: ShellBanner): void {
    if (b.id === 'shell-error') {
      this.shellError.clearError();
    }
  }

  executeShellAction(action: ShellAction | { kind?: string; eventName?: string; payload?: Record<string, unknown> } | null | undefined): void {
    if (!action || typeof (action as { kind?: unknown }).kind !== 'string') return;
    const kind = (action as { kind: string }).kind;
    switch (kind) {
      case 'navigate':
        void this.router.navigateByUrl((action as { path: string }).path);
        break;
      case 'open_external':
        window.open((action as { url: string }).url, '_blank', 'noopener');
        break;
      case 'toggle_language':
        this.prefs.toggleLanguage();
        break;
      case 'toggle_theme':
        this.prefs.toggleTheme();
        break;
      case 'clear_error':
        this.shellError.clearError();
        break;
      case 'open_command':
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-open-command', { bubbles: true, composed: true }),
          );
        }
        break;
      case 'open_context_tab': {
        const tab = (action as { tab?: string }).tab;
        if (
          typeof window !== 'undefined' &&
          typeof tab === 'string' &&
          tab.length > 0
        ) {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-open-context-tab', {
              bubbles: true,
              composed: true,
              detail: { tab },
            }),
          );
        }
        break;
      }
      case 'close_overlay':
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-close-overlay', { bubbles: true, composed: true }),
          );
        }
        break;
      case 'dispatch_event': {
        const evt = (action as { eventName?: string }).eventName ?? '';
        if (evt === 'auth.logout') {
          void this.authLogout.logout();
        } else if (evt === 'preference.toggle.language') {
          this.prefs.toggleLanguage();
        } else if (evt === 'preference.toggle.theme') {
          this.prefs.toggleTheme();
        }
        break;
      }
      default:
        break;
    }
  }
}
