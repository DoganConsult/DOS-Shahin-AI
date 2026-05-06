import { Injectable, computed, signal, inject } from '@angular/core';
import { BootstrapStore } from '@app/core/services/platform/bootstrap.store';
import { AccessStore } from '@dos/access-store';
import { EntitlementsService } from '@app/core/services/platform/entitlements.service';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  EffectiveUiState,
  EffectiveNavItem,
  EffectiveModuleView,
  EffectiveActionState,
  AiModuleCapability,
  UiRenderContext,
  PageAccessResult,
  DenialReason,
} from '@app/core/runtime/ui-state.models';
import { PAGE_BY_ROUTE } from '../../registries/page.registry';
import { DynamicUiBootstrapService } from '@app/core/services/platform/dynamic-ui-bootstrap.service';
import { environment } from '@env/environment';
import { WidgetRenderContext } from '@app/shared/widgets/widget-core/core/models/widget-context.model';

/**
 * Signal-based single source of truth for the policy-driven UI.
 *
 * Computed once at bootstrap via `resolve()`.
 * All components and services read from this store's signals.
 */
@Injectable({ providedIn: 'root' })
export class UiRuntimeStore {
  private bootstrap = inject(BootstrapStore);
  private accessStore = inject(AccessStore);
  private entitlements = inject(EntitlementsService);

  private i18n = inject(I18nService);
  private dynamicUiBootstrap = inject(DynamicUiBootstrapService);

  // ── Internal state ───────────────────────────────────────────────────
  private _blueprint = signal<EffectiveUiState | null>(null);
  private _renderContext = signal<UiRenderContext | null>(null);
  private _resolved = signal(false);

  // ── Public signals ───────────────────────────────────────────────────
  readonly resolved = computed(() => this._resolved());
  readonly blueprint = computed(() => this._blueprint());

  readonly nav = computed<EffectiveNavItem[]>(
    () => this._blueprint()?.navigation ?? []
  );

  readonly modules = computed<EffectiveModuleView[]>(
    () => this._blueprint()?.modules ?? []
  );

  readonly featureFlags = computed<Set<string>>(
    () => this._blueprint()?.featureFlags ?? new Set()
  );

  readonly aiCapabilities = computed<AiModuleCapability[]>(
    () => this._blueprint()?.aiCapabilities ?? []
  );

  readonly renderContext = computed<UiRenderContext | null>(
    () => this._renderContext()
  );

  // DB-driven only. null = no UI-OS landing route; SPA must render
  // empty/no-op (NO FRONTEND INVENTION per AGENTS.md).
  readonly landingPage = computed<string | null>(
    () => this._blueprint()?.landingPage ?? null
  );

  readonly archetypeCode = computed<string>(
    () => this._blueprint()?.archetypeCode ?? 'standard'
  );

  /**
   * Provides a WidgetRenderContext compatible with the existing widget system.
   * This bridges the new UiRenderContext to the existing WidgetVisibilityService.
   */
  readonly widgetRenderContext = computed<WidgetRenderContext | null>(() => {
    const ctx = this._renderContext();
    if (!ctx) return null;
    return {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      roleCode: ctx.roleCode,
      lang: ctx.lang,
      rtl: ctx.rtl,
      dateRange: undefined,
      globalFilters: ctx.globalFilters,
      featureFlags: ctx.featureFlags,
      activeModules: ctx.activeModules,
      sectorCode: ctx.sectorCode,
      frameworkCodes: ctx.frameworkCodes,
    };
  });

  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Called once after BootstrapStore + AccessStore + EntitlementsService
   * are loaded. Builds UiRenderContext from all stores, delegates to
   * UiBlueprintResolverService, and stores result.
   */
  async resolve(): Promise<void> {
    if (!environment.uiPolicyEngine) return;

    const data = this.bootstrap.data();
    if (!data) return;

    // 1. Build UiRenderContext from existing stores
    const ctx: UiRenderContext = {
      tenantId: data.tenant?.tenantId ?? '',
      userId: data.user?.userId ?? '',
      roleCode: data.user?.roleCode ?? 'viewer',
      lang: (this.i18n.currentLang() ?? 'en') as 'ar' | 'en',
      rtl: this.i18n.currentLang() === 'ar',

      permissions: this.buildPermissionSet(),
      functionalRoles: this.accessStore.functionalRoles() ?? [],
      accessProfiles: this.accessStore.accessProfiles() ?? [],

      activeModules: this.entitlements.entitlements()?.modules
        ? Object.entries(this.entitlements.entitlements()!.modules)
            .filter(([, v]) => v === true)
            .map(([k]) => k)
        : [],
      featureFlags: [], // Populated from bootstrap if available
      tier: this.entitlements.tier() ?? 'free',
      operationMode: this.entitlements.operationMode() ?? 'human',

      sectorCode: data.workspace?.sectors?.[0],
      frameworkCodes: data.workspace?.sectors ?? [],
      orgSize: undefined,
      enforcementMode: data.workspace?.enforcementMode ?? undefined,

      globalFilters: {},
    };

    this._renderContext.set(ctx);

    const blueprint: EffectiveUiState = {
      navigation: [],
      modules: [],
      pages: [],
      actions: {},
      featureFlags: new Set(),
      aiCapabilities: [],
      landingPage: null,
      archetypeCode: 'standard',
    };
    this._blueprint.set(blueprint);
    this._resolved.set(true);
  }

  // ── Synchronous lookups from precomputed state ───────────────────────

  canAccessPage(route: string): PageAccessResult {
    const blueprint = this._blueprint();
    if (!blueprint) {
      return { allowed: true, reasons: [], requiredPermissions: [], missingPermissions: [] };
    }
    // W11.D9.3 — prefer effective registry (foundation overlaid by live
    // dynamic-ui rows); fall back to static map.
    const reg = this.dynamicUiBootstrap.effectivePageRegistry();
    const page = reg.length
      ? (reg.find(p => p.route === route) ?? PAGE_BY_ROUTE.get(route))
      : PAGE_BY_ROUTE.get(route);
    if (!page) {
      return { allowed: true, reasons: [], requiredPermissions: [], missingPermissions: [] };
    }
    const pageView = blueprint.pages.find(p => p.route === route);
    if (!pageView) {
      return { allowed: true, reasons: [], requiredPermissions: [], missingPermissions: [] };
    }
    if (pageView.allowed) {
      return { allowed: true, reasons: [], requiredPermissions: page.requiresPermissions, missingPermissions: [] };
    }
    const reasons: DenialReason[] = [];
    if (pageView.disabledReason) {
      reasons.push({
        category: 'permission',
        code: pageView.disabledReason,
        messageEn: pageView.disabledReason,
        messageAr: pageView.disabledReason,
      });
    }
    const ctx = this._renderContext();
    const missing = page.requiresPermissions.filter(p => !ctx?.permissions.has(p));
    return {
      allowed: false,
      reasons,
      requiredPermissions: page.requiresPermissions,
      missingPermissions: missing,
    };
  }

  canPerformAction(actionCode: string): EffectiveActionState {
    const blueprint = this._blueprint();
    if (!blueprint) {
      return { actionCode, visible: true, enabled: true, mode: 'normal' };
    }
    return blueprint.actions[actionCode] ?? { actionCode, visible: true, enabled: true, mode: 'normal' };
  }

  isModuleVisible(moduleCode: string): boolean {
    const blueprint = this._blueprint();
    if (!blueprint) return true;
    return blueprint.modules.some(m => m.moduleCode === moduleCode && m.visible);
  }

  private buildPermissionSet(): Set<string> {
    if (!this.accessStore.loaded()) return new Set();

    if (this.accessStore.isAdmin()) return new Set(['*']);

    return new Set(this.accessStore.permissions());
  }

  clear(): void {
    this._blueprint.set(null);
    this._renderContext.set(null);
    this._resolved.set(false);
  }
}
