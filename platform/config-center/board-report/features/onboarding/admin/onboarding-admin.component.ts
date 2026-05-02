import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { OnboardingApiService } from '../services/onboarding-api.service';
import type { OnboardingDashboardContract } from '../contracts/onboarding.contracts';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  selector: 'app-onboarding-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="onboarding-admin" [dir]="i18n.direction()">
      <h2>{{ i18n.translate('onboarding.admin.title') }}</h2>

      <section class="onboarding-admin__stuck" *ngIf="stuckSessions.length > 0">
        <h3>{{ i18n.translate('onboarding.admin.stuckSessions') }} ({{ stuckSessions.length }})</h3>
        <table>
          <thead><tr>
            <th>{{ i18n.translate('onboarding.admin.sessionId') }}</th>
            <th>{{ i18n.translate('onboarding.admin.status') }}</th>
            <th>{{ i18n.translate('onboarding.admin.updated') }}</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let s of stuckSessions">
              <td>{{ s['id'] }}</td>
              <td>{{ s['status'] }}</td>
              <td>{{ s['updated_at'] }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="onboarding-admin__overview">
        <h3>{{ i18n.translate('onboarding.admin.overview') }}</h3>
        <div *ngIf="loading">{{ i18n.translate('common.loading') }}…</div>
        <div *ngIf="error" class="error" role="alert">{{ error }}</div>
        <div *ngIf="!loading && !error && dashboard">
          <p>{{ i18n.translate('onboarding.admin.totalSessions') }}: {{ dashboard.totalSessions }}</p>
          <p>{{ i18n.translate('onboarding.admin.activeProvisioning') }}: {{ dashboard.activeProvisioningJobs }}</p>
          <p>{{ i18n.translate('onboarding.admin.failedProvisioning') }}: {{ dashboard.failedProvisioningJobs }}</p>
          <p>{{ i18n.translate('onboarding.admin.stuckCount') }}: {{ dashboard.stuckSessionCount }}</p>
        </div>
      </section>

      <section class="onboarding-admin__stage-rates" *ngIf="dashboard?.stageCompletionRates?.length">
        <h3>{{ i18n.translate('onboarding.admin.stageRates') }}</h3>
        <table>
          <thead><tr>
            <th>{{ i18n.translate('onboarding.admin.stage') }}</th>
            <th>{{ i18n.translate('onboarding.admin.started') }}</th>
            <th>{{ i18n.translate('onboarding.admin.completed') }}</th>
            <th>{{ i18n.translate('onboarding.admin.rate') }}</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let s of dashboard!.stageCompletionRates">
              <td>{{ s.stageCode }}</td>
              <td>{{ s.started }}</td>
              <td>{{ s.completed }}</td>
              <td>{{ s.completionRate }}%</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
})
export class OnboardingAdminComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(OnboardingApiService);
  readonly i18n = inject(I18nService);
  loading = false;
  error: string | null = null;
  dashboard: OnboardingDashboardContract | null = null;
  stuckSessions: GrcRecord[] = [];

  ngOnInit(): void {
    this.loading = true;
    this.api.getAdminDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => { this.dashboard = data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Failed to load'; this.loading = false; },
    });
    this.api.getStuckSessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => { this.stuckSessions = (data.data ?? []) as GrcRecord[]; },
      error: (e: unknown) => devError('[onboarding-admin] stuck sessions', e),
    });
  }
}
