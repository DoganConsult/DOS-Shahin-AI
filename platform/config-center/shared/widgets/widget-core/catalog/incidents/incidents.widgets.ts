import { WidgetManifest } from '../../core/models/widget-manifest.model';

export const INCIDENTS_WIDGETS: WidgetManifest[] = [
  {
    id: 'incidents.tracker',
    key: 'incident_tracker',
    title: 'Incident Tracker',
    titleAr: 'متتبع الحوادث',
    category: 'incidents',
    engine: 'angular',
    component: () => import('../../../components/lifecycle-ops/incident-tracker.widget').then(m => m.IncidentTrackerWidget),
    icon: '🚨',
    defaultSize: { cols: 3, rows: 1 },
    roles: ['owner', 'admin', 'risk_manager'],
    schemaVersion: 1,
  },
  {
    id: 'incidents.seismograph',
    key: 'incident_seismograph',
    title: 'Incident Seismograph',
    titleAr: 'مقياس الحوادث الزلزالي',
    category: 'incidents',
    engine: 'echarts',
    component: () => import('../../../chart-infra/echart-components/specialty/incident-seismograph.component').then(m => m.IncidentSeismographComponent),
    icon: '📊',
    defaultSize: { cols: 6, rows: 1 },
    schemaVersion: 1,
  },
];
