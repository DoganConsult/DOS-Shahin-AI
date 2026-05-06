/**
 * @dos/ui-system — single source of truth for product UI components.
 *
 * Consumers import standalone Angular components from this barrel and
 * include `@dos/design-tokens/tokens.css` plus `@dos/ui-system/styles.css`
 * once at the application root. No product-local styling should clone or
 * shadow these primitives.
 */

// I18n
export * from './i18n/dos-language-switcher.component';

// Components
export * from './components/account-menu.component';
export * from './components/bottom-sheet.component';
export * from './components/desktop-dialog.component';
export * from './components/page-header.component';
export * from './components/side-drawer.component';
export * from './components/tabs.component';
export * from './components/metric-card.component';
export * from './components/adaptive-command-bar.component';
export * from './components/status-banner.component';
export * from './components/service-card.component';
export * from './components/challenge-card.component';
export * from './components/empty-state.component';
export * from './components/loading-state.component';
export * from './components/ai-assistant-fab.component';
export * from './components/skeleton.component';
export * from './components/widget-frame.component';
export * from './components/trust-layer.component';
export * from './components/recommendation-card.component';
export * from './components/why-chip.component';
export * from './components/page-masthead.component';

// 10 archetype-enhancement molecules (G13 — roster patch 31)
export * from './components/mission-bar.component';
export * from './components/narrative-panel.component';
export * from './components/ai-confidence-chip.component';
export * from './components/impact-preview-modal.component';
export * from './components/readiness-meter.component';
export * from './components/why-tooltip.component';
export * from './components/twin-graph.component';
export * from './components/side-panel.component';
export * from './components/agent-followup.component';
export * from './components/role-priority-switcher.component';

// Universal Advanced Components (§26)
export * from './components/command-center.component';
export * from './components/entity-360-panel.component';
export * from './components/agent-workbench-panel.component';
export * from './components/decision-preview-panel.component';
export * from './components/workflow-canvas.component';
export * from './components/audit-timeline.component';

// Workspace nav (B0.2)
export * from './components/nav-item.component';
export * from './components/nav-section.component';
export * from './components/workspace-nav.component';
export * from './components/module-switcher.component';
export * from './components/workspace-switcher.component';
export * from './components/icon.component';

// Layout
export * from './layout/responsive-grid.component';

// Workspace shell — 10 standalone Carbon-backed surfaces (Phase WS-2..WS-6).
// Drives the runtime workspace shell (header, sidebar, mobile nav,
// command-search, status-bar, action-queue, agent-strip, inbox, context,
// quick-create) — every selector is registered in
// dos.dynamic_ui_component_registry under workspace.* keys.
export * from './shell/chrome-aria-label-resolver';
export * from './shell/quick-create.component';
export * from './shell/workspace-shell.contracts';
export * from './shell/toast-outlet.component';
export * from './shell/shell-banner-strip.component';
export * from './shell/workspace-host-kit';
export * from './shell/command-search.component';
export * from './shell/workspace-status-bar.component';
export * from './shell/workspace-action-queue.component';
export * from './shell/agent-activity-strip.component';
export * from './shell/inbox-center.component';
export * from './shell/context-panel.component';
export * from './shell/mobile-bottom-nav.component';
export * from './shell/workspace-header.component';
export * from './shell/workspace-sidebar.component';
export * from './shell/surface-renderer.component';
export * from './shell/visual-shell-surfaces.component';
export * from './shell/quick-create.component';
export * from './shell/workspace-shell.contracts';

// Named internal kits (Carbon-only, built on top of src/carbon/* wrappers).
// NOT third-party templates — the kits exist solely to formalize the
// "kit boundary" referenced by the agent operating directive.
export * from './marketing/marketing-page-kit';

// Carbon-backed primitives (one-source wrappers — never import Carbon
// directly from products/modules/services; the carbon-boundary-guard
// fails the build if you do).
export * from './carbon/index';

// Permission-gated structural directive (DOM-removal, AccessStore-bound).
export * from './directives/dos-can-render.directive';
export * from './directives/dos-gate-probe.directive';

// Carbon icon allowlist + picker (rule #8 — package-level asset, runtime allowlist).
export * from './icons/carbon-icon-allowlist.service';
export * from './icons/carbon-icon-picker.component';

// Marketing surface — Phase M0 (functional icon subset, public config,
// brand asset contract + eagle renderer). NOT AccessStore-bound.
export {
  MARKETING_ICON_NAMES,
  MARKETING_ICON_SET,
  isMarketingIcon,
  assertMarketingIcon,
  type MarketingIconName,
} from './allowlists/marketing-icons.allowlist';
export * from './brand/brand-asset.contract';
export * from './brand/brand-resolver.service';
export * from './brand/dos-brand-eagle.component';
export * from './marketing/marketing-public-config.service';
export * from './marketing/marketing-home.page';
// Phase M1.5 — Download-Kit system (3 components + contract).
export * from './marketing/download-kit.contract';
export * from './marketing/download-kit.components';
export * from './marketing/marketing-public-pages.components';

// Phase M1.6 — Carbon Auth Pages Pack (5 pages + 14 primitives + contract).
export * from './auth/auth.contract';
export * from './auth/auth-components';
export * from './auth/auth-pages';

// Agentic UI Interaction Layer (Phase M0.5) — 10 Carbon-backed components
// + universal state/event contract. CI gate: agentic-ui-coverage.mjs.
export * from './agentic/agentic.contract';
export * from './agentic/agentic-components';
export {
  CARBON_ICON_NAMES,
  CARBON_ICON_NAME_SET,
  CARBON_ICON_INDEX,
  isCarbonIconName,
  resolveCarbonIcon,
  type CarbonIconName,
  type CarbonIconSize,
  type CarbonIconNamespace,
  type CarbonIconEntry,
} from './allowlists/carbon-icons.allowlist';

// Re-export contracts for convenience.
export {
  isApprovedComponentKey,
  registerApprovedComponentKeys,
  getApprovedComponentKeys,
  registerComponentKey,
} from '@dos/ui-contracts';
export type {
  ApprovedComponentKey,
  ActionContract,
  PageContract,
  NavigationContract,
  ResponsiveBehavior,
  ResponsiveContract,
  Breakpoint,
  // Nav contracts (B0.2)
  DosNavItem,
  DosNavGroup,
  DosNavDisabledReason,
  DosShellNavConfig,
  DosWorkspaceShellConfig,
} from '@dos/ui-contracts';
