export interface GovernanceBodyContract {
  bodyId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  bodyType: 'board' | 'committee' | 'council' | 'working_group';
  status: 'draft' | 'active' | 'suspended' | 'archived';
  chairId: string | null;
  memberCount: number;
  createdAt: string;
}

export interface GovernanceCommitteeMemberContract {
  memberId: string;
  bodyId: string;
  userId: string;
  role: 'chair' | 'member' | 'secretary' | 'observer';
  joinedAt: string;
  leftAt: string | null;
}

export interface GovernanceResponsibilityContract {
  responsibilityId: string;
  bodyId: string;
  nameEn: string;
  nameAr: string | null;
  assigneeId: string | null;
  status: 'active' | 'completed' | 'overdue';
}

export interface GovernanceRaciContract {
  raciId: string;
  activityName: string;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

export interface GovernanceDecisionContract {
  decisionId: string;
  bodyId: string;
  title: string;
  state: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'deferred' | 'archived';
  decidedAt: string | null;
}

export interface GovernanceDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}
