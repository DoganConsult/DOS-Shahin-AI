/**
 * Part C / G4 — CommandPaletteRegistry.
 *
 * Aggregates command-palette entries from the live Dynamic UI contract:
 * one navigation entry per visible route + one synthetic "Run agent: …"
 * entry per agent action exposed by DynamicAgentExperienceResolver-compatible
 * data. Backend permissions remain authoritative; SPA filters by
 * UserContextResolver as a presentation hint only.
 */
import { Injectable, computed, inject } from '@angular/core';
import { DynamicUiBootstrapService } from './dynamic-ui-bootstrap.service';
import { DynamicPageExperienceResolver } from './dynamic-page-experience.resolver';
import { UserContextResolver } from './user-context.resolver';

export type CommandPaletteEntryKind = 'navigation' | 'action' | 'agent-action';

export interface CommandPaletteEntry {
  id: string;
  kind: CommandPaletteEntryKind;
  label: string;
  hint?: string;
  route?: string;
  permission?: string | null;
  moduleCode: string;
  rank: number;
}

@Injectable({ providedIn: 'root' })
export class CommandPaletteRegistry {
  private dynamic = inject(DynamicUiBootstrapService);
  private experience = inject(DynamicPageExperienceResolver);
  private user = inject(UserContextResolver);

  readonly entries = computed<CommandPaletteEntry[]>(() => {
    const ctx = this.user.context();
    const routes = this.dynamic.visibleRoutes();
    const expMap = this.experience.experiences();
    const out: CommandPaletteEntry[] = [];

    for (const r of routes) {
      const moduleCode = r.module_code;
      const pathPattern = r.path_pattern;
      const permissionKey = r.permission_key;
      const sortOrder = r.sort_order;

      const exp = expMap.get(pathPattern);
      if (exp && !exp.visibleForCurrentUser) continue;
      if (permissionKey && ctx && !ctx.permissions.has(permissionKey)) continue;

      out.push({
        id: `nav:${moduleCode}:${pathPattern}`,
        kind: 'navigation',
        label: this.humanize(pathPattern),
        hint: moduleCode,
        route: pathPattern,
        permission: permissionKey ?? null,
        moduleCode,
        rank: sortOrder ?? 0,
      });
    }

    return out.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  });

  search(query: string): CommandPaletteEntry[] {
    const q = (query ?? '').trim().toLowerCase();
    const all = this.entries();
    if (!q) return all.slice(0, 50);
    return all
      .filter(e =>
        e.label.toLowerCase().includes(q) ||
        (e.route ?? '').toLowerCase().includes(q) ||
        (e.moduleCode ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50);
  }

  private humanize(route: string): string {
    const last = route.split('/').filter(Boolean).pop() ?? route;
    return last.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
