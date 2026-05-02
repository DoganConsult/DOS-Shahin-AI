import { DrillTargetDef } from './drill-through.model';

const DRILL_TARGETS: DrillTargetDef[] = [
  {
    widgetId: 'workflow.sla_by_role',
    titleKey: 'role',
    titleEn: 'SLA by Role',
    titleAr: 'SLA حسب الدور',
    route: '/process-tasks',
    routeParamsFromPayload: (p: Record<string, unknown>): Record<string, string> => (p?.['role'] ? { assigneeRole: String(p['role']) } : {}),
    viewType: 'list',
  },
  {
    widgetId: 'workflow.sla_by_role',
    titleEn: 'SLA by Role',
    titleAr: 'SLA حسب الدور',
    route: '/process-tasks',
    viewType: 'summary',
  },
  {
    widgetId: 'compliance.controls',
    titleEn: 'Controls',
    titleAr: 'الضوابط',
    route: '/compliance/controls',
    viewType: 'summary',
  },
  {
    widgetId: 'risk.heatmap',
    titleEn: 'Risk Heatmap',
    titleAr: 'خريطة المخاطر',
    route: '/risks',
    viewType: 'summary',
  },
];

export function getDrillTarget(
  widgetId: string,
  payload?: Record<string, unknown>
): DrillTargetDef | undefined {
  const withPayload = payload && Object.keys(payload).length > 0;
  const candidates = DRILL_TARGETS.filter((d) => d.widgetId === widgetId);
  if (withPayload && payload) {
    const withKey = candidates.find((d) => d.titleKey && payload[d.titleKey!] != null);
    if (withKey) return withKey;
  }
  return candidates.find((d) => !d.titleKey) ?? candidates[0];
}

export function resolveDrillTitle(
  def: DrillTargetDef,
  payload?: Record<string, unknown>
): string {
  if (def.titleKey && payload && payload[def.titleKey] != null) {
    return String(payload[def.titleKey]);
  }
  return def.titleEn;
}

export function resolveDrillRoute(
  def: DrillTargetDef,
  payload?: Record<string, unknown>
): string {
  const base = def.route ?? '';
  if (!base) return '';
  const params = def.routeParamsFromPayload?.(payload ?? {}) ?? {};
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return qs ? `${base}?${qs}` : base;
}
