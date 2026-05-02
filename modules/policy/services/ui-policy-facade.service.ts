import { Injectable, inject } from '@angular/core';
import { UiRuntimeStore } from '../../../platform/config-center/runtime/ui-runtime-store.service';
import {
  EffectiveActionState,
  DenialReason,
  PageAccessResult,
  AiMode,
} from '@app/core/runtime/ui-state.models';
import { PAGE_BY_CODE } from '../../../platform/registries/page.registry';

/**
 * Thin facade for components. Simple yes/no questions.
 *
 * Components inject this — never UiRuntimeStore or UiBlueprintResolver directly.
 * This insulates components from internal refactoring.
 */
@Injectable({ providedIn: 'root' })
export class UiPolicyFacade {
  private store = inject(UiRuntimeStore);

  // ── Module Visibility ────────────────────────────────────────────────

  canViewModule(moduleCode: string): boolean {
    return this.store.isModuleVisible(moduleCode);
  }

  getModuleVisibilityReason(moduleCode: string): DenialReason[] {
    const modules = this.store.modules();
    const mod = modules.find(m => m.moduleCode === moduleCode);
    if (!mod || mod.visible) return [];
    return mod.reason
      ? [{ category: 'module', code: mod.reason, messageEn: mod.reason, messageAr: mod.reason }]
      : [];
  }

  // ── Page Access ──────────────────────────────────────────────────────

  canOpenPage(pageCodeOrRoute: string): boolean {
    const result = this.store.canAccessPage(pageCodeOrRoute);
    return result.allowed;
  }

  getPageAccessDecision(pageCodeOrRoute: string): PageAccessResult {
    return this.store.canAccessPage(pageCodeOrRoute);
  }

  // ── Action Availability ──────────────────────────────────────────────

  canExecuteAction(actionCode: string, _context?: Record<string, unknown>): boolean {
    const state = this.store.canPerformAction(actionCode);
    return state.visible && state.enabled;
  }

  getActionState(actionCode: string, _context?: Record<string, unknown>): EffectiveActionState {
    return this.store.canPerformAction(actionCode);
  }

  // ── AI ───────────────────────────────────────────────────────────────

  getAiMode(moduleCode: string): AiMode {
    const caps = this.store.aiCapabilities();
    const cap = caps.find(c => c.moduleCode === moduleCode);
    return cap?.mode ?? 'hidden';
  }

  getAiActionState(moduleCode: string, actionCode: string, _context?: Record<string, unknown>): EffectiveActionState {
    const aiMode = this.getAiMode(moduleCode);
    const actionState = this.store.canPerformAction(actionCode);

    if (aiMode === 'hidden' || aiMode === 'blocked') {
      return { ...actionState, visible: false, reason: `AI ${aiMode} for module ${moduleCode}` };
    }
    if (aiMode === 'observe') {
      return { ...actionState, enabled: false, mode: 'ai-recommend-only', reason: 'AI in observe-only mode' };
    }
    return actionState;
  }

  // ── Layout ───────────────────────────────────────────────────────────

  getPageLayout(pageCode: string): string {
    const blueprint = this.store.blueprint();
    const page = blueprint?.pages.find(p => p.pageCode === pageCode);
    if (!page) return 'layout-full';

    const registryEntry = PAGE_BY_CODE.get(pageCode);
    if (!registryEntry) return 'layout-full';

    const layoutMap: Record<string, string> = {
      full: 'layout-full',
      split: 'layout-split',
      wizard: 'layout-wizard',
      detail: 'layout-detail',
      hub: 'layout-hub',
    };
    return layoutMap[registryEntry.layout] ?? 'layout-full';
  }

  getApprovalBanner(_pageCode: string): unknown {
    // Placeholder — Phase 4 implements approval-ui.service
    return null;
  }

  // ── Explainability ───────────────────────────────────────────────────

  explain(target: string): DenialReason[] {
    // Check modules
    const mod = this.store.modules().find(m => m.moduleCode === target);
    if (mod && !mod.visible && mod.reason) {
      return [{ category: 'module', code: mod.reason, messageEn: mod.reason, messageAr: mod.reason }];
    }

    // Check pages
    const pageResult = this.store.canAccessPage(target);
    if (!pageResult.allowed) {
      return pageResult.reasons;
    }

    // Check actions
    const action = this.store.canPerformAction(target);
    if (!action.visible || !action.enabled) {
      return action.reason
        ? [{ category: 'permission', code: action.reason, messageEn: action.reason, messageAr: action.reason }]
        : [];
    }

    return [];
  }
}
