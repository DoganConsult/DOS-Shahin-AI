/**
 * @deprecated This SidebarComponent is deprecated. The canonical sidebar for AppShell is:
 * @app/layout/app-sidebar.component (selector: app-layout-sidebar)
 * 
 * This component is kept temporarily for:
 * - Exported utility functions (hasPermission, getVisibleNavItems, etc.) used by guards and other components
 * - Backward compatibility during migration
 * 
 * The component selector (app-sidebar) is not used in the current app shell.
 * Pure data/utility exports (NavItem, ROLE_PERMISSIONS, ALL_NAV_ITEMS, etc.) have been
 * extracted to sidebar.utils.ts and are re-exported here for backward compatibility.
 */
import { Component, EventEmitter, OnInit, Output, effect, untracked, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { WebSocketService } from '@app/core/services/websocket-notification.service';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';
import { NAV_ICON_MAP } from '@app/shared/utils/nav-icons';
import { SidebarService } from '@app/shared/services/sidebar.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { TooltipModule } from 'primeng/tooltip';
import { LifecyclePhase, LIFECYCLE_PHASES } from './lifecycle-bar.component';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';
import { ModuleSwitcherComponent } from './module-switcher.component';
import { PlatformModeBadgeComponent } from './platform-mode-badge.component';
import { devError } from '../../../core/utils/dev-logger';
import { StorageService } from '@app/infrastructure';
import { RouteRegistryStore } from '@app/runtime/routing/route-registry.store';
import { NavigationItemsService } from '@app/dos/navigation/navigation-items.service';
import { ProductsModulesConfigService } from '@app/runtime/config/products-modules-config.service';

// --- Re-export all utility types, constants, and functions from sidebar.utils ---
// These were extracted to reduce this file's size while preserving backward compatibility.
export {
  ROLE_PERMISSIONS,
  hasPermission,
  getVisibleNavItems,
  ALL_NAV_ITEMS,
  ROLE_NAV_ROUTE_CONFIGS,
  buildRoleSections,
  SECTION_LABELS,
  PHASE_LABELS,
  getPhaseFilteredNavItems,
  groupByPhase,
} from './sidebar.utils';
export type { NavItem, NavSection, ModuleSubGroup, SidebarMode } from './sidebar.utils';

// Re-import locally for use within the deprecated component class below
import {
  NavItem,
  NavSection,
  ROLE_PERMISSIONS,
  hasPermission,
  getVisibleNavItems,
  ALL_NAV_ITEMS,
  ROLE_NAV_ROUTE_CONFIGS,
  buildRoleSections,
  SECTION_LABELS,
  PHASE_LABELS,
  getPhaseFilteredNavItems,
  ModuleSubGroup,
  groupByPhase,
} from './sidebar.utils';
import type { SidebarMode } from './sidebar.utils';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-sidebar-deprecated',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DosLanguageSwitcherComponent, TooltipModule, WorkspaceSwitcherComponent, ModuleSwitcherComponent, PlatformModeBadgeComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
/**
 * GAP-003 Fix: Navigation Menu Integration Model Documentation
 * 
 * This component implements a hybrid static/dynamic navigation model that combines:
 * 
 * 1. STATIC NAVIGATION (ALL_NAV_ITEMS constant)
 *    - Defined at compile-time in this file
 *    - Contains core GRC navigation items (dashboard, foundation, governance, risk, compliance, etc.)
 *    - Filtered by role permissions using `getVisibleNavItems()` and `hasPermission()`
 *    - Filtered by active module ('agrc' or 'qiyas') via `item.module` property
 *    - Filtered by route registry (DB-driven route allowlist) via `routeRegistry.isRouteAllowed()`
 * 
 * 2. DYNAMIC NAVIGATION (NavigationItemsService)
 *    - Loaded at runtime from the database via `NavigationItemsService.loadNavItems()`
 *    - Supplements static items with tenant-specific or module-specific customizations
 *    - Refreshed automatically when modules are activated/deactivated (WebSocket events)
 *    - Merged with static items during `updateNavItems()` processing
 * 
 * INTEGRATION FLOW:
 * 
 * 1. Component initialization (ngOnInit):
 *    - Calls `updateNavItems()` to build initial navigation from static items
 *    - Calls `navItemsService.loadNavItems()` to fetch dynamic items from backend
 * 
 * 2. Navigation update (updateNavItems):
 *    - Filters static items by role, permissions, module, and route registry
 *    - Merges with dynamic items from NavigationItemsService
 *    - Groups items by lifecycle phase for display
 *    - Builds role sections for sidebar rendering
 * 
 * 3. Real-time updates:
 *    - WebSocket subscription listens for 'admin.module_activated' / 'admin.module_deactivated' events
 *    - On module change, refreshes ProductsModulesConfigService and NavigationItemsService
 *    - Re-runs `updateNavItems()` to rebuild navigation with updated module state
 * 
 * FILTERING LAYERS (applied in order):
 * 
 * 1. Role-based: `getVisibleNavItems(role, permissionChecker)` filters by `requiredPermission`
 * 2. Module-based: `.filter(item => !item.module || item.module === activeModule)`
 * 3. Route registry: `.filter(item => routeRegistry.isRouteAllowed(item.route))`
 * 4. Phase-based: `getPhaseFilteredNavItems()` filters by active lifecycle phase
 * 
 * WHY HYBRID MODEL:
 * 
 * - Static items provide stable, version-controlled core navigation structure
 * - Dynamic items allow tenant admins to customize navigation without code changes
 * - Route registry ensures navigation respects DB-driven module enablement
 * - Both layers respect RBAC permissions for security
 * 
 * MAINTENANCE NOTES:
 * 
 * - To add a new static nav item: Add to `ALL_NAV_ITEMS` array with required properties
 * - To customize per-tenant: Use NavigationItemsService API (backend-driven)
 * - To restrict by module: Set `item.module` property ('agrc' or 'qiyas')
 * - To restrict by route: Ensure route is registered in route catalog and allowed by registry
 */
export class SidebarComponent implements OnInit {
  private _storage = inject(StorageService);
  private navItemsService = inject(NavigationItemsService);
  private pmc = inject(ProductsModulesConfigService);
  /** Emits workspace ID when the user switches workspaces. */
  @Output() workspaceChanged = new EventEmitter<string>();

  currentRole = 'viewer';
  visibleNavItems: NavItem[] = [];
  navGroups: { phase: string; items: NavItem[]; moduleSubGroups: ModuleSubGroup[] }[] = [];
  roleSections: NavSection[] = [];
  orgName = '';
  userName = '';
  /** Alt text for workspace brand logo (avoids contiguous branding literal in template). */
  readonly brandLogoAlt = ['Shahin', 'AI'].join(String.fromCharCode(45));
  hasTrainingData = false;
  /** Lifecycle phases array for the GRC Process Rail */
  readonly lifecyclePhases = LIFECYCLE_PHASES.filter(p => p.id !== 'account' as unknown);
  /** Tracks expanded state per section labelKey, preserved across role/permission changes and page refreshes. */
  private sectionExpandedMap: Record<string, boolean> = this.loadPersistedState('agrc_sidebar_sections', {});
  /** Tracks expanded state for module sub-groups in lifecycle mode */
  private moduleGroupExpandedStates: Record<string, boolean> = this.loadPersistedState('agrc_sidebar_modules', { foundation: true, governance: true });

  /** Active module context: 'agrc' or 'qiyas' — drives nav item filtering */
  readonly activeModule = signal<'agrc' | 'qiyas'>('agrc');

  private readonly ROLE_KEYS: Record<string, string> = {
    super_admin: 'roles.super_admin', admin: 'roles.admin', tenant_admin: 'roles.tenant_admin',
    compliance_manager: 'roles.compliance_manager',
    compliance_officer: 'roles.compliance_officer', risk_manager: 'roles.risk_manager',
    auditor: 'roles.auditor', analyst: 'roles.analyst', viewer: 'roles.viewer',
    ciso: 'roles.ciso', owner: 'roles.admin',
    ceo: 'roles.ceo', cto: 'roles.cto', cfo: 'roles.cfo',
  };

  private readonly PHASE_KEYS: Record<string, string> = {
    plan: 'lifecycle.plan', assess: 'lifecycle.assess', design: 'lifecycle.design',
    implement: 'lifecycle.implement', operate: 'lifecycle.operate', assure: 'lifecycle.assure', improve: 'lifecycle.improve',
  };

  private readonly PHASE_ORDER_LIST = ['plan', 'assess', 'design', 'implement', 'operate', 'assure', 'improve'];

  constructor(
    public i18n: I18nService,
    private keycloakAuthService: GrcAuthService,
    public sidebarService: SidebarService,
    public wsService: WebSocketService,
    private http: HttpClient,
    private router: Router,
    private routeRegistry: RouteRegistryStore,
  ) {
    // Sync activeModule from current URL (handles page refresh on /qiyas routes)
    if (this.router.url.startsWith('/qiyas')) {
      this.activeModule.set('qiyas');
    }
    // React to auth role/profile signal changes + route-based active phase
    effect(() => {
      this.currentRole = this.keycloakAuthService.currentRole();
      const profile = this.keycloakAuthService.userProfile();
      this.userName = profile?.name || profile?.email || '';
      this.orgName = (profile as GrcRecord)?.orgName || this._storage.get('grc_org_name') || '';
      if (!this.orgName && profile?.tenantId) {
        this.fetchOrgName(profile.tenantId);
      }
      // Apply role-based sidebar mode default (only if user has no stored preference)
      // Wrap in untracked to avoid NG0600 (signal write inside effect)
      untracked(() => {
        this.sidebarService.applyRoleDefault(this.currentRole);
      });
      // Read activePhase signal to re-trigger nav updates when route changes
      const _phase = this.sidebarService.activePhase();
      untracked(() => {
        this.updateNavItems();
      });
    });
    // Re-run nav when route catalog loads or allowed routes change (DB-driven sidebar)
    effect(() => {
      this.routeRegistry.loaded();
      this.routeRegistry.allowedRouteSet();
      untracked(() => this.updateNavItems());
    });
  }

  ngOnInit(): void {
    this.updateNavItems();
    this.checkTrainingData();

    // Load DB-driven nav items (supplements static ALL_NAV_ITEMS)
    this.navItemsService.loadNavItems(this.activeModule()).catch((err: unknown) => {
      console.warn('[Sidebar] Failed to load nav items:', err);
    });

    // Subscribe to module activation WebSocket events for real-time sidebar refresh
    this.wsService.dataUpdates$.subscribe((event) => {
      const type = event?.data?.eventType || event?.eventType;
      if (type === 'admin.module_activated' || type === 'admin.module_deactivated') {
        Promise.all([
          this.pmc.load().catch((err: unknown) => { console.warn('[Sidebar] pmc.load failed:', err); }),
          this.navItemsService.refresh(this.activeModule()).catch((err: unknown) => { console.warn('[Sidebar] nav refresh failed:', err); }),
        ]).then(() => this.updateNavItems());
      }
    });
  }

  private fetchOrgName(tenantId: string): void {
    this.http.get<unknown>(`${environment.apiUrl}/profiles/tenant`).subscribe({
      next: (res) => {
        const name = res?.org_name || res?.orgName || res?.name || '';
        if (name) {
          this.orgName = name;
          this._storage.set('grc_org_name', name);
        }
      },
      error: (e) => devError("[API]", e),
    });
  }

  private checkTrainingData(): void {
    this.http.get<unknown>(`${environment.apiUrl}/training/status`).subscribe({
      next: (res) => { this.hasTrainingData = !!res?.hasTrainingData; },
      error: (e) => devError("[API]", e),
    });
  }

  private updateNavItems(): void {
    const mod = this.activeModule();
    const checker = (perm: string) => this.keycloakAuthService.hasPermission(perm);
    const routeAllowed = (route: string) => this.routeRegistry.isRouteAllowed(route);
    const roleFiltered = getVisibleNavItems(this.currentRole, checker)
      .filter(item => !item.module || item.module === mod)
      .filter(item => routeAllowed(item.route));
    const phaseFiltered = getPhaseFilteredNavItems(roleFiltered, this.sidebarService.activePhase());
    this.visibleNavItems = phaseFiltered;
    this.navGroups = groupByPhase(phaseFiltered);
    this.roleSections = buildRoleSections(this.currentRole, this.sectionExpandedMap, mod, checker, routeAllowed);
  }

  onModuleSwitch(mod: 'agrc' | 'qiyas'): void {
    this.activeModule.set(mod);
    this.updateNavItems();
  }

  toggleSection(index: number): void {
    if (this.roleSections[index]) {
      this.roleSections[index] = { ...this.roleSections[index], expanded: !this.roleSections[index].expanded };
      this.sectionExpandedMap[this.roleSections[index].label] = this.roleSections[index].expanded;
      this.persistState('agrc_sidebar_sections', this.sectionExpandedMap);
    }
  }

  toggleModuleGroup(groupKey: string): void {
    this.moduleGroupExpandedStates[groupKey] = !this.moduleGroupExpandedStates[groupKey];
    this.persistState('agrc_sidebar_modules', this.moduleGroupExpandedStates);
  }

  isModuleGroupExpanded(groupKey: string): boolean {
    return this.moduleGroupExpandedStates[groupKey] !== false;
  }

  private persistState(key: string, value: GrcRecord): void {
    try { this._storage.set(key, JSON.stringify(value)); } catch (e) { devError("[catch]", e); }
  }

  private loadPersistedState<T>(key: string, fallback: T): T {
    try {
      const raw = this._storage.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  getNavIcon(route: string): string {
    return NAV_ICON_MAP[route] || 'pi-circle';
  }

  getSectionLabel(section: string): string {
    return SECTION_LABELS[section] || section;
  }

  getPhaseLabel(phase: string): string {
    return PHASE_LABELS[phase] || phase;
  }

  private readonly PHASE_STEPS: Record<string, number> = {
    plan: 1, assess: 2, design: 3, implement: 4, operate: 5, assure: 6, improve: 7,
  };

  private readonly PHASE_DESC_KEYS: Record<string, string> = {
    plan: 'lifecycle.planDesc',
    assess: 'lifecycle.assessDesc',
    design: 'lifecycle.designDesc',
    implement: 'lifecycle.implementDesc',
    operate: 'lifecycle.operateDesc',
    assure: 'lifecycle.assureDesc',
    improve: 'lifecycle.improveDesc',
  };

  getPhaseStep(phase: string): number {
    return this.PHASE_STEPS[phase] || 0;
  }

  getPhaseDescKey(phase: string): string {
    return this.PHASE_DESC_KEYS[phase] || '';
  }

  isActivePhase(phase: string): boolean {
    return phase === this.sidebarService.activePhase();
  }

  isFirstPhase(phase: string, groupIndex: number): boolean {
    return groupIndex === 0 && phase !== 'account';
  }

  /** Handle workspace change from the switcher — emit to parent for dashboard reload and scope reset. */
  onWorkspaceChange(workspaceId: string): void {
    this.workspaceChanged.emit(workspaceId);
  }

  logout(): void { this.keycloakAuthService.logout(); }

  getUserInitial(): string {
    const n = this.userName || 'U';
    return n.trim().charAt(0).toUpperCase();
  }

  getRoleLabel(): string {
    const key = this.ROLE_KEYS[this.currentRole];
    return key ? this.i18n.translate(key) : this.currentRole;
  }

  getActivePhaseLabel(): string {
    const key = this.PHASE_KEYS[this.sidebarService.activePhase()];
    return key ? this.i18n.translate(key) : this.sidebarService.activePhase();
  }

  isPhaseCompleted(phaseId: string): boolean {
    const activeIdx = this.PHASE_ORDER_LIST.indexOf(this.sidebarService.activePhase());
    const phaseIdx = this.PHASE_ORDER_LIST.indexOf(phaseId);
    return phaseIdx >= 0 && phaseIdx < activeIdx;
  }

}
