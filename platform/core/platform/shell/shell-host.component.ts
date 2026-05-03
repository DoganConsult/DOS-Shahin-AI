import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import {
  BreadcrumbModule,
  SearchModule,
  SkeletonModule,
  UIShellModule,
} from 'carbon-components-angular';
import {
  WorkspaceNavigationAdapter,
  AccessStore as PlatformAccessStore,
  WORKSPACE_NAV_LABEL_RESOLVER,
  type WorkspaceNavLabelResolver,
} from '@dos/access-store';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
import { BreadcrumbService } from './breadcrumb.service';

const CARBON_BREAKPOINT_LARGE_PX = 1056;

/** Group → Carbon icon name mapping (rendered as inline SVG via ibmIcon or text fallback). */
const GROUP_ICONS: Record<string, string> = {
  'foundation':        'layers',
  'compliance':        'security',
  'risk':              'warning',
  'config-center':     'settings',
  'access':            'locked',
  'dauth':             'user--admin',
  'dnoc':              'network--3',
  'dsoc':              'security',
  'ai-platform':       'ai',
  'dos-platform':      'platforms',
  'runtime':           'cloud',
  'ui-system':         'application',
  'tenant-management': 'enterprise',
  'multi-tenant-mgmt': 'building',
  'foundation-admin':  'layers',
  'modules':           'folder',
};

@Component({
  selector: 'app-shell-host',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    UIShellModule,
    BreadcrumbModule,
    SearchModule,
    SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ─── Rail toggle ─── */
    .shell-rail-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--cds-icon-inverse, #fff);
      margin-inline-start: var(--cds-spacing-03);
      border-radius: 2px;
      transition: background 0.15s;
    }
    .shell-rail-toggle:hover { background: var(--cds-layer-hover, rgba(255,255,255,0.08)); }

    /* ─── Nav search ─── */
    .shell-nav-search {
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      border-bottom: 1px solid var(--cds-border-subtle);
    }

    /* ─── Breadcrumb strip ─── */
    .shell-breadcrumb {
      position: sticky;
      top: 3rem;
      z-index: 5999;
      background: var(--cds-layer-01, #f4f4f4);
      border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      padding: var(--cds-spacing-03) var(--cds-spacing-06);
    }

    /* ─── Page header strip ─── */
    .shell-page-header {
      padding: var(--cds-spacing-05) var(--cds-spacing-06) 0;
      max-width: 1600px;
    }
    .shell-page-title {
      margin: 0;
      font-size: var(--cds-productive-heading-04-font-size, 1.75rem);
      font-weight: var(--cds-productive-heading-04-font-weight, 400);
      line-height: 1.25;
      color: var(--cds-text-primary);
    }

    /* ─── Nav item disabled state ─── */
    .shell-nav-disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Skeleton container ─── */
    .shell-skeleton {
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      display: grid;
      gap: var(--cds-spacing-05);
    }

    /* ─── Active group highlight ─── */
    :host ::ng-deep .cds--side-nav__menu[aria-expanded="true"] > a {
      color: var(--cds-interactive, #0f62fe);
    }

  `],
  template: `
    <!-- ═══════════════════════════════════════════
         HEADER (cds-header)
    ═══════════════════════════════════════════ -->
    <cds-header
      [brand]="headerBrand()"
      [name]="headerWorkspaceTitle()"
      [route]="headerHomeRoute()"
      useRouter="true">

      <cds-hamburger
        [active]="sideNavActive()"
        (selected)="toggleSideNav()">
      </cds-hamburger>

      <!-- Rail mode toggle (W-E) -->
      <button
        class="shell-rail-toggle"
        [title]="isRail() ? 'Expand sidebar' : 'Collapse sidebar'"
        [attr.aria-label]="isRail() ? 'Expand sidebar' : 'Collapse to rail'"
        (click)="toggleRail()">
        {{ isRail() ? '▶' : '◀' }}
      </button>

    </cds-header>

    <!-- ═══════════════════════════════════════════
         SIDENAV (W-A, W-D, W-E, W-F)
    ═══════════════════════════════════════════ -->
    @if (navGroups().length > 0) {
      <cds-sidenav
        [expanded]="sideNavActive()"
        [rail]="isRail()"
        useRouter="true"
        [ariaLabel]="sideNavAriaLabel()">

        <!-- W-D: Nav search filter -->
        @if (!isRail()) {
          <div class="shell-nav-search">
            <cds-search
              size="sm"
              placeholder="Filter navigation"
              [value]="navSearch()"
              (valueChange)="navSearch.set($event)"
              id="shell-nav-search-input">
            </cds-search>
          </div>
        }

        <!-- W-A: Groups with icons, active state, auto-expand -->
        @for (group of filteredGroups(); track group.id) {
          <cds-sidenav-menu
            [title]="groupLabel(group.id, group.label)"
            [active]="activeGroupId() === group.id">

            @for (item of group.items; track item.id) {
              @if (item.enabled !== false) {
                <!-- Normal routable item -->
                <cds-sidenav-item
                  [route]="[item.route]"
                  useRouter="true"
                  [active]="isActive(item)"
                  [attr.aria-current]="isActive(item) ? 'page' : null"
                  (navigation)="onNav(item)">
                  {{ label(item) }}
                </cds-sidenav-item>
              } @else {
                <!-- Disabled / coming-soon item -->
                <cds-sidenav-item class="shell-nav-disabled"
                  [attr.aria-disabled]="true"
                  [title]="disabledTitle(item)">
                  {{ label(item) }}
                </cds-sidenav-item>
              }
            }
          </cds-sidenav-menu>
        }

        @if (filteredGroups().length === 0 && navSearch()) {
          <p style="padding:1rem;color:var(--cds-text-secondary);font-size:.875rem">
            No results for "{{ navSearch() }}"
          </p>
        }
      </cds-sidenav>
    }

    <!-- ═══════════════════════════════════════════
         BREADCRUMB STRIP (W-B)
    ═══════════════════════════════════════════ -->
    @if (breadcrumbs().length > 1) {
      <div class="shell-breadcrumb" id="shell-breadcrumb-strip" role="navigation" aria-label="Breadcrumb">
        <cds-breadcrumb [noTrailingSlash]="true">
          @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
            <cds-breadcrumb-item>
              @if (!last && crumb.route) {
                <a [routerLink]="crumb.route">{{ crumb.label }}</a>
              } @else {
                {{ crumb.label }}
              }
            </cds-breadcrumb-item>
          }
        </cds-breadcrumb>
      </div>
    }

    <!-- ═══════════════════════════════════════════
         MAIN CONTENT with skeleton (W-C, W-G)
    ═══════════════════════════════════════════ -->
    <main class="cds--content" id="main-content">
      @if (pageTitle()) {
        <div class="shell-page-header" id="shell-page-header">
          <h1 class="shell-page-title">{{ pageTitle() }}</h1>
        </div>
      }

      @if (isNavigating()) {
        <!-- W-C: Skeleton during navigation -->
        <div class="shell-skeleton" id="shell-nav-skeleton" aria-busy="true" aria-label="Loading page">
          <cds-skeleton-text [lines]="2" [heading]="true"></cds-skeleton-text>
          <cds-skeleton-text [lines]="4"></cds-skeleton-text>
          <cds-skeleton-placeholder></cds-skeleton-placeholder>
          <cds-skeleton-text [lines]="3"></cds-skeleton-text>
        </div>
      } @else {
        <router-outlet />
      }
    </main>

  `,
})
export class ShellHostComponent {
  private readonly nav         = inject(WorkspaceNavigationAdapter);
  private readonly access      = inject(PlatformAccessStore);
  private readonly router      = inject(Router);
  private readonly platformId  = inject(PLATFORM_ID);
  private readonly titleSvc    = inject(Title);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly breadcrumbSvc = inject(BreadcrumbService);
  private readonly labelResolver = inject<WorkspaceNavLabelResolver | null>(
    WORKSPACE_NAV_LABEL_RESOLVER, { optional: true },
  );

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // ── Viewport / nav state ──────────────────────────────────────────────────
  readonly isMobile     = signal(false);
  readonly sideNavActive = signal(true);
  readonly isRail       = signal(false);   // W-E: rail mode
  readonly navSearch    = signal('');       // W-D: filter

  // ── W-C: skeleton + title ─────────────────────────────────────────────────
  readonly isNavigating = signal(false);
  readonly pageTitle    = signal<string | null>(null);

  // ── W-B: breadcrumbs (from BreadcrumbService) ─────────────────────────────
  readonly breadcrumbs  = signal<Array<{ label: string; route?: string }>>([]);

  // ── Nav config ────────────────────────────────────────────────────────────
  readonly navConfig = computed(() => this.nav.navConfig());

  readonly navGroups = computed(() => {
    const groups = this.navConfig()?.groups ?? [];
    return groups
      .map((group) => ({
        ...group,
        items: (group.items ?? []).filter(
          (item: DosNavItem) => !!item.route,
        ),
      }))
      .filter((group) => group.items.length > 0);
  });

  // ── W-A: auto-expand active group ─────────────────────────────────────────
  readonly activeGroupId = computed(() => {
    const url = this.router.url.split('?')[0];
    return (
      this.navGroups().find((g) =>
        g.items.some((i: DosNavItem) => {
          const r = i.route?.split('?')[0];
          return r && (url === r || url.startsWith(`${r}/`));
        }),
      )?.id ?? null
    );
  });

  // ── W-D: filtered groups for search ──────────────────────────────────────
  readonly filteredGroups = computed(() => {
    const q = this.navSearch().toLowerCase().trim();
    if (!q) return this.navGroups();
    return this.navGroups()
      .map((g) => ({
        ...g,
        items: g.items.filter((i: DosNavItem) =>
          this.label(i).toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  });

  // ── Header labels ─────────────────────────────────────────────────────────
  readonly headerBrand = computed(
    () => this.labelResolver?.shellChromeString?.('shell.header.brand') ?? 'Shahin',
  );
  // Step 2.5 — Selected module label sourced from existing nav state.
  // No hardcoded module map; falls back to generic 'Workspace'.
  readonly headerWorkspaceTitle = computed(() => {
    const sel = this.selectedModuleLabel();
    if (sel) return sel;
    return this.labelResolver?.shellChromeString?.('shell.header.workspace_title') ?? 'Workspace';
  });
  readonly selectedModuleLabel = computed<string | null>(() => {
    // 1. Prefer the active sidenav group label.
    const id = this.activeGroupId();
    if (id) {
      const g = this.navGroups().find((g) => g.id === id);
      if (g) {
        const lbl = this.groupLabel(g.id, g.label);
        if (lbl) return lbl;
      }
    }
    // 2. Fall back to the first breadcrumb segment after the home crumb.
    const crumbs = this.breadcrumbs();
    if (crumbs.length >= 2) {
      const seg = (crumbs[1]?.label ?? '').toString().trim();
      if (seg) return seg;
    }
    return null;
  });
  readonly headerHomeRoute = computed((): string[] => {
    const raw = this.labelResolver?.shellChromeString?.('shell.header.home_route') ?? '/workspace-home';
    const parts = raw.replace(/^\/+/, '').split('/').filter(Boolean);
    return parts.length ? parts : ['workspace-home'];
  });
  readonly sideNavAriaLabel = computed(
    () => this.labelResolver?.shellChromeString?.('shell.sidenav.aria_label') ?? 'Workspace navigation',
  );

  // ── Effects ───────────────────────────────────────────────────────────────
  private readonly navRefreshEffect = effect(
    () => {
      this.access.loaded();
      this.access.modules();
      this.access.permissions();
      this.access.trialExpiredModules();
      queueMicrotask(() => {
        void this.nav.refresh().then(() => {
          // W-B: feed updated groups to breadcrumb service
          this.breadcrumbSvc.setGroups(this.navGroups() as unknown as ReadonlyArray<DosNavGroup>);
        });
      });
    },
    { allowSignalWrites: false },
  );

  constructor() {
    this.syncViewportState();

    // W-C: navigation skeleton + page title
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.isNavigating.set(true);
        } else if (
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError
        ) {
          this.isNavigating.set(false);
          this._syncTitle();
        }
      });

    // W-B: subscribe to breadcrumb updates
    const unsub = this.breadcrumbSvc.subscribe((crumbs) => this.breadcrumbs.set(crumbs));
    this.destroyRef.onDestroy(unsub);
  }

  @HostListener('window:resize')
  onResize(): void { this.syncViewportState(); }

  // ── Public methods ────────────────────────────────────────────────────────
  toggleSideNav(): void { this.sideNavActive.update((v) => !v); }

  toggleRail(): void {
    this.isRail.update((v) => !v);
    // Ensure sidenav stays open in rail mode
    if (!this.isRail()) this.sideNavActive.set(true);
  }

  onNav(item: DosNavItem): void {
    if (item.enabled === false || !item.route) return;
    void this.router.navigateByUrl(item.route);
    if (this.isMobile()) this.sideNavActive.set(false);
  }

  // W-A: router-exact active state
  isActive(item: DosNavItem): boolean {
    if (!item.route) return false;
    const url = this.router.url.split('?')[0].split('#')[0];
    const route = item.route.split('?')[0].split('#')[0];
    return url === route || url.startsWith(`${route}/`);
  }

  // W-I: disabled item tooltip
  disabledTitle(item: DosNavItem): string {
    const reason = (item as DosNavItem & { disabledReason?: string }).disabledReason;
    switch (reason) {
      case 'coming-soon':      return `${this.label(item)} — Coming soon`;
      case 'route-not-wired':  return `${this.label(item)} — Not yet available`;
      case 'backend-offline':  return `${this.label(item)} — Service offline`;
      case 'missing-permission': return `${this.label(item)} — Access restricted`;
      case 'not-entitled':     return `${this.label(item)} — Not in your plan`;
      default: return this.label(item);
    }
  }

  label(item: DosNavItem): string {
    const direct = (item.label || '').toString().trim();
    const key    = (item.labelKey || item.id || '').toString();
    const resolved = this.labelResolver?.navItemLabel(direct || key, item.id);
    if (resolved) return resolved;
    if (direct) return direct;
    return this.labelFromKey(key);
  }

  groupLabel(id: string, label?: string): string {
    const resolved = this.labelResolver?.navGroupLabel(label || id);
    if (resolved) return resolved;
    return label || this.labelFromKey(id);
  }

  groupIcon(groupId: string): string {
    return GROUP_ICONS[groupId] ?? 'folder';
  }

  labelFromKey(key: string): string {
    const raw = (key || '').toString().trim();
    const seg = raw.split('.').pop() || raw;
    return seg
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private _user() {
    const me = this.access.me() as {
      user?: { displayName?: string; name?: string; email?: string } | null;
    } | null;
    return me?.user;
  }

  private _syncTitle(): void {
    // W-G: sync document <title> from active route data.title or breadcrumb
    const crumbs = this.breadcrumbs();
    if (crumbs.length > 0) {
      const last = crumbs[crumbs.length - 1];
      this.pageTitle.set(last.label);
      this.titleSvc.setTitle(`${last.label} — ${this.headerBrand()}`);
    } else {
      this.pageTitle.set(null);
      this.titleSvc.setTitle(this.headerBrand());
    }
  }

  private syncViewportState(): void {
    if (!this.isBrowser) {
      this.isMobile.set(false);
      this.sideNavActive.set(true);
      return;
    }
    const mobile = window.innerWidth < CARBON_BREAKPOINT_LARGE_PX;
    this.isMobile.set(mobile);
    this.sideNavActive.set(!mobile);
    if (mobile) this.isRail.set(false);
  }

}