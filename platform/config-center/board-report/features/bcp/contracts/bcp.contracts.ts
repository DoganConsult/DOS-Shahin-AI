export type BcpPlanStatus = 'draft' | 'active' | 'under_review' | 'approved' | 'outdated' | 'retired' | 'archived';
export type ExerciseStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type RecoveryStrategy = 'hot_standby' | 'warm_standby' | 'cold_standby' | 'manual_recovery' | 'cloud_failover';

export interface BcpPlanContract {
  planId: string; tenantId: string; titleEn: string; titleAr: string | null;
  status: BcpPlanStatus; ownerId: string; approverId: string | null;
  scenarioDescription: string; recoveryStrategy: RecoveryStrategy;
  rtoHours: number; rpoHours: number;
  linkedAssetIds: string[]; linkedRiskIds: string[];
  lastExerciseDate: string | null; nextExerciseDate: string | null;
  approvedAt: string | null; createdAt: string; updatedAt: string;
}

export interface BcpExerciseContract {
  exerciseId: string; planId: string; title: string; status: ExerciseStatus;
  exerciseType: 'tabletop' | 'walkthrough' | 'simulation' | 'full_drill';
  scheduledDate: string; conductedAt: string | null;
  outcome: 'pass' | 'partial' | 'fail' | null; findings: string | null;
  participantCount: number; createdAt: string;
}

export interface BcpDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalPlans: number; activePlans: number;
  outdatedPlans: number; overdueExercises: number; noOwnerPlans: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface BcpDashboardContract {
  totalPlans: number; byStatus: Record<string, number>; byStrategy: Record<string, number>;
  activeCount: number; outdatedCount: number; overdueExercises: number;
  avgRtoHours: number; avgRpoHours: number; exercisePassRate: number;
}
