import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/core/services/api-client.service';
import { EmptyStateComponent } from '@app/shared/components';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { StepsModule } from 'primeng/steps';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function asRecordArray(value: unknown): Record<string, any>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-provisioning-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    CardModule, TableModule, TagModule, ButtonModule,
    StepsModule, ProgressBarModule, AppDatePipe, TooltipModule],
  template: `
    <app-page-shell icon="server" [title]="i18n.translate('provisioning.title')"
      [subtitle]="i18n.translate('provisioning.subtitle')"
      [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('provisioning.breadcrumb')]" [loading]="loading">

      <!-- Summary stats -->
      <div class="grid mb-3">
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ jobs.length }}</div><div class="stat-label">{{ i18n.translate('provisioning.totalJobs') }}</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ runningCount }}</div><div class="stat-label">{{ i18n.translate('provisioning.running') }}</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ doneCount }}</div><div class="stat-label">{{ i18n.translate('provisioning.completed') }}</div></div></div>
        <div class="col-3"><div class="stat-box warn"><div class="stat-value">{{ failedCount }}</div><div class="stat-label">{{ i18n.translate('provisioning.failed') }}</div></div></div>
      </div>

      <!-- Detail view when a job is selected -->
      <p-card *ngIf="selectedJob" class="mb-3" [header]="i18n.translate('provisioning.jobDetail') + ': ' + (selectedJob.name || selectedJob.id)">
        <div class="mb-3 flex align-items-center gap-2">
          <p-tag [value]="selectedJob.status" [severity]="getJobSeverity(selectedJob.status)" />
          <span class="text-sm text-color-secondary">{{ i18n.translate('provisioning.lastUpdated') }} {{ selectedJob.updated_at | appDate:'medium' }}</span>
          <span class="flex-grow-1"></span>
          <p-button [label]="i18n.translate('provisioning.close')" icon="pi pi-times" [text]="true" (onClick)="selectedJob = null" />
        </div>

        <!-- 8-stage stepper -->
        <p-steps [model]="stageItems" [activeIndex]="activeStageIndex" [readonly]="true" styleClass="mb-3" />

        <div class="stages-grid">
          <div *ngFor="let stage of selectedJob.stages || []; let idx = index" class="stage-card" [class.stage-active]="idx === activeStageIndex">
            <div class="stage-header">
              <span class="stage-number">{{ idx + 1 }}</span>
              <span class="stage-name">{{ stage.name }}</span>
              <p-tag [value]="stage.status" [severity]="getStageSeverity(stage.status)" />
            </div>
            <div class="stage-body" *ngIf="stage.message">
              <span class="text-sm">{{ stage.message }}</span>
            </div>
            <div class="stage-actions" *ngIf="stage.status === 'FAILED'">
              <p-button [label]="i18n.translate('provisioning.retry')" icon="pi pi-refresh" severity="warning" size="small" (onClick)="retryStage(selectedJob.id, idx)" />
            </div>
          </div>
        </div>

        <div class="mt-3" *ngIf="selectedJob.status === 'FAILED'">
          <p-button [label]="i18n.translate('provisioning.retryJob')" icon="pi pi-refresh" severity="warning" (onClick)="retryJob(selectedJob.id)" />
        </div>
      </p-card>

      <!-- Jobs list -->
      <p-card>
        <p-table [attr.aria-label]="i18n.translate('provisioning.ariaJobsTable')" [value]="jobs" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" selectionMode="single" [(selection)]="selectedJob" (onRowSelect)="onJobSelect($event)">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('provisioning.colJobId') }}</th>
              <th>{{ i18n.translate('provisioning.colName') }}</th>
              <th>{{ i18n.translate('provisioning.colStatus') }}</th>
              <th>{{ i18n.translate('provisioning.colProgress') }}</th>
              <th>{{ i18n.translate('provisioning.colCreated') }}</th>
              <th>{{ i18n.translate('provisioning.colActions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-job let-rowIndex="rowIndex">
            <tr [pSelectableRow]="job" [pSelectableRowIndex]="rowIndex">
              <td><code>{{ job.id | slice:0:8 }}</code></td>
              <td>{{ job.name || job.tenant_name || i18n.translate('provisioning.defaultJobName') }}</td>
              <td><p-tag [value]="job.status" [severity]="getJobSeverity(job.status)" /></td>
              <td>
                <p-progressBar [value]="getJobProgress(job)" [showValue]="true" [style]="{'height':'10px'}" />
              </td>
              <td>{{ job.created_at | appDate:'short' }}</td>
              <td>
                <p-button icon="pi pi-eye" [text]="true" severity="info" (onClick)="viewJob(job)" [pTooltip]="i18n.translate('provisioning.viewDetails')" />
                <p-button *ngIf="job.status === 'FAILED'" icon="pi pi-refresh" [text]="true" severity="warning" (onClick)="retryJob(job.id)" [pTooltip]="i18n.translate('provisioning.retry')" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">
              <i class="pi pi-inbox" style="font-size:1.5rem; display:block; margin-bottom:8px"></i>
              {{ i18n.translate('provisioning.noJobs') }}
              <div class="mt-3">
                <p-button
                  [label]="i18n.translate('provisioning.seedBaseline')"
                  icon="pi pi-database"
                  severity="success"
                  [loading]="seeding"
                  (onClick)="seedBaseline()" />
              </div>
            </td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>
  `,
  styles: [`
    .stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius-sm); }
    .stat-value { font-size: 1.5rem; font-weight: var(--font-bold); color: var(--primary-color); }
    .stat-box.warn .stat-value { color: var(--orange-500); }
    .stat-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .stages-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    @media (max-width: 768px) { .stages-grid { grid-template-columns: repeat(2, 1fr); } }
    .stage-card { padding: 0.75rem; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-sm); }
    .stage-card.stage-active { border-color: var(--primary-color); box-shadow: 0 0 0 1px var(--primary-color); }
    .stage-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .stage-number { width: 24px; height: 24px; border-radius: var(--radius-pill); background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .stage-name { font-weight: 600; font-size: 0.85rem; flex: 1; }
    .stage-body { font-size: 0.8rem; color: var(--text-color-secondary); margin-bottom: 0.5rem; }
    .stage-actions { margin-top: 0.25rem; }
  `]
})
export class ProvisioningDashboardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];
  private pollSub?: Subscription;
  loading = false;

  jobs: Record<string, any>[] = [];
  selectedJob: Record<string, any> | null = null;
  activeStageIndex = 0;
  stageItems: MenuItem[] = [];

  runningCount = 0;
  doneCount = 0;
  failedCount = 0;
  seeding = false;

  private readonly defaultStages = [
    'Schema Creation', 'Table Setup', 'Seed Data', 'Framework Import',
    'Control Mapping', 'Role Assignment', 'Evidence Setup', 'Finalization'
  ];

  private api = inject(ApiClientService);
  constructor(public i18n: I18nService) {}

  ngOnInit(): void {
    this.loadJobs();
    this.pollSub = interval(10000).pipe(
      switchMap(() => this.api.get('/provisioning/jobs'))
    , takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d: Record<string, any>) => {
        this.jobs = asArray(d, 'jobs');
        this.updateStats();
        // Refresh selected job if still open
        if (this.selectedJob) {
          const updated = this.jobs.find((j: Record<string, any>) => j.id === this.selectedJob.id);
          if (updated) { this.selectedJob = updated; this.updateStageItems(); }
        }
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.pollSub?.unsubscribe();
  }

  private loadJobs(): void {
    this.loading = true;
    this.subs.push(
      this.api.get('/provisioning/jobs').subscribe({
        next: (d: Record<string, any>) => {
          this.jobs = asArray(d, 'jobs');
          this.updateStats();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      })
    );
  }

  private updateStats(): void {
    this.runningCount = this.jobs.filter((j: Record<string, any>) => j.status === 'RUNNING').length;
    this.doneCount = this.jobs.filter((j: Record<string, any>) => j.status === 'DONE' || j.status === 'COMPLETED').length;
    this.failedCount = this.jobs.filter((j: Record<string, any>) => j.status === 'FAILED').length;
  }

  getJobSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'DONE': case 'COMPLETED': return 'success';
      case 'RUNNING': return 'info';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'danger';
      default: return undefined;
    }
  }

  getStageSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'DONE': return 'success';
      case 'RUNNING': return 'info';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'danger';
      default: return undefined;
    }
  }

  getJobProgress(job: Record<string, any>): number {
    const stages = asRecordArray(job['stages']);
    if (!stages.length) {
      if (asString(job['status']) === 'DONE' || asString(job['status']) === 'COMPLETED') return 100;
      if (asString(job['status']) === 'RUNNING') return 50;
      return 0;
    }
    const done = stages.filter((s) => asString(s['status']) === 'DONE').length;
    return Math.round((done / stages.length) * 100);
  }

  viewJob(job: Record<string, any>): void {
    this.loading = true;
    this.api.get(`/provisioning/jobs/${asString(job['id'])}/status`).subscribe({
      next: (response: unknown) => {
        const d = asRecord(response);
        const stages = asRecordArray(d['steps']).map((step) => ({
          name: asString(step['name']),
          status: asString(step['status']),
          message: asString(step['message']) || undefined,
        }));
        this.selectedJob = {
          id: asString(d['jobId']),
          name: asString(job['name']) || this.i18n.translate('provisioning.defaultJobName'),
          status: asString(d['status']),
          percent: asNumber(d['percent']),
          stages,
          updated_at: asString(d['updatedAt']),
          created_at: asString(d['createdAt']),
        };
        if (!asRecordArray(this.selectedJob['stages']).length) {
          this.selectedJob['stages'] = this.defaultStages.map((name: string) => ({
            name,
            status: asString(this.selectedJob?.['status']) === 'DONE' ? 'DONE' : 'PENDING'
          }));
        }
        this.updateStageItems();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedJob = job;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onJobSelect(event: Record<string, any>): void {
    this.viewJob(asRecord(event['data']));
  }

  private updateStageItems(): void {
    const stages = asRecordArray(this.selectedJob?.['stages']);
    this.stageItems = stages.map((s, i) => ({
      label: asString(s['name']) || `Stage ${i + 1}`
    }));
    const firstActive = stages.findIndex((s) => asString(s['status']) !== 'DONE');
    this.activeStageIndex = firstActive >= 0 ? firstActive : stages.length - 1;
  }

  retryJob(jobId: string): void {
    this.api.post(`/provisioning/jobs/${jobId}/retry`, {}).subscribe({
      next: () => { this.loadJobs(); }
    });
  }

  retryStage(jobId: string, stageIndex: number): void {
    this.api.post(`/provisioning/jobs/${jobId}/retry-stage`, { stageIndex }).subscribe({
      next: () => { this.viewJob(this.selectedJob); }
    });
  }

  seedBaseline(): void {
    this.seeding = true;
    this.api.post('/provisioning/seed-baseline', {}).subscribe({
      next: () => {
        this.seeding = false;
        this.cdr.markForCheck();
        this.loadJobs();
      },
      error: () => { this.seeding = false; this.cdr.markForCheck(); }
    });
  }

}
