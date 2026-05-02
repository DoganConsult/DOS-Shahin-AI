export type TrainingProgramStatus = 'draft' | 'active' | 'paused' | 'completed' | 'retired' | 'archived';
export type CampaignStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'waived';

export interface TrainingProgramContract {
  programId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: TrainingProgramStatus; description: string; ownerId: string;
  targetAudience: string[]; durationMinutes: number;
  passingScore: number | null; isMandatory: boolean;
  totalAssignments: number; completedAssignments: number; completionRate: number;
  createdAt: string; updatedAt: string;
}

export interface TrainingCampaignContract {
  campaignId: string; programId: string; titleEn: string; titleAr: string | null;
  status: CampaignStatus; startDate: string; endDate: string;
  targetGroupIds: string[]; totalAssigned: number; totalCompleted: number;
  createdAt: string;
}

export interface TrainingAssignmentContract {
  assignmentId: string; campaignId: string; userId: string;
  status: AssignmentStatus; assignedAt: string; dueDate: string;
  completedAt: string | null; score: number | null; passed: boolean | null;
  attemptsCount: number;
}

export interface TrainingDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalPrograms: number; activePrograms: number;
  overdueAssignments: number; lowCompletionPrograms: number; noOwnerPrograms: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface TrainingDashboardContract {
  totalPrograms: number; byStatus: Record<string, number>;
  activeCampaigns: number; overallCompletionRate: number;
  overdueAssignments: number; avgScore: number | null;
  topPrograms: Array<{ programId: string; titleEn: string; completionRate: number }>;
}
