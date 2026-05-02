"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPROVED_COMPONENT_KEYS = void 0;
exports.isApprovedComponentKey = isApprovedComponentKey;
/**
 * Approved Dynamic UI component keys.
 *
 * Dynamic UI MUST allow only these keys. Any unknown component key
 * fails the `ui-component-allowlist.mjs` CI guard and is refused at
 * render time by the runtime allowlist guard.
 */
exports.APPROVED_COMPONENT_KEYS = [
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
];
function isApprovedComponentKey(key) {
    return exports.APPROVED_COMPONENT_KEYS.includes(key);
}
//# sourceMappingURL=component-keys.js.map