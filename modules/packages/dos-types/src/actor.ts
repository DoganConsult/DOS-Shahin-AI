export type ActorType = 'human' | 'agent' | 'service_account' | 'service' | 'external';
export interface ActorIdentity {
  actorId: string;
  type?: ActorType;
  actorType?: ActorType;
  userId?: string;
  displayName?: string;
  displayNameAr?: string;
  email?: string;
  tenantId?: string;
  [k: string]: unknown;
}
export type AuthorityType = 'approve' | 'reject' | 'override' | 'escalate' | 'delegate' | string;
export type CompetencyType = 'technical' | 'regulatory' | 'managerial' | 'domain' | string;
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | string;
export type StakeholderType = 'internal' | 'external' | 'regulator' | 'auditor' | 'vendor' | string;
export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline' | string;
export interface ExternalStakeholderProfile { stakeholderId?: string; name?: string; type?: StakeholderType; organization?: string; email?: string; [k: string]: unknown; }
export interface WorkloadSnapshot { userId?: string; taskCount?: number; overdueCount?: number; utilization?: number; snapshotAt?: string; [k: string]: unknown; }
export interface WorkloadRecommendation { userId?: string; action?: string; reason?: string; suggestedReassignTo?: string; [k: string]: unknown; }
export interface ModuleUserContext { userId?: string; moduleCode?: string; role?: string; permissions?: string[]; [k: string]: unknown; }
export interface UserAvailability { userId?: string; status?: AvailabilityStatus; since?: string; until?: string; delegateTo?: string; [k: string]: unknown; }
export interface UserCompetency { userId?: string; competency?: CompetencyType; proficiency?: ProficiencyLevel; certifiedAt?: string; [k: string]: unknown; }
export interface AccessProfile { profileId?: string; name?: string; level?: string; permissions?: string[]; [k: string]: unknown; }
export interface FunctionalRole { roleCode?: string; roleName?: string; moduleCode?: string; permissions?: string[]; [k: string]: unknown; }
export interface JobTitle { titleId?: string; title?: string; titleAr?: string; department?: string; [k: string]: unknown; }
export interface DecisionAuthority { authorityId?: string; type?: AuthorityType; scope?: string; level?: number; [k: string]: unknown; }
export interface DecisionOutcome { decision?: string; decidedBy?: string; decidedAt?: string; reason?: string; [k: string]: unknown; }
