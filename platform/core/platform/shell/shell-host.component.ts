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
  viewChild,
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
  AccessStore as PlatformAccessStore,
} from '@dos/access-store';
import type { DosNavGroup, DosNavItem, ShellAccountMenuEntry, ShellAction } from '@dos/ui-contracts';
import { BreadcrumbService } from './breadcrumb.service';
import { WorkspaceShellBindingService } from './workspace-shell-binding.service';
import type { WorkspaceShellZone } from '@dos/ui-system';
import { ShellPreferencesService } from './shell-preferences.service';
import { ShellErrorStateService } from './shell-error-state.service';
import { ShellConnectivityService } from './shell-connectivity.service';
import { ToastService } from '../../../dos/shell/toast.service';

type ShellActionCarrier = {
  action?: ShellAction | null;
};

type RuntimeShellAdapter = {
  chromeString?: (key: string) => string | null | undefined;
  shellNumber?: (key: string) => number | null | undefined;
  shellStringList?: (key: string) => readonly string[] | null | undefined;
  shellAction?: (key: string) => ShellAction | null | undefined;
  shellShortcuts?: () => ReadonlyArray<{
    key: string;
    meta?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: ShellAction;
  }> | null | undefined;
  shellBanners?: (state: {
    offline: boolean;
    trialExpiredModules: readonly string[];
    sessionExpiresAt?: string | null;
    impersonating: boolean;
    dismissedIds: readonly string[];
    error: unknown;
  }) => readonly ShellBanner[] | null | undefined;
  accountPreferenceMenuItems?: () => readonly (DosAccountMenuItem & ShellActionCarrier)[] | null | undefined;
  titleTemplate?: () => string | null | undefined;
};

// COMPLIANCE: No hardcoded constants. Breakpoint, icons, labels — all from UI-OS runtime.

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
      border-radius: var(--cds-border-radius);
      transition: background 0.15s;
    }
    .shell-header-toggle:hover { background: var(--cds-layer-hover); }
    .shell-header-brand {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-03);
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
    .shell-page-header { padding: var(--cds-spacing-05) var(--cds-spacing-06) 0; max-width: var(--dos-shell-content-max-width); }
    .shell-page-title { margin: 0; font-size: 1.75rem; font-weight: 400; line-height: 1.25; color: var(--cds-text-primary); }

    /* Skeleton container. */
    .shell-skeleton { padding: var(--cds-spacing-07) var(--cds-spacing-06); display: grid; gap: var(--cds-spacing-05); }

    /* Header-mounted command-search — keep narrow inside the inverse bar. */
    .shell-header-cmd { display: inline-block; min-width: var(--dos-shell-cmd-min-width); max-width: var(--dos-shell-cmd-max-width); }
    .shell-header-cmd ::ng-deep .dos-command-search__input {
      background: var(--cds-field-02);
      color: var(--cds-text-on-color);
      border: 1px solid transparent;
      height: var(--cds-size-small);
      padding: 0 var(--cds-spacing-03);
      font-size: var(--cds-body-short-01-font-size);
    }
    .shell-header-cmd ::ng-deep .dos-command-search__input::placeholder {
      color: var(--cds-text-placeholder-on-color);
    }

    /* Wave F — mobile full-screen command-search overlay. */
    .shell-mobile-cmd {
      position: fixed; inset: 0;
      background: var(--cds-background);
      z-index: var(--dos-z-overlay);
      display: flex; flex-direction: column;
      padding: var(--cds-spacing-05);
      gap: var(--cds-spacing-05);
    }
    .shell-mobile-cmd__bar { display: flex; align-items: center; gap: var(--cds-spacing-03); }
    .shell-mobile-cmd__close {
      flex: 0 0 auto;
      width: 2rem; height: 2rem;
      background: none; border: 0; cursor: pointer;
      color: var(--cds-text-primary);
    }
    .shell-mobile-cmd__body { flex: 1; overflow: auto; }

    /* Wave F — action-queue + agent-strip in-flow placement (desktop only). */
    .shell-aux-strip { max-width: var(--dos-shell-content-max-width); padding-inline: var(--cds-spacing-06); }
    .shell-aux-strip--top    { padding-block-start: var(--cds-spacing-03); }
    .shell-aux-strip--bottom { padding-block-end:   var(--cds-spacing-03); }

    /* Wave F — status-bar fixed bottom strip with mobile safe-area padding. */
    .shell-statusbar-fixed {
      position: fixed;
      inset-block-end: 0;
      inset-inline: 0;
      z-index: var(--dos-z-statusbar);
      background: var(--cds-layer);
      border-block-start: 1px solid var(--cds-border-subtle-01);
      padding-block-end: env(safe-area-inset-bottom, 0);
    }
    .shell-statusbar-fixed--mobile { inset-block-end: var(--dos-mobile-nav-height); }

    /* §B.9 #38 — skip-link for keyboard/screen-reader a11y. */
    .shell-skip-link {
      position: absolute;
      inset-block-start: -100%;
      inset-inline-start: 0;
      background: var(--cds-background);
      color: var(--cds-link-primary);
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      z-index: var(--dos-z-skiplink);
      font-size: var(--cds-body-short-01-font-size);
      text-decoration: none;
    }
    .shell-skip-link:focus { inset-block-start: 0; }

    /* §B.9 #25 — blocking error frame (401/403/maintenance). */
    .shell-error-frame {
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      max-width: var(--dos-content-max-width-narrow);
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
      padding: var(--cds-spacing-03) var(--cds-spacing-04);
      border-block-end: 1px solid var(--cds-border-subtle-01);
    }
  `],
  template: `
    <!-- §B.9 #38 — skip-link for keyboard/screen-reader accessibility. -->
    <a class="shell-skip-link" href="#main-content">
      {{ shellBinding.chromeString('shell.a11y.skip_to_main') }}
    </a>

    <!-- Phase H — workspace-host-kit consumer mount.
         Desktop  → dos-app-shell + dos-workspace-sidebar
         Mobile   → dos-mobile-shell + dos-mobile-drawer + dos-mobile-bottom-nav
         Common   → dos-workspace-header (header surface), dos-skeleton (loading).
         No raw cds-* tags. -->

    <ng-template #headerTpl>
      <dos-workspace-header shellHeader [title]="headerBrand()" [tenantName]="headerTenantSubtitle()" [logoHref]="headerLogoHref()">
        <ng-container headerStart>
          <button type="button"
                  class="shell-header-toggle"
                  [attr.aria-label]="ariaToggleNav()"
                  (click)="toggleSideNav()">
            <dos-icon name="menu" [size]="shellIconSize()" [ariaLabel]="ariaToggleNav()"></dos-icon>
          </button>
          <!-- 2026-05-05 Slice-1: brand is now rendered exactly once by
               dos-workspace-header via the .dos-wh-brand-name projection.
               Carbon cds-header [name] was removed in
               workspace-header.component.ts:36 (dual-stamp collapse), so
               there is nothing to project here. Do NOT add a third stamp. -->
        </ng-container>
        <ng-container headerEnd>
          @if (!isMobile() && showCommandSearch()) {
            <dos-command-search #desktopCmdSearch
                                class="shell-header-cmd"
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
              <dos-icon name="search" [size]="shellIconSize()" [ariaLabel]="commandAria()"></dos-icon>
            </button>
          }
          @if (showInbox()) {
            <button type="button"
                    class="shell-header-toggle"
                    [attr.aria-label]="inboxToggleAria()"
                    [attr.aria-expanded]="inboxOpen()"
                    (click)="toggleInbox()">
              <dos-icon name="bell" [size]="shellIconSize()" [ariaLabel]="inboxToggleAria()"></dos-icon>
            </button>
          }
          <!-- GAP-HDR-2 — account menu (Carbon header action + overflow menu). -->
          <dos-account-menu [userName]="userDisplayName()"
                            [userEmail]="userEmail()"
                            [buttonLabel]="accountAria()"
                            [items]="accountMenuItems()"
                            (action)="onAccountMenuAction($event)">
          </dos-account-menu>
          <!-- §B.9 #33 — help/support entry opens context panel on 'help' tab. -->
          @if (showContextPanel()) {
            <button type="button"
                    class="shell-header-toggle"
                    [attr.aria-label]="shellBinding.chromeString('shell.header.help')"
                    [attr.aria-expanded]="contextOpen()"
                    (click)="openContextPanel()">
              <dos-icon name="help" [size]="shellIconSize()"
                        [ariaLabel]="shellBinding.chromeString('shell.header.help')">
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
                        [size]="shellIconSize()"
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
              {{ shellText('shell.error.dismiss') }}
            </button>
          </div>
        } @else if (isNavigating()) {
          <div class="shell-skeleton" id="shell-nav-skeleton" aria-busy="true" [attr.aria-label]="ariaLoadingPage()">
            <dos-skeleton shape="line" [rows]="skeletonRows()" [ariaLabel]="ariaLoadingPage()"></dos-skeleton>
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
                                  (action)="dispatchShellActionFromBanner($event)"
                                  (dismiss)="onBannerClose($event)">
          </dos-shell-banner-strip>
        }
        @if (zoneHas('main')) {
          <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
          <ng-container *ngTemplateOutlet="mainTpl"></ng-container>
        }

        @if (zoneHas('mobile-nav')) {
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
                                 [placeholder]="shellBinding.chromeString('shell.sidebar.search_placeholder')"
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
                                  (action)="dispatchShellActionFromBanner($event)"
                                  (dismiss)="onBannerClose($event)">
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
      <div class="shell-statusbar-fixed" [class.shell-statusbar-fixed--mobile]="isMobile()">
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
            <dos-icon name="close" [size]="shellIconSize()" [ariaLabel]="drawerCloseLabel()"></dos-icon>
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
                        (dismissed)="onToastClosed($event)">
      </dos-toast-outlet>
    }
  `,
})
export class ShellHostComponent {
  private readonly access      = inject(PlatformAccessStore);
  private readonly router      = inject(Router);
  private readonly platformId  = inject(PLATFORM_ID);
  private readonly titleSvc    = inject(Title);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly breadcrumbSvc = inject(BreadcrumbService);
  protected readonly shellBinding = inject(WorkspaceShellBindingService);
  private readonly prefs = inject(ShellPreferencesService);
  readonly errorState = inject(ShellErrorStateService);
  private readonly connectivity = inject(ShellConnectivityService);
  private readonly toastSvc = inject(ToastService);

  /** Desktop Cmd/Ctrl+K focuses this component — never toggles mobile overlay on desktop. */
  private readonly desktopCmdSearch = viewChild<DosCommandSearchComponent>('desktopCmdSearch');

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // ── Viewport / nav state ──────────────────────────────────────────────────
  readonly isMobile     = signal(false);
  readonly sideNavActive = signal(true);
  readonly isRail       = signal(false);   // W-E: rail mode
  readonly navSearch    = signal('');       // W-D: filter

  // ── §B.9 P2/P4 — toast + local banner dismiss state (candidates from binding) ─
  readonly toastMessages = signal<DosToastMessage[]>([]);
  private readonly dismissedBannerIds = signal<Set<string>>(new Set());

  // ── W-C: skeleton + title ─────────────────────────────────────────────────
  readonly isNavigating = signal(false);
  readonly pageTitle    = signal<string | null>(null);

  // ── W-B: breadcrumbs (from BreadcrumbService) ─────────────────────────────
  readonly breadcrumbs  = signal<Array<{ label: string; route?: string }>>([]);

  // ── Nav config ────────────────────────────────────────────────────────────
  readonly navConfig = computed(() => this.shellBinding.navConfig());

  readonly navGroups = computed(() => {
    const groups = this.navConfig().groups;
    return groups
      .map((group: DosNavGroup) => ({
        ...group,
        items: (group.items || []).filter(
          (item: DosNavItem) => !!item.route,
        ),
      }))
      .filter((group: DosNavGroup) => group.items.length > 0);
  });

  // ── W-A: auto-expand active group ─────────────────────────────────────────
  readonly activeGroupId = computed(() => {
    const url = this.router.url.split('?')[0];
    const found = this.navGroups().find((g) =>
      g.items.some((i: DosNavItem) => {
        const r = i.route?.split('?')[0];
        return r && (url === r || url.startsWith(`${r}/`));
      }),
    );
    return found ? found.id : null;
  });

  // ── W-D: filtered groups for search ──────────────────────────────────────
  readonly filteredGroups = computed(() => {
    const q = this.navSearch().toLowerCase().trim();
    if (!q) return this.navGroups();
    return this.navGroups()
      .map((g) => ({
        ...g,
        items: g.items.filter((i: DosNavItem) =>
          this.navItemLabel(i).toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  });

  // ── Header labels ─────────────────────────────────────────────────────────
  // Dynamic-UI policy: chrome strings flow from UI-OS runtime only.
  // No hardcoded fallbacks - empty if missing (observable gap for telemetry).
  readonly headerBrand = computed(() => {
    const bindingBrand = this.shellBinding.headerBrandLabel();
    if (bindingBrand) return bindingBrand;
    const chromeBrand = this.shellBinding.chromeString('shell.header.brand');
    if (chromeBrand) return chromeBrand;
    return '';
  });

  readonly headerWorkspaceTitle = computed(() => {
    const sel = this.selectedModuleLabel();
    if (sel) return sel;
    const title = this.shellBinding.headerWorkspaceTitle();
    if (title) return title;
    return '';
  });
  /** Tenant line after `/` only when binding supplied a distinct brand/product from session tenant. */
  readonly headerTenantSubtitle = computed(() => {
    const fromBinding = this.shellBinding.headerBrandLabel();
    const brandLine = typeof fromBinding === 'string' ? fromBinding.trim() : '';
    const tenant = this.access.tenant();
    const tenantName = typeof tenant?.name === 'string' ? tenant.name.trim() : '';
    const tenantCode = typeof tenant?.code === 'string' ? tenant.code.trim() : '';
    const tn = tenantName || tenantCode;
    if (!brandLine || !tn) return '';
    if (brandLine.toLowerCase() === tn.toLowerCase()) return '';
    return tn;
  });
  readonly selectedModuleLabel = computed<string | null>(() => {
    const id = this.activeGroupId();
    if (id) {
      const g = this.navGroups().find((g) => g.id === id);
      if (g) {
        const lbl = this.navGroupLabel(g);
        if (lbl) return lbl;
      }
    }
    return null;
  });
  readonly headerHomeRoute = computed((): string[] => {
    const raw = this.shellBinding.headerHomeRoute();
    if (!raw) return [];
    const parts = raw.replace(/^\/+/, '').split('/').filter(Boolean);
    return parts;
  });
  readonly headerLogoHref = computed((): string => {
    const href = this.shellBinding.headerLogoHref();
    return typeof href === 'string' ? href : '';
  });
  readonly sideNavAriaLabel = computed(
    () => this.shellBinding.chromeString('shell.sidenav.aria_label'),
  );

  readonly ariaToggleNav = computed(
    () => this.shellBinding.chromeString(
      this.sideNavActive() ? 'shell.header.hide_navigation' : 'shell.header.show_navigation',
    ),
  );
  readonly ariaToggleRail = computed(
    () => this.shellBinding.chromeString(
      this.isRail() ? 'shell.header.expand_sidebar' : 'shell.header.collapse_to_rail',
    ),
  );
  readonly ariaBreadcrumb = computed(
    () => this.shellBinding.chromeString('shell.breadcrumb.aria'),
  );
  readonly ariaLoadingPage = computed(
    () => this.shellBinding.chromeString('shell.skeleton.loading_page'),
  );
  readonly drawerTitle = computed(() => {
    const selectedLabel = this.selectedModuleLabel();
    if (selectedLabel) return selectedLabel;
    const runtimeTitle = this.shellBinding.headerWorkspaceTitle();
    if (runtimeTitle) return runtimeTitle;
    const brand = this.headerBrand();
    if (brand) return brand;
    return '';
  });
  readonly drawerCloseLabel = computed(
    () => this.shellBinding.chromeString('shell.drawer.close'),
  );
  readonly mobileBottomNavAria = computed(
    () => this.shellBinding.chromeString('shell.mobile_bottom_nav.aria'),
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

  /**
   * Banners shown in chrome: UI-OS runtime-driven via resolveRuntimeBanners.
   * All banner logic (trial, offline, session, impersonation, errors) moved to runtime.
   */
  readonly shellBanners = computed<ShellBanner[]>(() => this.resolveRuntimeBanners());

  // §B.9 #25 — blocking errors replace content slot with error frame.
  readonly isBlockingError = computed(() => {
    const err = this.errorState.error();
    if (!err) return false;
    const blockingKinds = this.runtimeStringList('blockingErrorKinds');
    return blockingKinds.includes(err.kind);
  });

  // ── Wave F — new header/overlay UI state ──────────────────────────────────
  readonly mobileCmdOpen = signal(false);
  readonly contextOpen   = signal(false);
  readonly contextTab    = signal<string>('record');
  readonly accountMenuEntries = computed<ReadonlyArray<ShellAccountMenuEntry>>(
    () => {
      const entries = this.shellBinding.accountMenuEntries();
      return entries ? entries : [];
    },
  );
  readonly accountMenuItems = computed<DosAccountMenuItem[]>(() => {
    const entries = this.accountMenuEntries().map((entry) => ({
      id: entry.id,
      label: this.accountLabel(entry),
      destructive: !!entry.destructive,
      action: this.actionFromAccountEntry(entry),
    }));
    // Runtime-driven preference items (language toggle, theme toggle, etc.)
    const runtimeItems = this.runtimeAccountMenuItems();
    return [...entries, ...runtimeItems] as DosAccountMenuItem[];
  });
  readonly userDisplayName = computed<string>(() => {
    const u = this._user();
    return (u?.displayName || u?.name) as string;
  });
  readonly userEmail = computed<string>(() => (this._user()?.email) as string);

  readonly commandAria = computed(
    () => this.shellBinding.chromeString('shell.command.aria'),
  );
  readonly commandPlaceholder = computed(
    () => this.shellBinding.chromeString('shell.command.placeholder'),
  );
  readonly inboxTitle = computed(
    () => this.shellBinding.chromeString('shell.inbox.title'),
  );
  readonly inboxAria = computed(
    () => this.shellBinding.chromeString('shell.inbox.aria'),
  );
  readonly inboxEmpty = computed(
    () => this.shellBinding.chromeString('shell.inbox.empty'),
  );
  readonly inboxToggleAria = computed(
    () => this.shellBinding.chromeString('shell.inbox.toggle'),
  );
  readonly quickCreateAria = computed(
    () => this.shellBinding.chromeString('shell.quick.aria'),
  );
  readonly quickCreateGlyph = computed(
    () => this.shellBinding.chromeString('shell.quick.fab_glyph'),
  );
  readonly accountAria = computed(
    () => this.shellBinding.chromeString('shell.header.account_action'),
  );
  readonly actionQueueAria = computed(
    () => this.shellBinding.chromeString('shell.action_queue.aria'),
  );
  readonly actionQueueTitle = computed(
    () => this.shellBinding.chromeString('shell.action_queue.title'),
  );
  readonly actionQueueEmpty = computed(
    () => this.shellBinding.chromeString('shell.action_queue.empty'),
  );

  // ── Effects ───────────────────────────────────────────────────────────────
  private readonly navRefreshEffect = effect(
    () => {
      this.access.loaded();
      this.access.modules();
      this.access.permissions();
      this.access.trialExpiredModules();
      queueMicrotask(() => {
        // W-B: feed updated groups to breadcrumb service
        this.breadcrumbSvc.setGroups(this.navGroups() as unknown as ReadonlyArray<DosNavGroup>);
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

  onCommandSelect(result: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(result as ShellActionCarrier));
  }

  onInboxSelect(message: Record<string, unknown>): void {
    const executed = this.executeShellAction(this.actionFromCarrier(message as ShellActionCarrier));
    if (executed) this.closeInbox();
  }

  onQuickCreate(action: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(action as ShellActionCarrier));
  }

  // ── Wave F handlers ──────────────────────────────────────────────────────
  onAccountEntry(entry: ShellAccountMenuEntry): void {
    this.executeShellAction(this.actionFromAccountEntry(entry));
  }

  /** Bridge DosAccountMenu `action` emission → platform ShellAccountMenuEntry. */
  onAccountMenuAction(item: DosAccountMenuItem): void {
    const action = this.actionFromCarrier(item as unknown as ShellActionCarrier)
      || this.accountMenuEntries()
        .map((entry) => this.actionFromAccountEntry(entry))
        .find((candidate, index) => this.accountMenuEntries()[index]?.id === item.id);
    this.executeShellAction(action);
  }

  accountLabel(entry: ShellAccountMenuEntry): string {
    const key = typeof entry.labelKey === 'string' ? entry.labelKey.trim() : '';
    if (!key) return '';
    return this.shellBinding.chromeString(key);
  }

  toggleMobileCmd(): void { this.mobileCmdOpen.update((v) => !v); }
  closeMobileCmd(): void  { this.mobileCmdOpen.set(false); }

  onMobileCommandSelect(r: Record<string, unknown>): void {
    this.onCommandSelect(r);
    this.closeMobileCmd();
  }

  onStatusSignal(signal: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(signal as ShellActionCarrier));
  }

  onActionQueueOpen(item: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(item as ShellActionCarrier));
  }

  onAgentSelect(activity: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(activity as ShellActionCarrier));
  }

  onContextTabChange(tab: string): void {
    this.contextTab.set(tab);
  }

  toggleContext(): void { this.contextOpen.update((v) => !v); }
  closeContext(): void  { this.contextOpen.set(false); }

  openContextPanel(): void {
    const defaultTab = this.shellBinding.chromeString('shell.context.default_tab');
    if (defaultTab) this.contextTab.set(defaultTab);
    this.contextOpen.set(true);
  }

  // §B.9 #32 — toast outlet handlers.
  onToastClosed(msg: DosToastMessage): void {
    this.toastMessages.update((msgs) => msgs.filter((m) => m !== msg));
  }

  // §B.9 #34–37, #25 — banner strip handlers.
  dispatchShellActionFromBanner(banner: ShellBanner): void {
    this.executeShellAction(banner.action);
  }

  onBannerClose(banner: ShellBanner): void {
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
      const cmd = this.desktopCmdSearch();
      queueMicrotask(() => cmd?.focusSearch());
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
      const groupName = this.navGroupLabel(group);
      for (const it of group.items) {
        if (!it.route) continue;
        if (it.enabled === false) continue;
        const badgeNum = it.badge != null ? Number(it.badge) : NaN;
        const labelKey = typeof it.labelKey === 'string' ? it.labelKey : '';
        const item: Record<string, unknown> = {
          id: it.id,
          label: {
            i18nKey: labelKey,
            fallback: this.navItemLabel(it),
          },
          icon: this.navItemIcon(it),
          route: it.route,
          active: this.isActive(it),
          group: groupName,
          action: { kind: 'navigate', path: it.route } satisfies ShellAction,
        };
        if (it.requiredPermission) item.permission = it.requiredPermission;
        if (Number.isFinite(badgeNum) && badgeNum > 0) item.badgeCount = badgeNum;
        out.push(item);
      }
    }
    return out;
  });

  readonly mobileBottomItems = computed<DosBottomNavItem[]>(() => {
    const max = this.shellBinding.mobileBottomNavMaxItems();
    if (max <= 0) return [];
    const out: DosBottomNavItem[] = [];
    for (const group of this.navGroups()) {
      const first = group.items.find((i: DosNavItem) => !!i.route && i.enabled !== false);
      if (!first) continue;
      out.push({
        id: first.id,
        label: this.navItemLabel(first),
        icon: this.navItemIcon(first),
        route: first.route,
        active: this.isActive(first),
      });
      if (out.length >= max) break;
    }
    return out;
  });

  onSidebarNavigate(item: Record<string, unknown>): void {
    this.executeShellAction(this.actionFromCarrier(item as ShellActionCarrier));
    if (this.isMobile()) this.sideNavActive.set(false);
  }

  onMobileNavSelect(item: DosBottomNavItem): void {
    if (!item.route) return;
    this.executeShellAction({ kind: 'navigate', path: item.route });
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
    if (!reason) return this.navItemLabel(item);
    const key = `shell.nav.disabled.${reason.replace(/-/g, '_')}`;
    const txt = this.shellBinding.chromeString(key);
    return txt ? `${this.navItemLabel(item)} — ${txt}` : this.navItemLabel(item);
  }

  navItemLabel(item: DosNavItem): string {
    const direct = (item.label || '').toString().trim();
    if (direct) return direct;
    return '';
  }

  navGroupLabel(group: DosNavGroup): string {
    return typeof group.label === 'string' ? group.label.trim() : '';
  }

  navItemIcon(item: DosNavItem): string {
    const direct = (item.icon || '').toString().trim();
    if (direct) return direct;
    return '';
  }



  // ── Private helpers ───────────────────────────────────────────────────────
  private _user() {
    const me = this.access.me() as {
      user?: { displayName?: string; name?: string; email?: string } | null;
    } | null;
    return me?.user;
  }

  shellText(key: string): string {
    const runtime = this.runtimeAdapter().chromeString?.(key);
    if (runtime != null) return runtime;
    return this.shellBinding.chromeString(key) || '';
  }

  readonly skeletonRows = computed(() => this.shellNumber('skeletonRows') || 6);

  readonly shellIconSize = computed(() => this.shellNumber('iconSize') || 20);

  private runtimeAdapter(): RuntimeShellAdapter {
    return this.shellBinding as unknown as RuntimeShellAdapter;
  }

  private shellNumber(key: string): number | null {
    const direct = this.runtimeAdapter().shellNumber?.(key);
    if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
    if (!this.isBrowser) return null;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--dos-shell-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`)
      .trim();
    if (!raw) return null;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private runtimeStringList(key: string): readonly string[] {
    return this.runtimeAdapter().shellStringList?.(key) || [];
  }

  private runtimeShellAction(key: string): ShellAction | null {
    return this.runtimeAdapter().shellAction?.(key) || null;
  }

  private runtimeAccountMenuItems(): readonly (DosAccountMenuItem & ShellActionCarrier)[] {
    return this.runtimeAdapter().accountPreferenceMenuItems?.() || [];
  }

  private resolveRuntimeBanners(): ShellBanner[] {
    return [
      ...(this.runtimeAdapter().shellBanners?.({
        offline: this.connectivity.isOffline(),
        trialExpiredModules: this.access.trialExpiredModules() as readonly string[],
        sessionExpiresAt: this.access.sessionExpiresAt(),
        impersonating: this.access.isImpersonating(),
        dismissedIds: Array.from(this.dismissedBannerIds()),
        error: this.errorState.error(),
      }) || []),
    ];
  }

  private actionFromAccountEntry(entry: ShellAccountMenuEntry): ShellAction | null {
    const maybeAction = (entry as ShellAccountMenuEntry & ShellActionCarrier).action;
    if (maybeAction) return maybeAction;
    return entry.route ? { kind: 'navigate', path: entry.route } : null;
  }

  private actionFromCarrier(carrier: ShellActionCarrier | null | undefined): ShellAction | null {
    return carrier?.action || null;
  }

  private executeShellAction(action: ShellAction | null | undefined): boolean {
    if (!action) return false;

    switch (action.kind) {
      case 'navigate':
        void this.router.navigateByUrl(action.path);
        return true;

      case 'open_external':
        if (!this.isBrowser) return false;
        window.open(action.url, '_blank', 'noopener');
        return true;

      case 'toggle_language':
        this.prefs.toggleLanguage();
        return true;

      case 'toggle_theme':
        this.prefs.toggleTheme();
        return true;

      case 'open_context_tab':
        this.contextTab.set(action.tab);
        this.contextOpen.set(true);
        return true;

      case 'open_command':
        this.mobileCmdOpen.set(true);
        return true;

      case 'close_overlay':
        this.mobileCmdOpen.set(false);
        return true;

      case 'clear_error':
        this.errorState.clearError();
        return true;

      case 'dispatch_event':
        if (!this.isBrowser) return false;
        window.dispatchEvent(new CustomEvent(action.eventName, { detail: action.payload }));
        return true;

      default:
        return false;
    }
  }

  private shortcutActionForEvent(ev: KeyboardEvent): ShellAction | null {
    const shortcuts = this.runtimeAdapter().shellShortcuts?.();
    if (!shortcuts) return null;
    return shortcuts.find(s => {
      if (s.key.toLowerCase() !== ev.key.toLowerCase()) return false;
      if (s.meta && !ev.metaKey) return false;
      if (s.ctrl && !ev.ctrlKey) return false;
      if (s.shift && !ev.shiftKey) return false;
      if (s.alt && !ev.altKey) return false;
      return true;
    })?.action || null;
  }

  private _syncTitle(): void {
    const template = this.shellBinding.chromeString('shell.chrome.titleTemplate');
    const brand = this.headerBrand();
    const crumbs = this.breadcrumbs();
    if (crumbs.length > 0) {
      const last = crumbs[crumbs.length - 1];
      this.pageTitle.set(last.label);
      if (template) {
        this.titleSvc.setTitle(template.replace('{title}', last.label).replace('{brand}', brand));
        return;
      }
      this.titleSvc.setTitle(last.label);
    } else {
      this.pageTitle.set(null);
      this.titleSvc.setTitle(brand);
    }
  }

  private syncViewportState(): void {
    if (!this.isBrowser) {
      this.isMobile.set(false);
      this.sideNavActive.set(true);
      return;
    }
    const bp = this.shellBinding.desktopMinPx();
    const mobile = window.innerWidth < bp;
    this.isMobile.set(mobile);
    this.sideNavActive.set(!mobile);
    if (mobile) this.isRail.set(false);
  }

}