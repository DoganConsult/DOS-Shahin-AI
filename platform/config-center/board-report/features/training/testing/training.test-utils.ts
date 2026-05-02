import type { TrainingProgramContract, TrainingCampaignContract, TrainingAssignmentContract, TrainingDiagnosticsContract } from '../contracts/training.contracts';
export function mockTrainingProgram(overrides?: Partial<TrainingProgramContract>): TrainingProgramContract {
  return { programId: 'trn-001', tenantId: 'tenant-001', code: 'SAT-2026', titleEn: 'Security Awareness Training 2026', titleAr: null,
    status: 'active', description: 'Annual security awareness program covering phishing, social engineering, and data handling',
    ownerId: 'user-001', targetAudience: ['all_employees'], durationMinutes: 45, passingScore: 80, isMandatory: true,
    totalAssignments: 250, completedAssignments: 180, completionRate: 72,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockTrainingCampaign(overrides?: Partial<TrainingCampaignContract>): TrainingCampaignContract {
  return { campaignId: 'camp-001', programId: 'trn-001', titleEn: 'Q1 Security Awareness', titleAr: null,
    status: 'active', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    targetGroupIds: ['dept-001', 'dept-002'], totalAssigned: 120, totalCompleted: 85, createdAt: new Date().toISOString(), ...overrides };
}
export function mockTrainingAssignment(overrides?: Partial<TrainingAssignmentContract>): TrainingAssignmentContract {
  return { assignmentId: 'asgn-001', campaignId: 'camp-001', userId: 'user-005', status: 'completed',
    assignedAt: new Date().toISOString(), dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    completedAt: new Date().toISOString(), score: 92, passed: true, attemptsCount: 1, ...overrides };
}
export function mockTrainingDiagnostics(overrides?: Partial<TrainingDiagnosticsContract>): TrainingDiagnosticsContract {
  return { moduleCode: 'training', healthy: true, totalPrograms: 8, activePrograms: 3, overdueAssignments: 15,
    lowCompletionPrograms: 1, noOwnerPrograms: 0,
    checks: [{ name: 'assignment-pipeline', passed: true }, { name: 'completion-tracking', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides };
}
export function mockTrainingProgramList(count = 5): TrainingProgramContract[] { return Array.from({ length: count }, (_, i) => mockTrainingProgram({ programId: `trn-${String(i+1).padStart(3,'0')}`, titleEn: `Program ${i+1}` })); }
