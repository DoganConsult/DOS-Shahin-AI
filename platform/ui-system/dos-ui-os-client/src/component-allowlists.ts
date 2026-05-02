import { InjectionToken, type Type, type Provider } from '@angular/core';

/**
 * §24 Component registry / allowlists.
 *
 * Strict allowlists are the *only* legal source of components renderable
 * from DB-resolved Dynamic UI / UI-OS payloads. The runtime component
 * resolver MUST refuse any token that is not registered here. Never
 * render arbitrary DB-provided Angular code.
 *
 * Each map is keyed by a stable string `component_token` (matching
 * dos.dynamic_ui_widgets.component_token, ui_form_fields.component_token,
 * etc.) and resolves to a concrete Angular `Type<T>`. Products provide
 * the maps via `provideUiOsComponentAllowlists({...})`. Manager-side
 * draft validation should reject any token absent from the union of all
 * registered keys at publish time.
 */

export type ComponentToken = string;
export type ComponentMap = Record<ComponentToken, Type<unknown>>;

// 1 — top-level page shells (route-keyed component classes).
export const PAGE_COMPONENT_MAP        = new InjectionToken<ComponentMap>('UI_OS_PAGE_COMPONENT_MAP',        { providedIn: 'root', factory: () => ({}) });
// 2 — dashboard widget bodies.
export const WIDGET_COMPONENT_MAP      = new InjectionToken<ComponentMap>('UI_OS_WIDGET_COMPONENT_MAP',      { providedIn: 'root', factory: () => ({}) });
// 3 — dynamic-form field renderers (text/select/file/etc).
export const FORM_FIELD_COMPONENT_MAP  = new InjectionToken<ComponentMap>('UI_OS_FORM_FIELD_COMPONENT_MAP',  { providedIn: 'root', factory: () => ({}) });
// 4 — action buttons / action-bar items.
export const ACTION_COMPONENT_MAP      = new InjectionToken<ComponentMap>('UI_OS_ACTION_COMPONENT_MAP',      { providedIn: 'root', factory: () => ({}) });
// 5 — chart renderers (line/bar/pie/heatmap/...).
export const CHART_COMPONENT_MAP       = new InjectionToken<ComponentMap>('UI_OS_CHART_COMPONENT_MAP',       { providedIn: 'root', factory: () => ({}) });
// 6 — data-grid cell renderers (status pill/avatar/link/...).
export const GRID_CELL_COMPONENT_MAP   = new InjectionToken<ComponentMap>('UI_OS_GRID_CELL_COMPONENT_MAP',   { providedIn: 'root', factory: () => ({}) });
// 7 — empty-state surfaces (no-data/no-permission/loading-failed).
export const EMPTY_STATE_COMPONENT_MAP = new InjectionToken<ComponentMap>('UI_OS_EMPTY_STATE_COMPONENT_MAP', { providedIn: 'root', factory: () => ({}) });
// 8 — guided-tour step bodies.
export const TOUR_STEP_COMPONENT_MAP   = new InjectionToken<ComponentMap>('UI_OS_TOUR_STEP_COMPONENT_MAP',   { providedIn: 'root', factory: () => ({}) });
// 9 — AI side-panel / co-pilot surfaces.
export const AI_PANEL_COMPONENT_MAP    = new InjectionToken<ComponentMap>('UI_OS_AI_PANEL_COMPONENT_MAP',    { providedIn: 'root', factory: () => ({}) });

export interface UiOsComponentAllowlists {
  pages?: ComponentMap;
  widgets?: ComponentMap;
  formFields?: ComponentMap;
  actions?: ComponentMap;
  charts?: ComponentMap;
  gridCells?: ComponentMap;
  emptyStates?: ComponentMap;
  tourSteps?: ComponentMap;
  aiPanels?: ComponentMap;
}

export function provideUiOsComponentAllowlists(maps: UiOsComponentAllowlists): Provider[] {
  return [
    { provide: PAGE_COMPONENT_MAP,        useValue: maps.pages       ?? {} },
    { provide: WIDGET_COMPONENT_MAP,      useValue: maps.widgets     ?? {} },
    { provide: FORM_FIELD_COMPONENT_MAP,  useValue: maps.formFields  ?? {} },
    { provide: ACTION_COMPONENT_MAP,      useValue: maps.actions     ?? {} },
    { provide: CHART_COMPONENT_MAP,       useValue: maps.charts      ?? {} },
    { provide: GRID_CELL_COMPONENT_MAP,   useValue: maps.gridCells   ?? {} },
    { provide: EMPTY_STATE_COMPONENT_MAP, useValue: maps.emptyStates ?? {} },
    { provide: TOUR_STEP_COMPONENT_MAP,   useValue: maps.tourSteps   ?? {} },
    { provide: AI_PANEL_COMPONENT_MAP,    useValue: maps.aiPanels    ?? {} },
  ];
}

/**
 * Snapshot of every registered component-token across all 9 allowlists.
 * Used by admin draft-validation (UiOsAdminManager.validateDraft) to
 * reject payloads that reference unknown tokens before publish.
 */
export interface AllowlistSnapshot {
  pages: ComponentToken[];
  widgets: ComponentToken[];
  formFields: ComponentToken[];
  actions: ComponentToken[];
  charts: ComponentToken[];
  gridCells: ComponentToken[];
  emptyStates: ComponentToken[];
  tourSteps: ComponentToken[];
  aiPanels: ComponentToken[];
}

export function snapshotAllowlists(maps: Required<UiOsComponentAllowlists>): AllowlistSnapshot {
  return {
    pages:       Object.keys(maps.pages),
    widgets:     Object.keys(maps.widgets),
    formFields:  Object.keys(maps.formFields),
    actions:     Object.keys(maps.actions),
    charts:      Object.keys(maps.charts),
    gridCells:   Object.keys(maps.gridCells),
    emptyStates: Object.keys(maps.emptyStates),
    tourSteps:   Object.keys(maps.tourSteps),
    aiPanels:    Object.keys(maps.aiPanels),
  };
}
