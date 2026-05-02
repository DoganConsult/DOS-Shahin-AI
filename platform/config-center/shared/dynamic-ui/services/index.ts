// Canonical Dynamic UI services — single source of truth.
// Implementation files live HERE physically. All other locations are
// thin re-export shims for backwards compatibility.

export {
  DynamicUiBootstrapService,
  type DynamicUiNavItem,
  type DynamicUiRouteItem,
  type DynamicUiModuleRecord,
  type DynamicUiActionItem,
  type DynamicUiWidgetItem,
  type DynamicUiAgentActionItem,
  type DynamicUiContractBundle,
} from './dynamic-ui-bootstrap.service';

export {
  DynamicPageExperienceResolver,
  type DynamicPageExperience,
  type PageType,
  type PageLayout,
  type KpiScope,
  type DataScopeMode,
} from './dynamic-page-experience.resolver';

export {
  DynamicAgentExperienceResolver,
  type ResolvedAgentExperience,
} from './dynamic-agent-experience.resolver';

export {
  DynamicWidgetResolver,
  type ResolvedWidgetSlot,
} from './dynamic-widget.resolver';

export {
  UserContextResolver,
  type UserContext,
  type ProfileType,
} from '../../../../core/services/platform/user-context.resolver';

export { WidgetRegistryService } from './widget-registry.service';
export { WidgetsApiService, type WidgetResponseDto } from './widgets-api.service';

// Layer 6 — client-side allowlist guard (fail-closed).
export {
  CarbonAllowlistGuard,
  type AllowlistRow,
  type AllowlistResponse,
  type LoadState,
} from './carbon-allowlist.guard';
