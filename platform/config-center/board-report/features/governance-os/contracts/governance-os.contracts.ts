export type GovernanceRitualStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type CouncilStatus = 'active' | 'suspended' | 'dissolved';

export interface GovernanceRitualContract {
  ritualId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: GovernanceRitualStatus; frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  ownerId: string; participantIds: string[]; nextOccurrence: string | null;
  lastCompletedAt: string | null; agenda: string | null;
  createdAt: string; updatedAt: string;
}

export interface GovernanceCouncilContract {
  councilId: string; tenantId: string; nameEn: string; nameAr: string | null;
  status: CouncilStatus; chairId: string; memberIds: string[];
  mandate: string; meetingFrequency: string;
  createdAt: string; updatedAt: string;
}

export interface GovernanceOsDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalRituals: number; overdueRituals: number;
  activeCouncils: number; suspendedCouncils: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface GovernanceOsDashboardContract {
  totalRituals: number; byStatus: Record<string, number>;
  activeCouncils: number; overdueRituals: number;
  upcomingRituals: Array<{ ritualId: string; titleEn: string; nextOccurrence: string }>;
  readinessScore: number | null;
}
