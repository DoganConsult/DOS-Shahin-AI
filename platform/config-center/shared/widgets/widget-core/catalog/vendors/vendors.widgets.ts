import { WidgetManifest } from '../../core/models/widget-manifest.model';

export const VENDORS_WIDGETS: WidgetManifest[] = [
  {
    id: 'vendors.risk_snapshot',
    key: 'vendor_risk_snapshot',
    title: 'Vendor Risk Snapshot',
    titleAr: 'مخاطر الموردين',
    category: 'vendors',
    engine: 'angular',
    component: () => import('../../../components/lifecycle-ops/vendor-risk-snapshot.widget').then(m => m.VendorRiskSnapshotWidget),
    icon: '🏢',
    defaultSize: { cols: 3, rows: 1 },
    roles: ['owner', 'admin', 'risk_manager'],
    schemaVersion: 1,
  },
];
