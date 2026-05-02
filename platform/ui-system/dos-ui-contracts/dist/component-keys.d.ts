/**
 * Approved Dynamic UI component keys.
 *
 * Dynamic UI MUST allow only these keys. Any unknown component key
 * fails the `ui-component-allowlist.mjs` CI guard and is refused at
 * render time by the runtime allowlist guard.
 */
export declare const APPROVED_COMPONENT_KEYS: readonly ["AppShell", "PageHeader", "Tabs", "MetricCard", "AdaptiveCommandBar", "StatusBanner", "ServiceCard", "ChallengeCard", "EmptyState", "LoadingState", "BottomSheet", "DesktopDialog", "SideDrawer", "AccountMenu", "AiAssistantFab", "DataTable", "GraphCanvas", "AIWorkbenchPanel", "NavItem", "NavSection", "WorkspaceNav"];
export type ApprovedComponentKey = (typeof APPROVED_COMPONENT_KEYS)[number];
export declare function isApprovedComponentKey(key: string): key is ApprovedComponentKey;
