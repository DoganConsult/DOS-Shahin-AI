import { Injectable, inject } from '@angular/core';
import { UiRuntimeStore } from '../../../platform/config-center/runtime/ui-runtime-store.service';
import { PageAccessResult, DenialReason } from '@app/core/runtime/ui-state.models';
import { PAGE_BY_ROUTE, PAGE_BY_CODE } from '../../../platform/registries/page.registry';
import { DynamicUiBootstrapService } from '@app/core/services/platform/dynamic-ui-bootstrap.service';

/**
 * Central page gate. Called by guards and directives.
 *
 * Checks all layers: auth, onboarding, permission, module, tier, feature flag.
 * Returns PageAccessResult with reasons for denial.
 */
@Injectable({ providedIn: 'root' })
export class PageAccessService {
  private store = inject(UiRuntimeStore);
  private dynamicUiBootstrap = inject(DynamicUiBootstrapService);

  // W11.D9.3 — derive PAGE_BY_ROUTE / PAGE_BY_CODE from the effective
  // registry signal so foundation entries follow live dynamic-ui rows.
  private effectiveByRoute() {
    const reg = this.dynamicUiBootstrap.effectivePageRegistry();
    if (!reg.length) return PAGE_BY_ROUTE;
    return new Map(reg.map(p => [p.route, p]));
  }
  private effectiveByCode() {
    const reg = this.dynamicUiBootstrap.effectivePageRegistry();
    if (!reg.length) return PAGE_BY_CODE;
    return new Map(reg.map(p => [p.pageCode, p]));
  }

  /**
   * Check if user can open a page by route or page code.
   */
  canOpen(routeOrCode: string, _context?: Record<string, unknown>): PageAccessResult {
    return this.store.canAccessPage(routeOrCode);
  }

  /**
   * Full decision with redirect target and reason code.
   */
  getPageAccessDecision(routeOrCode: string, _context?: Record<string, unknown>): {
    allowed: boolean;
    blocked: boolean;
    hidden: boolean;
    redirectTarget: string;
    reasonCode: string;
  } {
    const result = this.canOpen(routeOrCode, _context);
    const page = this.effectiveByRoute().get(routeOrCode) ?? this.effectiveByCode().get(routeOrCode);

    return {
      allowed: result.allowed,
      blocked: !result.allowed,
      hidden: !result.allowed && page?.navVisibility === 'entitled',
      redirectTarget: result.allowed ? routeOrCode : '/workspace-home',
      reasonCode: result.reasons.length > 0 ? result.reasons[0].code : '',
    };
  }
}
