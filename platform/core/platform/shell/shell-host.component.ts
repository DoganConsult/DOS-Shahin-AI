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
import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  DosSurfaceRendererComponent,
  DosShellBannerStripComponent,
  ShellStateService,
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
      [class.dos-shell-host--tablet]="isTabletViewport()"
      [class.dos-shell-host--desktop]="isDesktopViewport()"
      [class.dos-shell-host--no-sidebar]="visualSidebarSurfaces().length === 0 || isMobileViewport()"
      [attr.data-desktop-min-px]="desktopMinPx() || null"
      [attr.data-viewport-w]="viewportWidth()"
    >
      @if (skipToMainText()) {
        <a class="cds--skip-to-content" href="#main-content">{{ skipToMainText() }}</a>
      }
      <header
        class="dos-shell-zone dos-shell-zone--header"
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
      @if (visualSidebarSurfaces().length > 0 && !isMobileViewport()) {
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
        class="dos-shell-zone dos-shell-zone--main"
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
          <div class="dos-page-container"
               data-testid="dos-page-container"
               [class.dos-page-container--full-bleed]="isShellOnlyRoute()">
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
    /* Viewport pivots are DB-driven (shell.breakpoints) and applied via
       host class bindings (dos-shell-host--mobile|tablet|desktop) sourced
       from ShellStateService.viewportMode. No literal @media (max-width)
       queries — the CSS reacts to the runtime-classified mode, not a
       hardcoded pixel threshold. */
    /* Tablet rail: collapse expanded sidebar to a 72px icon rail. */
    .dos-shell-host.dos-shell-host--tablet {
      --workspace-sidebar-width: 4.5rem;
    }
    /* Mobile: sidebar hidden; topbar at 56px; no sidebar width reserved. */
    .dos-shell-host.dos-shell-host--mobile {
      --workspace-sidebar-width: 0px;
      --workspace-topbar-height: 56px;
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
       when isMobile && drawerOpen — currently unused in shell-host.
       Class-targeted (sourced from shell.breakpoints), not @media. */
    .dos-shell-host.dos-shell-host--mobile {
      grid-template-columns: 1fr;
      grid-template-areas:
        'header'
        'banners'
        'main';
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone--sidebar { display: none; }
    /* Contract Gate: when UI-OS emits zero validated sidebar surfaces,
       collapse the sidebar column so main fills the full width. */
    .dos-shell-host--no-sidebar {
      grid-template-columns: 1fr;
      grid-template-areas:
        'header'
        'banners'
        'main';
    }

    /* Topbar — fixed height, no padding so embedded surfaces own spacing.
       Logical-only flex layout; RTL is a native flip via direction:rtl
       on the host. Slot ordering is owned by ShellHostComponent
       (HEADER_SLOT_ORDER); the template just iterates the sorted list. */
    .dos-shell-zone--header {
      grid-area: header;
      display: flex; align-items: stretch;
      block-size: var(--workspace-topbar-height);
      background: var(--cds-background);
      border-block-end: 1px solid var(--cds-border-subtle);
      padding: 0;
      gap: 0;
    }
    /* Leading group: brand + workspace-title. Hugs inline-start. */
    .dos-shell-zone__header-start {
      display: inline-flex; align-items: stretch;
      flex: 0 0 auto;
      gap: var(--cds-spacing-05);
      padding-inline-start: 0;
    }
    /* Trailing group: search/actions/notifications/settings/profile.
       Hugs inline-end via auto inline-start margin (logical), not via
       physical right/left rules. flex:0 1 auto keeps it content-sized;
       the spacer between leading and trailing is the auto margin. */
    .dos-shell-zone__header-end {
      display: inline-flex; align-items: center;
      flex: 0 1 auto;
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
    /* Inner main panel: scrollable region. No padding — the
       .dos-page-container child centers content with a max-width
       and provides responsive inline padding. */
    .dos-shell-zone__main-inner {
      flex: 1 1 auto;
      min-block-size: 0;
      inline-size: 100%;
      overflow: auto;
      display: block;
      padding: 0;
    }
    /* ── Canonical Page Container ────────────────────────────────
       Every page renders inside this. Centered, max-width capped,
       responsive inline padding. Pages should NEVER add their own
       outer max-width or horizontal centering — the shell owns it.
       Vertical spacing between sections is owned by each
       .dos-section-container's margin-block-end (single source) so
       container gap is 0 to avoid a 2× gap. */
    .dos-page-container {
      max-inline-size: 1440px;
      margin-inline: auto;
      padding-inline: var(--cds-spacing-06);
      padding-block: var(--cds-spacing-05);
      display: flex; flex-direction: column;
      gap: 0;
      min-inline-size: 0;
    }
    /* Shell-only landing route (chrome.landingRoute) — module-cards
       and other shell-owned visuals fill the available width; remove
       the 1440px cap and centered margin so the grid hugs the viewport
       and matches the side-nav's inline-start edge. Inner module
       routes keep the centered max-width container. */
    .dos-page-container.dos-page-container--full-bleed {
      max-inline-size: none;
      margin-inline: 0;
      inline-size: 100%;
    }
    /* Tablet padding shrink — class-targeted via dos-shell-host--tablet
       (was @media (max-width: 1199.98px)). */
    .dos-shell-host.dos-shell-host--tablet .dos-page-container {
      padding-inline: var(--cds-spacing-05);
    }
    /* Mobile layout collapse — class-targeted via dos-shell-host--mobile
       (was @media (max-width: 767.98px)). */
    .dos-shell-host.dos-shell-host--mobile .dos-page-container {
      max-inline-size: none;
      margin-inline: 0;
      inline-size: 100%;
      padding-inline: 12px;
      padding-block: var(--cds-spacing-04);
      overflow-x: hidden;
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone--main { overflow-x: hidden; }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone--header {
      block-size: var(--workspace-topbar-height);
      overflow: hidden;
      padding-inline: 0;
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone__header-start {
      min-inline-size: 0;
      overflow: hidden;
      flex: 1 1 auto;
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone__header-end {
      gap: var(--cds-spacing-02);
      flex: 0 0 auto;
      overflow: hidden;
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone__main-inner {
      scrollbar-width: none;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .dos-shell-host.dos-shell-host--mobile .dos-shell-zone__main-inner::-webkit-scrollbar { display: none; }
    .dos-shell-zone__page-actions,
    .dos-shell-zone__page-content {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-04);
      min-inline-size: 0;
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
  /** Single source of truth for viewport / direction / route / overlays. */
  readonly state = inject(ShellStateService);

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
   * Wave 3 — mobile-first responsive shell. Viewport state is owned
   * by ShellStateService (single source). Resolver-emitted breakpoint
   * is pushed into the state service via setBreakpoints() in the
   * constructor effect so every component sees one consistent answer.
   */
  readonly viewportWidth = this.state.viewportWidth;
  readonly desktopMinPx = computed<number>(() => this.shell.desktopMinPx() || 0);
  readonly viewportMode = this.state.viewportMode;
  readonly sidebarMode = this.state.sidebarMode;
  // Distinct viewport classifiers used to drive class-targeted CSS blocks
  // in place of literal `@media (max-width: …)` queries. Sourced entirely
  // from ShellStateService whose pivots come from `shell.breakpoints`.
  readonly isMobileViewport = computed<boolean>(() => this.state.viewportMode() === 'mobile');
  readonly isTabletViewport = computed<boolean>(() => this.state.viewportMode() === 'tablet');
  readonly isDesktopViewport = computed<boolean>(() => this.state.viewportMode() === 'desktop');

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
    () => this.visualHeaderSurfaces()
      .filter((s) => !this.isTrailingHeaderSurface(s))
      .slice()
      .sort((a, b) => this.headerSlotOrder(a) - this.headerSlotOrder(b)),
  );
  /** Header surfaces that anchor to the trailing edge (global actions). */
  readonly visualHeaderEnd = computed<WorkspaceShellSurface[]>(
    () => this.visualHeaderSurfaces()
      .filter((s) => this.isTrailingHeaderSurface(s))
      .slice()
      .sort((a, b) => this.headerSlotOrder(a) - this.headerSlotOrder(b)),
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

  /**
   * Canonical topbar slot order (LTR reading order):
   *   1 brand · 2 workspace-switcher · 3 global-search · 4 command-actions
   *   · 5 notifications · 6 settings · 7 profile-menu
   *
   * The resolver emits a single `workspace.shell.global-quick-actions`
   * surface that internally bundles search + command actions + inbox
   * (notifications), so slots 3/4/5 collapse to one DOM node — its
   * canonical index is 3 (the leading edge of that bundle).
   *
   * RTL is achieved by native `direction: rtl` on the host: flexbox
   * mirrors the inline axis automatically. DOM order stays canonical
   * in both directions; no template branching, no per-language order.
   */
  private static readonly HEADER_SLOT_ORDER: Readonly<Record<string, number>> = Object.freeze({
    'workspace.shell.brand': 1,
    'workspace.shell.workspace-title': 2,
    'workspace.shell.global-quick-actions': 3,
    'workspace.shell.notifications': 5,
    'workspace.shell.settings-action': 6,
    'workspace.shell.user-menu': 7,
  });
  private headerSlotOrder(s: WorkspaceShellSurface): number {
    const key = s.componentKey ?? '';
    const idx = ShellHostComponent.HEADER_SLOT_ORDER[key];
    if (typeof idx === 'number') return idx;
    return Number.MAX_SAFE_INTEGER;
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
  /**
   * Main-zone surfaces filtered against the DB-emitted landing route.
   * Doctrine: `workspace.shell.empty-state` is the workspace-home
   * placeholder. It must render only on the route that UI-OS emits
   * as `chrome.landingRoute` — never on inner module routes like
   * `/foundation/*` where the router-outlet owns the page content.
   * landingRoute is DB-owned (dos.tenant_landing_config); the active
   * route comes from ShellStateService (Angular Router NavigationEnd).
   * No product/route literal is hardcoded here.
   */
  /**
   * Shell-only route — true when the active route equals the
   * DB-emitted `chrome.landingRoute`. On this route the shell paints
   * the workspace home (module cards, empty-state, etc.) and there is
   * no router-outlet child page; the page-container drops its
   * 1440px cap so module cards hug the viewport. Inner module routes
   * keep the centered container. The route literal is NEVER hardcoded
   * here — it is sourced from UI-OS chrome.landingRoute (which itself
   * comes from `dos.tenant_landing_config`).
   */
  readonly isShellOnlyRoute = computed<boolean>(() => {
    const chrome = this.shell.chrome() as Record<string, unknown>;
    const landing = typeof chrome['landingRoute'] === 'string'
      ? this.state.normalize(chrome['landingRoute'] as string)
      : '';
    if (landing.length === 0) return false;
    return this.state.activeRoute() === landing;
  });

  readonly visualMainSurfaces = computed<WorkspaceShellSurface[]>(() => {
    const all = this.shell.visualStructuralSurfacesByZone('main');
    const chrome = this.shell.chrome() as Record<string, unknown>;
    const landing = typeof chrome['landingRoute'] === 'string'
      ? this.state.normalize(chrome['landingRoute'] as string)
      : '';
    const active = this.state.activeRoute();
    const onLanding = landing.length > 0 && active === landing;
    const LANDING_ONLY_SURFACES = new Set([
      'workspace.shell.empty-state',
      'workspace.shell.module-cards',
    ]);
    return onLanding
      ? all
      : all.filter((s) => !LANDING_ONLY_SURFACES.has(s.componentKey ?? ''));
  });

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
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as ShellAction | { kind?: string; eventName?: string } | null | undefined;
        this.executeShellAction(detail as ShellAction | null | undefined);
      };
      window.addEventListener('dos:shell-action', handler);
      this.destroyRef.onDestroy(() => window.removeEventListener('dos:shell-action', handler));
    }
    // Push the resolver-emitted shell.breakpoints into the shared
    // ShellStateService so viewportMode classification is consistent
    // across every shell consumer (host, sidebar nav, drawer, popovers).
    // v1.1 source: shell.breakpoints[breakpointKey IN ('tablet','desktop')].minPx;
    // legacy source `policies.layout.breakpoints.desktopMinPx` is kept
    // as a tenant-policy-driven override for the desktop pivot only.
    effect(() => {
      const tabletMinFromBreakpoints  = this.shell.tabletMinPx() || 0;
      const desktopMinFromBreakpoints = this.shell.desktopMinPxFromBreakpoints() || 0;
      const desktopMinFromPolicy      = this.shell.desktopMinPx() || 0;
      // Resolved-breakpoint values take precedence; tenant-policy
      // override (desktopMinPx in policies) wins ONLY when present.
      const desktopMin = desktopMinFromPolicy > 0 ? desktopMinFromPolicy : desktopMinFromBreakpoints;
      const opts: { desktopMinPx?: number; tabletMinPx?: number } = {};
      if (desktopMin > 0)               opts.desktopMinPx = desktopMin;
      if (tabletMinFromBreakpoints > 0) opts.tabletMinPx  = tabletMinFromBreakpoints;
      if (opts.desktopMinPx || opts.tabletMinPx) this.state.setBreakpoints(opts);
    });
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
