export { RecordsDashboardComponent } from './dashboards/records-dashboard.component';
export { RecordsDiagnosticsComponent } from './diagnostics/records-diagnostics.component';
export { RecordsAdminComponent } from './admin/records-admin.component';
export { RecordsWidgetComponent } from './widgets/records-widget.component';
export { RecordsState } from './state/records.state';
export { RECORD_STATES, RECORD_TRANSITIONS, RECORD_TERMINAL_STATES, isValidRecordTransition, isRecordTerminal } from './workflows/records-lifecycle';
export type { RecordContract, RecordsDiagnosticsContract, RecordsDashboardContract, RecordStatus, RecordClassification, RetentionPolicy } from './contracts/records.contracts';
