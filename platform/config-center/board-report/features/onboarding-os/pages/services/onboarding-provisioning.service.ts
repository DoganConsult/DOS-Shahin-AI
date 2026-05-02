import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { OnboardingApiService, ProvisioningMilestone } from '../../services/onboarding-api.service';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import { devWarn } from '../../utils/dev-logger';

@Injectable()
export class OnboardingProvisioningService {
  readonly provisioning = signal(false);
  readonly provJob = signal<unknown>(null);
  readonly provSteps = signal<any[]>([]);
  readonly provisionError = signal<string | null>(null);
  readonly provisionCorrelationId = signal<string | null>(null);
  readonly provisionElapsedSeconds = signal(0);
  readonly provisioningMilestones = signal<ProvisioningMilestone[]>([]);
  startupChecklist: unknown[] = [];

  private pollSub?: Subscription;
  private pollAttempt = 0;
  private pollErrorCount = 0;
  private readonly POLL_MAX_ERRORS = 5;
  private provElapsedInterval?: ReturnType<typeof setInterval>;

  /** Lazy session ID resolver — set by the component so poll completion can load the checklist. */
  private getSessionId: (() => string | null) | null = null;

  private readonly api = inject(OnboardingApiService);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  get isAr(): boolean { return this.platform.i18n.currentLang() === 'ar'; }

  /** Component calls this once so the service can resolve session ID when needed. */
  setSessionIdResolver(fn: () => string | null): void {
    this.getSessionId = fn;
  }

  clearProvisionError(): void {
    this.provisionError.set(null);
    this.provisionCorrelationId.set(null);
  }

  approveAndProvision(sessionId: string, callbacks: { onProvisionStarted: (jobId: string) => void }): void {
    this.provisionError.set(null);
    this.provisionCorrelationId.set(null);
    this.provisioning.set(true);
    this.api.completeSession(sessionId).subscribe({
      next: (res: Record<string, unknown>) => {
        const provisioning = (res.provisioning as Record<string, unknown> | undefined) ?? {};
        const jobId = provisioning.jobId as string | undefined;
        if (!jobId) {
          this.provisioning.set(false);
          this.provisionError.set(this.isAr ? 'تعذر تحديد مهمة التهيئة' : 'Provisioning job id missing');
          this.messageService.add({
            severity: 'error',
            summary: this.isAr ? 'خطأ في التهيئة' : 'Provisioning Error',
            detail: this.isAr ? 'تعذر تحديد مهمة التهيئة' : 'Provisioning job id missing',
            life: 6000,
          });
          return;
        }

        this.provisioning.set(false);
        this.startProvisionElapsedTimer();
        this.loadProvisioningMilestones();
        callbacks.onProvisionStarted(jobId);
        this.startProvisioningPoll(jobId, sessionId);
      },
      error: (err: unknown) => {
        const httpErr = err as Record<string, unknown> | null;
        const errBody = httpErr?.error as Record<string, unknown> | null;
        this.provisioning.set(false);
        this.provisionError.set((errBody?.error as string) || (this.isAr ? 'فشل إكمال الإعداد' : 'Failed to complete onboarding'));
        this.provisionCorrelationId.set((errBody?.correlationId ?? errBody?.correlation_id ?? null) as string | null);
        this.messageService.add({
          severity: 'error',
          summary: this.isAr ? 'خطأ في الإكمال' : 'Completion Error',
          detail: (errBody?.error as string) || (this.isAr ? 'فشل إكمال الإعداد' : 'Failed to complete onboarding'),
          life: 6000,
        });
      }
    });
  }

  retryProvisionAndApprove(sessionId: string, callbacks: { onProvisionStarted: (jobId: string) => void }): void {
    this.clearProvisionError();
    this.approveAndProvision(sessionId, callbacks);
  }

  retryProvisioningPoll(): void {
    this.clearProvisionError();
    const job = this.provJob() as Record<string, unknown> | null;
    const jobId = (job?.jobId ?? job?.job_id) as string | undefined;
    if (jobId) this.startProvisioningPoll(jobId);
  }

  startProvisioningPoll(jobId: string, sessionId?: string): void {
    // Resolve session ID: prefer explicit param, then lazy resolver
    const resolveSessionId = (): string | null => sessionId ?? this.getSessionId?.() ?? null;

    this.pollSub?.unsubscribe();
    this.pollAttempt = 0;
    this.pollErrorCount = 0;

    // Initial load
    forkJoin([
      this.api.getProvisioningJob(jobId),
      this.api.getProvisioningSteps(jobId),
    ]).subscribe({
      next: ([j, steps]) => {
        this.provJob.set(j);
        this.provSteps.set(steps);
      },
      error: (err) => {
        devWarn('[Poll] Initial load failed:', err?.message ?? err);
      },
    });

    // Recurring poll
    const poll = () => {
      this.pollAttempt++;
      const delay = Math.min(2000 * Math.pow(1.3, Math.min(this.pollAttempt, 15)), 15000);
      this.pollSub = interval(delay).pipe(
        switchMap(() => forkJoin([
          this.api.getProvisioningJob(jobId),
          this.api.getProvisioningSteps(jobId),
        ])),
      ).subscribe({
        next: ([j, steps]) => {
          this.pollErrorCount = 0;
          this.provJob.set(j);
          this.provSteps.set(steps);
          if (j.job_status === 'completed' || j.job_status === 'failed') {
            this.pollSub?.unsubscribe();
            this.stopProvisionElapsedTimer();
            if (j.job_status === 'completed') {
              this.loadStartupChecklist(resolveSessionId());
            }
          }
        },
        error: (err: unknown) => {
          const httpErr = err as Record<string, unknown> | null;
          const errBody = httpErr?.error as Record<string, unknown> | null;
          this.pollErrorCount++;
          devWarn(`[Poll] Error ${this.pollErrorCount}/${this.POLL_MAX_ERRORS}:`, (httpErr?.message as string) ?? err);
          if (this.pollErrorCount >= this.POLL_MAX_ERRORS) {
            this.pollSub?.unsubscribe();
            this.provisionError.set((errBody?.error as string) || (httpErr?.message as string) || this.platform.i18n.translate('common.lostConnectionToServer'));
            this.provisionCorrelationId.set((errBody?.correlationId ?? errBody?.correlation_id ?? null) as string | null);
            this.messageService.add({
              severity: 'warn',
              summary: this.platform.i18n.translate('common.connectionIssue'),
              detail: this.platform.i18n.translate('common.lostConnectionToServer'),
              life: 0,
            });
          }
        },
      });
    };
    poll();
  }

  loadStartupChecklist(sessionId: string | null): void {
    if (!sessionId) return;
    this.api.getStartupChecklist(sessionId).subscribe({
      next: (raw) => { const res = raw as Record<string, unknown> | null; this.startupChecklist = (res?.items as unknown[]) ?? []; },
      error: () => { this.startupChecklist = []; }
    });
  }

  toggleChecklistItem(sessionId: string | null, item: Record<string, unknown>): void {
    if (!sessionId || item.is_completed) return;
    this.api.completeChecklistItem(sessionId, item.id as string).subscribe({
      next: () => {
        item.is_completed = true;
        item.completed_at = new Date().toISOString();
      }
    });
  }

  retryProvisioning(sessionId: string | null): void {
    const job = this.provJob() as Record<string, unknown> | null;
    if (job?.id) {
      this.api.retryProvisioningJob(job.id as string).subscribe({
        next: (raw) => { const res = raw as Record<string, unknown>; this.startProvisioningPoll((res.jobId as string) || (job.id as string), sessionId ?? undefined); }
      });
    } else {
      if (!sessionId) return;
      this.api.provision(sessionId).subscribe({
        next: (res) => { this.startProvisioningPoll(res.jobId, sessionId); }
      });
    }
  }

  goToWorkspace(sessionId: string | null): void {
    const finalize = () => {
      this.platform.storage.remove('onb_session_id');
      this.platform.auth.setOnboardingComplete(true);
      const tid = this.platform.auth.tenantId() || '';
      const cockpitKey = tid ? `grc_cockpit_shown_${tid}` : 'grc_cockpit_shown';
      this.platform.storage.set(cockpitKey, 'true');
      this.platform.productsConfig.load().then(() => {
        this.router.navigate(['/workspace-home']);
      }).catch(() => {
        this.router.navigate(['/workspace-home']);
      });
    };
    finalize();
  }

  startProvisionElapsedTimer(): void {
    this.provisionElapsedSeconds.set(0);
    if (this.provElapsedInterval) clearInterval(this.provElapsedInterval);
    this.provElapsedInterval = setInterval(() => {
      this.provisionElapsedSeconds.update(v => v + 1);
    }, 1000);
  }

  stopProvisionElapsedTimer(): void {
    if (this.provElapsedInterval) {
      clearInterval(this.provElapsedInterval);
      this.provElapsedInterval = undefined;
    }
  }

  private loadProvisioningMilestones(): void {
    this.api.getProvisioningMilestones().subscribe({
      next: (milestones) => this.provisioningMilestones.set(milestones ?? []),
      error: () => this.provisioningMilestones.set([]),
    });
  }

  destroy(): void {
    this.pollSub?.unsubscribe();
    this.stopProvisionElapsedTimer();
    this.getSessionId = null;
  }
}
