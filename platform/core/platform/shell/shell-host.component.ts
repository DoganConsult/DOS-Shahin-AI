import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  OnInit, OnDestroy, DestroyRef, effect, PLATFORM_ID, HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  switchMap,
  tap,
  catchError,
  distinctUntilChanged,
  map,
  filter,
  merge,
  of,
} from 'rxjs';

// Wave 2.1 — Workspace Shell adopts the canonical Platform UI OS chrome.
// Carbon UIShell — workspace frame uses ONLY canonical IBM Carbon Angular
// shell primitives (no wrappers). Allow-list items 1–14:
//   UIShell, Header, HeaderName, HeaderNavigation, HeaderMenu,
//   HeaderMenuItem, HeaderGlobalBar, HeaderGlobalAction, SideNav,
//   SideNavItems, SideNavMenu, SideNavMenuItem, SideNavLink, Content.
// Inner page chrome uses Carbon Grid/Column/Layer (allow-list items 15–17).
import { UIShellModule, GridModule, LayerModule, TagModule } from 'carbon-components-angular';
import type { DosBottomNavItem } from '@dos/ui-system';
import type { DosAccountMenuItem } from '@dos/ui-system';
import {
  WorkspaceNavigationAdapter,
  AccessStore as PlatformAccessStore,
} from '@dos/access-store';
import type { DosNavItem, ShellAccountMenuEntry } from '@dos/ui-contracts';

import { ShellResolverService } from './shell-resolver.service';
import { ShellKpiBridgeService } from './shell-kpi-bridge.service';
import { BootstrapStore } from '../../services/platform/bootstrap.store';
import { AccessStore } from '../../../dauth/access/access.store';
import { I18nService } from '../../services/ui-infra/i18n.service';
import { PlatformModeService } from '../../services/platform/platform-mode.service';
import { DeploymentProfileService } from '../../services/platform/deployment-profile.service';
import type { ResolvedShellConfig, ShellResolverInput, ShellSlotConfig } from '../../../config-center/shared/contracts/shell-engine.contracts';

import { CanonicalModuleShellComponent } from '../../../config-center/shared/components/module-chrome/generic/canonical-module-shell.component';
import { KpiCardGridComponent } from '../../../config-center/shared/components/status-indicators/kpi-card-grid.component';
import { CommandCenterLayoutComponent } from '../../../config-center/shared/components/layouts/command-center-layout.component';
import { RegistryLayoutComponent } from '../../../config-center/shared/components/layouts/registry-layout.component';
import { CaseWorkspaceLayoutComponent } from '../../../config-center/shared/components/layouts/case-workspace-layout.component';
import { StudioLayoutComponent } from '../../../config-center/shared/components/layouts/studio-layout.component';
import { ModuleStatePresetComponent, type StatePreset } from '../../../config-center/shared/components/module-chrome/module-state-preset.component';
import { ModuleMastheadComponent, type MastheadConfig } from '../../../config-center/shared/components/module-chrome/module-masthead.component';
import { ModuleActionBarComponent } from '../../../config-center/shared/components/module-chrome/module-action-bar.component';
import { ModuleWorkflowRibbonComponent, type WorkflowRibbonConfig } from '../../../config-center/shared/components/module-chrome/module-workflow-ribbon.component';
import { MODULE_SHELL_REGISTRY } from '../../../config-center/shared/contracts/module-shell-registry';
import { ModuleContextRailComponent } from '../../../config-center/shared/components/module-chrome/module-context-rail.component';
import { ModuleStickyFooterComponent, type StickyFooterConfig } from '../../../config-center/shared/components/module-chrome/module-sticky-footer.component';
import { ModuleAiPulseComponent } from '../../../config-center/shared/widgets/module-ai-pulse.component';
import type { KpiCardVM } from '../../../config-center/shared/models/module-overview.vm';
import { DynamicCommandPaletteComponent } from './dynamic-command-palette.component';
import { DynamicPageContextBarComponent } from './dynamic-page-context-bar.component';


type ShellState = 'loading' | 'skeleton' | 'ready' | 'error' | 'error-blocking' | 'no-permission' | 'empty-first-use' | 'empty-filtered' | 'archived' | 'syncing';

@Component({
    selector: 'app-shell-host',
    imports: [
        CommonModule, RouterOutlet,
        KpiCardGridComponent,
        CommandCenterLayoutComponent, RegistryLayoutComponent,
        CaseWorkspaceLayoutComponent,
        ModuleStatePresetComponent, ModuleMastheadComponent,
        ModuleActionBarComponent, ModuleWorkflowRibbonComponent,
        ModuleContextRailComponent, ModuleStickyFooterComponent,
        DynamicCommandPaletteComponent, DynamicPageContextBarComponent,
        // Carbon UIShell — workspace frame (allow-list 1–14) + layout (15–17):
        UIShellModule,
        GridModule,
        LayerModule,
        TagModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- ────────────────────────────────────────────────────────────────────
         Carbon UIShell workspace frame.
         Frame uses ONLY Carbon allow-list items 1–14:
           cds-header / cds-hamburger / cds-header-name / cds-header-navigation
           / cds-header-menu / cds-header-item (HeaderMenuItem)
           / cds-header-global / cds-header-action
           / cds-sidenav / cds-sidenav-menu / cds-sidenav-item (SideNavLink &
             SideNavMenuItem) inside the implicit SideNavItems list.
         <main class="cds--content"> is Carbon's Content primitive.
         ──────────────────────────────────────────────────────────────────── -->
    <cds-header
      [brand]="i18n.translate('shell.brand.fallback')"
      [name]="config()?.masthead?.moduleName || ''"
      [route]="['/workspace-home']"
      useRouter="true">
      <cds-hamburger
        *ngIf="isMobile()"
        [active]="drawerOpen()"
        (selected)="toggleDrawer()"></cds-hamburger>
      <cds-header-navigation *ngIf="!isMobile() && !isWorkspaceHome() && navConfig().groups.length > 0"
                             [ariaLabel]="i18n.translate('shell.aria.navigation')">
        @for (g of navConfig().groups; track g.id) {
          @if (g.items.length === 1) {
            <cds-header-item
              [route]="[g.items[0].route]"
              useRouter="true"
              (selected)="onNavSelect(g.items[0])">
              {{ resolveLabel(g.items[0]) }}
            </cds-header-item>
          } @else {
            <cds-header-menu [title]="g.label">
              @for (it of g.items; track it.id) {
                <cds-header-item
                  [route]="[it.route]"
                  useRouter="true"
                  (selected)="onNavSelect(it)">
                  {{ resolveLabel(it) }}
                </cds-header-item>
              }
            </cds-header-menu>
          }
        }
      </cds-header-navigation>
      <cds-header-global>
        <cds-header-action
          [active]="accountOpen()"
          (selected)="toggleAccount()"
          [description]="i18n.translate('shell.aria.account')">
          {{ accountInitial() }}
        </cds-header-action>
      </cds-header-global>
    </cds-header>

    <cds-sidenav
      *ngIf="!isWorkspaceHome()"
      [expanded]="!isMobile() || drawerOpen()"
      [hidden]="isMobile() && !drawerOpen()"
      useRouter="true"
      [ariaLabel]="i18n.translate('shell.aria.navigation')">
      @for (g of navConfig().groups; track g.id) {
        @if (g.items.length === 1) {
          <cds-sidenav-item
            [route]="[g.items[0].route]"
            useRouter="true"
            [active]="isActive(g.items[0])"
            (navigation)="onNavSelect(g.items[0])">
            {{ resolveLabel(g.items[0]) }}
          </cds-sidenav-item>
        } @else {
          <cds-sidenav-menu [title]="g.label">
            @for (it of g.items; track it.id) {
              <cds-sidenav-item
                [route]="[it.route]"
                useRouter="true"
                [active]="isActive(it)"
                (navigation)="onNavSelect(it)">
                {{ resolveLabel(it) }}
              </cds-sidenav-item>
            }
          </cds-sidenav-menu>
        }
      }
    </cds-sidenav>

    <main class="cds--content shell-content"
          [attr.dir]="config()?.dir"
          [attr.data-mobile]="isMobile() ? 'true' : 'false'">
    @if (shellState() === 'loading' || shellState() === 'skeleton') {
      <app-module-state-preset preset="loading" />
    } @else if (shellState() === 'no-permission') {
      <app-module-state-preset preset="no-permission"
        [title]="i18n.translate('shell.state.no-permission.title')"
        [description]="i18n.translate('shell.state.no-permission.description')" />
    } @else if (shellState() === 'error' || shellState() === 'error-blocking') {
      <app-module-state-preset [preset]="shellState() === 'error-blocking' ? 'error' : 'partial-error'"
        [title]="i18n.translate(shellState() === 'error-blocking' ? 'shell.state.error-blocking.title' : 'shell.state.error.title')"
        (action)="retryResolve()" />
    } @else if (shellState() === 'empty-first-use') {
      <app-module-state-preset preset="empty"
        [title]="i18n.translate('shell.state.empty.title')"
        [description]="i18n.translate('shell.state.empty.description')" />
    } @else if (shellState() === 'empty-filtered') {
      <app-module-state-preset preset="filtered-empty"
        [title]="i18n.translate('shell.state.empty-filtered.title')"
        (action)="onClearFilters()" />
    } @else if (shellState() === 'archived') {
      <app-module-state-preset preset="archived"
        [title]="i18n.translate('shell.state.archived.title')"
        [description]="i18n.translate('shell.state.archived.description')" />
    } @else if (config()) {
      @if (shellState() === 'syncing') {
        <div class="shell-sync-bar">
          <span>{{ i18n.translate('shell.state.syncing.label') }}</span>
        </div>
      }
      <cds-layer [level]="1"
           [attr.dir]="config()!.dir"
           [attr.data-module]="config()!.moduleCode"
           [attr.data-layout]="config()!.layoutType"
           [attr.data-mode]="platformMode()"
           [attr.data-tier]="config()!.meta.tier"
           class="shell-page">

        <!-- Layer 2: Masthead -->
        <app-module-masthead
          [config]="mastheadConfig()"
          (aiAction)="onAiAction($event)" />

        <!-- Part C / G4 — Dynamic Page Context Bar -->
        <app-dynamic-page-context-bar />

        <!-- Layer 3: KPI Strip -->
        @if (isSlotVisible('kpi-strip') && pageKpiScope() === 'module-overview' && kpiCards().length > 0) {
          <div ibmGrid class="shell-kpi-strip">
            <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}">
              <app-kpi-card-grid
                [cards]="kpiCards()"
                [isAr]="lang() === 'ar'" />
            </div>
          </div>
        }

        <!-- Layer 4: Action Bar -->
        @if (isSlotVisible('action-bar')) {
          <app-module-action-bar
            [items]="actionBarItems()"
            [lang]="lang()"
            [showSearch]="config()!.actionBar.showSearch"
            [viewModes]="viewModes()"
            [activeView]="activeView()"
            (slotClick)="onSlotClick($event)"
            (searchChange)="onSearchChange($event)"
            (viewChange)="onViewChange($event)" />
        }

        <!-- Layer 7: Workflow Ribbon -->
        @if (isSlotVisible('workflow-ribbon') && config()!.workflow.enabled) {
          <app-module-workflow-ribbon
            [config]="workflowConfig()"
            (transition)="onTransition($event)" />
        }

        <!-- Layer 5: Primary Work Area + Layer 6: Context Rail -->
        <div ibmGrid class="shell-body">
          @switch (config()!.layoutType) {
            @case ('cockpit') {
              <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}">
                <app-command-center-layout [lang]="lang()">
                  <router-outlet />
                </app-command-center-layout>
              </div>
            }
            @case ('hub') {
              <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}">
                <app-command-center-layout [lang]="lang()">
                  <router-outlet />
                </app-command-center-layout>
              </div>
            }
            @case ('list-detail') {
              <div ibmCol [columnNumbers]="{lg: isSlotVisible('context-rail') ? 12 : 16, md: 8, sm: 4}">
                <app-registry-layout [lang]="lang()"
                  [showFilters]="isSlotVisible('filter-panel')"
                  [showDetail]="isSlotVisible('detail-drawer')">
                  <router-outlet />
                </app-registry-layout>
              </div>
            }
            @case ('workspace') {
              <div ibmCol [columnNumbers]="{lg: isSlotVisible('context-rail') ? 12 : 16, md: 8, sm: 4}">
                <app-case-workspace-layout [lang]="lang()"
                  [showSidebar]="isSlotVisible('context-rail')">
                  <router-outlet />
                </app-case-workspace-layout>
              </div>
            }
            @case ('board') {
              <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}" class="shell-main--board">
                <router-outlet />
              </div>
            }
            @case ('admin-console') {
              <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}" class="shell-main--admin">
                <router-outlet />
              </div>
            }
            @default {
              <div ibmCol [columnNumbers]="{lg: 16, md: 8, sm: 4}">
                <router-outlet />
              </div>
            }
          }

          <!-- Layer 6: Right Context Rail -->
          @if (isSlotVisible('context-rail')) {
            <div ibmCol [columnNumbers]="{lg: 4, md: 8, sm: 4}">
              <app-module-context-rail
                [moduleCode]="config()!.moduleCode"
                [lang]="lang()"
                [activity]="[]"
                [relatedRecords]="[]"
                [auditTrail]="[]"
                [notes]="[]" />
            </div>
          }
        </div>

        <!-- Layer 9: Sticky Footer -->
        @if (isSlotVisible('sticky-footer') && config()!.footer.enabled) {
          <app-module-sticky-footer
            [config]="footerConfig()"
            (clearSelection)="onClearSelection()" />
        }

        <!-- Part C / G4 — Global Command Palette (Ctrl+K) -->
        <app-dynamic-command-palette />

        <!-- Beyond-Spec: Platform Mode Indicator -->
        @if (platformMode() !== 'human') {
          <cds-tag type="outline" size="sm" class="shell-mode-indicator" [attr.data-mode]="platformMode()">
            {{ modeLabel() }}
          </cds-tag>
        }
      </cds-layer>
    }
    </main>
  `,
    styles: [`
    /* Shell page — Carbon Layer wraps all inner content */
    .shell-page {
      display: flex; flex-direction: column; height: 100%;
      min-height: 0; background: var(--cds-background);
    }
    /* KPI strip uses Carbon Grid — just spacing */
    .shell-kpi-strip { padding-block-start: var(--cds-spacing-04); }
    /* Body uses Carbon Grid — flex: 1 for remaining height */
    .shell-body { flex: 1; min-height: 0; overflow: hidden; }
    /* Layout variant padding */
    .shell-main--board { padding: var(--cds-spacing-05) var(--cds-spacing-06); }
    .shell-main--admin { padding: var(--cds-spacing-05) var(--cds-spacing-06); }
    /* Mode indicator — positioned fixed, uses Carbon Tag */
    .shell-mode-indicator {
      position: fixed; inset-block-end: var(--cds-spacing-05); inset-inline-end: var(--cds-spacing-05);
      z-index: 200;
    }
    /* Sync bar — minimal Carbon-token styles */
    .shell-sync-bar {
      display: flex; align-items: center; gap: var(--cds-spacing-03);
      padding: var(--cds-spacing-02) var(--cds-spacing-06);
      background: var(--cds-support-warning); color: var(--cds-text-on-color);
      font: var(--cds-helper-text-01);
    }
  `]
})
export class ShellHostComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shellResolver = inject(ShellResolverService);
  private kpiBridge = inject(ShellKpiBridgeService);
  private bootstrap = inject(BootstrapStore);
  private accessStore = inject(AccessStore);
  protected i18n = inject(I18nService);
  private modeSvc = inject(PlatformModeService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  // Contract-driven workspace nav (6-layer resolver). The platform AccessStore
  // bound here is `@dos/access-store` (separate from the legacy dauth one above);
  // the adapter consumes that store internally, so we don't need to re-inject it
  // for nav purposes.
  private nav = inject(WorkspaceNavigationAdapter);
  private platformAccess = inject(PlatformAccessStore);

  // NG0203 fix: effect() must be created in an injection context. ngOnInit
  // is NOT an injection context, so we register the reactive nav-refresh
  // effect as a field initializer (which runs during construction, inside
  // DI). Re-resolves nav whenever AccessStore session/module/permission/
  // trial signals change. Idempotent.
  private _navRefreshEffect = effect(() => {
    this.platformAccess.loaded();
    this.platformAccess.modules();
    this.platformAccess.permissions();
    this.platformAccess.trialExpiredModules();
    void this.nav.refresh();
  }, { allowSignalWrites: false });

  readonly shellState = signal<ShellState>('loading');
  readonly config = signal<ResolvedShellConfig | null>(null);
  readonly selectedCount = signal(0);
  readonly pendingChanges = signal(0);

  // Wave 2.1 — Workspace Shell adoption signals
  readonly isMobile = signal(false);
  readonly drawerOpen = signal(false);
  readonly accountOpen = signal(false);

  @HostListener('window:resize')
  onWindowResize(): void { this.refreshIsMobile(); }

  private refreshIsMobile(): void {
    if (!isPlatformBrowser(this.platformId)) { this.isMobile.set(false); return; }
    try { this.isMobile.set(window.matchMedia('(max-width: 1024px)').matches); }
    catch { this.isMobile.set(false); }
  }

  toggleDrawer(): void { this.drawerOpen.update(v => !v); }
  toggleAccount(): void { this.accountOpen.update(v => !v); }

  // Account menu — fail-closed name/email derivation from BootstrapStore.
  readonly accountUserName = computed(() => {
    const u = this.bootstrap.user();
    return (u as { displayName?: string; fullName?: string; name?: string } | null)?.displayName
        ?? (u as { fullName?: string } | null)?.fullName
        ?? (u as { name?: string } | null)?.name
        ?? '';
  });
  readonly accountUserEmail = computed(() => {
    const u = this.bootstrap.user();
    return (u as { email?: string } | null)?.email ?? '';
  });
  readonly accountInitial = computed(() => {
    const n = this.accountUserName().trim();
    if (n) return n.charAt(0).toUpperCase();
    return this.i18n.translate('shell.account.initial.fallback');
  });

  // Account menu — contract-driven from WorkspaceNavigationAdapter.accountMenuConfig().
  // Labels resolve via I18nService.translate(labelKey). requiresAdmin rows are
  // filtered against PlatformAccessStore.isTenantAdmin().
  readonly accountMenuItems = computed<DosAccountMenuItem[]>(() => {
    const isAdmin = this.platformAccess.isTenantAdmin();
    return this.nav.accountMenuConfig()
      .filter((entry) => !entry.requiresAdmin || isAdmin)
      .map((entry) => ({
        id: entry.id,
        label: this.i18n.translate(entry.labelKey),
        destructive: entry.destructive ?? false,
      }));
  });

  // Live workspace nav config (signal from the 6-layer resolver).
  readonly navConfig = computed(() => this.nav.navConfig());

  // Active route, used for routerLinkActive parity inside DosWorkspaceNav.
  private readonly _currentRoute = signal<string>('');
  readonly currentRoute = this._currentRoute.asReadonly();

  // Workspace landing — the clean product entry page. When active, suppress
  // the global module top-nav and the left/right sidenav to render the
  // landing as a full-width Carbon page (Tile/Grid) only.
  readonly isWorkspaceHome = computed(() => {
    const u = (this._currentRoute() || '').split('?')[0].split('#')[0];
    return u === '/' || u === '' || u === '/workspace-home' || u.startsWith('/workspace-home/');
  });

  // Whether AccessStore has finished loading the session (used to gate empty states).
  readonly accessLoaded = computed(() => this.platformAccess.loaded());

  // Mobile bottom nav — first 4 enabled items pulled from the same nav config.
  // Translated via I18nService when items carry labelKey; otherwise label fallback.
  readonly bottomNavItems = computed<DosBottomNavItem[]>(() => {
    const groups = this.nav.navConfig().groups;
    const flat: DosNavItem[] = [];
    for (const g of groups) {
      for (const it of g.items) flat.push(it);
    }
    const enabled = flat.filter((it) => it.enabled && !!it.route);
    return enabled.slice(0, 4).map((it) => ({
      id: it.id,
      label: this.resolveLabel(it),
      route: it.route!,
      active: this._currentRoute().startsWith(it.route!),
    }));
  });

  onBottomNavSelect(item: DosBottomNavItem): void {
    this.drawerOpen.set(false);
    if (item.route) this.router.navigateByUrl(item.route);
  }

  onNavSelect(item: DosNavItem): void {
    this.drawerOpen.set(false);
    if (item.enabled && item.route) this.router.navigateByUrl(item.route);
  }

  onAccountAction(item: DosAccountMenuItem): void {
    this.accountOpen.set(false);
    const entry = this.nav.accountMenuConfig().find((e) => e.id === item.id);
    if (item.id === 'logout' || entry?.destructive) {
      window.dispatchEvent(new CustomEvent('shell:logout'));
      return;
    }
    if (entry?.route) this.router.navigateByUrl(entry.route);
  }
  // Part C / G1 — kpiScope is read from the deepest activated route's data
  // and refreshed on every NavigationEnd. Module-level KPI strip renders only
  // when the active page declares kpiScope === 'module-overview'.
  readonly pageKpiScope = signal<'module-overview' | 'page-local' | 'none'>('none');

  readonly lang = computed(() => this.config()?.lang ?? (this.i18n.direction() === 'rtl' ? 'ar' : 'en'));
  readonly platformMode = computed(() => this.modeSvc.currentMode());

  readonly mastheadConfig = computed<MastheadConfig>(() => {
    const c = this.config();
    if (!c) return {} as MastheadConfig;
    return {
      moduleCode: c.moduleCode,
      moduleName: c.masthead.moduleName,
      moduleIcon: c.masthead.moduleIcon,
      moduleAccentToken: c.masthead.accentToken,
      purposeLine: c.masthead.purposeLine,
      healthLevel: c.masthead.healthLevel,
      dataFreshnessIso: c.masthead.dataFreshness ?? undefined,
      primaryAiAction: c.masthead.primaryAiAction ?? { id: 'none', label: { en: 'AI', ar: 'ذكاء' }, icon: 'sparkles' },
      breadcrumbs: c.masthead.breadcrumbs.map(b => ({ label: c.lang === 'ar' ? b.label.ar : b.label.en, route: b.route })),
      lang: c.lang,
    };
  });

  /**
   * Spec §4.1 — KPI strip is owned by the SHELL, not the page.
   * Prefer live cards published by the active page via `ShellKpiBridgeService`.
   * Fall back to the static contract (kpiStrip.cards) only when no page has
   * published live cards (e.g. during route transitions or for pages that
   * don't yet emit live KPIs). Static fallback values use `—` instead of `0`
   * so users can distinguish "no data plumbed" from "real zero".
   */
  readonly kpiCards = computed<KpiCardVM[]>(() => {
    const live = this.kpiBridge.cards();
    if (live.length > 0) return live.slice(0, this.config()?.kpiStrip.maxVisible ?? live.length);
    const c = this.config();
    if (!c) return [];
    return c.kpiStrip.cards.slice(0, c.kpiStrip.maxVisible).map(k => ({
      id: k.id,
      labelEn: k.label.en,
      labelAr: k.label.ar,
      value: '—',
      icon: k.icon,
      color: k.color,
      bg: k.bg,
      route: k.route ?? '',
      severity: k.urgency ? 'danger' as const : k.health ? 'success' as const : 'default' as const,
    }));
  });

  readonly actionBarItems = computed(() => {
    const c = this.config();
    if (!c) return [];
    return c.actionBar.slots.filter(s => s.visible).map(s => ({
      slot: this.mapPosition(s.position),
      labelEn: s.label.en,
      labelAr: s.label.ar,
      icon: s.icon,
      primary: s.position === 'primary-create',
      disabled: s.disabled ?? false,
      hidden: !s.visible,
    }));
  });

  readonly viewModes = computed(() => {
    const c = this.config();
    if (!c) return ['table' as const];
    return c.actionBar.viewModes.map(v => v === 'kanban' ? 'board' as const : v === 'map' ? 'table' as const : v as any);
  });

  readonly activeView = computed(() => {
    const c = this.config();
    return (c?.actionBar.activeView ?? 'table') as any;
  });

  readonly workflowConfig = computed<WorkflowRibbonConfig>(() => {
    const c = this.config();
    if (!c) return {} as WorkflowRibbonConfig;
    const def = MODULE_SHELL_REGISTRY[c.moduleCode];
    const lifecycle = def?.lifecycleDefinition ?? [];
    const allStates = new Set<string>();
    for (const step of lifecycle) {
      allStates.add(step.from);
      allStates.add(step.to);
    }
    const stateArr = Array.from(allStates);
    const current = c.workflow.currentState ?? 'draft';
    const completedCount = (c.workflow.completedStates?.length ?? 0);
    const totalStates = Math.max(stateArr.length, 1);
    const progress = Math.round((completedCount / totalStates) * 100);

    const transitionSteps = lifecycle.filter(s => s.from === current);
    const transitions = (c.workflow.transitions ?? []).map(t => {
      const step = transitionSteps.find(s => s.to === t);
      const labelEn = t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const labelAr = labelEn;
      return {
        to: t,
        label: labelEn,
        labelAr,
        requiresApproval: step?.requiresApproval ?? false,
        icon: step?.requiresApproval ? 'check-circle' : 'arrow-right',
      };
    });

    const slaStep = transitionSteps.find(s => s.slaHours);
    return {
      currentState: current,
      availableTransitions: transitions,
      slaHours: slaStep?.slaHours ?? null,
      slaDueDate: c.workflow.slaDueDate ?? null,
      slaStatus: c.workflow.slaDueDate && new Date(c.workflow.slaDueDate).getTime() < Date.now() ? 'breached' : 'pending',
      pendingApprovals: c.workflow.approvalsRequired ?? 0,
      lifecycleProgress: progress,
      lang: c.lang,
    };
  });

  readonly footerConfig = computed<StickyFooterConfig>(() => {
    const c = this.config();
    return {
      selectedCount: this.selectedCount(),
      pendingChanges: this.pendingChanges(),
      syncStatus: 'synced' as const,
      lang: c?.lang ?? 'en',
    };
  });

  readonly modeIcon = computed(() => {
    // Carbon icon names (resolved by dos-carbon-icon → @carbon/icons-angular).
    const m: Record<string, string> = {
      hybrid:          'user--multiple',
      shadow_agent:    'view',
      full_autonomous: 'machine-learning-model',
    };
    return m[this.platformMode()] ?? 'user';
  });

  readonly modeLabel = computed(() => {
    const m: Record<string, string> = { hybrid: 'Hybrid', shadow_agent: 'Shadow', full_autonomous: 'Autonomous' };
    return m[this.platformMode()] ?? '';
  });

  /** Deepest activated child — module/product/kpi metadata live on leaf routes. */
  private readDeepestShellRouteData(): { moduleCode: string; productCode: string } {
    let r: ActivatedRoute | null = this.route;
    while (r.firstChild) r = r.firstChild;
    const leaf = r?.snapshot?.data ?? {};
    const parent = this.route.snapshot.data ?? {};
    const moduleCode = (leaf['moduleCode'] ?? leaf['module'] ?? parent['moduleCode'] ?? parent['module'] ?? '') as string;
    const productCode = (leaf['productCode'] ?? parent['productCode'] ?? 'agrc') as string;
    return { moduleCode, productCode };
  }

  ngOnInit(): void {
    // Initial active route + access-driven nav refresh.
    this._currentRoute.set(this.router.url);
    this.refreshIsMobile();
    void this.nav.refresh();
    // Reactive refresh wired up via _navRefreshEffect field initializer
    // (see field declaration above) — effect() requires injection context.

    // Part C / G1 — refresh pageKpiScope on every NavigationEnd by walking
    // the activated route tree to its deepest snapshot.data.
    const updateKpiScope = () => {
      let r = this.route.snapshot;
      while (r.firstChild) r = r.firstChild;
      const scope = (r.data?.['kpiScope'] as string) ?? 'none';
      this.pageKpiScope.set(
        scope === 'module-overview' || scope === 'page-local' ? scope : 'none',
      );
    };
    updateKpiScope();
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((evt) => {
      this._currentRoute.set(evt.urlAfterRedirects);
      updateKpiScope();
      // Spec §4.1 — clear stale page-published KPIs across navigations so the
      // strip never carries values from a previous page until the new page
      // re-publishes (or the static contract fallback renders).
      this.kpiBridge.clear();
    });

    const resolveShell$ = merge(
      of(null),
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
    ).pipe(
      map(() => this.readDeepestShellRouteData().moduleCode),
      filter((code: string) => !!code),
      distinctUntilChanged(),
      tap(() => this.shellState.set('loading')),
      switchMap(moduleCode => {
        const user = this.bootstrap.user();
        const tenant = this.bootstrap.tenant();
        const roleProfile = this.bootstrap.roleProfile();
        const productCode = this.readDeepestShellRouteData().productCode;

        const input: ShellResolverInput = {
          productCode,
          tenantId: tenant?.tenantId ?? 'default',
          userId: user?.userId ?? 'anonymous',
          roleCode: roleProfile?.roleCode ?? user?.roleCode ?? 'viewer',
          moduleCode,
        };

        return this.shellResolver.resolveShell(input);
      }),
      tap(resolved => {
        const dir = this.i18n.direction();
        if (dir === 'rtl' && resolved.lang === 'en') {
          resolved = { ...resolved, lang: 'ar', dir: 'rtl' };
        } else if (dir === 'ltr' && resolved.lang === 'ar') {
          resolved = { ...resolved, lang: 'en', dir: 'ltr' };
        }
        this.config.set(resolved);
        const presetMap: Record<string, ShellState> = {
          'loading': 'loading', 'skeleton': 'skeleton', 'empty-first-use': 'empty-first-use',
          'empty-filtered': 'empty-filtered', 'no-permission': 'no-permission',
          'error-recoverable': 'error', 'error-blocking': 'error-blocking',
          'archived': 'archived', 'syncing': 'syncing',
        };
        const mapped = resolved.statePreset ? presetMap[resolved.statePreset] : undefined;
        this.shellState.set(mapped ?? 'ready');
      }),
      catchError(err => {
        this.shellState.set('error');
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    );

    resolveShell$.subscribe();
  }

  isSlotVisible(slotId: string): boolean {
    const c = this.config();
    if (!c) return false;
    const slot = c.slots.find(s => s.slotId === slotId);
    return slot?.visible ?? false;
  }

  retryResolve(): void {
    const { moduleCode } = this.readDeepestShellRouteData();
    if (moduleCode) {
      this.shellResolver.invalidateCache(moduleCode);
      void this.router.navigateByUrl(this.router.url, { replaceUrl: true });
    }
  }

  onAiAction(actionId: string): void {
    window.dispatchEvent(new CustomEvent('shell:ai-action', { detail: { actionId, moduleCode: this.config()?.moduleCode } }));
  }

  onSlotClick(slot: string): void {
    window.dispatchEvent(new CustomEvent('shell:action', { detail: { slot, moduleCode: this.config()?.moduleCode } }));
  }

  onSearchChange(term: string): void {
    window.dispatchEvent(new CustomEvent('shell:search', { detail: { term, moduleCode: this.config()?.moduleCode } }));
  }

  onViewChange(view: string): void {
    window.dispatchEvent(new CustomEvent('shell:view-change', { detail: { view, moduleCode: this.config()?.moduleCode } }));
  }

  onTransition(to: string): void {
    window.dispatchEvent(new CustomEvent('shell:transition', { detail: { to, moduleCode: this.config()?.moduleCode } }));
  }

  onClearSelection(): void {
    this.selectedCount.set(0);
  }

  onClearFilters(): void {
    window.dispatchEvent(new CustomEvent('shell:clear-filters', { detail: { moduleCode: this.config()?.moduleCode } }));
  }

  // Carbon UIShell helpers — label resolution & active-route detection.
  resolveLabel(item: DosNavItem): string {
    if (item.labelKey) {
      const tr = this.i18n.translate(item.labelKey);
      if (tr && tr !== item.labelKey) return tr;
    }
    if (item.label && !/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(item.label)) return item.label;
    // Final fallback — never leak raw dotted i18n keys into the UI. Take the
    // last meaningful segment of the key/id, drop trailing ".title"/".label",
    // split on dashes/underscores, and Title Case.
    const raw = (item.label || item.id || item.labelKey || '').toString();
    const cleaned = raw.replace(/\.(title|label|name)$/i, '');
    const seg = cleaned.split('.').pop() || cleaned;
    return seg
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || seg;
  }

  isActive(item: DosNavItem): boolean {
    const route = item.route;
    if (!route) return false;
    return this._currentRoute().startsWith(route);
  }

  private mapPosition(pos: string): any {
    const m: Record<string, string> = {
      'primary-create': 'new', import: 'import', bulk: 'bulk',
      filters: 'filter', 'view-switch': 'viewSwitch', export: 'export', 'ai-assist': 'aiAssist',
    };
    return m[pos] ?? pos;
  }
}
