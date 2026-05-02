import { Routes } from '@angular/router';
import { AnalyticsHubComponent } from '../../../analytics-hub/analytics-hub.component';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    component: AnalyticsHubComponent,
    data: {
      breadcrumb: 'Analytics',
      moduleCode: 'analytics',
      permission: 'analytics.report.read',
      entitlementKey: 'module.analytics',
      featureFlag: 'module.analytics.enabled',
    },
  }
];
