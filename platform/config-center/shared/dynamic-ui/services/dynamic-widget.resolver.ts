/**
 * Part C / G4 — DynamicWidgetResolver.
 *
 * Resolves the signature widget + ordered widget zones for a route from the
 * Page Experience contract. Backed by the published contract for Foundation;
 * agnostic to other modules and falls back to {signatureWidget} per route.
 */
import { Injectable, computed, inject } from '@angular/core';
import { DynamicPageExperienceResolver } from './dynamic-page-experience.resolver';
import { DynamicUiBootstrapService } from './dynamic-ui-bootstrap.service';
import { UserContextResolver } from '../../../../core/services/platform/user-context.resolver';

export interface ResolvedWidgetSlot {
  widgetKey: string;
  zone: 'signature' | 'main' | 'side' | 'header' | 'footer' | 'context-rail';
  order: number;
  config?: Record<string, unknown>;
  isSignature: boolean;
}

@Injectable({ providedIn: 'root' })
export class DynamicWidgetResolver {
  private experience = inject(DynamicPageExperienceResolver);
  private dynamic = inject(DynamicUiBootstrapService);
  private user = inject(UserContextResolver);

  readonly widgetsByRoute = computed<Map<string, ResolvedWidgetSlot[]>>(() => {
    const ctx = this.user.context();
    const out = new Map<string, ResolvedWidgetSlot[]>();
    // Seed every known route with at least the signature-widget contract entry.
    for (const exp of this.experience.experiences().values()) {
      if (exp.signatureWidget) {
        out.set(exp.route, [{
          widgetKey: exp.signatureWidget,
          zone: 'signature',
          order: 0,
          isSignature: true,
        }]);
      } else {
        out.set(exp.route, []);
      }
    }
    // Merge the live dynamic_ui_widgets rows on top, gated by permission/profile.
    for (const w of this.dynamic.widgets()) {
      if (ctx && w.permission && !ctx.permissions.has(w.permission)) continue;
      if (ctx && w.profiles && w.profiles.length > 0 && !w.profiles.includes(ctx.profileType)) continue;
      const arr = out.get(w.route) ?? [];
      const exists = arr.some(s => s.widgetKey === w.widget_key);
      if (exists) continue;
      arr.push({
        widgetKey: w.widget_key,
        zone: (w.zone as ResolvedWidgetSlot['zone']) ?? 'main',
        order: w.sort_order ?? 0,
        config: w.config ?? undefined,
        isSignature: !!w.is_signature,
      });
      arr.sort((a, b) => a.order - b.order);
      out.set(w.route, arr);
    }
    return out;
  });

  forRoute(route: string): ResolvedWidgetSlot[] {
    return this.widgetsByRoute().get(route) ?? [];
  }

  signatureFor(route: string): string | null {
    return this.experience.forRoute(route)?.signatureWidget ?? null;
  }
}
