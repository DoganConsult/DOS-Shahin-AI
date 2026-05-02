import { Injectable } from '@angular/core';
import { EffectiveNavItem, UiRenderContext, DenialReason } from '../../runtime/ui-state.models';
import { PLATFORM_MODULES } from '../../runtime/ui-constants';

/** Minimal shape of the API navigation menu response */
interface ApiNavMenu {
  primary?: Record<string, any>[];
  secondary?: Record<string, any>[];
}

export interface CommandAction {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string | null;
  icon: string | null;
  category: 'navigation' | 'action' | 'search';
  moduleCode: string | null;
  requiredPermission: string | null;
}

/**
 * Builds sidebar/topnav/command-palette from DB nav + UiRenderContext.
 * Replaces static ALL_NAV_ITEMS + ROLE_NAV_ROUTE_CONFIGS.
 */
@Injectable({ providedIn: 'root' })
export class NavigationDerivationService {

  /**
   * Build sidebar from API nav menu + render context.
   * Returns EffectiveNavItem[] tree with visibility and denial reasons.
   */
  buildSidebar(apiNavMenu: ApiNavMenu, ctx: UiRenderContext): EffectiveNavItem[] {
    if (!apiNavMenu?.primary?.length) {
      return [];
    }

    // 1. Convert flat API items to EffectiveNavItem with visibility
    const items: EffectiveNavItem[] = (apiNavMenu.primary as any[]).map(item =>
      this.evaluateNavItem(item, ctx)
    );

    // 2. Build parent->children tree
    const tree = this.buildTree(items);

    // 3. Apply orphan reparenting
    const reparented = this.reparentOrphans(tree);

    // 4. Sort by sortOrder
    this.sortRecursive(reparented);

    return reparented;
  }

  /**
   * Build top nav (secondary items).
   */
  buildTopNav(apiNavMenu: ApiNavMenu, ctx: UiRenderContext): EffectiveNavItem[] {
    if (!apiNavMenu?.secondary?.length) {
      return [];
    }
    return (apiNavMenu.secondary as any[]).map(item =>
      this.evaluateNavItem(item, ctx)
    );
  }

  /**
   * Build command palette actions from visible nav items.
   * Flattens the nav tree into searchable command actions.
   */
  buildCommandPaletteActions(apiNavMenu: ApiNavMenu, ctx: UiRenderContext): CommandAction[] {
    const sidebar = this.buildSidebar(apiNavMenu, ctx);
    const actions: CommandAction[] = [];
    this.flattenToCommands(sidebar, actions);
    return actions;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private flattenToCommands(items: EffectiveNavItem[], result: CommandAction[]): void {
    for (const item of items) {
      if (!item.visible) continue;

      // Only include items with routes (not pure group headers)
      if (item.route) {
        result.push({
          id: `nav-${item.navKey}`,
          labelEn: item.labelEn,
          labelAr: item.labelAr,
          route: item.route,
          icon: item.icon,
          category: 'navigation',
          moduleCode: item.moduleCode,
          requiredPermission: null,
        });
      }

      // Recurse into children
      if (item.children.length > 0) {
        this.flattenToCommands(item.children, result);
      }
    }
  }

  private evaluateNavItem(item: Record<string, any>, ctx: UiRenderContext): EffectiveNavItem {
    const denialReasons: DenialReason[] = [];
    let visible = true;
    const disabled = false;

    const navKey = item.navKey || item.id || '';
    const moduleCode = item.module || item.moduleCode || null;
    const requiredPermission = item.requiredPermission || item.audience?.requiredPermission || null;

    // Check module entitlement (skip platform modules + null)
    if (moduleCode && !PLATFORM_MODULES.has(moduleCode) && !ctx.activeModules.includes(moduleCode)) {
      visible = false;
      denialReasons.push({
        category: 'module',
        code: `module_not_entitled:${moduleCode}`,
        messageEn: `Module "${moduleCode}" not active`,
        messageAr: `الوحدة "${moduleCode}" غير نشطة`,
      });
    }

    // Check permission
    if (visible && requiredPermission) {
      if (!ctx.permissions.has(requiredPermission) && !ctx.permissions.has('*')) {
        visible = false;
        denialReasons.push({
          category: 'permission',
          code: `missing_permission:${requiredPermission}`,
          messageEn: `Missing permission: ${requiredPermission}`,
          messageAr: `صلاحية مفقودة: ${requiredPermission}`,
        });
      }
    }

    // Check role binding (if audience has roles array)
    if (visible && item.audience?.roles?.length) {
      if (!item.audience.roles.includes(ctx.roleCode) && !ctx.accessProfiles.includes('platform_super_admin')) {
        visible = false;
        denialReasons.push({
          category: 'permission',
          code: `role_not_allowed:${ctx.roleCode}`,
          messageEn: `Role "${ctx.roleCode}" not allowed`,
          messageAr: `الدور "${ctx.roleCode}" غير مسموح`,
        });
      }
    }

    // Check is_allowed from navigation_role_bindings (if provided via API)
    if (visible && item.isAllowed === false) {
      visible = false;
      denialReasons.push({
        category: 'permission',
        code: `nav_role_binding_denied:${navKey}`,
        messageEn: `Navigation item disabled for your role`,
        messageAr: `عنصر التنقل معطل لدورك`,
      });
    }

    // Recursively evaluate children
    const children: EffectiveNavItem[] = (item.children ?? []).map(( c: Record<string, any>) =>
      this.evaluateNavItem(c, ctx)
    );

    // A parent is visible if at least one child is visible
    if (children.length > 0 && !item.route) {
      const anyChildVisible = children.some(c => c.visible);
      if (!anyChildVisible) {
        visible = false;
      }
    }

    return {
      navKey,
      parentNavKey: item.parentNavKey || item.parentId || null,
      labelEn: item.labelEn || item.label || '',
      labelAr: item.labelAr || '',
      route: item.route || null,
      icon: item.icon || null,
      moduleCode,
      sortOrder: item.sortOrder ?? 999,
      visible,
      disabled,
      denialReasons,
      children,
    };
  }

  private buildTree(items: EffectiveNavItem[]): EffectiveNavItem[] {
    const rootItems = items.filter(i => !i.parentNavKey);
    const childMap = new Map<string, EffectiveNavItem[]>();

    for (const item of items) {
      if (item.parentNavKey) {
        const siblings = childMap.get(item.parentNavKey) ?? [];
        siblings.push(item);
        childMap.set(item.parentNavKey, siblings);
      }
    }

    for (const root of rootItems) {
      const moreChildren = childMap.get(root.navKey) ?? [];
      if (moreChildren.length > 0) {
        root.children = [...root.children, ...moreChildren];
      }
    }

    return rootItems;
  }

  /**
   * Move orphaned root-level items into their logical parent group.
   * Mirrors NavigationStore.reparentOrphans logic.
   */
  private static readonly ORPHAN_ROUTE_PARENT: Record<string, string[]> = {
    'governance': ['/governance/', '/policies', '/policy-versions', '/procedures'],
    'risk':       ['/risk/', '/risk-scoring', '/risk-appetite', '/risk-workspace', '/risk-hub'],
    'compliance': ['/compliance/', '/controls', '/frameworks'],
    'evidence':   ['/evidence/'],
    'audit':      ['/audit/', '/akb', '/audit-workpapers'],
    'reporting':  ['/reports/'],
    'qiyas':      ['/qiyas/', '/maturity'],
    'ai':         ['/ai-hub', '/workflows', '/task-board', '/agrc-os'],
  };

  private reparentOrphans(items: EffectiveNavItem[]): EffectiveNavItem[] {
    const orphanIndices: number[] = [];
    const parentMap = new Map<string, EffectiveNavItem>();

    for (const item of items) {
      if (item.children.length > 0) {
        parentMap.set(item.navKey.toLowerCase(), item);
      }
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.children.length > 0) continue;
      const route = (item.route || '').toLowerCase();
      if (!route) continue;

      for (const [parentKey, routes] of Object.entries(NavigationDerivationService.ORPHAN_ROUTE_PARENT)) {
        if (routes.some(r => route.startsWith(r) || route === r)) {
          const parent = parentMap.get(parentKey);
          if (parent) {
            const alreadyChild = parent.children.some(c => c.route === item.route);
            if (!alreadyChild) {
              parent.children.push(item);
            }
            orphanIndices.push(i);
          }
          break;
        }
      }
    }

    for (const idx of orphanIndices) {
      items.splice(idx, 1);
    }

    return items;
  }

  private sortRecursive(items: EffectiveNavItem[]): void {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of items) {
      if (item.children.length > 0) {
        this.sortRecursive(item.children);
      }
    }
  }
}
