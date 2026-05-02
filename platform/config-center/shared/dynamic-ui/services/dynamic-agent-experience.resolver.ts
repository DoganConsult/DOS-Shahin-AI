/**
 * Part C / G4 — DynamicAgentExperienceResolver.
 *
 * Reads the live dynamic_ui_agent_actions rows and exposes them as a per-route
 * agent experience map, gated by UserContextResolver permissions/profiles.
 * Backend remains authoritative for execution; this is a presentation hint.
 */
import { Injectable, computed, inject } from '@angular/core';
import { DynamicUiBootstrapService, DynamicUiAgentActionItem } from './dynamic-ui-bootstrap.service';
import { UserContextResolver } from '../../../../core/services/platform/user-context.resolver';

export interface ResolvedAgentExperience {
  route: string;
  primaryAgent: string | null;
  actions: DynamicUiAgentActionItem[];
}

@Injectable({ providedIn: 'root' })
export class DynamicAgentExperienceResolver {
  private dynamic = inject(DynamicUiBootstrapService);
  private user = inject(UserContextResolver);

  readonly byRoute = computed<Map<string, ResolvedAgentExperience>>(() => {
    const ctx = this.user.context();
    const out = new Map<string, ResolvedAgentExperience>();
    for (const a of this.dynamic.agentActions()) {
      if (ctx && a.permission && !ctx.permissions.has(a.permission)) continue;
      const slot = out.get(a.route) ?? {
        route: a.route,
        primaryAgent: a.agent_id,
        actions: [],
      };
      slot.actions.push(a);
      out.set(a.route, slot);
    }
    return out;
  });

  forRoute(route: string): ResolvedAgentExperience | null {
    return this.byRoute().get(route) ?? null;
  }
}
