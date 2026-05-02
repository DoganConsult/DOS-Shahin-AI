import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, catchError, map, tap, switchMap, combineLatest } from 'rxjs';
import type {
  ResolvedShellConfig,
  ShellResolverInput,
  ShellOverride,
  ShellConfigSource,
  ShellLayoutType,
  ShellSlotConfig,
  ShellSlotId,
  ShellTabConfig,
  ShellPanelConfig,
  ShellWidgetZone,
  ShellActionBarConfig,
  ShellDetailDrawerConfig,
} from '../../../config-center/shared/contracts/shell-engine.contracts';
import { MODULE_SHELL_REGISTRY } from '../../../config-center/shared/contracts/module-shell-registry';
import type { ModuleShellDefinition, WorkspacePattern } from '../../../config-center/shared/contracts/module-shell-definition';

const LAYOUT_MAP: Record<WorkspacePattern, ShellLayoutType> = {
  'command-center': 'cockpit',
  'registry': 'list-detail',
  'case-workspace': 'workspace',
  'studio': 'workspace',
};

const DEFAULT_SLOTS: ShellSlotConfig[] = [
  { slotId: 'masthead', visible: true, order: 1 },
  { slotId: 'kpi-strip', visible: true, order: 2 },
  { slotId: 'action-bar', visible: true, order: 3 },
  { slotId: 'workflow-ribbon', visible: true, order: 4 },
  { slotId: 'main-content', visible: true, order: 5 },
  { slotId: 'context-rail', visible: true, order: 6 },
  { slotId: 'sticky-footer', visible: false, order: 7 },
  { slotId: 'filter-panel', visible: false, order: 8 },
  { slotId: 'detail-drawer', visible: false, order: 9 },
  { slotId: 'preview-panel', visible: false, order: 10 },
  { slotId: 'left-nav-tree', visible: false, order: 11 },
  { slotId: 'editor-canvas', visible: false, order: 12 },
  { slotId: 'validation-panel', visible: false, order: 13 },
  { slotId: 'priority-queue', visible: false, order: 14 },
  { slotId: 'trend-row', visible: false, order: 15 },
  { slotId: 'ai-recommendations', visible: false, order: 16 },
];

function slotsForLayout(layoutType: ShellLayoutType): ShellSlotConfig[] {
  const base = DEFAULT_SLOTS.map(s => ({ ...s }));
  const show = (id: ShellSlotId) => {
    const slot = base.find(s => s.slotId === id);
    if (slot) slot.visible = true;
  };
  const hide = (id: ShellSlotId) => {
    const slot = base.find(s => s.slotId === id);
    if (slot) slot.visible = false;
  };

  switch (layoutType) {
    case 'cockpit':
    case 'hub':
      show('priority-queue');
      show('trend-row');
      show('ai-recommendations');
      hide('filter-panel');
      hide('detail-drawer');
      // Spec §26.2 + §26.4 — Command Center (overview/landing) does NOT use
      // the right Context Rail. The rail is reserved for Entity 360 / object
      // pages where there is real per-record context (relationships, audit,
      // evidence, notes). On overview pages we have no entity selected, so
      // the rail would render an empty 320px strip ("collapsed-but-empty"
      // visual bug seen on /foundation/overview). Collapse it here.
      hide('context-rail');
      break;
    case 'list-detail':
      show('filter-panel');
      show('detail-drawer');
      show('preview-panel');
      show('sticky-footer');
      hide('workflow-ribbon');
      break;
    case 'workspace':
    case 'reviewer-workspace':
      show('sticky-footer');
      show('detail-drawer');
      break;
    case 'board':
      show('filter-panel');
      show('sticky-footer');
      hide('context-rail');
      break;
    case 'admin-console':
      hide('kpi-strip');
      hide('workflow-ribbon');
      hide('context-rail');
      show('filter-panel');
      break;
  }
  return base;
}

function defaultActionBar(def: ModuleShellDefinition): ShellActionBarConfig {
  return {
    slots: [
      { position: 'primary-create', actionId: `${def.moduleCode}:create`, label: { en: 'Create', ar: 'إنشاء' }, icon: 'add', visible: true },
      { position: 'import', actionId: `${def.moduleCode}:import`, label: { en: 'Import', ar: 'استيراد' }, icon: 'upload', visible: true },
      { position: 'bulk', actionId: `${def.moduleCode}:bulk`, label: { en: 'Bulk Actions', ar: 'إجراءات جماعية' }, icon: 'list', visible: true },
      { position: 'filters', actionId: `${def.moduleCode}:filters`, label: { en: 'Filters', ar: 'تصفية' }, icon: 'filter', visible: true },
      { position: 'view-switch', actionId: `${def.moduleCode}:view-switch`, label: { en: 'View', ar: 'عرض' }, icon: 'grid', visible: true },
      { position: 'export', actionId: `${def.moduleCode}:export`, label: { en: 'Export', ar: 'تصدير' }, icon: 'download', visible: true },
      { position: 'ai-assist', actionId: def.primaryAiAction.id, label: def.primaryAiAction.label, icon: def.primaryAiAction.icon, visible: true },
    ],
    showSearch: true,
    viewModes: ['table', 'cards'],
    activeView: 'table',
  };
}

function defaultTabs(def: ModuleShellDefinition): ShellTabConfig[] {
  if (def.defaultRecordTabs.length > 0) {
    return def.defaultRecordTabs.map((t, i) => ({
      id: t.id,
      label: { en: t.labelEn, ar: t.labelAr },
      icon: t.icon,
      route: t.route,
      default: t.default ?? i === 0,
      visible: true,
      order: i + 1,
    }));
  }
  return [
    { id: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, icon: 'home', default: true, visible: true, order: 1 },
    { id: 'records', label: { en: 'Records', ar: 'السجلات' }, icon: 'list', default: false, visible: true, order: 2 },
    { id: 'analytics', label: { en: 'Analytics', ar: 'التحليلات' }, icon: 'chart--bar', default: false, visible: true, order: 3 },
    { id: 'ai-insights', label: { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' }, icon: 'machine-learning-model', default: false, visible: true, order: 4 },
    { id: 'settings', label: { en: 'Settings', ar: 'الإعدادات' }, icon: 'settings', default: false, visible: true, order: 5 },
  ];
}

function buildWorkflowConfig(def: ModuleShellDefinition): ResolvedShellConfig['workflow'] {
  if (def.tier === 'platform' || !def.lifecycleDefinition?.length) {
    return { enabled: false };
  }

  const initialState = def.lifecycleDefinition[0].from;
  const firstTransitions = def.lifecycleDefinition
    .filter(s => s.from === initialState)
    .map(s => s.to);

  const slaStep = def.lifecycleDefinition.find(s => s.slaHours);
  const approvalStep = def.lifecycleDefinition.find(s => s.requiresApproval);

  return {
    enabled: true,
    currentState: initialState,
    completedStates: [],
    transitions: firstTransitions,
    slaDueDate: slaStep?.slaHours
      ? new Date(Date.now() + slaStep.slaHours * 3600000).toISOString()
      : undefined,
    approvalsRequired: approvalStep ? 1 : 0,
  };
}

function buildPlatformDefault(input: ShellResolverInput): ResolvedShellConfig {
  const def = MODULE_SHELL_REGISTRY[input.moduleCode];
  if (!def) {
    return buildFallback(input);
  }

  const layoutType = LAYOUT_MAP[def.defaultWorkspacePattern] || 'workspace';
  const lang: 'en' | 'ar' = 'en';

  return {
    moduleCode: def.moduleCode,
    productCode: input.productCode,
    tenantId: input.tenantId,
    userId: input.userId,
    layoutType,
    lang,
    dir: (lang as string) === 'ar' ? 'rtl' : 'ltr',
    masthead: {
      moduleIcon: def.moduleIcon,
      moduleName: def.moduleName,
      purposeLine: def.purposeLine,
      accentToken: def.moduleAccentToken,
      healthLevel: 'unknown',
      dataFreshness: null,
      primaryAiAction: def.primaryAiAction,
      breadcrumbs: [
        { label: { en: 'Home', ar: 'الرئيسية' }, route: '/' },
        { label: def.moduleName, route: `/${def.moduleCode}` },
      ],
      contextTags: [],
    },
    kpiStrip: {
      cards: def.kpiDefinitions.map(k => ({
        id: k.id, label: { en: k.labelEn, ar: k.labelAr },
        icon: k.icon, color: k.color, bg: k.bg,
        route: k.route, urgency: k.urgency, workflow: k.workflow, health: k.health,
      })),
      maxVisible: 6,
    },
    actionBar: defaultActionBar(def),
    slots: slotsForLayout(layoutType),
    tabs: defaultTabs(def),
    panels: [
      // Spec §26.2 + §26.4 — context rail is for Entity 360 (object/workspace)
      // pages, not Command Center (overview/landing) pages. Keeping the
      // `panels` entry in sync with `slotsForLayout` prevents a phantom
      // 320px empty rail on /foundation/overview and other overview pages.
      { id: 'context-rail', position: 'right', width: '320px', collapsible: true, defaultCollapsed: false, visible: layoutType === 'list-detail' || layoutType === 'workspace' },
      { id: 'filter-panel', position: 'left', width: '280px', collapsible: true, defaultCollapsed: true, visible: layoutType === 'list-detail' || layoutType === 'board' },
    ],
    widgetZones: [
      { zoneId: 'main-widgets', label: { en: 'Main Widgets', ar: 'الأدوات الرئيسية' }, maxWidgets: 8, widgetIds: [], layout: 'grid', columns: 2 },
      { zoneId: 'sidebar-widgets', label: { en: 'Sidebar', ar: 'الشريط الجانبي' }, maxWidgets: 4, widgetIds: [], layout: 'stack' },
    ],
    detailDrawer: {
      enabled: layoutType === 'list-detail' || layoutType === 'workspace',
      position: 'right',
      width: '480px',
      sections: [
        { id: 'summary', label: { en: 'Summary', ar: 'ملخص' }, order: 1, visible: true },
        { id: 'details', label: { en: 'Details', ar: 'التفاصيل' }, order: 2, visible: true },
        { id: 'ai-summary', label: { en: 'AI Summary', ar: 'ملخص الذكاء الاصطناعي' }, order: 3, visible: true },
        { id: 'activity', label: { en: 'Activity', ar: 'النشاط' }, order: 4, visible: true },
        { id: 'audit-trail', label: { en: 'Audit Trail', ar: 'سجل التدقيق' }, order: 5, visible: true },
      ],
    },
    workflow: buildWorkflowConfig(def),
    footer: {
      enabled: layoutType === 'list-detail' || layoutType === 'workspace' || layoutType === 'board',
      showSelectionCount: true,
      showSyncState: true,
      showSaveStatus: true,
    },
    meta: {
      resolvedAt: new Date().toISOString(),
      sources: ['platform-default'],
      tier: def.tier,
      automationLevel: def.automationLevel,
      slaDefaultHours: def.slaDefaultHours,
    },
  };
}

function buildFallback(input: ShellResolverInput): ResolvedShellConfig {
  return {
    moduleCode: input.moduleCode,
    productCode: input.productCode,
    tenantId: input.tenantId,
    userId: input.userId,
    layoutType: 'workspace',
    lang: 'en',
    dir: 'ltr',
    masthead: {
      moduleIcon: 'cube',
      moduleName: { en: input.moduleCode, ar: input.moduleCode },
      purposeLine: { en: '', ar: '' },
      accentToken: 'gray',
      healthLevel: 'unknown',
      dataFreshness: null,
      primaryAiAction: null,
      breadcrumbs: [{ label: { en: 'Home', ar: 'الرئيسية' }, route: '/' }],
      contextTags: [],
    },
    kpiStrip: { cards: [], maxVisible: 6 },
    actionBar: { slots: [], showSearch: true, viewModes: ['table'], activeView: 'table' },
    slots: slotsForLayout('workspace'),
    tabs: [{ id: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, default: true, visible: true, order: 1 }],
    panels: [],
    widgetZones: [],
    detailDrawer: { enabled: false, position: 'right', width: '480px', sections: [] },
    workflow: { enabled: false },
    footer: { enabled: false, showSelectionCount: false, showSyncState: false, showSaveStatus: false },
    meta: { resolvedAt: new Date().toISOString(), sources: ['platform-default'], tier: 'platform', automationLevel: null, slaDefaultHours: null },
  };
}

function applyOverride(config: ResolvedShellConfig, override: ShellOverride): ResolvedShellConfig {
  const c = { ...config };
  c.meta = { ...c.meta, sources: [...c.meta.sources, override.source] };

  if (override.layoutType) {
    c.layoutType = override.layoutType;
    c.slots = slotsForLayout(override.layoutType);
  }

  if (override.visibleSlots) {
    c.slots = c.slots.map(s => ({
      ...s,
      visible: override.visibleSlots![s.slotId] ?? s.visible,
    }));
  }

  if (override.slotOrder) {
    c.slots = c.slots.map(s => ({
      ...s,
      order: override.slotOrder![s.slotId] ?? s.order,
    })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  if (override.kpiCardIds) {
    c.kpiStrip = {
      ...c.kpiStrip,
      cards: c.kpiStrip.cards.filter(card => override.kpiCardIds!.includes(card.id)),
    };
  }
  if (override.kpiMaxVisible != null) {
    c.kpiStrip = { ...c.kpiStrip, maxVisible: override.kpiMaxVisible };
  }

  if (override.actionBarVisibility) {
    c.actionBar = {
      ...c.actionBar,
      slots: c.actionBar.slots.map(s => ({
        ...s,
        visible: override.actionBarVisibility![s.position] ?? s.visible,
      })),
    };
  }

  if (override.viewModes) {
    c.actionBar = { ...c.actionBar, viewModes: override.viewModes };
  }
  if (override.defaultView) {
    c.actionBar = { ...c.actionBar, activeView: override.defaultView };
  }

  if (override.tabVisibility) {
    c.tabs = c.tabs.map(t => ({
      ...t,
      visible: override.tabVisibility![t.id] ?? t.visible,
    }));
  }
  if (override.tabOrder) {
    c.tabs = c.tabs.map(t => ({
      ...t,
      order: override.tabOrder![t.id] ?? t.order,
    })).sort((a, b) => a.order - b.order);
  }

  if (override.panelDefaults) {
    c.panels = c.panels.map(p => {
      const o = override.panelDefaults![p.id];
      return o ? { ...p, defaultCollapsed: o.collapsed ?? p.defaultCollapsed, visible: o.visible ?? p.visible } : p;
    });
  }
  if (override.panelWidths) {
    c.panels = c.panels.map(p => ({
      ...p,
      width: override.panelWidths![p.id] ?? p.width,
    }));
  }

  if (override.widgetZoneOverrides) {
    c.widgetZones = c.widgetZones.map(z => {
      const o = override.widgetZoneOverrides![z.zoneId];
      return o ? { ...z, widgetIds: o.widgetIds ?? z.widgetIds, layout: o.layout ?? z.layout } : z;
    });
  }

  if (override.detailDrawerEnabled != null) {
    c.detailDrawer = { ...c.detailDrawer, enabled: override.detailDrawerEnabled };
  }
  if (override.detailDrawerPosition) {
    c.detailDrawer = { ...c.detailDrawer, position: override.detailDrawerPosition };
  }

  if (override.footerEnabled != null) {
    c.footer = { ...c.footer, enabled: override.footerEnabled };
  }

  return c;
}

@Injectable({ providedIn: 'root' })
export class ShellResolverService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, ResolvedShellConfig>();
  private readonly resolved$ = new BehaviorSubject<ResolvedShellConfig | null>(null);

  readonly currentShell$ = this.resolved$.asObservable();

  resolveShell(input: ShellResolverInput): Observable<ResolvedShellConfig> {
    const cacheKey = `${input.productCode}:${input.tenantId}:${input.userId}:${input.moduleCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.resolved$.next(cached);
      return of(cached);
    }

    let config = buildPlatformDefault(input);

    return this.fetchOverrides(input).pipe(
      map(overrides => {
        const sorted = overrides.sort((a, b) => a.priority - b.priority);
        for (const override of sorted) {
          config = applyOverride(config, override);
        }
        return config;
      }),
      tap(resolved => {
        this.cache.set(cacheKey, resolved);
        this.resolved$.next(resolved);
      }),
      catchError(() => {
        this.resolved$.next(config);
        return of(config);
      }),
    );
  }

  invalidateCache(moduleCode?: string): void {
    if (moduleCode) {
      for (const key of this.cache.keys()) {
        if (key.endsWith(`:${moduleCode}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  updateUserPreference(input: ShellResolverInput, override: Partial<ShellOverride>): Observable<ResolvedShellConfig> {
    const payload = { ...override, source: 'user-preference' as ShellConfigSource, priority: 50 };
    return this.http.put<void>(
      `/api/shell/preferences/${input.moduleCode}`,
      payload,
    ).pipe(
      switchMap(() => {
        this.invalidateCache(input.moduleCode);
        return this.resolveShell(input);
      }),
    );
  }

  private fetchOverrides(input: ShellResolverInput): Observable<ShellOverride[]> {
    const moduleOverrides$ = this.http.get<{ overrides: ShellOverride[] }>(
      `/api/shell/config/${input.moduleCode}`,
      { params: { product: input.productCode, role: input.roleCode } },
    ).pipe(
      map(res => res.overrides || []),
      catchError(() => of([] as ShellOverride[])),
    );

    const workspaceOverrides$ = this.http.get<{ override: ShellOverride }>(
      '/api/config-center/gateway/shell-override',
    ).pipe(
      map(res => res.override ? [res.override as ShellOverride] : []),
      catchError(() => of([] as ShellOverride[])),
    );

    return combineLatest([moduleOverrides$, workspaceOverrides$]).pipe(
      map(([moduleOvr, workspaceOvr]) => [...workspaceOvr, ...moduleOvr]),
    );
  }
}
