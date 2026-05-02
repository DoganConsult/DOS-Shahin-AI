export { InboxDashboardComponent } from './dashboards/inbox-dashboard.component';
export { InboxDiagnosticsComponent } from './diagnostics/inbox-diagnostics.component';
export { InboxAdminComponent } from './admin/inbox-admin.component';
export { InboxWidgetComponent } from './widgets/inbox-widget.component';
export { InboxState } from './state/inbox.state';
export { INBOX_STATES, INBOX_TRANSITIONS, INBOX_TERMINAL_STATES, isValidInboxTransition, isInboxTerminal } from './workflows/inbox-lifecycle';
export type { InboxItemContract, InboxDiagnosticsContract, InboxDashboardContract, InboxItemStatus, InboxItemType, InboxPriority } from './contracts/inbox.contracts';
