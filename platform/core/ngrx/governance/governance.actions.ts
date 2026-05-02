import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface GovernanceOverviewDto {
  totalPolicies: number;
  policiesInReview: number;
  overdueReviews: number;
  totalCommittees: number;
  complianceScore: number;
}

export interface PolicySummaryDto {
  policyId: string;
  title: string;
  status: string;
  owner: string;
  reviewDate: string;
  version: number;
}

export interface CommitteeSummaryDto {
  committeeId: string;
  name: string;
  meetingCount: number;
  nextMeeting: string | null;
}

export const GovernanceActions = createActionGroup({
  source: 'Governance',
  events: {
    'Load Overview': emptyProps(),
    'Overview Loaded': props<{ overview: GovernanceOverviewDto }>(),
    'Overview Load Failed': props<{ error: string }>(),

    'Load Policies': emptyProps(),
    'Policies Loaded': props<{ policies: PolicySummaryDto[] }>(),
    'Policies Load Failed': props<{ error: string }>(),

    'Load Committees': emptyProps(),
    'Committees Loaded': props<{ committees: CommitteeSummaryDto[] }>(),
    'Committees Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});
