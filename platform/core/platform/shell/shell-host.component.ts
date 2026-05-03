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
// Phase H — Carbon chrome is now consumed exclusively through the
// @dos/ui-system workspace-host-kit (Carbon-only wrappers under
// platform/ui-system/dos-ui-system/src/shell/*). Direct
// `carbon-components-angular` imports are forbidden here per
// UNIFIED_MOUNT_POLICY §1 and ui-os-carbon-boundary-guard.
import {
  DosAppShellComponent,
  DosMobileShellComponent,
  DosMobileDrawerComponent,
  DosWorkspaceHeaderComponent,
  DosWorkspaceSidebarComponent,
  DosMobileBottomNavComponent,
  DosCommandSearchComponent,
  DosInboxCenterComponent,
  DosQuickCreateComponent,
  DosSkeletonComponent,
  DosIconComponent,
  type DosBottomNavItem,
  type CommandSearchResult,
  type InboxMessage,
  type QuickCreateAction,
} from '@dos/ui-system';
import type { WorkspaceNavItem } from '@dos/ui-system';
import {
  WorkspaceNavigationAdapter,
  AccessStore as PlatformAccessStore,
  WORKSPACE_NAV_LABEL_RESOLVER,
  type WorkspaceNavLabelResolver,
} from '@dos/access-store';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
import { BreadcrumbService } from './breadcrumb.service';

const CARBON_BREAKPOINT_LARGE_PX = 1056;
const FALLBACK_GROUP_ICON = 'layout-dashboard';
const FALLBACK_ITEM_ICON  = 'dot';

@Component({
  selector: 'app-shell-host',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    DosAppShellComponent,
    DosMobileShellComponent,
    DosMobileDrawerComponent,
    DosWorkspaceHeaderComponent,
    DosWorkspaceSidebarComponent,
    DosMobileBottomNavComponent,
    DosCommandSearchComponent,
    DosInboxCenterComponent,
    DosQuickCreateComponent,
    DosSkeletonComponent,
    DosIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100vh; }

    /* Header chrome — owned by dos-workspace-header projection slots. */
    .shell-header-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--cds-text-on-color, #fff);
      border-radius: 2px;
      transition: background 0.15s;
    }
    .shell-header-toggle:hover { background: var(--cds-layer-hover, rgba(255,255,255,0.08)); }
    .shell-header-brand {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }
    .shell-header-brand a { color: inherit; text-decoration: none; }

    /* Breadcrumb strip — pure HTML; no Carbon import. */
    .shell-breadcrumb {
      padding: var(--cds-spacing-03, 0.5rem) var(--cds-spacing-06, 1.5rem);
      background: var(--cds-layer-01, #f4f4f4);
      border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    }
    .shell-breadcrumb ol { display: flex; gap: var(--cds-spacing-03, 0.5rem); list-style: none; margin: 0; padding: 0; flex-wrap: wrap; }
    .shell-breadcrumb a { color: var(--cds-link-primary, #0f62fe); text-decoration: none; }
    .shell-breadcrumb a:hover { text-decoration: underline; }
    .shell-breadcrumb__sep { margin-inline-start: var(--cds-spacing-03, 0.5rem); color: var(--cds-text-secondary, #6f6f6f); }

    /* Page title strip. */
    .shell-page-header { padding: var(--cds-spacing-05, 1rem) var(--cds-spacing-06, 1.5rem) 0; max-width: 1600px; }
    .shell-page-title { margin: 0; font-size: 1.75rem; font-weight: 400; line-height: 1.25; color: var(--cds-text-primary, #161616); }

    /* Skeleton container. */
    .shell-skeleton { padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem); display: grid; gap: var(--cds-spacing-05, 1rem); }

    /* Header-mounted command-search — keep narrow inside the inverse bar. */
    .shell-header-cmd { display: inline-block; min-width: 12rem; max-width: 22rem; }
    .shell-header-cmd ::ng-deep .dos-command-search__input {
      background: var(--cds-field-02, rgba(255,255,255,0.08));
      color: var(--cds-text-on-color, #fff);
      border: 1px solid transparent;
      height: 32px;
      padding: 0 .5rem;
      font-size: .875rem;
    }
    .shell-header-cmd ::ng-deep .dos-command-search__input::placeholder {
      color: var(--cds-text-placeholder-on-color, rgba(255,255,255,0.6));
    }
  `],
  template: `
    <!-- Phase H — workspace-host-kit consumer mount.
         Desktop  → dos-app-shell + dos-workspace-sidebar
         Mobile   → dos-mobile-shell + dos-mobile-drawer + dos-mobile-bottom-nav
         Common   → dos-workspace-header (header surface), dos-skeleton (loading).
         No raw cds-* tags. -->

    <ng-template #headerTpl>
      <dos-workspace-header shellHeader [title]="headerWorkspaceTitle()">
        <ng-container headerStart>
          <button type="button"
                  class="shell-header-toggle"
                  [attr.aria-label]="ariaToggleNav()"
                  (click)="toggleSideNav()">
            <dos-icon name="menu" [size]="20" [ariaLabel]="ariaToggleNav()"></dos-icon>
          </button>
          <span class="shell-header-brand">
            <a [routerLink]="headerHomeRoute()">{{ headerBrand() }}</a>
          </span>
        </ng-container>
        <ng-container headerEnd>
          @if (!isMobile()) {
            <dos-command-search class="shell-header-cmd"
                                [results]="commandResults()"
                                [placeholder]="commandPlaceholder()"
                                [ariaLabel]="commandAria()"
                                (queryChange)="onCommandQuery($event)"
                                (select)="onCommandSelect($event)">
            </dos-command-search>
          }
          <button type="button"
                  class="shell-header-toggle"
                  [attr.aria-label]="inboxToggleAria()"
                  [attr.aria-expanded]="inboxOpen()"
                  (click)="toggleInbox()">
            <dos-icon name="bell" [size]="20" [ariaLabel]="inboxToggleAria()"></dos-icon>
          </button>
          @if (!isMobile()) {
            <button type="button"
                    class="shell-header-toggle"
                    [attr.title]="ariaToggleRail()"
                    [attr.aria-label]="ariaToggleRail()"
                    (click)="toggleRail()">
              <dos-icon [name]="isRail() ? 'chevron-right' : 'chevron-left'"
                        [size]="20"
                        [ariaLabel]="ariaToggleRail()"></dos-icon>
            </button>
          }
        </ng-container>
      </dos-workspace-header>
    </ng-template>

    <ng-template #breadcrumbTpl>
      @if (breadcrumbs().length > 1) {
        <nav class="shell-breadcrumb" id="shell-breadcrumb-strip" [attr.aria-label]="ariaBreadcrumb()">
          <ol>
            @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
              <li>
                @if (!last && crumb.route) {
                  <a [routerLink]="crumb.route">{{ crumb.label }}</a>
                } @else {
                  <span>{{ crumb.label }}</span>
                }
                @if (!last) { <span class="shell-breadcrumb__sep" aria-hidden="true">/</span> }
              </li>
            }
          </ol>
        </nav>
      }
    </ng-template>

    <ng-template #titleTpl>
      @if (pageTitle()) {
        <div class="shell-page-header" id="shell-page-header">
          <h1 class="shell-page-title">{{ pageTitle() }}</h1>
        </div>
      }
    </ng-template>

    <ng-template #mainTpl>
      @if (isNavigating()) {
        <div class="shell-skeleton" id="shell-nav-skeleton" aria-busy="true" [attr.aria-label]="ariaLoadingPage()">
          <dos-skeleton shape="line" [rows]="6" [ariaLabel]="ariaLoadingPage()"></dos-skeleton>
        </div>
      } @else {
        <router-outlet />
      }
    </ng-template>

    @if (isMobile()) {
      <!-- Mobile chrome: dos-mobile-shell + dos-mobile-drawer + dos-mobile-bottom-nav. -->
      <dos-mobile-shell>
        <ng-container *ngTemplateOutlet="headerTpl"></ng-container>
        <ng-container *ngTemplateOutlet="breadcrumbTpl"></ng-container>
        <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
        <ng-container *ngTemplateOutlet="mainTpl"></ng-container>

        @if (mobileBottomItems().length > 0) {
          <dos-mobile-bottom-nav shellBottomNav
                                 [items]="mobileBottomItems()"
                                 [dir]="sidebarDir()"
                                 [ariaLabel]="mobileBottomNavAria()"
                                 (select)="onMobileNavSelect($event)">
          </dos-mobile-bottom-nav>
        }

        <dos-mobile-drawer shellDrawer
                           [open]="sideNavActive()"
                           [title]="drawerTitle()"
                           [dir]="sidebarDir()"
                           [closeLabel]="drawerCloseLabel()"
                           (closed)="closeSideNav()">
          @if (sidebarItems().length > 0) {
            <dos-workspace-sidebar
              [items]="sidebarItems()"
              [collapsed]="false"
              [dir]="sidebarDir()"
              [ariaLabel]="sideNavAriaLabel()"
              (navigate)="onSidebarNavigate($event)">
            </dos-workspace-sidebar>
          }
        </dos-mobile-drawer>
      </dos-mobile-shell>
    } @else {
      <!-- Desktop chrome: dos-app-shell + dos-workspace-sidebar. -->
      <dos-app-shell [mobile]="false">
        <ng-container *ngTemplateOutlet="headerTpl"></ng-container>

        @if (sidebarItems().length > 0 && sideNavActive()) {
          <dos-workspace-sidebar shellSidebar
                                 [items]="sidebarItems()"
                                 [collapsed]="isRail()"
                                 [dir]="sidebarDir()"
                                 [ariaLabel]="sideNavAriaLabel()"
                                 (navigate)="onSidebarNavigate($event)">
          </dos-workspace-sidebar>
        }

        <ng-container *ngTemplateOutlet="breadcrumbTpl"></ng-container>
        <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
        <ng-container *ngTemplateOutlet="mainTpl"></ng-container>
      </dos-app-shell>
    }

    <!-- Global action surfaces — fixed-position overlays, render once. -->
    <dos-inbox-center [open]="inboxOpen()"
                      [mobileMode]="isMobile()"
                      [messages]="inboxMessages()"
                      [title]="inboxTitle()"
                      [ariaLabel]="inboxAria()"
                      [closeLabel]="drawerCloseLabel()"
                      [emptyText]="inboxEmpty()"
                      (select)="onInboxSelect($event)"
                      (closed)="closeInbox()">
    </dos-inbox-center>

    @if (quickCreateActions().length > 0) {
      <dos-quick-create [actions]="quickCreateActions()"
                        [mobileMode]="isMobile()"
                        [ariaLabel]="quickCreateAria()"
                        [fabGlyph]="quickCreateGlyph()"
                        (invoke)="onQuickCreate($event)">
      </dos-quick-create>
    }
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
  // Phase H — every chrome string MUST come from the resolver. No hardcoded
  // English literals remain in this file; missing keys render empty so the
  // gap is observable at runtime instead of being masked by fake defaults.
  readonly headerBrand = computed(
    () => this.labelResolver?.shellChromeString?.('shell.header.brand') ?? '',
  );
  // Step 2.5 — Selected module label sourced from existing nav state.
  // Falls back to the resolver-owned chrome string when no module is active.
  readonly headerWorkspaceTitle = computed(() => {
    const sel = this.selectedModuleLabel();
    if (sel) return sel;
    return this.labelResolver?.shellChromeString?.('shell.header.workspace_title') ?? '';
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
    const raw = this.labelResolver?.shellChromeString?.('shell.header.home_route') ?? '';
    const parts = raw.replace(/^\/+/, '').split('/').filter(Boolean);
    return parts;
  });
  readonly sideNavAriaLabel = computed(
    () => this.labelResolver?.shellChromeString?.('shell.sidenav.aria_label') ?? '',
  );

  // Phase H — chrome aria/labels resolved through WorkspaceNavLabelResolver.
  readonly ariaToggleNav = computed(
    () => this.labelResolver?.shellChromeString?.(
      this.sideNavActive() ? 'shell.header.hide_navigation' : 'shell.header.show_navigation',
    ) ?? '',
  );
  readonly ariaToggleRail = computed(
    () => this.labelResolver?.shellChromeString?.(
      this.isRail() ? 'shell.header.expand_sidebar' : 'shell.header.collapse_to_rail',
    ) ?? '',
  );
  readonly ariaBreadcrumb = computed(
    () => this.labelResolver?.shellChromeString?.('shell.breadcrumb.aria') ?? '',
  );
  readonly ariaLoadingPage = computed(
    () => this.labelResolver?.shellChromeString?.('shell.skeleton.loading_page') ?? '',
  );
  readonly drawerTitle = computed(
    () => this.selectedModuleLabel()
       ?? this.labelResolver?.shellChromeString?.('shell.drawer.title')
       ?? this.headerBrand(),
  );
  readonly drawerCloseLabel = computed(
    () => this.labelResolver?.shellChromeString?.('shell.drawer.close') ?? '',
  );
  readonly mobileBottomNavAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.mobile_bottom_nav.aria') ?? '',
  );

  // ── Global action surfaces — command-search / inbox-center / quick-create ─
  readonly inboxOpen           = signal(false);
  readonly commandQuery        = signal('');
  // Backend feeds will populate these signals through a binding service in a
  // follow-up phase. For now expose typed empty arrays so the surfaces mount
  // and render their localized empty/placeholder states.
  readonly commandResults      = signal<CommandSearchResult[]>([]);
  readonly inboxMessages       = signal<InboxMessage[]>([]);
  readonly quickCreateActions  = signal<QuickCreateAction[]>([]);

  readonly commandAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.command.aria') ?? '',
  );
  readonly commandPlaceholder = computed(
    () => this.labelResolver?.shellChromeString?.('shell.command.placeholder') ?? '',
  );
  readonly inboxTitle = computed(
    () => this.labelResolver?.shellChromeString?.('shell.inbox.title') ?? '',
  );
  readonly inboxAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.inbox.aria') ?? '',
  );
  readonly inboxEmpty = computed(
    () => this.labelResolver?.shellChromeString?.('shell.inbox.empty') ?? '',
  );
  readonly inboxToggleAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.inbox.toggle') ?? '',
  );
  readonly quickCreateAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.quick.aria') ?? '',
  );
  readonly quickCreateGlyph = computed(
    () => this.labelResolver?.shellChromeString?.('shell.quick.fab_glyph') || '+',
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

  closeSideNav(): void { this.sideNavActive.set(false); }

  // ── Global action handlers ────────────────────────────────────────────────
  toggleInbox(): void { this.inboxOpen.update((v) => !v); }
  closeInbox(): void { this.inboxOpen.set(false); }

  onCommandQuery(q: string): void { this.commandQuery.set(q); }

  onCommandSelect(r: CommandSearchResult): void {
    if (r.route) void this.router.navigateByUrl(r.route);
  }

  onInboxSelect(m: InboxMessage): void {
    if (m.route) {
      void this.router.navigateByUrl(m.route);
      this.closeInbox();
    }
  }

  onQuickCreate(a: QuickCreateAction): void {
    if (a.route) void this.router.navigateByUrl(a.route);
  }

  // cmd-K / ctrl-K — focus command-search input.
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(ev: KeyboardEvent): void {
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      if (!this.isBrowser) return;
      const el = document.querySelector<HTMLInputElement>(
        '.shell-header-cmd .dos-command-search__input',
      );
      el?.focus();
      el?.select?.();
    }
  }

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

  // Phase H — workspace-host-kit feeds.
  readonly sidebarDir = computed<'ltr' | 'rtl'>(() => {
    if (!this.isBrowser) return 'ltr';
    const d = (document.documentElement.getAttribute('dir') || '').toLowerCase();
    return d === 'rtl' ? 'rtl' : 'ltr';
  });

  readonly sidebarItems = computed<WorkspaceNavItem[]>(() => {
    const out: WorkspaceNavItem[] = [];
    for (const group of this.filteredGroups()) {
      const groupName = this.groupLabel(group.id, group.label);
      for (const it of group.items) {
        if (!it.route) continue;
        if (it.enabled === false) continue;
        const badgeNum = it.badge != null ? Number(it.badge) : NaN;
        const item: WorkspaceNavItem = {
          id: it.id,
          label: { i18nKey: it.labelKey || it.id, fallback: this.label(it) },
          icon: this.itemIcon(it, group.id),
          route: it.route,
          active: this.isActive(it),
          group: groupName,
        };
        if (it.requiredPermission) item.permission = it.requiredPermission;
        if (Number.isFinite(badgeNum) && badgeNum > 0) item.badgeCount = badgeNum;
        out.push(item);
      }
    }
    return out;
  });

  readonly mobileBottomItems = computed<DosBottomNavItem[]>(() => {
    const out: DosBottomNavItem[] = [];
    for (const group of this.navGroups()) {
      const first = group.items.find((i: DosNavItem) => !!i.route && i.enabled !== false);
      if (!first) continue;
      out.push({
        id: first.id,
        label: this.label(first),
        icon: this.itemIcon(first, group.id),
        route: first.route,
        active: this.isActive(first),
      });
      if (out.length === 4) break;
    }
    return out;
  });

  onSidebarNavigate(item: WorkspaceNavItem): void {
    if (!item.route) return;
    void this.router.navigateByUrl(item.route);
    if (this.isMobile()) this.sideNavActive.set(false);
  }

  onMobileNavSelect(item: DosBottomNavItem): void {
    if (!item.route) return;
    void this.router.navigateByUrl(item.route);
  }

  // W-A: router-exact active state
  isActive(item: DosNavItem): boolean {
    if (!item.route) return false;
    const url = this.router.url.split('?')[0].split('#')[0];
    const route = item.route.split('?')[0].split('#')[0];
    return url === route || url.startsWith(`${route}/`);
  }

  // W-I: disabled item tooltip — reason text resolved through resolver.
  disabledTitle(item: DosNavItem): string {
    const reason = (item as DosNavItem & { disabledReason?: string }).disabledReason;
    if (!reason) return this.label(item);
    const key = `shell.nav.disabled.${reason.replace(/-/g, '_')}`;
    const txt = this.labelResolver?.shellChromeString?.(key);
    return txt ? `${this.label(item)} — ${txt}` : this.label(item);
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
    const key = `shell.group.icon.${groupId}`;
    return this.labelResolver?.shellChromeString?.(key) || FALLBACK_GROUP_ICON;
  }

  itemIcon(item: DosNavItem, groupId: string): string {
    const direct = (item.icon || '').toString().trim();
    if (direct) return direct;
    const key = `shell.item.icon.${item.id}`;
    const resolved = this.labelResolver?.shellChromeString?.(key);
    if (resolved) return resolved;
    const grp = this.groupIcon(groupId);
    return grp || FALLBACK_ITEM_ICON;
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