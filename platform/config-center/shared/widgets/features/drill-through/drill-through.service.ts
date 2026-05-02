import { Injectable, signal, computed } from '@angular/core';
import { DrillThroughContext } from './drill-through.model';
import {
  getDrillTarget,
  resolveDrillTitle,
  resolveDrillRoute,
} from './drill-target.registry';

@Injectable({ providedIn: 'root' })
export class DrillThroughService {
  private readonly stackSignal = signal<DrillThroughContext[]>([]);

  readonly stack = this.stackSignal.asReadonly();
  readonly isOpen = computed(() => this.stackSignal().length > 0);
  readonly currentLevel = computed(() => {
    const s = this.stackSignal();
    return s.length > 0 ? s[s.length - 1] : null;
  });
  readonly breadcrumbs = computed(() => this.stackSignal());

  /**
   * Open drill at top level (or replace if same widget and no payload).
   */
  open(widgetId: string, payload?: Record<string, unknown>, title?: string): void {
    const def = getDrillTarget(widgetId, payload);
    const resolvedTitle = title ?? (def ? resolveDrillTitle(def, payload) : widgetId);
    const route = def ? resolveDrillRoute(def, payload) : undefined;
    const levelId = `drill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const context: DrillThroughContext = {
      levelId,
      widgetId,
      title: resolvedTitle,
      titleAr: def?.titleAr,
      payload,
      route,
      viewType: def?.viewType ?? 'summary',
    };
    this.stackSignal.update((s) => [...s, context]);
  }

  /**
   * Push another level onto the stack (e.g. widget → segment → detail).
   */
  pushLevel(
    widgetId: string,
    payload?: Record<string, unknown>,
    title?: string
  ): void {
    this.open(widgetId, payload, title);
  }

  /**
   * Go back one level.
   */
  back(): void {
    this.stackSignal.update((s) => (s.length <= 1 ? [] : s.slice(0, -1)));
  }

  /**
   * Close the entire drill panel.
   */
  close(): void {
    this.stackSignal.set([]);
  }

  /**
   * Go to a specific level by index (for breadcrumb click).
   */
  goToLevel(index: number): void {
    this.stackSignal.update((s) => (index >= 0 && index < s.length ? s.slice(0, index + 1) : s));
  }
}
