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
  DosWorkspaceStatusBarComponent,
  DosActionQueueComponent,
  DosAgentActivityStripComponent,
  DosContextPanelComponent,
  DosAccountMenuComponent,
  DosSkeletonComponent,
  DosIconComponent,
  DosToastOutletComponent,
  DosShellBannerStripComponent,
  type DosBottomNavItem,
  type DosAccountMenuItem,
  type DosToastMessage,
  type ShellBanner,
} from '@dos/ui-system';
import { DosCarbonSearchComponent } from '@dos/ui-system';
import {
  WorkspaceNavigationAdapter,
  AccessStore as PlatformAccessStore,
  WORKSPACE_NAV_LABEL_RESOLVER,
  type WorkspaceNavLabelResolver,
} from '@dos/access-store';
import type { DosNavGroup, DosNavItem, ShellAccountMenuEntry } from '@dos/ui-contracts';
import { BreadcrumbService } from './breadcrumb.service';
import { WorkspaceShellBindingService, type WorkspaceShellZone } from './workspace-shell-binding.service';
import { ShellPreferencesService } from './shell-preferences.service';
import { ShellErrorStateService } from './shell-error-state.service';
import { ToastService } from '../../../dos/shell/toast.service';

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
    DosWorkspaceStatusBarComponent,
    DosActionQueueComponent,
    DosAgentActivityStripComponent,
    DosContextPanelComponent,
    DosAccountMenuComponent,
    DosSkeletonComponent,
    DosIconComponent,
    DosToastOutletComponent,
    DosShellBannerStripComponent,
    DosCarbonSearchComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100vh; }

    /* Header chrome — owned by dos-workspace-header projection slots. */
    .shell-header-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--cds-spacing-07);
      height: var(--cds-spacing-07);
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--cds-text-on-color);
      border-radius: var(--cds-border-radius, 2px);
      transition: background 0.15s;
    }
    .shell-header-toggle:hover { background: var(--cds-layer-hover); }
    .shell-header-brand {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }
    .shell-header-brand a { color: inherit; text-decoration: none; }

    .shell-breadcrumb {
      padding: var(--cds-spacing-03) var(--cds-spacing-06);
      background: var(--cds-layer-01);
      border-bottom: 1px solid var(--cds-border-subtle-01);
    }
    .shell-breadcrumb ol { display: flex; gap: var(--cds-spacing-03); list-style: none; margin: 0; padding: 0; flex-wrap: wrap; }
    .shell-breadcrumb a { color: var(--cds-link-primary); text-decoration: none; }
    .shell-breadcrumb a:hover { text-decoration: underline; }
    .shell-breadcrumb__sep { margin-inline-start: var(--cds-spacing-03); color: var(--cds-text-secondary); }

    /* Page title strip. */
    .shell-page-header { padding: var(--cds-spacing-05, 1rem) var(--cds-spacing-06, 1.5rem) 0; max-width: 1600px; }
    .shell-page-title { margin: 0; font-size: 1.75rem; font-weight: 400; line-height: 1.25; color: var(--cds-text-primary, #161616); }

    /* Skeleton container. */
    .shell-skeleton { padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem); display: grid; gap: var(--cds-spacing-05, 1rem); }

    /* Header-mounted command-search — keep narrow inside the inverse bar. */
    .shell-header-cmd { display: inline-block; min-width: 12rem; max-width: 22rem; }
    .shell-header-cmd ::ng-deep .dos-command-search__input {
      background: var(--cds-field-02);
      color: var(--cds-text-on-color);
      border: 1px solid transparent;
      height: var(--cds-size-small, 32px);
      padding: 0 var(--cds-spacing-03);
      font-size: var(--cds-body-short-01-font-size);
    }
    .shell-header-cmd ::ng-deep .dos-command-search__input::placeholder {
      color: var(--cds-text-placeholder-on-color, rgba(255,255,255,0.6));
    }

    /* Wave F — mobile full-screen command-search overlay. */
    .shell-mobile-cmd {
      position: fixed; inset: 0;
      background: var(--cds-background);
      z-index: var(--dos-z-overlay, 90);
      display: flex; flex-direction: column;
      padding: var(--cds-spacing-05);
      gap: var(--cds-spacing-05);
    }
    .shell-mobile-cmd__bar { display: flex; align-items: center; gap: var(--cds-spacing-03, .5rem); }
    .shell-mobile-cmd__close {
      flex: 0 0 auto;
      width: 2rem; height: 2rem;
      background: none; border: 0; cursor: pointer;
      color: var(--cds-text-primary, #161616);
    }
    .shell-mobile-cmd__body { flex: 1; overflow: auto; }

    /* Wave F — action-queue + agent-strip in-flow placement (desktop only). */
    .shell-aux-strip { max-width: 1600px; padding-inline: var(--cds-spacing-06, 1.5rem); }
    .shell-aux-strip--top    { padding-block-start: var(--cds-spacing-03, .5rem); }
    .shell-aux-strip--bottom { padding-block-end:   var(--cds-spacing-03, .5rem); }

    /* Wave F — status-bar fixed bottom strip with mobile safe-area padding. */
    .shell-statusbar-fixed {
      position: fixed;
      inset-block-end: 0;
      inset-inline: 0;
      z-index: var(--dos-z-statusbar, 60);
      background: var(--cds-layer);
      border-block-start: 1px solid var(--cds-border-subtle-01);
      padding-block-end: env(safe-area-inset-bottom, 0);
    }
    @media (max-width: 480px) {
      /* Avoid overlap with DosMobileBottomNav and DosQuickCreate FAB. */
      .shell-statusbar-fixed { inset-block-end: var(--dos-mobile-nav-height, 56px); }
    }

    /* §B.9 #38 — skip-link for keyboard/screen-reader a11y. */
    .shell-skip-link {
      position: absolute;
      inset-block-start: -100%;
      inset-inline-start: 0;
      background: var(--cds-background);
      color: var(--cds-link-primary);
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      z-index: var(--dos-z-skiplink, 999);
      font-size: var(--cds-body-short-01-font-size);
      text-decoration: none;
    }
    .shell-skip-link:focus { inset-block-start: 0; }

    /* §B.9 #25 — blocking error frame (401/403/maintenance). */
    .shell-error-frame {
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      max-width: var(--dos-content-max-width-narrow, 600px);
      margin: 0 auto;
      text-align: center;
    }
    .shell-error-frame__kind {
      font-size: var(--cds-productive-heading-02-font-size);
      font-weight: 600;
      color: var(--cds-support-error);
      margin-block-end: var(--cds-spacing-03);
    }
    .shell-error-frame__message {
      color: var(--cds-text-secondary);
      margin-block-end: var(--cds-spacing-05);
    }
    .shell-error-frame__corr-id {
      display: inline-block;
      margin-block-end: var(--cds-spacing-05);
      padding: var(--cds-spacing-02) var(--cds-spacing-03);
      background: var(--cds-layer-01);
      font-family: var(--cds-code-01-font-family);
      font-size: var(--cds-code-01-font-size);
      user-select: all;
    }
    .shell-error-frame__action {
      background: none;
      border: 1px solid var(--cds-border-interactive);
      color: var(--cds-link-primary);
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      cursor: pointer;
      font-size: var(--cds-body-short-01-font-size);
    }
    .shell-error-frame__action:hover {
      background: var(--cds-layer-hover);
    }

    /* §B.9 #16 — sidebar search wrapper. */
    .shell-sidebar-search {
      padding: var(--cds-spacing-03, .5rem) var(--cds-spacing-04, .75rem);
      border-block-end: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    }
  `],
  template: `
    <!-- §B.9 #38 — skip-link for keyboard/screen-reader accessibility. -->
    <a class="shell-skip-link" href="#main-content">
      {{ labelResolver?.shellChromeString?.('shell.a11y.skip_to_main') ?? 'Skip to main content' }}
    </a>

    <!-- Phase H — workspace-host-kit consumer mount.
         Desktop  → dos-app-shell + dos-workspace-sidebar
         Mobile   → dos-mobile-shell + dos-mobile-drawer + dos-mobile-bottom-nav
         Common   → dos-workspace-header (header surface), dos-skeleton (loading).
         No raw cds-* tags. -->

    <ng-template #headerTpl>
      <dos-workspace-header shellHeader [title]="headerWorkspaceTitle()" [logoHref]="headerLogoHref()">
        <ng-container headerStart>
          <button type="button"
                  class="shell-header-toggle"
                  [attr.aria-label]="ariaToggleNav()"
                  (click)="toggleSideNav()">
            <dos-icon name="menu" [size]="20" [ariaLabel]="ariaToggleNav()"></dos-icon>
          </button>
          <!-- 2026-05-05 Slice-1: brand is now rendered exactly once by
               dos-workspace-header via the .dos-wh-brand-name projection.
               Carbon cds-header [name] was removed in
               workspace-header.component.ts:36 (dual-stamp collapse), so
               there is nothing to project here. Do NOT add a third stamp. -->
        </ng-container>
        <ng-container headerEnd>
          @if (!isMobile() && showCommandSearch()) {
            <dos-command-search class="shell-header-cmd"
                                [results]="commandResults()"
                                [placeholder]="commandPlaceholder()"
                                [ariaLabel]="commandAria()"
                                (queryChange)="onCommandQuery($event)"
                                (select)="onCommandSelect($event)">
            </dos-command-search>
          }
          @if (isMobile() && showCommandSearch()) {
            <!-- GAP-HDR-3 — mobile command-search launch button. -->
            <button type="button"
                    class="shell-header-toggle"
                    [attr.aria-label]="commandAria()"
                    [attr.aria-expanded]="mobileCmdOpen()"
                    (click)="toggleMobileCmd()">
              <dos-icon name="search" [size]="20" [ariaLabel]="commandAria()"></dos-icon>
            </button>
          }
          @if (showInbox()) {
            <button type="button"
                    class="shell-header-toggle"
                    [attr.aria-label]="inboxToggleAria()"
                    [attr.aria-expanded]="inboxOpen()"
                    (click)="toggleInbox()">
              <dos-icon name="bell" [size]="20" [ariaLabel]="inboxToggleAria()"></dos-icon>
            </button>
          }
          <!-- GAP-HDR-2 — account menu (Carbon header action + overflow menu). -->
          <dos-account-menu [userName]="userDisplayName()"
                            [userEmail]="userEmail()"
                            [buttonLabel]="accountAria() || 'Account menu'"
                            [items]="accountMenuItems()"
                            (action)="onAccountMenuAction($event)">
          </dos-account-menu>
          <!-- §B.9 #33 — help/support entry opens context panel on 'help' tab. -->
          @if (showContextPanel()) {
            <button type="button"
                    class="shell-header-toggle"
                    [attr.aria-label]="labelResolver?.shellChromeString?.('shell.header.help') ?? 'Help'"
                    [attr.aria-expanded]="contextOpen()"
                    (click)="openContextHelp()">
              <dos-icon name="help" [size]="20"
                        [ariaLabel]="labelResolver?.shellChromeString?.('shell.header.help') ?? 'Help'">
              </dos-icon>
            </button>
          }
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
      <main id="main-content" role="main">
        @if (errorState.hasError() && isBlockingError()) {
          <!-- §B.9 #25 — blocking error frame (401/403/maintenance). -->
          <div class="shell-error-frame" role="alert">
            <div class="shell-error-frame__kind">{{ errorState.error()?.kind }}</div>
            <div class="shell-error-frame__message">{{ errorState.error()?.message }}</div>
            @if (errorState.error()?.correlationId) {
              <code class="shell-error-frame__corr-id">{{ errorState.error()?.correlationId }}</code>
            }
            <button type="button" class="shell-error-frame__action" (click)="errorState.clearError()">
              {{ labelResolver?.shellChromeString?.('shell.error.dismiss') ?? 'Dismiss' }}
            </button>
          </div>
        } @else if (isNavigating()) {
          <div class="shell-skeleton" id="shell-nav-skeleton" aria-busy="true" [attr.aria-label]="ariaLoadingPage()">
            <dos-skeleton shape="line" [rows]="6" [ariaLabel]="ariaLoadingPage()"></dos-skeleton>
          </div>
        } @else {
          <router-outlet />
        }
      </main>
    </ng-template>

    @if (isMobile() && showShellMobile()) {
      <!-- Mobile chrome: dos-mobile-shell + dos-mobile-drawer + dos-mobile-bottom-nav. -->
      <dos-mobile-shell>
        @if (zoneHas('header')) {
          <ng-container *ngTemplateOutlet="headerTpl"></ng-container>
        }
        @if (zoneHas('main')) {
          <ng-container *ngTemplateOutlet="breadcrumbTpl"></ng-container>
        }
        @if (zoneHas('top-banners') && shellBanners().length > 0) {
          <dos-shell-banner-strip [banners]="shellBanners()"
                                  (action)="onBannerAction($event)"
                                  (dismiss)="onBannerDismiss($event)">
          </dos-shell-banner-strip>
        }
        @if (zoneHas('main')) {
          <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
          <ng-container *ngTemplateOutlet="mainTpl"></ng-container>
        }

        @if (zoneHas('mobile-nav') && mobileBottomItems().length > 0) {
          <dos-mobile-bottom-nav shellBottomNav
                                 [items]="mobileBottomItems()"
                                 [dir]="sidebarDir()"
                                 [ariaLabel]="mobileBottomNavAria()"
                                 (select)="onMobileNavSelect($event)">
          </dos-mobile-bottom-nav>
        }

        @if (zoneHas('mobile-drawer')) {
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
        }
      </dos-mobile-shell>
    } @else if (showShellDesktop()) {
      <!-- Desktop chrome: dos-app-shell + dos-workspace-sidebar. -->
      <dos-app-shell [mobile]="false">
        @if (zoneHas('header')) {
          <ng-container *ngTemplateOutlet="headerTpl"></ng-container>
        }

        @if (zoneHas('sidebar') && sidebarItems().length > 0 && sideNavActive()) {
          <!-- §B.9 #16 — sidebar search/filter input. -->
          @if (!isRail()) {
            <div class="shell-sidebar-search">
              <dos-carbon-search size="sm"
                                 [placeholder]="labelResolver?.shellChromeString?.('shell.sidebar.search_placeholder') ?? 'Filter navigation…'"
                                 [value]="navSearch()"
                                 (valueChange)="navSearch.set($event)">
              </dos-carbon-search>
            </div>
          }
          <dos-workspace-sidebar shellSidebar
                                 [items]="sidebarItems()"
                                 [collapsed]="isRail()"
                                 [dir]="sidebarDir()"
                                 [ariaLabel]="sideNavAriaLabel()"
                                 (navigate)="onSidebarNavigate($event)">
          </dos-workspace-sidebar>
        }

        @if (zoneHas('main')) {
          <ng-container *ngTemplateOutlet="breadcrumbTpl"></ng-container>
        }
        @if (zoneHas('top-banners') && shellBanners().length > 0) {
          <dos-shell-banner-strip [banners]="shellBanners()"
                                  (action)="onBannerAction($event)"
                                  (dismiss)="onBannerDismiss($event)">
          </dos-shell-banner-strip>
        }
        @if (zoneHas('main')) {
          <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
          <ng-container *ngTemplateOutlet="mainTpl"></ng-container>
        }
      </dos-app-shell>
    }

    <!-- Global action surfaces — DB-gated via workspace_shell_binding. -->
    @if (zoneHas('right-rail') && showInbox()) {
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
    }

    @if (zoneHas('fab') && showQuickCreate() && quickCreateActions().length > 0) {
      <dos-quick-create [actions]="quickCreateActions()"
                        [mobileMode]="isMobile()"
                        [ariaLabel]="quickCreateAria()"
                        [fabGlyph]="quickCreateGlyph()"
                        (invoke)="onQuickCreate($event)">
      </dos-quick-create>
    }

    <!-- Wave F — GAP-SURF-2 action-queue strip. Render gate is DB-driven
         (dos.workspace_shell_binding.enabled + perms_required). Content is
         hidden on mobile to avoid overlap with bottom-nav; the strip itself
         still respects the DB enabled flag on desktop. -->
    @if (zoneHas('bottom-status') && !isMobile() && showActionQueue() && actionQueueItems().length > 0) {
      <div class="shell-aux-strip shell-aux-strip--top">
        <dos-action-queue [items]="actionQueueItems()"
                          [mobileMode]="false"
                          [ariaLabel]="actionQueueAria()"
                          [title]="actionQueueTitle()"
                          [emptyText]="actionQueueEmpty()"
                          (open)="onActionQueueOpen($event)">
        </dos-action-queue>
      </div>
    }

    <!-- Wave F — GAP-SURF-3 agent-activity-strip. DB-gated. -->
    @if (zoneHas('bottom-status') && !isMobile() && showAgentStrip() && agentActivities().length > 0) {
      <div class="shell-aux-strip shell-aux-strip--bottom">
        <dos-agent-activity-strip [activities]="agentActivities()"
                                  [mobileMode]="false"
                                  (select)="onAgentSelect($event)">
        </dos-agent-activity-strip>
      </div>
    }

    <!-- Wave F — GAP-SURF-4 context-panel. DB-gated — rendered only when
         the per-tenant binding enables it AND the session holds the required
         permissions. The wrapper itself is [open]-gated internally. -->
    @if (zoneHas('right-rail') && showContextPanel()) {
      <dos-context-panel [views]="contextViews()"
                         [activeTab]="contextTab()"
                         [open]="contextOpen()"
                         [mobileMode]="isMobile()"
                         [dir]="sidebarDir()"
                         (tabChange)="onContextTabChange($event)">
      </dos-context-panel>
    }

    <!-- Wave F — GAP-SURF-1 status-bar. DB-gated. -->
    @if (zoneHas('bottom-status') && showStatusBar() && statusBarSignals().length > 0) {
      <div class="shell-statusbar-fixed">
        <dos-workspace-status-bar [signals]="statusBarSignals()"
                                  [mobileMode]="isMobile()"
                                  (signalClick)="onStatusSignal($event)">
        </dos-workspace-status-bar>
      </div>
    }

    <!-- GAP-HDR-3 — mobile command-search full-screen overlay. -->
    @if (zoneHas('header') && isMobile() && mobileCmdOpen()) {
      <div class="shell-mobile-cmd" role="dialog" [attr.aria-label]="commandAria()">
        <div class="shell-mobile-cmd__bar">
          <button type="button"
                  class="shell-mobile-cmd__close"
                  [attr.aria-label]="drawerCloseLabel()"
                  (click)="closeMobileCmd()">
            <dos-icon name="close" [size]="20" [ariaLabel]="drawerCloseLabel()"></dos-icon>
          </button>
          <dos-command-search [results]="commandResults()"
                              [placeholder]="commandPlaceholder()"
                              [ariaLabel]="commandAria()"
                              (queryChange)="onCommandQuery($event)"
                              (select)="onMobileCommandSelect($event)">
          </dos-command-search>
        </div>
      </div>
    }

    <!-- §B.9 #32 — toast outlet (singleton, not workspace.* gated). -->
    @if (zoneHas('toast')) {
      <dos-toast-outlet [messages]="toastMessages()"
                        (dismissed)="onToastDismissed($event)">
      </dos-toast-outlet>
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
  private readonly shellBinding = inject(WorkspaceShellBindingService);
  private readonly prefs = inject(ShellPreferencesService);
  readonly errorState = inject(ShellErrorStateService);
  private readonly toastSvc = inject(ToastService);
  protected readonly labelResolver = inject<WorkspaceNavLabelResolver | null>(
    WORKSPACE_NAV_LABEL_RESOLVER, { optional: true },
  );

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // ── Viewport / nav state ──────────────────────────────────────────────────
  readonly isMobile     = signal(false);
  readonly sideNavActive = signal(true);
  readonly isRail       = signal(false);   // W-E: rail mode
  readonly navSearch    = signal('');       // W-D: filter

  // ── §B.9 P2/P4 — toast, offline, banner state ─────────────────────────────
  readonly toastMessages = signal<DosToastMessage[]>([]);
  readonly isOffline     = signal(false);
  private readonly dismissedBannerIds = signal<Set<string>>(new Set());

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
  // Wave F / Dynamic-UI policy: chrome strings flow dynamic-first, catalog-
  // last. Priority order for every header label is:
  //   1. workspace.header.props.* from `dos.workspace_shell_binding` (live
  //      per-tenant, served by GET /api/ui-os/workspace-shell/:tenantId).
  //   2. tenant name/code from AccessStore (dynamic per-tenant fallback).
  //   3. product-level i18n catalog (`WorkspaceNavLabelResolver`).
  //   4. empty string (observable gap, per Phase H policy — no fake defaults).
  readonly headerBrand = computed(
    () => this.shellBinding.headerBrandLabel()
       ?? this.access.tenant()?.name
       ?? this.access.tenant()?.code
       ?? this.labelResolver?.shellChromeString?.('shell.header.brand')
       ?? '',
  );
  // Step 2.5 — Selected module label sourced from existing nav state.
  // Falls back to the resolver-owned chrome string when no module is active,
  // and ultimately to the binding-served workspace title if present.
  readonly headerWorkspaceTitle = computed(() => {
    const sel = this.selectedModuleLabel();
    if (sel) return sel;
    return this.shellBinding.headerWorkspaceTitle()
        ?? this.labelResolver?.shellChromeString?.('shell.header.workspace_title')
        ?? '';
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
    const raw = this.shellBinding.headerHomeRoute() ?? '';
    const parts = raw.replace(/^\/+/, '').split('/').filter(Boolean);
    return parts;
  });
  readonly headerLogoHref = computed((): string => {
    return this.shellBinding.headerLogoHref() ?? '/';
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
  // Wave F / GAP-RES-1 — surface payloads are resolver-fed by
  // WorkspaceShellBindingService consuming
  // GET /api/ui-os/workspace-shell/:tenantId (dos.workspace_shell_binding).
  // Empty arrays render localized empty/placeholder states fail-soft.
  readonly commandResults: () => unknown[]      = this.shellBinding.commandResults;
  readonly inboxMessages: () => unknown[]              = this.shellBinding.inboxMessages;
  readonly quickCreateActions: () => unknown[]    = this.shellBinding.quickCreateActions;
  readonly statusBarSignals: () => unknown[]        = this.shellBinding.statusBarSignals;
  readonly actionQueueItems: () => unknown[]        = this.shellBinding.actionQueueItems;
  readonly agentActivities: () => unknown[]           = this.shellBinding.agentActivities;
  readonly contextViews: () => unknown[]           = this.shellBinding.contextViews;

  // ── Dynamic render gates — Zone-based, fully resolver-driven ─────────────
  // Every surface render is gated on zone membership from the resolver.
  // The shell-host never references specific component_key strings.
  // The binding-service resolves zone from: row.zone → props.zone → null.
  readonly showShellApp         = computed(() => this.shellBinding.zoneHas('header'));
  readonly showShellDesktop     = computed(() => this.shellBinding.zoneHas('header'));
  readonly showShellMobile      = computed(() => this.shellBinding.zoneHas('header'));
  readonly showShellDesktopSidebar = computed(() => this.shellBinding.zoneHas('sidebar'));
  readonly showStatusBar        = computed(() => this.shellBinding.zoneHas('bottom-status'));
  readonly showActionQueue      = computed(() => this.shellBinding.zoneHas('bottom-status'));
  readonly showAgentStrip       = computed(() => this.shellBinding.zoneHas('bottom-status'));
  readonly showContextPanel     = computed(() => this.shellBinding.zoneHas('right-rail'));
  readonly showInbox            = computed(() => this.shellBinding.zoneHas('right-rail'));
  readonly showQuickCreate      = computed(() => this.shellBinding.zoneHas('fab'));
  readonly showCommandSearch    = computed(() => this.shellBinding.zoneHas('header'));
  readonly zoneHas              = (zone: WorkspaceShellZone) => this.shellBinding.zoneHas(zone);
  // Dynamic delegators (binding-renderer-parity gate): the shell-host
  // surfaces the binding-service contract verbs without hardcoding any
  // component_key. Templates can resolve any surface row by zone, read
  // arbitrary props by name, and gate render on permission flags — all
  // resolver-driven (DB → zone → component_key).
  readonly surfacesByZone = (zone: WorkspaceShellZone) => this.shellBinding.surfacesByZone(zone);
  readonly surfaceProp = <T>(key: string, propName: string): T | null =>
    this.shellBinding.surfaceProp<T>(key, propName);
  readonly isSurfaceAllowed = (key: string): boolean =>
    this.shellBinding.isSurfaceAllowed(key);

  // ── §B.9 P4 — banner multiplex (#25, #34–37) ──────────────────────────────
  readonly shellBanners = computed<ShellBanner[]>(() => {
    const banners: ShellBanner[] = [];
    const dismissed = this.dismissedBannerIds();

    // #36 — trial/subscription banner
    const expired = this.access.trialExpiredModules() as string[];
    if (expired.length > 0 && !dismissed.has('trial-expired')) {
      banners.push({
        id: 'trial-expired',
        kind: 'warning',
        title: this.labelResolver?.shellChromeString?.('shell.banner.trial_expired.title') ?? 'Trial Expired',
        message: (this.labelResolver?.shellChromeString?.('shell.banner.trial_expired.message') ?? 'Modules expired: ') + expired.join(', '),
        dismissible: true,
        actionLabel: this.labelResolver?.shellChromeString?.('shell.banner.trial_expired.action') ?? 'Upgrade',
        actionRoute: '/settings/subscription',
      });
    }

    // #37 — offline/reconnect banner
    if (this.isOffline() && !dismissed.has('offline')) {
      banners.push({
        id: 'offline',
        kind: 'danger',
        title: this.labelResolver?.shellChromeString?.('shell.banner.offline.title') ?? 'Offline',
        message: this.labelResolver?.shellChromeString?.('shell.banner.offline.message') ?? 'You are offline. Some features may be unavailable.',
        dismissible: false,
      });
    }

    // #25 — global error frame (from ShellErrorStateService + #40 correlation-id)
    const err = this.errorState.error();
    if (err && !dismissed.has('shell-error')) {
      const corrId = err.correlationId;
      banners.push({
        id: 'shell-error',
        kind: 'danger',
        title: err.kind,
        message: err.message + (corrId ? ` (ID: ${corrId})` : ''),
        dismissible: true,
      });
    }

    // #34 — session-expiry warning
    const expiresAt = this.access.sessionExpiresAt();
    if (expiresAt && !dismissed.has('session-expiry')) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const minsLeft = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 60000));
      if (minsLeft <= 5) {
        banners.push({
          id: 'session-expiry',
          kind: minsLeft <= 1 ? 'danger' : 'warning',
          title: this.labelResolver?.shellChromeString?.('shell.banner.session_expiry.title') ?? 'Session Expiring',
          message: (this.labelResolver?.shellChromeString?.('shell.banner.session_expiry.message') ?? 'Your session expires in ') + minsLeft + ' minute' + (minsLeft !== 1 ? 's' : '') + '.',
          dismissible: false,
        });
      }
    }

    // #35 — impersonation banner
    if (this.access.isImpersonating() && !dismissed.has('impersonation')) {
      banners.push({
        id: 'impersonation',
        kind: 'warning',
        title: this.labelResolver?.shellChromeString?.('shell.banner.impersonation.title') ?? 'Impersonation Mode',
        message: this.labelResolver?.shellChromeString?.('shell.banner.impersonation.message') ?? 'You are viewing this workspace as another user.',
        dismissible: false,
      });
    }

    return banners;
  });

  // §B.9 #25 — blocking errors replace content slot with error frame.
  readonly isBlockingError = computed(() => {
    const err = this.errorState.error();
    if (!err) return false;
    return err.kind === 'unauthorized' || err.kind === 'forbidden' || err.kind === 'maintenance';
  });

  // ── Wave F — new header/overlay UI state ──────────────────────────────────
  readonly mobileCmdOpen = signal(false);
  readonly contextOpen   = signal(false);
  readonly contextTab    = signal<string>('record');
  // Dynamic-first account menu: prefer DB (workspace.header.props.accountMenu
  // via WorkspaceShellBindingService) over the platform-default adapter
  // constant. Both sources are signals so the UI reacts to either flipping.
  readonly accountMenuEntries = computed<ReadonlyArray<ShellAccountMenuEntry>>(
    () => this.shellBinding.accountMenuEntries() ?? this.nav.accountMenuConfig(),
  );
  // Map platform-owned ShellAccountMenuEntry → DosAccountMenuItem shape
  // consumed by the @dos/ui-system primitive. Labels are i18n-resolved via
  // WorkspaceNavLabelResolver; the `ShellAccountMenuEntry.route` is carried
  // into an internal map (see `accountRouteById`) because DosAccountMenuItem
  // has no route field — only `action` emits the id on click.
  readonly accountMenuItems = computed<DosAccountMenuItem[]>(() => {
    const base = this.accountMenuEntries().map((e) => ({
      id: e.id,
      label: this.accountLabel(e),
      destructive: !!e.destructive,
    }));
    // #7 — language toggle (EN/AR)
    const langLabel = this.prefs.language() === 'ar'
      ? (this.labelResolver?.shellChromeString?.('shell.account.menu.switch_to_english') ?? 'English')
      : (this.labelResolver?.shellChromeString?.('shell.account.menu.switch_to_arabic') ?? 'العربية');
    base.push({ id: '__prefs_language', label: langLabel, destructive: false });
    // #8 — theme toggle (light/dark)
    const themeLabel = this.prefs.isDark()
      ? (this.labelResolver?.shellChromeString?.('shell.account.menu.light_theme') ?? 'Light Theme')
      : (this.labelResolver?.shellChromeString?.('shell.account.menu.dark_theme') ?? 'Dark Theme');
    base.push({ id: '__prefs_theme', label: themeLabel, destructive: false });
    return base;
  });
  readonly userDisplayName = computed<string>(() => {
    const u = this._user();
    return (u?.displayName || u?.name || '') as string;
  });
  readonly userEmail = computed<string>(() => (this._user()?.email || '') as string);

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
  readonly accountAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.header.account_action') ?? '',
  );
  readonly actionQueueAria = computed(
    () => this.labelResolver?.shellChromeString?.('shell.action_queue.aria') ?? '',
  );
  readonly actionQueueTitle = computed(
    () => this.labelResolver?.shellChromeString?.('shell.action_queue.title') ?? '',
  );
  readonly actionQueueEmpty = computed(
    () => this.labelResolver?.shellChromeString?.('shell.action_queue.empty') ?? '',
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

    // §B.9 #37 — offline/reconnect signal.
    if (this.isBrowser) {
      this.isOffline.set(!navigator.onLine);
      const goOnline  = () => this.isOffline.set(false);
      const goOffline = () => this.isOffline.set(true);
      window.addEventListener('online',  goOnline);
      window.addEventListener('offline', goOffline);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online',  goOnline);
        window.removeEventListener('offline', goOffline);
      });
    }

    // §B.9 #32 — sync platform ToastService messages into shell-host outlet signal.
    effect(() => {
      this.toastMessages.set(this.toastSvc.messages() as DosToastMessage[]);
    });
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

  onCommandSelect(r: Record<string, unknown>): void {
    if (r['route']) void this.router.navigateByUrl(r['route'] as string);
  }

  onInboxSelect(m: Record<string, unknown>): void {
    if (m['route']) {
      void this.router.navigateByUrl(m['route'] as string);
      this.closeInbox();
    }
  }

  onQuickCreate(a: Record<string, unknown>): void {
    if (a['route']) void this.router.navigateByUrl(a['route'] as string);
  }

  // ── Wave F handlers ──────────────────────────────────────────────────────
  onAccountEntry(entry: ShellAccountMenuEntry): void {
    if (entry.route) {
      void this.router.navigateByUrl(entry.route);
      return;
    }
    // Routeless logout / custom action: emit a DOM-level custom event so
    // products can opt in without requiring a platform-wide logout bus here.
    if (this.isBrowser) {
      window.dispatchEvent(new CustomEvent('dos:shell-account-action', {
        detail: { id: entry.id },
      }));
    }
  }

  /** Bridge DosAccountMenu `action` emission → platform ShellAccountMenuEntry. */
  onAccountMenuAction(item: DosAccountMenuItem): void {
    // §B.9 #7/#8 — intercept synthetic preference toggles.
    if (item.id === '__prefs_language') { this.prefs.toggleLanguage(); return; }
    if (item.id === '__prefs_theme')    { this.prefs.toggleTheme();    return; }
    const entry = this.accountMenuEntries().find((e) => e.id === item.id);
    if (entry) this.onAccountEntry(entry);
  }

  accountLabel(entry: ShellAccountMenuEntry): string {
    const key = entry.labelKey || `shell.account.menu.${entry.id}`;
    const resolved = this.labelResolver?.shellChromeString?.(key);
    if (resolved) return resolved;
    return this.labelFromKey(key);
  }

  toggleMobileCmd(): void { this.mobileCmdOpen.update((v) => !v); }
  closeMobileCmd(): void  { this.mobileCmdOpen.set(false); }

  onMobileCommandSelect(r: Record<string, unknown>): void {
    this.onCommandSelect(r);
    this.closeMobileCmd();
  }

  onStatusSignal(s: Record<string, unknown>): void {
    if (s['detailRoute']) void this.router.navigateByUrl(s['detailRoute'] as string);
  }

  onActionQueueOpen(item: Record<string, unknown>): void {
    if (item['route']) void this.router.navigateByUrl(item['route'] as string);
  }

  onAgentSelect(a: Record<string, unknown>): void {
    if (a['evidenceUri']) {
      if (this.isBrowser) window.open(a['evidenceUri'] as string, '_blank', 'noopener');
    }
  }

  onContextTabChange(tab: string): void {
    this.contextTab.set(tab);
  }

  toggleContext(): void { this.contextOpen.update((v) => !v); }
  closeContext(): void  { this.contextOpen.set(false); }

  // §B.9 #33 — help entry opens context panel on 'help' tab.
  openContextHelp(): void {
    this.contextTab.set('help');
    this.contextOpen.set(true);
  }

  // §B.9 #32 — toast outlet handlers.
  onToastDismissed(msg: DosToastMessage): void {
    this.toastMessages.update((msgs) => msgs.filter((m) => m !== msg));
  }

  // §B.9 #34–37, #25 — banner strip handlers.
  onBannerAction(banner: ShellBanner): void {
    if (banner.actionRoute) void this.router.navigateByUrl(banner.actionRoute);
  }

  onBannerDismiss(banner: ShellBanner): void {
    this.dismissedBannerIds.update((s) => {
      const next = new Set(s);
      next.add(banner.id);
      return next;
    });
    if (banner.id === 'shell-error') this.errorState.clearError();
  }

  // cmd-K / ctrl-K — focus command-search input.
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(ev: KeyboardEvent): void {
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      if (!this.isBrowser) return;
      if (this.isMobile()) {
        this.mobileCmdOpen.set(true);
        return;
      }
      const el = document.querySelector<HTMLInputElement>(
        '.shell-header-cmd .dos-command-search__input',
      );
      el?.focus();
      el?.select?.();
    }
    if (ev.key === 'Escape') {
      if (this.mobileCmdOpen()) { this.mobileCmdOpen.set(false); return; }
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
  // §B.9 #7 — dir derived from ShellPreferencesService (no DOM read).
  readonly sidebarDir = computed<'ltr' | 'rtl'>(() => this.prefs.dir());

  readonly sidebarItems = computed<Record<string, unknown>[]>(() => {
    const out: Record<string, unknown>[] = [];
    for (const group of this.filteredGroups()) {
      const groupName = this.groupLabel(group.id, group.label);
      for (const it of group.items) {
        if (!it.route) continue;
        if (it.enabled === false) continue;
        const badgeNum = it.badge != null ? Number(it.badge) : NaN;
        const item: Record<string, unknown> = {
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

  onSidebarNavigate(item: Record<string, unknown>): void {
    if (!item['route']) return;
    void this.router.navigateByUrl(item['route'] as string);
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