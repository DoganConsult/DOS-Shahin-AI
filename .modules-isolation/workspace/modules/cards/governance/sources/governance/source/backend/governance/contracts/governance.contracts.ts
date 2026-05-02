export interface GovernanceBodyContract {
  bodyId: string;
  tenantId: string;
  nameEn: string;
  nameAr?: string;
  bodyType: string;
  status: 'active' | 'inactive' | 'archived';
  parentBodyId?: string;
  ownerId?: string;
  createdAt: string;
}

export interface CommitteeMembershipContract {
  membershipId: string;
  bodyId: string;
  userId: string;
  role: string;
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt?: string;
}

export interface GovernanceResponsibilityContract {
  responsibilityId: string;
  bodyId: string;
  titleEn: string;
  titleAr?: string;
  assigneeId?: string;
  assigneeType: 'user' | 'role' | 'position';
  status: 'assigned' | 'unassigned' | 'overdue' | 'completed';
  dueDate?: string;
}

export interface RaciEntryContract {
  raciId: string;
  templateId: string;
  activityEn: string;
  responsible?: string;
  accountable?: string;
  consulted?: string[];
  informed?: string[];
}

export interface GovernanceOversightContract {
  totalBodies: number;
  activeBodies: number;
  totalCommittees: number;
  activeMembers: number;
  overdueResponsibilities: number;
  pendingSignOffs: number;
  healthScore?: number;
}

export interface GovernanceDiagnosticsContract {
  hierarchyHealth: {
    orphanedBodies: number;
    circularReferences: number;
    bodiesWithoutOwner: number;
  };
  signOffHealth: {
    pendingSignOffs: number;
    blockedSignOffs: number;
    averageSignOffLatencyDays: number;
  };
  responsibilityHealth: {
    totalAssigned: number;
    unassigned: number;
    overdue: number;
    coveragePercent: number;
  };
  delegationHealth: {
    activeDelegations: number;
    expiredDelegations: number;
  };
}

export interface GovernanceCharterContract {
  charterId: string;
  titleEn: string;
  status: 'draft' | 'in_review' | 'approved' | 'active' | 'expired' | 'archived';
  committeeId?: string;
  bodyId?: string;
  ownerId?: string;
  effectiveDate?: string;
  expiryDate?: string;
}

export interface BoardPackContract {
  packId: string;
  titleEn: string;
  status: 'draft' | 'assembling' | 'review' | 'approved' | 'published';
  packType: string;
  periodStart?: string;
  periodEnd?: string;
  itemCount: number;
}
