import { Component, Input, inject, OnInit, OnChanges, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { OnboardingApiService } from '../services/onboarding-api.service';
import type { OnboardingDiagnosticsContract } from '../contracts/onboarding.contracts';
import { devError } from '../../../core/utils/dev-logger';

@Component({
  selector: 'app-onboarding-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onboarding-diagnostics" [dir]="i18n.direction()">
      <h2>{{ i18n.translate('onboarding.diagnostics.title') }}</h2>

      <div *ngIf="!sessionId" class="onboarding-diagnostics__prompt">
        <p>{{ i18n.translate('onboarding.diagnostics.prompt') }}</p>
        <input #inp type="text" [placeholder]="i18n.translate('onboarding.diagnostics.placeholder')" (keyup.enter)="loadDiagnostics(inp.value)" />
        <button (click)="loadDiagnostics(inp.value)">{{ i18n.translate('onboarding.diagnostics.diagnose') }}</button>
      </div>

      <div *ngIf="loading">{{ i18n.translate('common.loading') }}…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>

      <ng-container *ngIf="diag">
        <section>
          <h3>{{ i18n.translate('onboarding.diagnostics.session') }}: {{ diag.sessionId }}</h3>
          <p>{{ i18n.translate('onboarding.diagnostics.status') }}: <strong>{{ diag.sessionStatus }}</strong></p>
          <p>{{ i18n.translate('onboarding.diagnostics.emailVerified') }}: {{ diag.emailVerified ? (i18n.translate('common.yes')) : (i18n.translate('common.no')) }}</p>
          <p>{{ i18n.translate('onboarding.diagnostics.provisioningHealth') }}: <strong>{{ diag.provisioningHealth }}</strong></p>
          <p *ngIf="diag.lastFailureReason">{{ i18n.translate('onboarding.diagnostics.lastFailure') }}: {{ diag.lastFailureReason }}</p>
          <p>{{ i18n.translate('onboarding.diagnostics.retryCount') }}: {{ diag.retryCount }}</p>
        </section>

        <section *ngIf="diag.dependencyChecks?.length">
          <h3>{{ i18n.translate('onboarding.diagnostics.dependencyChecks') }}</h3>
          <ul>
            <li *ngFor="let dep of diag.dependencyChecks" [class]="dep.status">
              <strong>{{ dep.name }}</strong>: {{ dep.status }}
              <span *ngIf="dep.detail"> — {{ dep.detail }}</span>
            </li>
          </ul>
        </section>

        <section *ngIf="diag.failedStepCodes?.length">
          <h3>{{ i18n.translate('onboarding.diagnostics.failedSteps') }}</h3>
          <ul><li *ngFor="let code of diag.failedStepCodes">{{ code }}</li></ul>
        </section>
      </ng-container>
    </div>
  `,
})
export class OnboardingDiagnosticsComponent implements OnInit, OnChanges {
  @Input() sessionId: string | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(OnboardingApiService);
  readonly i18n = inject(I18nService);
  loading = false;
  error: string | null = null;
  diag: OnboardingDiagnosticsContract | null = null;

  ngOnInit(): void { if (this.sessionId) this.loadDiagnostics(this.sessionId); }
  ngOnChanges(): void { if (this.sessionId) this.loadDiagnostics(this.sessionId); }

  loadDiagnostics(id: string): void {
    if (!id?.trim()) return;
    this.sessionId = id.trim();
    this.loading = true;
    this.error = null;
    this.diag = null;
    this.api.getDiagnostics(this.sessionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => { this.diag = data; this.loading = false; },
      error: (err) => { devError('[onboarding-diagnostics]', err); this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
