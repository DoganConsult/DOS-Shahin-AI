// Public surface of @dos/ui-os-client.
//
// Single canonical Angular HTTP client for the /api/ui-os/* contract
// owned by services/ui-os-service. Replaces every legacy dynamic-ui /
// shell / dashboard / widgets / kpi / navigation FE client per the
// one-source / one-path / one-way decree. Consumers MUST import from
// this entry exactly — never reach into subpaths.

export * from './ui-os.types';
export { UI_OS_API_BASE, provideUiOsClient, type UiOsClientConfig } from './ui-os.config';
export { UiOsClient } from './ui-os.client';
export {
  PAGE_COMPONENT_MAP,
  WIDGET_COMPONENT_MAP,
  FORM_FIELD_COMPONENT_MAP,
  ACTION_COMPONENT_MAP,
  CHART_COMPONENT_MAP,
  GRID_CELL_COMPONENT_MAP,
  EMPTY_STATE_COMPONENT_MAP,
  TOUR_STEP_COMPONENT_MAP,
  AI_PANEL_COMPONENT_MAP,
  provideUiOsComponentAllowlists,
  snapshotAllowlists,
  type ComponentToken,
  type ComponentMap,
  type UiOsComponentAllowlists,
  type AllowlistSnapshot,
} from './component-allowlists';
