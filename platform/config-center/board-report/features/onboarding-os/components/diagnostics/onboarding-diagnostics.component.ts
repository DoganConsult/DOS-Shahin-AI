import { Component, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { OnboardingApiService, SessionDiagnostics, ProvisioningDiagnostics, DependencyCheck } from '../../services/onboarding-api.service';

@Component({
  selector: 'app-onboarding-diagnostics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule, ButtonModule, ProgressBarModule],
  template: `
    <div class="diag" [class.rtl]="lang === 'ar'">
      <div class="diag-header">
        <i class="pi pi-search"></i>
        <h3>{{ lang === 'ar' ? 'تشخيص الجلسة' : 'Session Diagnostics' }}</h3>
        <button pButton icon="pi pi-refresh" class="p-button-sm p-button-text" (click)="refresh()" [loading]="loading()"></button>
      </div>

      <div class="diag-section" *ngIf="sessionDiag()">
        <div class="diag-row">
          <span class="diag-label">{{ lang === 'ar' ? 'الحالة' : 'Status' }}</span>
          <p-tag [value]="sessionDiag()!.sessionStatus" [severity]="statusSeverity(sessionDiag()!.sessionStatus)" />
        </div>
        <div class="diag-row">
          <span class="diag-label">{{ lang === 'ar' ? 'البريد محقق' : 'Email Verified' }}</span>
          <p-tag [value]="sessionDiag()!.emailVerified ? 'Yes' : 'No'" [severity]="sessionDiag()!.emailVerified ? 'success' : 'warning'" />
        </div>
        <div class="diag-row">
          <span class="diag-label">{{ lang === 'ar' ? 'صحة التزويد' : 'Provisioning Health' }}</span>
          <p-tag [value]="sessionDiag()!.provisioningHealth" [severity]="healthSeverity(sessionDiag()!.provisioningHealth)" />
        </div>
        <div class="diag-row" *ngIf="sessionDiag()!.lastFailureReason">
          <span class="diag-label">{{ lang === 'ar' ? 'آخر خطأ' : 'Last Failure' }}</span>
          <code class="diag-error">{{ sessionDiag()!.lastFailureReason }}</code>
        </div>
        <div class="diag-row" *ngIf="sessionDiag()!.failedStepCodes.length > 0">
          <span class="diag-label">{{ lang === 'ar' ? 'خطوات فاشلة' : 'Failed Steps' }}</span>
          <span class="diag-chips">
            <span *ngFor="let code of sessionDiag()!.failedStepCodes" class="diag-chip diag-chip--error">{{ code }}</span>
          </span>
        </div>
        <div class="diag-row" *ngIf="sessionDiag()!.correlationId">
          <span class="diag-label">{{ lang === 'ar' ? 'معرف الارتباط' : 'Correlation ID' }}</span>
          <code>{{ sessionDiag()!.correlationId }}</code>
        </div>
      </div>

      <div class="diag-section" *ngIf="provDiag()">
        <h4>{{ lang === 'ar' ? 'خطوات التزويد' : 'Provisioning Steps' }}</h4>
        <div *ngFor="let step of provDiag()!.steps" class="diag-step">
          <span class="diag-step-code">{{ step.stepCode }}</span>
          <p-tag [value]="step.status" [severity]="stepSeverity(step.status)" />
          <span *ngIf="step.durationMs" class="diag-step-dur">{{ step.durationMs }}ms</span>
          <small *ngIf="step.errorMessage" class="diag-step-err">{{ step.errorMessage }}</small>
        </div>
      </div>

      <div class="diag-section" *ngIf="deps().length > 0">
        <h4>{{ lang === 'ar' ? 'فحص التبعيات' : 'Dependency Checks' }}</h4>
        <div *ngFor="let dep of deps()" class="diag-dep">
          <span class="diag-dep-name">{{ dep.name }}</span>
          <p-tag [value]="dep.status" [severity]="dep.status === 'ok' ? 'success' : dep.status === 'degraded' ? 'warning' : 'danger'" />
          <small *ngIf="dep.detail" class="diag-dep-detail">{{ dep.detail }}</small>
        </div>
      </div>

      <div class="diag-empty" *ngIf="!sessionDiag() && !loading()">
        {{ lang === 'ar' ? 'لا توجد بيانات تشخيصية' : 'No diagnostics data available' }}
      </div>
    </div>
  `,
  styles: [`
    .diag { padding: 1rem; font-size: var(--font-size-sm, 0.875rem); }
    .diag-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .diag-header h3 { margin: 0; font-size: var(--font-size-md, 1rem); flex: 1; }
    .diag-section { margin-bottom: 1rem; padding: 0.75rem; border-radius: var(--border-radius, 8px); background: var(--surface-ground, #f8f9fa); }
    .diag-section h4 { margin: 0 0 0.5rem; font-size: var(--font-size-sm, 0.875rem); color: var(--text-color-secondary); }
    .diag-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }
    .diag-label { font-weight: 600; min-width: 120px; color: var(--text-color-secondary); }
    .diag-error { color: var(--error, #dc3545); font-size: 0.75rem; word-break: break-all; }
    .diag-chips { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .diag-chip { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .diag-chip--error { background: var(--red-50, #fef2f2); color: var(--error, #dc3545); }
    .diag-step { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }
    .diag-step-code { font-family: monospace; font-size: 0.75rem; min-width: 160px; }
    .diag-step-dur { font-size: 0.7rem; color: var(--text-color-secondary); }
    .diag-step-err { color: var(--error, #dc3545); font-size: 0.7rem; }
    .diag-dep { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }
    .diag-dep-name { font-weight: 500; min-width: 150px; }
    .diag-dep-detail { color: var(--text-color-secondary); font-size: 0.75rem; }
    .diag-empty { text-align: center; color: var(--text-color-secondary); padding: 2rem; }
    .rtl { direction: rtl; }
  `]
})
export class OnboardingDiagnosticsComponent implements OnChanges {
  @Input() sessionId: string | null = null;
  @Input() lang: 'en' | 'ar' = 'en';

  sessionDiag = signal<SessionDiagnostics | null>(null);
  provDiag = signal<ProvisioningDiagnostics | null>(null);
  deps = signal<DependencyCheck[]>([]);
  loading = signal(false);

  constructor(private readonly api: OnboardingApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessionId'] && this.sessionId) {
      this.refresh();
    }
  }

  refresh(): void {
    if (!this.sessionId) return;
    this.loading.set(true);
    const sid = this.sessionId;

    this.api.getSessionDiagnostics(sid).subscribe({
      next: (data) => this.sessionDiag.set(data),
      error: () => this.sessionDiag.set(null),
    });

    this.api.getProvisioningDiagnostics(sid).subscribe({
      next: (data) => this.provDiag.set(data),
      error: () => this.provDiag.set(null),
    });

    this.api.getDependencyChecks(sid).subscribe({
      next: (data) => { this.deps.set(data); this.loading.set(false); },
      error: () => { this.deps.set([]); this.loading.set(false); },
    });
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    if (['active', 'provisioned'].includes(status)) return 'success';
    if (['failed', 'cancelled'].includes(status)) return 'danger';
    if (['review_blocked'].includes(status)) return 'warning';
    return 'info';
  }

  healthSeverity(health: string): 'success' | 'info' | 'warning' | 'danger' {
    if (health === 'healthy') return 'success';
    if (health === 'failed') return 'danger';
    if (health === 'partial') return 'warning';
    return 'info';
  }

  stepSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'running') return 'info';
    return 'warning';
  }
}
