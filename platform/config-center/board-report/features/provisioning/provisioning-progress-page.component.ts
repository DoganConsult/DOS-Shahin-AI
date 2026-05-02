import { Component, OnDestroy, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subject, switchMap, takeUntil, startWith, catchError, of } from 'rxjs';

import { ProvisioningApiService } from './services/provisioning-api.service';
import { ProvisioningStatusResponse } from '../../../../core/models/provisioning.models';
import { StorageService } from '@app/infrastructure';

const STEP_LABELS: Record<string, { en: string; ar: string }> = {
  seed_workspace_profile: { en: 'Configure workspace profile', ar: 'إعداد ملف مساحة العمل' },
  seed_workspace_seed_record: { en: 'Save workspace blueprint', ar: 'حفظ مخطط مساحة العمل' },
  seed_content_packs: { en: 'Install content packs', ar: 'تثبيت حزم المحتوى' },
  seed_role_profiles: { en: 'Create role profiles', ar: 'إنشاء ملفات الأدوار' },
  seed_dashboard_layouts: { en: 'Set up dashboards', ar: 'إعداد لوحات التحكم' },
  seed_workflow_templates: { en: 'Activate workflows', ar: 'تفعيل مسارات العمل' },
  seed_integrations_plan: { en: 'Prepare integrations', ar: 'تجهيز التكاملات' },
  'seed_90_day_plan': { en: 'Generate 90-day plan', ar: 'إنشاء خطة 90 يومًا' },
  install_shared_base_pack: { en: 'Install base pack', ar: 'تثبيت الحزمة الأساسية' },
  seed_role_pack: { en: 'Seed roles', ar: 'تهيئة الأدوار' },
  seed_dashboard_pack: { en: 'Seed dashboards', ar: 'تهيئة لوحات التحكم' },
  seed_workflow_pack: { en: 'Seed workflows', ar: 'تهيئة مسارات العمل' },
  install_agrc_pack: { en: 'Install AGRC pack', ar: 'تثبيت حزمة الحوكمة' },
  install_qiyas_pack: { en: 'Install Qiyas pack', ar: 'تثبيت حزمة قياس' },
  run_integrity_checks: { en: 'Run integrity checks', ar: 'تشغيل فحوصات السلامة' },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-provisioning-progress-page',
    imports: [CommonModule],
    template: `
    <div class="provisioning-page">
      <div class="provisioning-card">
        <!-- Header -->
        <div class="card-header">
          <div class="header-icon" [class.done]="isDone()" [class.failed]="isFailed()">
            <span *ngIf="!isDone() && !isFailed()" class="spinner"></span>
            <span *ngIf="isDone()">✓</span>
            <span *ngIf="isFailed()">✗</span>
          </div>
          <h1>{{ isDone()
            ? (lang() === 'ar' ? 'اكتمل التهيئة' : 'Provisioning Complete')
            : isFailed()
              ? (lang() === 'ar' ? 'فشل التهيئة' : 'Provisioning Failed')
              : (lang() === 'ar' ? 'جارٍ تهيئة مساحة العمل...' : 'Setting up your workspace...') }}</h1>
          <p class="subtitle" *ngIf="!isDone() && !isFailed()">
            {{ lang() === 'ar'
              ? 'نقوم بتجهيز الأدوار والأطر ولوحات التحكم ومسارات العمل.'
              : 'Installing modules, roles, dashboards, and workflows for your organization.' }}
          </p>
        </div>

        <!-- Progress bar -->
        <div class="progress-section">
          <div class="progress-meta">
            <span>{{ lang() === 'ar' ? 'التقدم' : 'Progress' }}</span>
            <span>{{ percent() }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill"
              [class.fill-done]="isDone()"
              [class.fill-failed]="isFailed()"
              [style.width.%]="percent()"></div>
          </div>
        </div>

        <!-- Steps -->
        <div class="steps-list" *ngIf="status()?.steps?.length">
          <div class="step-row" *ngFor="let step of status()?.steps"
            [class.step-completed]="step.status === 'completed'"
            [class.step-running]="step.status === 'running'"
            [class.step-failed]="step.status === 'failed'">
            <div class="step-icon">
              <span *ngIf="step.status === 'completed'">✓</span>
              <span *ngIf="step.status === 'running'" class="dot-pulse"></span>
              <span *ngIf="step.status === 'failed'">✗</span>
              <span *ngIf="step.status === 'pending'">○</span>
            </div>
            <div class="step-label">{{ stepLabel(step.name) }}</div>
            <div class="step-error" *ngIf="step.errorMessage">{{ step.errorMessage }}</div>
          </div>
        </div>

        <!-- Error message -->
        <div class="error-banner" role="alert" aria-live="polite" *ngIf="status()?.job?.errorMessage">
          {{ status()?.job?.errorMessage }}
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn-primary" *ngIf="isDone()" (click)="continueToWorkspace()">
            {{ lang() === 'ar' ? 'ابدأ الاستخدام' : 'Enter Workspace' }}
          </button>
          <button class="btn-secondary" *ngIf="isFailed()" (click)="goToSupport()">
            {{ lang() === 'ar' ? 'تواصل مع الدعم' : 'Contact Support' }}
          </button>
        </div>

        <div class="poll-note" *ngIf="!isDone() && !isFailed()">
          {{ lang() === 'ar' ? 'يتم التحديث تلقائيًا...' : 'Auto-refreshing...' }}
        </div>
      </div>
    </div>
  `,
    styles: [`
    .provisioning-page { display: flex; justify-content: center; align-items: center; min-height: 85vh; padding: 24px; background: var(--surface-ice); }
    .provisioning-card { max-width: 580px; width: 100%; background: #fff; border-radius: var(--radius-xl); border: 1.5px solid var(--border-subtle); box-shadow: 0 4px 24px rgba(var(--color-black-rgb), 0.06); padding: 48px 36px; }
    .card-header { text-align: center; margin-bottom: 28px; }
    .header-icon { width: 56px; height: 56px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: var(--font-size-2xl); font-weight: 700; background: var(--status-info-bg, #edf5ff); color: var(--primary); border: 2px solid #bae6fd; }
    .header-icon.done { background: var(--status-success-bg, #defbe6); color: var(--success); border-color: #86efac; }
    .header-icon.failed { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: #fca5a5; }
    .spinner { width: 24px; height: 24px; border: 3px solid var(--border-subtle); border-top-color: var(--primary); border-radius: var(--radius-pill); animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); margin: 0 0 6px; }
    .subtitle { color: var(--text-muted); font-size: var(--font-size-base); margin: 0; }
    .progress-section { margin-bottom: 24px; }
    .progress-meta { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 6px; }
    .progress-track { height: 8px; background: var(--border-subtle); border-radius: var(--radius); overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary)); border-radius: var(--radius); transition: width 0.5s ease; }
    .progress-fill.fill-done { background: var(--success); }
    .progress-fill.fill-failed { background: var(--error); }
    .steps-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 24px; }
    .step-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radius); font-size: var(--font-size-base); color: var(--text-muted); }
    .step-row.step-completed { color: var(--success); }
    .step-row.step-running { color: var(--primary); font-weight: 600; background: var(--status-info-bg, #edf5ff); }
    .step-row.step-failed { color: var(--error); background: var(--status-danger-bg, #fff1f1); }
    .step-icon { width: 20px; text-align: center; font-weight: 700; flex-shrink: 0; }
    .dot-pulse { display: inline-block; width: 8px; height: 8px; background: var(--primary); border-radius: var(--radius-pill); animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    .step-label { flex: 1; }
    .step-error { font-size: var(--font-size-sm); color: var(--error); }
    .error-banner { background: var(--status-danger-bg, #fff1f1); border: 1px solid #fca5a5; border-radius: var(--radius-md); padding: 12px 16px; color: #991b1b; font-size: var(--font-size-sm); margin-bottom: 20px; }
    .actions { display: flex; justify-content: center; gap: 12px; }
    .btn-primary { padding: 12px 32px; border-radius: var(--radius-md); border: none; background: linear-gradient(135deg, var(--primary), var(--primary)); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-secondary { padding: 12px 24px; border-radius: var(--radius-md); border: 1.5px solid #cbd5e1; background: transparent; color: #475569; cursor: pointer; font-weight: 500; }
    .poll-note { text-align: center; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 16px; }
  `]
})
export class ProvisioningProgressPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ProvisioningApiService);
  private _storage = inject(StorageService);
  private destroy$ = new Subject<void>();

  readonly status = signal<ProvisioningStatusResponse | null>(null);
  readonly percent = computed(() => this.status()?.job?.percent ?? 0);
  readonly lang = signal<'en' | 'ar'>(
    (typeof localStorage !== 'undefined' && this._storage.get('grc_lang') as 'en' | 'ar') || 'en'
  );

  isDone() { return this.status()?.job?.status === 'completed'; }
  isFailed() { return this.status()?.job?.status === 'failed'; }

  stepLabel(name: string): string {
    const entry = STEP_LABELS[name];
    if (!entry) return name.replace(/_/g, ' ');
    return this.lang() === 'ar' ? entry.ar : entry.en;
  }

  ngOnInit(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId') || this._storage.get('grc_tenant_id') || '';
    const jobId = this.route.snapshot.paramMap.get('jobId') || this._storage.get('grc_provisioning_job_id') || '';
    if (!tenantId || !jobId) return;

    interval(2000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.getStatus(tenantId, jobId).pipe(catchError(() => of(null)))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        if (!result) return;
        this.status.set(result);

        if (result.job.status === 'completed' || result.job.status === 'failed') {
          this.destroy$.next();
          this.destroy$.complete();
        }
      });
  }

  continueToWorkspace() {
    this.router.navigateByUrl('/');
  }

  goToSupport() {
    this.router.navigateByUrl('/support');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
