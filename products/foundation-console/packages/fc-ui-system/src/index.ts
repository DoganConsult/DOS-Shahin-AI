// @fc/ui-system — Carbon Workspace Shell V2 (Angular 21, zoneless, signals).
// F4: skeleton renderer that consumes FcWorkspaceRuntime only. No static nav. No fallback.
// F7: real COMPONENT_MAP closure — 11 approved componentKeys, all real renderers.
export const FC_UI_SYSTEM_VERSION = '0.0.1';

export { FC_RUNTIME_CONFIG, type FcRuntimeConfigToken } from './tokens.js';
export {
  FC_COMPONENT_MAP,
  FC_DEFAULT_COMPONENT_MAP,
  FC_APPROVED_COMPONENT_KEYS,
  type FcComponentMap,
} from './component-map.token.js';
export { WorkspaceRuntimeService, type FcRuntimeState } from './workspace-runtime.service.js';
export { PageRuntimeService, type FcPageState } from './page-runtime.service.js';
export { DosSurfaceRendererComponent } from './dos-surface-renderer.component.js';
export {
  WorkspaceShellSurfaceComponent,
  WorkspaceHeaderSurfaceComponent,
  WorkspaceSidebarSurfaceComponent,
  WorkspaceContentSurfaceComponent,
  WorkspaceNavGroupComponent,
  WorkspaceNavItemComponent,
  WorkspaceSurfaceComponent,
  WorkspaceEmptyStateComponent,
  WorkspaceDiagnosticComponent,
  WorkspaceLoadingComponent,
  WorkspaceErrorComponent,
} from './surface-components.js';
export { WorkspaceHeaderV2Component } from './workspace-header-v2.component.js';
export { WorkspaceSidebarV2Component } from './workspace-sidebar-v2.component.js';
export { WorkspaceContentHostV2Component } from './workspace-content-host-v2.component.js';
export { WorkspaceShellV2Component } from './workspace-shell-v2.component.js';
export {
  FoundationSectionHeadingComponent,
  FoundationTileMetricComponent,
  FoundationListSimpleComponent,
  FoundationDashboardSummaryComponent,
} from './foundation-domain-components.js';
