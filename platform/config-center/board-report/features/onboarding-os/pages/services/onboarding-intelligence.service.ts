import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { GrcRecord, StaffingSuggestion, BusinessFunction } from '../../models/onboarding.models';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';

@Injectable()
export class OnboardingIntelligenceService {
  private readonly store = inject(OnboardingStore);
  private readonly api = inject(OnboardingApiService);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private readonly messageService = inject(MessageService);

  loadQuickStartTemplates(): void {
    this.api.getQuickStartTemplates().subscribe({
      next: (res) => this.store.quickStartTemplates.set(res.templates ?? []),
      error: () => this.store.quickStartTemplates.set([]),
    });
  }

  loadTerminology(): void {
    this.api.getTerminology().subscribe({
      next: (res) => this.store.terminologyTerms.set(res.terms ?? []),
      error: () => this.store.terminologyTerms.set([]),
    });
  }

  loadAgentData(): void {
    const tenantId = this.platform.auth.tenantId();
    if (!tenantId) return;
    this.api.getAgentPreviews(tenantId).subscribe({
      next: (res) => this.store.activeAgentPreviews.set(res.agents ?? []),
      error: () => this.store.activeAgentPreviews.set([]),
    });
    this.api.getAgentReadiness(tenantId).subscribe({
      next: (res) => this.store.agentReadiness.set(res as import('../../models/onboarding.models').AgentReadiness),
      error: () => this.store.agentReadiness.set(null),
    });
  }

  loadAnswerHistory(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.getAnswerHistory(s.id).subscribe({
      next: (entries) => this.store.answerHistory.set((entries ?? []) as import('../../models/onboarding.models').AnswerHistoryEntry[]),
      error: () => this.store.answerHistory.set([]),
    });
  }

  loadBlockers(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.getBlockers(s.id).subscribe({
      next: (blockers) => this.store.blockers.set(blockers ?? []),
      error: () => this.store.blockers.set([]),
    });
  }

  loadStaffingSuggestions(): void {
    const rangeCode = this.store.answers['org.employee_band'] as string;
    if (!rangeCode) return;
    const sectorCode = (this.store.answers['org.industry'] || this.store.answers['gov.primary_sector']) as string | undefined;
    this.api.getStaffingSuggestions(rangeCode, sectorCode).subscribe({
      next: (res) => this.store.staffingSuggestions.set(res.staffing as StaffingSuggestion[]),
      error: () => this.store.staffingSuggestions.set([]),
    });
  }

  loadBusinessFunctions(): void {
    this.api.getBusinessFunctions().subscribe({
      next: (res) => this.store.businessFunctions.set(res.functions as BusinessFunction[]),
      error: () => this.store.businessFunctions.set([]),
    });
  }

  checkEmailVerified(): void {
    const profile = this.platform.auth.userProfile();
    this.store.emailVerified.set(!!profile?.email);
  }

  loadGovernanceContext(): void {
    const tenantId = this.platform.auth.tenantId();
    if (!tenantId) return;
    this.api.getGovernanceContext(tenantId).subscribe({
      next: (ctx) => this.store.governanceContext.set(ctx),
      error: () => {}
    });
    this.api.getModuleStates(tenantId).subscribe({
      next: (res) => this.store.moduleStates.set(res.modules ?? []),
      error: () => {}
    });
  }

  loadReviewIntelligence(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.getWorkspacePreview(s.id).subscribe({
      next: (res) => this.store.workspacePreviewSections.set(res.sections ?? []),
      error: () => this.store.workspacePreviewSections.set([]),
    });
    this.api.getInferredFacts(s.id).subscribe({
      next: (res) => this.store.inferredFacts.set(res.facts ?? []),
      error: () => {},
    });
    this.api.getConfidenceScores(s.id).subscribe({
      next: (res) => this.store.confidenceScores.set(res.scores ?? []),
      error: () => {},
    });
    this.api.getRegulatorExplanations().subscribe({
      next: (res) => this.store.regulatorExplanations.set(res.explanations ?? []),
      error: () => this.store.regulatorExplanations.set([]),
    });
    this.api.getDashboardPersonas().subscribe({
      next: (res) => this.store.dashboardPersonas.set(res.personas ?? []),
      error: () => this.store.dashboardPersonas.set([]),
    });
  }

  recomputeContext(): void {
    const tenantId = this.platform.auth.tenantId();
    const s = this.store.session();
    if (!tenantId || !s?.id) return;
    this.store.recomputing.set(true);
    this.api.recomputeContext(tenantId, s.id).subscribe({
      next: () => {
        this.store.recomputing.set(false);
        this.loadGovernanceContext();
      },
      error: () => this.store.recomputing.set(false),
    });
  }

  confirmInferredFact(factCode: string): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.confirmFact(s.id, factCode).subscribe({
      next: () => {
        this.store.inferredFacts.update(facts =>
          facts.map(f => f.fact_code === factCode ? { ...f, is_confirmed: true } : f)
        );
      },
      error: () => {},
    });
  }

  toggleModule(moduleCode: string, state: string): void {
    const tenantId = this.platform.auth.tenantId();
    if (!tenantId) return;
    this.api.toggleModuleState(tenantId, moduleCode, state).subscribe({
      next: () => {
        this.store.moduleStates.update(states =>
          states.map(m => m.module_code === moduleCode ? { ...m, state: state as 'on' | 'off' | 'trial' } : m)
        );
      },
      error: () => {},
    });
  }

  suggestResponsibilities(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.suggestResponsibilities(s.id).subscribe({
      next: (res: unknown) => {
        const suggestions = (res as Record<string, unknown>)?.suggestions;
        if (Array.isArray(suggestions)) {
          for (const rawSug of suggestions) {
            const sug = rawSug as Record<string, unknown>;
            if (sug.questionCode && sug.value != null) {
              this.store.answerSvc.onAnswer(sug.questionCode as string, sug.value, this.store.questions(), this.store.uiConfig());
            }
          }
        }
        this.messageService.add({
          severity: 'success',
          summary: this.store.isAr ? 'تم اقتراح المسؤوليات' : 'Responsibilities suggested',
          life: 3000,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.store.isAr ? 'فشل اقتراح المسؤوليات' : 'Failed to suggest responsibilities',
          life: 4000,
        });
      },
    });
  }

  onTeamCsvUploaded(file: File): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.importPersons(s.id, file).subscribe({
      next: (res: unknown) => {
        const imported = (res as Record<string, unknown>)?.imported;
        this.messageService.add({
          severity: 'success',
          summary: this.store.isAr ? `تم استيراد ${imported ?? 0} أعضاء` : `Imported ${imported ?? 0} team members`,
          life: 3000,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.store.isAr ? 'فشل استيراد الملف' : 'CSV import failed',
          life: 4000,
        });
      },
    });
  }

  checkTemporalStatus(): void {
    const job = this.store.provJob() as Record<string, unknown> | null;
    const jobId = job?.id ?? job?.job_id;
    if (!jobId) return;
    this.api.getTemporalStatus(jobId as string).subscribe({
      next: (status) => this.store.temporalStatus.set(status as import('../../models/onboarding.models').TemporalStatus),
      error: () => {},
    });
    this.api.getProvisioningEvents(jobId as string).subscribe({
      next: (events) => this.store.provisioningEvents.set((events ?? []) as import('../../models/onboarding.models').ProvisioningEvent[]),
      error: () => {},
    });
  }

  cancelProvisioningJob(): void {
    const job = this.store.provJob() as Record<string, unknown> | null;
    const jobId = job?.id ?? job?.job_id;
    if (!jobId) return;
    this.api.cancelProvisioningJob(jobId as string).subscribe({
      next: () => {
        this.store.provisioningSvc.provisioning.set(false);
        this.store.provisioningSvc.stopProvisionElapsedTimer();
        this.messageService.add({
          severity: 'warn',
          summary: this.store.isAr ? 'تم إلغاء التهيئة' : 'Provisioning cancelled',
          life: 4000,
        });
      },
      error: () => {},
    });
  }

  onNpsRated(rating: number): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.submitFeedback(s.id, rating).subscribe({ error: () => {} });
  }

  resendVerificationEmail(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.api.resendVerificationEmail(s.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.store.isAr ? 'تم إعادة إرسال رسالة التحقق' : 'Verification email resent',
          life: 3000,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.store.isAr ? 'فشل إعادة إرسال رسالة التحقق' : 'Failed to resend verification email',
          life: 4000,
        });
      },
    });
  }

  onPersonaConfirmed(personaCode: string): void {
    this.store.answerSvc.onAnswer('workspace_dashboard_persona', personaCode, this.store.questions(), this.store.uiConfig());
  }
}
