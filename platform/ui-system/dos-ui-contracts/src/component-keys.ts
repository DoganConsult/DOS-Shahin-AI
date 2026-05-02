/**
 * Approved Dynamic UI component keys.
 *
 * Dynamic UI MUST allow only these keys. Any unknown component key
 * fails the `ui-component-allowlist.mjs` CI guard and is refused at
 * render time by the runtime allowlist guard.
 */
export const APPROVED_COMPONENT_KEYS = [
  'AppShell',
  'PageHeader',
  'Tabs',
  'MetricCard',
  'AdaptiveCommandBar',
  'StatusBanner',
  'ServiceCard',
  'ChallengeCard',
  'EmptyState',
  'LoadingState',
  'BottomSheet',
  'DesktopDialog',
  'SideDrawer',
  'AccountMenu',
  'AiAssistantFab',
  'DataTable',
  'GraphCanvas',
  'AIWorkbenchPanel',
  // B0.2 nav primitives — owned by @dos/ui-system, consumed via product
  // navigation adapters. Do not duplicate locally in product apps.
  'NavItem',
  'NavSection',
  'WorkspaceNav',
] as const;

export type ApprovedComponentKey = (typeof APPROVED_COMPONENT_KEYS)[number];

export function isApprovedComponentKey(key: string): key is ApprovedComponentKey {
  return (APPROVED_COMPONENT_KEYS as readonly string[]).includes(key);
}
