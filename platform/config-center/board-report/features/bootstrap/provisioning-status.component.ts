import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { StorageService, I18nService } from '@app/infrastructure';
import { SessionService } from '../../../../dauth/session/session.service';
import { GrcRecord } from '@app/core/models/shared.types';

export interface InferenceSummary {
  regulators?: { regulatorId: string; reason: string }[];
  frameworks?: {
    mandatory: { instrumentId: string; nameEn: string; reason: string }[];
    recommended: { instrumentId: string; nameEn: string; reason: string }[];
    valueAdded: { instrumentId: string; nameEn: string; reason: string }[];
  };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-provisioning-status',
    imports: [CommonModule],
    template: `
    <div class="provisioning-container">
      <div class="status-card">
        <div class="spinner" *ngIf="!done()"></div>
        <div class="done-icon" *ngIf="done()">✅</div>

        <h1>{{ done() ? t('titleComplete') : t('titleProgress') }}</h1>
        <p class="subtitle" *ngIf="!done()">{{ t('subtitleProgress') }}</p>
        <p class="subtitle" *ngIf="done()">{{ t('subtitleComplete') }}</p>

        <div class="inference-card" *ngIf="inferenceSummary() as summary">
          <h3>{{ t('whyRegulatorsFrameworks') }}</h3>
          <p class="inference-desc">{{ t('whyDesc') }}</p>
          <div class="inference-regulators" *ngIf="summary.regulators?.length">
            <h4>{{ t('regulators') }}</h4>
            <ul>
              <li *ngFor="let r of summary.regulators"><strong>{{ r.regulatorId }}</strong><span *ngIf="r.reason"> — {{ r.reason }}</span></li>
            </ul>
          </div>
          <div class="inference-frameworks" *ngIf="summary.frameworks">
            <h4>{{ t('frameworks') }}</h4>
            <div *ngIf="summary.frameworks.mandatory?.length">
              <span class="tier-label">{{ t('mandatory') }}</span>
              <ul>
                <li *ngFor="let f of summary.frameworks.mandatory"><strong>{{ f.nameEn }}</strong><span *ngIf="f.reason"> — {{ f.reason }}</span></li>
              </ul>
            </div>
            <div *ngIf="summary.frameworks.recommended?.length">
              <span class="tier-label">{{ t('recommended') }}</span>
              <ul>
                <li *ngFor="let f of summary.frameworks.recommended"><strong>{{ f.nameEn }}</strong><span *ngIf="f.reason"> — {{ f.reason }}</span></li>
              </ul>
            </div>
            <div *ngIf="summary.frameworks.valueAdded?.length">
              <span class="tier-label">{{ t('valueAdded') }}</span>
              <ul>
                <li *ngFor="let f of summary.frameworks.valueAdded"><strong>{{ f.nameEn }}</strong><span *ngIf="f.reason"> — {{ f.reason }}</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="step-list" *ngIf="steps().length > 0">
          <div class="step" *ngFor="let step of steps()" [class.completed]="step.status === 'completed'" [class.failed]="step.status === 'failed'" [class.running]="step.status === 'running'">
            <span class="step-icon">
              <span *ngIf="step.status === 'completed'">✓</span>
              <span *ngIf="step.status === 'running'">⟳</span>
              <span *ngIf="step.status === 'failed'">✗</span>
              <span *ngIf="step.status === 'queued' || step.status === 'pending'">○</span>
              <span *ngIf="step.status === 'skipped'">–</span>
            </span>
            <span class="step-name">{{ step.step_name || step.step_code }}</span>
          </div>
        </div>

        <button class="btn-primary" *ngIf="done()" (click)="goToBootstrap()">{{ t('continueSetup') }}</button>
        <div *ngIf="error()" class="error-banner">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
          <span *ngIf="correlationId()" class="correlation-row">
            <span class="correlation-label">{{ t('correlationId') || 'Correlation ID' }}:</span>
            <code>{{ correlationId() }}</code>
          </span>
          <button type="button" class="btn-retry" (click)="clearErrorAndRetry()"><i class="pi pi-refresh"></i> {{ t('retry') || 'Retry' }}</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .provisioning-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 24px; }
    .status-card { max-width: 560px; width: 100%; text-align: center; padding: 48px 32px; border-radius: var(--radius-xl); background: #fff; border: 1.5px solid var(--border-subtle); box-shadow: 0 4px 24px rgba(var(--color-black-rgb), 0.06); }
    .spinner { width: 48px; height: 48px; border: 4px solid var(--border-subtle); border-top-color: var(--primary); border-radius: var(--radius-pill); animation: spin 1s linear infinite; margin: 0 auto 24px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .done-icon { font-size: var(--font-size-6xl); margin-bottom: 16px; }
    h1 { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); margin-bottom: 8px; }
    .subtitle { color: var(--text-muted); margin-bottom: 24px; }
    .step-list { text-align: start; margin: 0 auto 24px; max-width: 360px; }
    .step { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: var(--font-size-base); color: #475569; }
    .step.completed { color: var(--success); }
    .step.failed { color: var(--error); }
    .step.running { color: var(--primary); font-weight: 600; }
    .step-icon { width: 18px; text-align: center; font-weight: 700; }
    .btn-primary { padding: 12px 32px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .error-banner { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 16px; background: var(--red-50, rgba(var(--module-accent-red-rgb), 0.06)); border: 1px solid var(--red-200, rgba(var(--module-accent-red-rgb), 0.2)); border-radius: var(--radius); color: var(--red-700, #b91c1c); font-size: var(--font-size-sm); text-align: center; }
    .error-banner .correlation-row { display: inline-flex; align-items: center; gap: 6px; }
    .error-banner .correlation-label { font-weight: 600; }
    .error-banner code { background: var(--surface-100); padding: 2px 8px; border-radius: var(--radius); font-size: var(--font-size-tag); }
    .error-banner .btn-retry { display: inline-flex; align-items: center; gap: 6px; background: var(--red-100, rgba(var(--module-accent-red-rgb), 0.1)); border: 1px solid var(--red-300); color: var(--red-700); padding: 6px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }
    .error-banner .btn-retry:hover { background: var(--red-200); }
    .inference-card { text-align: start; margin: 0 auto 24px; max-width: 480px; padding: 16px; border-radius: var(--radius); background: var(--surface-50, #f8fafc); border: 1px solid var(--border-subtle); }
    .inference-card h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--text-heading); margin: 0 0 8px; }
    .inference-desc { color: var(--text-muted); font-size: var(--font-size-sm); margin: 0 0 12px; }
    .inference-card h4 { font-size: var(--font-size-base); font-weight: 600; margin: 12px 0 6px; color: var(--text-heading); }
    .inference-card ul { margin: 0; padding-left: 20px; color: var(--text-muted); font-size: var(--font-size-sm); }
    .inference-card li { margin-bottom: 4px; }
    .tier-label { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--primary); margin-top: 8px; }
  `]
})
export class ProvisioningStatusComponent implements OnInit, OnDestroy {
  private _storage = inject(StorageService);
  private _i18n = inject(I18nService);
  private _auth = inject(SessionService);
  steps = signal<GrcRecord[]>([]);
  done = signal(false);
  error = signal<string | null>(null);
  correlationId = signal<string | null>(null);
  inferenceSummary = signal<InferenceSummary | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private http: HttpClient, private router: Router) {}

  t(key: string): string {
    return this._i18n.translate(`provisioning.status.${key}`) ?? key;
  }

  ngOnInit() {
    if (!this._auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const raw = this._storage.get('grc_inference_summary');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as InferenceSummary;
        if (parsed && (parsed.regulators?.length || parsed.frameworks)) {
          this.inferenceSummary.set(parsed);
        }
      } catch { /* ignore */ }
    }
    this.poll();
  }

  clearErrorAndRetry(): void {
    this.error.set(null);
    this.correlationId.set(null);
    this.poll();
  }

  poll() {
    const jobId = this._storage.get('grc_provisioning_job_id');
    const storedTenantId = this._storage.get('grc_tenant_id');
    const sessionTenantId = this._storage.get('grc_tenantId');
    // Validate tenant ownership — only poll for the user's own tenant
    const tenantId = storedTenantId && storedTenantId === sessionTenantId ? storedTenantId : sessionTenantId;
    if (!jobId) {
      this.error.set(this.t('noJob'));
      this.correlationId.set(null);
      return;
    }

    // Tenant-schema jobs (e.g. build-workspace) require status API with tenantId
    const url = tenantId
      ? `${environment.apiUrl}/provisioning/status/${encodeURIComponent(tenantId)}/${encodeURIComponent(jobId)}`
      : `${environment.apiUrl}/provisioning/${jobId}`;

    this.http.get<{ steps?: Record<string, unknown>[]; job?: Record<string, unknown> }>(url).subscribe({
      next: (res) => {
        const rawSteps = (res.steps ?? []) as Record<string, unknown>[];
        const steps = rawSteps.map((s) => ({
          step_name: (s['name'] ?? s['step_name']) as string,
          step_code: (s['step_code'] ?? s['name']) as string,
          status: s['status'] as string,
        }));
        this.steps.set(steps);
        const job = (res.job ?? {}) as Record<string, unknown>;
        const summaryJson = (job['summary_json'] ?? {}) as Record<string, unknown>;
        const status = ((job['job_status'] ?? job['status'] ?? '') as string).toLowerCase();
        if (status === 'completed') {
          this.done.set(true);
          clearInterval(this.pollTimer);
        } else if (status === 'failed') {
          this.error.set((job['errorMessage'] ?? summaryJson['error'] ?? this.t('failed')) as string);
          this.correlationId.set((job['correlationId'] ?? job['correlation_id'] ?? null) as string | null);
          clearInterval(this.pollTimer);
        } else {
          if (!this.pollTimer) {
            this.pollTimer = setInterval(() => this.poll(), 3000);
          }
        }
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? this.t('fetchError'));
        this.correlationId.set(err?.error?.correlationId ?? err?.error?.correlation_id ?? null);
      },
    });
  }

  goToBootstrap() {
    this._storage.remove('grc_inference_summary');
    this.router.navigateByUrl('/bootstrap');
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

}
