import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { OnboardingState } from '../state/onboarding.state';
import type { OnboardingDashboardContract } from '../contracts/onboarding.contracts';

@Component({
  selector: 'app-onboarding-hub',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="onboarding-hub" [dir]="i18n.direction()">
      <h1>{{ i18n.translate('onboarding.hub.title') }}</h1>

      <ng-container *ngIf="state.loading()">
        <div class="onboarding-hub__loading">{{ i18n.translate('common.loading') }}…</div>
      </ng-container>

      <ng-container *ngIf="state.hasError()">
        <div class="onboarding-hub__error" role="alert">
          <span class="onboarding-hub__error-icon">⚠</span>
          <span>{{ state.error() }}</span>
        </div>
      </ng-container>

      <ng-container *ngIf="!state.loading() && !state.hasError()">
        <ng-container *ngIf="state.isEmpty()">
          <div class="onboarding-hub__empty">
            <p>{{ i18n.translate('onboarding.hub.noSessions') }}</p>
          </div>
        </ng-container>

        <ng-container *ngIf="state.session() as session">
          <section class="onboarding-hub__session">
            <h2>{{ i18n.translate('onboarding.hub.currentSession') }}</h2>
            <div class="onboarding-hub__session-meta">
              <span class="onboarding-hub__status" [attr.data-status]="session.status">{{ session.status }}</span>
              <span *ngIf="session.organizationName" class="onboarding-hub__org">{{ session.organizationName }}</span>
            </div>

            <div class="onboarding-hub__stages" *ngIf="state.stages().length > 0">
              <h3>{{ i18n.translate('onboarding.hub.stages') }}</h3>
              <ul>
                <li *ngFor="let stage of state.stages()" [class.completed]="stage.isCompleted">
                  <span class="stage-name">{{ stage.stageName }}</span>
                  <span class="stage-status" *ngIf="stage.isCompleted">✓</span>
                  <span class="stage-status" *ngIf="stage.isLocked">🔒</span>
                </li>
              </ul>
            </div>

            <div class="onboarding-hub__readiness" *ngIf="state.readinessPercent() > 0">
              <span>{{ i18n.translate('onboarding.hub.readiness') }}: {{ state.readinessPercent() }}%</span>
            </div>

            <div class="onboarding-hub__provisioning" *ngIf="state.isProvisioning()">
              <p>{{ i18n.translate('onboarding.hub.provisioningInProgress') }}</p>
              <span *ngIf="state.provisioningStatus()">{{ state.provisioningStatus() }}</span>
            </div>
          </section>
        </ng-container>

        <section class="onboarding-hub__dashboard" *ngIf="dashboard">
          <h2>{{ i18n.translate('onboarding.hub.overview') }}</h2>
          <div class="onboarding-hub__stats">
            <div class="stat">
              <span class="stat-value">{{ dashboard.totalSessions }}</span>
              <span class="stat-label">{{ i18n.translate('onboarding.hub.totalSessions') }}</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ dashboard.activeProvisioningJobs }}</span>
              <span class="stat-label">{{ i18n.translate('onboarding.hub.activeJobs') }}</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ dashboard.failedProvisioningJobs }}</span>
              <span class="stat-label">{{ i18n.translate('onboarding.hub.failedJobs') }}</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ dashboard.stuckSessionCount }}</span>
              <span class="stat-label">{{ i18n.translate('onboarding.hub.stuckSessions') }}</span>
            </div>
          </div>
        </section>
      </ng-container>
    </div>
  `,
})
export class OnboardingHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  readonly state = inject(OnboardingState);
  readonly i18n = inject(I18nService);
  private readonly api = inject(OnboardingApiService);
  dashboard: OnboardingDashboardContract | null = null;

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.state.setLoading(true);
    this.api.getAdminDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.state.setLoading(false);
      },
      error: (err) => {
        this.state.setError(err?.error?.message ?? 'Failed to load onboarding dashboard');
        this.state.setLoading(false);
      },
    });
  }
}
