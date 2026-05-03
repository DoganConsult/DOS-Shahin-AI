import { Routes } from '@angular/router';
import { RiskHubComponent } from './pages/risk-hub.component';

const PAGES = '../../../ui/features/risk/pages';

export const RISK_ROUTES: Routes = [
  {
    path: '',
    component: RiskHubComponent,
    data: { breadcrumb: 'Risk', moduleCode: 'risk', componentKey: 'module.entry.page', permission: 'risk.record.read' },
  },
  {
    path: 'overview',
    loadComponent: () => import(`${PAGES}/risk-overview.component`).then(m => m.RiskOverviewComponent),
    data: { breadcrumb: 'Overview', moduleCode: 'risk', componentKey: 'module.overview.page', permission: 'risk.record.read' },
  },
  {
    path: 'register',
    loadComponent: () => import(`${PAGES}/risk-register.component`).then(m => m.RiskRegisterPageComponent),
    data: { breadcrumb: 'Risk Register', moduleCode: 'risk', componentKey: 'RiskRegisterPage', permission: 'risk.record.read' },
  },
  {
    path: 'assessments',
    loadComponent: () => import(`${PAGES}/risk-assessments.component`).then(m => m.RiskAssessmentsPageComponent),
    data: { breadcrumb: 'Assessments', moduleCode: 'risk', componentKey: 'RiskAssessmentsPage', permission: 'risk.record.read' },
  },
  {
    path: 'heatmap',
    loadComponent: () => import(`${PAGES}/risk-heatmap.component`).then(m => m.RiskHeatmapPageComponent),
    data: { breadcrumb: 'Heatmap', moduleCode: 'risk', componentKey: 'RiskHeatmapPage', permission: 'risk.record.read' },
  },
  {
    path: 'treatments',
    loadComponent: () => import(`${PAGES}/risk-treatments.component`).then(m => m.RiskTreatmentsPageComponent),
    data: { breadcrumb: 'Treatments', moduleCode: 'risk', componentKey: 'RiskTreatmentsPage', permission: 'risk.record.read' },
  },
];
