import { WidgetManifest } from '../../core/models/widget-manifest.model';

export const BCP_WIDGETS: WidgetManifest[] = [
  {
    id: 'bcp.status',
    key: 'bcp_status',
    title: 'BCP Status',
    titleAr: 'حالة استمرارية الأعمال',
    category: 'bcp',
    engine: 'echarts',
    component: () => import('../../../chart-infra/echart-components/specialty/bcp-status.component').then(m => m.BcpStatusComponent),
    icon: '🏗️',
    defaultSize: { cols: 3, rows: 1 },
    schemaVersion: 1,
  },
];
