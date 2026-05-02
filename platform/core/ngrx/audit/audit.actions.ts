import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface AuditOverviewDto {
  totalPlans: number;
  activePlans: number;
  totalFindings: number;
  openFindings: number;
  overdueFindings: number;
}

export interface AuditPlanDto {
  planId: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  auditor: string;
}

export interface AuditFindingDto {
  findingId: string;
  title: string;
  severity: string;
  status: string;
  auditPlanId: string;
  dueDate: string | null;
}

export const AuditActions = createActionGroup({
  source: 'Audit',
  events: {
    'Load Overview': emptyProps(),
    'Overview Loaded': props<{ overview: AuditOverviewDto }>(),
    'Overview Load Failed': props<{ error: string }>(),

    'Load Plans': emptyProps(),
    'Plans Loaded': props<{ plans: AuditPlanDto[] }>(),
    'Plans Load Failed': props<{ error: string }>(),

    'Load Findings': emptyProps(),
    'Findings Loaded': props<{ findings: AuditFindingDto[] }>(),
    'Findings Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});
