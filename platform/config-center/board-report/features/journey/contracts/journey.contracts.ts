export type JourneyStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'archived';

export interface JourneyContract {
  journeyId: string; tenantId: string; userId: string; journeyCode: string;
  titleEn: string; titleAr: string | null; status: JourneyStatus;
  totalMilestones: number; completedMilestones: number; progressPercent: number;
  currentMilestoneCode: string | null; startedAt: string | null; completedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface JourneyMilestoneContract {
  milestoneId: string; journeyId: string; code: string; titleEn: string; titleAr: string | null;
  sequenceNo: number; status: 'pending' | 'active' | 'completed' | 'skipped';
  completedAt: string | null; requiredActions: number; completedActions: number;
}

export interface JourneyDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalJourneys: number; activeJourneys: number;
  stuckJourneys: number; abandonedCount: number; avgCompletionDays: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface JourneyDashboardContract {
  totalJourneys: number; byStatus: Record<string, number>;
  activeCount: number; completionRate: number; avgProgressPercent: number;
  avgCompletionDays: number | null; stuckCount: number;
}
