import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { OnboardingApiService, ProvisioningDiagnostics } from '../../services/onboarding-api.service';

@Component({
  selector: 'app-onboarding-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule, ButtonModule],
  template: `
    <div class="admin" [class.rtl]="lang === 'ar'">
      <div class="admin-header">
        <i class="pi pi-cog"></i>
        <h3>{{ lang === 'ar' ? 'إدارة الجلسة' : 'Session Admin' }}</h3>
      </div>

      <div class="admin-actions" *ngIf="sessionId">
        <button pButton [label]="lang === 'ar' ? 'تحميل التشخيص' : 'Load Diagnostics'"
          icon="pi pi-search" class="p-button-sm p-button-outlined"
          [loading]="loading()" (click)="loadDiagnostics()"></button>
      </div>

      <div class="admin-diag" *ngIf="provDiag()">
        <div class="admin-diag-header">
          <span>{{ lang === 'ar' ? 'الوظيفة' : 'Job' }}: <code>{{ provDiag()!.jobId ?? '—' }}</code></span>
          <div class="admin-diag-badges">
            <p-tag *ngIf="provDiag()!.retryEligible" value="Retry Eligible" severity="warning" />
            <p-tag *ngIf="provDiag()!.cancelEligible" value="Cancel Eligible" severity="info" />
          </div>
        </div>

        <div class="admin-steps" *ngIf="provDiag()!.steps.length > 0">
          <div *ngFor="let step of provDiag()!.steps" class="admin-step">
            <code class="admin-step-code">{{ step.stepCode }}</code>
            <p-tag [value]="step.status" [severity]="stepSeverity(step.status)" />
            <small *ngIf="step.errorMessage" class="admin-step-err">{{ step.errorMessage }}</small>
          </div>
        </div>

        <div class="admin-recovery" *ngIf="provDiag()!.jobId">
          <button pButton *ngIf="provDiag()!.retryEligible"
            [label]="lang === 'ar' ? 'إعادة المحاولة' : 'Retry Job'"
            icon="pi pi-refresh" severity="warning" class="p-button-sm"
            [loading]="retrying()" (click)="retry()"></button>
          <button pButton *ngIf="provDiag()!.cancelEligible"
            [label]="lang === 'ar' ? 'إلغاء الوظيفة' : 'Cancel Job'"
            icon="pi pi-times" severity="danger" class="p-button-sm p-button-outlined"
            [loading]="cancelling()" (click)="cancel()"></button>
        </div>
      </div>

      <div class="admin-message" *ngIf="message()">
        <p-tag [value]="message()!" [severity]="messageSeverity()" />
      </div>

      <div class="admin-empty" *ngIf="!provDiag() && !loading()">
        {{ lang === 'ar' ? 'حدد جلسة لعرض أدوات الإدارة' : 'Select a session to view admin tools' }}
      </div>
    </div>
  `,
  styles: [`
    .admin { padding: 1rem; font-size: var(--font-size-sm, 0.875rem); }
    .admin-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .admin-header h3 { margin: 0; font-size: var(--font-size-md, 1rem); }
    .admin-actions { margin-bottom: 1rem; }
    .admin-diag { padding: 0.75rem; border-radius: var(--border-radius, 8px); background: var(--surface-ground, #f8f9fa); }
    .admin-diag-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .admin-diag-badges { display: flex; gap: 0.25rem; }
    .admin-steps { margin: 0.5rem 0; }
    .admin-step { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; }
    .admin-step-code { font-size: 0.75rem; min-width: 150px; }
    .admin-step-err { color: var(--error, #dc3545); font-size: 0.7rem; }
    .admin-recovery { display: flex; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--surface-border); }
    .admin-message { margin-top: 0.75rem; }
    .admin-empty { text-align: center; color: var(--text-color-secondary); padding: 2rem; }
    .rtl { direction: rtl; }
  `]
})
export class OnboardingAdminComponent {
  @Input() sessionId: string | null = null;
  @Input() lang: 'en' | 'ar' = 'en';

  provDiag = signal<ProvisioningDiagnostics | null>(null);
  loading = signal(false);
  retrying = signal(false);
  cancelling = signal(false);
  message = signal<string | null>(null);

  constructor(private readonly api: OnboardingApiService) {}

  loadDiagnostics(): void {
    if (!this.sessionId) return;
    this.loading.set(true);
    this.message.set(null);
    this.api.getProvisioningDiagnostics(this.sessionId).subscribe({
      next: (data) => { this.provDiag.set(data); this.loading.set(false); },
      error: () => { this.message.set('Failed to load diagnostics'); this.loading.set(false); },
    });
  }

  retry(): void {
    const jobId = this.provDiag()?.jobId;
    if (!jobId) return;
    this.retrying.set(true);
    this.message.set(null);
    this.api.retryProvisioningJob(jobId).subscribe({
      next: () => { this.message.set('Retry initiated'); this.retrying.set(false); this.loadDiagnostics(); },
      error: () => { this.message.set('Retry failed'); this.retrying.set(false); },
    });
  }

  cancel(): void {
    const jobId = this.provDiag()?.jobId;
    if (!jobId) return;
    this.cancelling.set(true);
    this.message.set(null);
    this.api.cancelProvisioningJob(jobId).subscribe({
      next: () => { this.message.set('Job cancelled'); this.cancelling.set(false); this.loadDiagnostics(); },
      error: () => { this.message.set('Cancel failed'); this.cancelling.set(false); },
    });
  }

  messageSeverity(): 'success' | 'danger' | 'info' {
    const m = this.message();
    if (m?.includes('failed') || m?.includes('Failed')) return 'danger';
    if (m?.includes('initiated') || m?.includes('cancelled')) return 'success';
    return 'info';
  }

  stepSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'running') return 'info';
    return 'warning';
  }
}
