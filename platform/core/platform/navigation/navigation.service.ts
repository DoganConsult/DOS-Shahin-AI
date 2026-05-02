import { Injectable, inject } from '@angular/core';
import { BootstrapResponseDto } from '../../models/bootstrap-response.model';
import { NavigationViewModel, QuickActionItem } from './navigation.models';
import { WIDGET_TO_QUICK_ACTION } from './navigation.config';

// Module aliases only collapse synonym pairs (controls↔compliance,
// audit↔assessment, bcp↔bcm, vendor↔vendors). They MUST NOT expand
// foundation into unrelated GRC modules — that would let a tenant with
// modules:["foundation"] surface compliance/audit/etc. nav items.
const MODULE_ALIASES: Record<string, string[]> = {
  compliance: ['controls'],
  assessment: ['audit'],
  controls:   ['compliance'],
  audit:      ['assessment'],
  bcm:        ['bcp'],
  bcp:        ['bcm'],
  vendors:    ['vendor'],
  vendor:     ['vendors'],
  all:        ['*'],
};

@Injectable({ providedIn: 'root' })
export class NavigationService {
  build(data: BootstrapResponseDto): NavigationViewModel {
    const raw = new Set(data.navigation?.visibleModules ?? []);
    const modules = NavigationService.expandAliases(raw);
    const widgets = data.navigation?.dashboardWidgets ?? [];
    const quickActions = this.buildQuickActions(widgets, modules);

    return { primary: [], secondary: [], quickActions };
  }

  private static expandAliases(modules: Set<string>): Set<string> {
    const expanded = new Set(modules);
    for (const m of modules) {
      const aliases = MODULE_ALIASES[m];
      if (aliases) aliases.forEach(a => expanded.add(a));
    }
    return expanded;
  }

  private buildQuickActions(widgets: string[], modules: Set<string>): QuickActionItem[] {
    const result: QuickActionItem[] = [];
    const hasWildcard = modules.has('*');

    for (const widget of widgets) {
      const action = WIDGET_TO_QUICK_ACTION[widget];
      if (!action) continue;
      if (action.module && !hasWildcard && !modules.has(action.module)) continue;
      result.push(action);
    }

    if (hasWildcard || modules.has('governance')) {
      result.push({ id: 'qa-new-policy', labelEn: 'Open Policies', labelAr: 'فتح السياسات', route: '/governance/policies', icon: 'file-text', module: 'governance' });
    }
    if (hasWildcard || modules.has('compliance')) {
      result.push({ id: 'qa-control-library', labelEn: 'Open Control Library', labelAr: 'فتح مكتبة الضوابط', route: '/compliance/controls', icon: 'shield-check', module: 'compliance' });
    }

    const seen = new Set<string>();
    return result.filter((x) => { if (seen.has(x.id)) return false; seen.add(x.id); return true; });
  }
}
