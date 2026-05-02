import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-intelligence.service.ts'), 'utf-8');

describe('OnboardingIntelligenceService — structure', () => {
  it('exports the service class', () => {
    expect(src).toContain('export class OnboardingIntelligenceService');
  });

  it('is marked @Injectable()', () => {
    expect(src).toContain('@Injectable()');
  });

  it('imports ONBOARDING_PLATFORM port', () => {
    expect(src).toContain("ONBOARDING_PLATFORM");
    expect(src).toContain("OnboardingPlatformPort");
  });

  it('injects OnboardingStore', () => {
    expect(src).toContain('private readonly store = inject(OnboardingStore)');
  });

  it('injects OnboardingApiService', () => {
    expect(src).toContain('private readonly api = inject(OnboardingApiService)');
  });

  it('injects platform port for tenantId resolution', () => {
    expect(src).toContain('private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM)');
  });

  it('injects MessageService for toast notifications', () => {
    expect(src).toContain('private readonly messageService = inject(MessageService)');
  });
});

describe('OnboardingIntelligenceService — data loading', () => {
  it('loads quick start templates', () => {
    expect(src).toContain('loadQuickStartTemplates(): void');
    expect(src).toContain('this.api.getQuickStartTemplates()');
  });

  it('loads terminology terms', () => {
    expect(src).toContain('loadTerminology(): void');
    expect(src).toContain('this.api.getTerminology()');
  });

  it('loads agent data with tenantId guard', () => {
    expect(src).toContain('loadAgentData(): void');
    expect(src).toContain('this.platform.auth.tenantId()');
    expect(src).toContain('this.api.getAgentPreviews(tenantId)');
    expect(src).toContain('this.api.getAgentReadiness(tenantId)');
  });

  it('loads answer history from API', () => {
    expect(src).toContain('loadAnswerHistory(): void');
    expect(src).toContain('this.api.getAnswerHistory(s.id)');
  });

  it('loads blockers from API', () => {
    expect(src).toContain('loadBlockers(): void');
    expect(src).toContain('this.api.getBlockers(s.id)');
  });

  it('loads staffing suggestions with org size', () => {
    expect(src).toContain('loadStaffingSuggestions(): void');
    expect(src).toContain("this.store.answers['org.employee_band']");
  });

  it('loads business functions from API', () => {
    expect(src).toContain('loadBusinessFunctions(): void');
    expect(src).toContain('this.api.getBusinessFunctions()');
  });
});

describe('OnboardingIntelligenceService — governance context', () => {
  it('loads governance context with tenantId guard', () => {
    expect(src).toContain('loadGovernanceContext(): void');
    expect(src).toContain('this.api.getGovernanceContext(tenantId)');
    expect(src).toContain('this.api.getModuleStates(tenantId)');
  });

  it('loads review intelligence (workspace preview, facts, scores, explanations, personas)', () => {
    expect(src).toContain('loadReviewIntelligence(): void');
    expect(src).toContain('this.api.getWorkspacePreview(s.id)');
    expect(src).toContain('this.api.getInferredFacts(s.id)');
    expect(src).toContain('this.api.getConfidenceScores(s.id)');
    expect(src).toContain('this.api.getRegulatorExplanations()');
    expect(src).toContain('this.api.getDashboardPersonas()');
  });

  it('recomputes context with loading state', () => {
    expect(src).toContain('recomputeContext(): void');
    expect(src).toContain('this.store.recomputing.set(true)');
    expect(src).toContain('this.api.recomputeContext(tenantId, s.id)');
  });
});

describe('OnboardingIntelligenceService — mutations', () => {
  it('confirms inferred fact via API', () => {
    expect(src).toContain('confirmInferredFact(factCode: string): void');
    expect(src).toContain('this.api.confirmFact(s.id, factCode)');
    expect(src).toContain('is_confirmed: true');
  });

  it('toggles module state via API', () => {
    expect(src).toContain('toggleModule(moduleCode: string, state: string): void');
    expect(src).toContain('this.api.toggleModuleState(tenantId, moduleCode, state)');
  });

  it('suggests responsibilities with AI', () => {
    expect(src).toContain('suggestResponsibilities(): void');
    expect(src).toContain('this.api.suggestResponsibilities(s.id)');
    expect(src).toContain('Responsibilities suggested');
  });

  it('handles CSV team upload', () => {
    expect(src).toContain('onTeamCsvUploaded(file: File): void');
    expect(src).toContain('this.api.importPersons(s.id, file)');
  });
});

describe('OnboardingIntelligenceService — provisioning support', () => {
  it('checks temporal status for provisioning jobs', () => {
    expect(src).toContain('checkTemporalStatus(): void');
    expect(src).toContain('this.api.getTemporalStatus(jobId');
    expect(src).toContain('this.api.getProvisioningEvents(jobId');
  });

  it('cancels provisioning job', () => {
    expect(src).toContain('cancelProvisioningJob(): void');
    expect(src).toContain('this.api.cancelProvisioningJob(jobId');
    expect(src).toContain('this.store.provisioningSvc.provisioning.set(false)');
  });

  it('submits NPS rating', () => {
    expect(src).toContain('onNpsRated(rating: number): void');
    expect(src).toContain('this.api.submitFeedback(s.id, rating)');
  });

  it('resends verification email', () => {
    expect(src).toContain('resendVerificationEmail(): void');
    expect(src).toContain('this.api.resendVerificationEmail(s.id)');
  });
});

describe('OnboardingIntelligenceService — email verification', () => {
  it('checks email verified from platform auth port', () => {
    expect(src).toContain('checkEmailVerified(): void');
    expect(src).toContain('this.platform.auth.userProfile()');
    expect(src).toContain('this.store.emailVerified.set');
  });
});

describe('OnboardingIntelligenceService — persona confirmation', () => {
  it('confirms dashboard persona via answer service', () => {
    expect(src).toContain('onPersonaConfirmed(personaCode: string): void');
    expect(src).toContain("'workspace_dashboard_persona'");
  });
});
