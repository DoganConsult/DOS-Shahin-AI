/**
 * Cron Job Monitoring Dashboard — View and manage all registered scheduled jobs.
 *
 * Displays a PrimeNG table of all jobs with status badges (healthy/stale/failed),
 * manual trigger buttons, and a dialog showing execution history per job.
 *
 * API endpoints:
 *   GET  /jobs
 *   GET  /jobs/:name/history
 *   POST /jobs/:name/trigger
 */

import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

interface JobDefinition {
  job_name: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  next_run_at: string | null;
}

interface JobExecution {
  execution_id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-job-monitor',
    imports: [
        CommonModule, PageShellComponent,
        CardModule, TableModule, TagModule, ButtonModule,
        TooltipModule, ToastModule, DialogModule, SkeletonModule,
    ],
    providers: [MessageService],
    template: `
    <p-toast />
    <app-page-shell
      icon="cog"
      [title]="i18n.translate('jobMonitor.title')"
      [subtitle]="i18n.translate('jobMonitor.subtitle')"
      [breadcrumbs]="['Admin', 'Job Monitor']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('Refresh')"
                  (onClick)="loadJobs()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      <p-table aria-label="Scheduled jobs" [value]="jobs()" [paginator]="true" [rows]="25"
               [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped"
               selectionMode="single" (onRowSelect)="onRowClick($event)">
        <ng-template pTemplate="header">
          <tr>
            <th>Job Name</th>
            <th>Cron</th>
            <th>Enabled</th>
            <th>Last Run</th>
            <th>Status</th>
            <th>Last Error</th>
            <th style="width:8rem">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [pSelectableRow]="row">
            <td class="font-semibold">{{ row.job_name }}</td>
            <td><code class="text-sm">{{ row.cron_expression }}</code></td>
            <td>
              <p-tag [value]="row.enabled ? 'Active' : 'Disabled'"
                     [severity]="row.enabled ? 'success' : 'secondary'" />
            </td>
            <td>{{ row.last_run_at ? (row.last_run_at | date:'short') : '-' }}</td>
            <td>
              <p-tag [value]="getStatusLabel(row)"
                     [severity]="getStatusSeverity(row)" />
            </td>
            <td class="text-xs text-red-500" style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
                [pTooltip]="row.last_error || ''">
              {{ row.last_error || '-' }}
            </td>
            <td>
              <div class="flex gap-1">
                <button pButton icon="pi pi-play" class="p-button-sm p-button-outlined p-button-success"
                        pTooltip="Trigger now" (click)="triggerJob(row, $event)" [disabled]="triggering()"></button>
                <button pButton icon="pi pi-history" class="p-button-sm p-button-outlined"
                        pTooltip="View history" (click)="showHistory(row, $event)"></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center text-color-secondary p-4">No jobs registered</td></tr>
        </ng-template>
      </p-table>

      <!-- Execution History Dialog -->
      <p-dialog [header]="'Execution History: ' + selectedJobName()"
                [(visible)]="historyDialogVisible" [modal]="true" [style]="{width:'70vw'}" [closable]="true">
        <p-table aria-label="Job execution history" [value]="executions()" [paginator]="false"
                 [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped"
                 *ngIf="!historyLoading(); else historySkeletonRef">
          <ng-template pTemplate="header">
            <tr>
              <th>Execution ID</th>
              <th>Status</th>
              <th>Started</th>
              <th>Completed</th>
              <th>Duration (ms)</th>
              <th>Error</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="text-xs">{{ row.execution_id }}</td>
              <td>
                <p-tag [value]="row.status"
                       [severity]="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" />
              </td>
              <td>{{ row.started_at | date:'medium' }}</td>
              <td>{{ row.completed_at ? (row.completed_at | date:'medium') : '-' }}</td>
              <td>{{ row.duration_ms ?? '-' }}</td>
              <td class="text-xs text-red-500">{{ row.error || '-' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center text-color-secondary p-4">No executions found</td></tr>
          </ng-template>
        </p-table>
        <ng-template #historySkeletonRef>
          <p-skeleton width="100%" height="200px" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
  `,
    styles: [`
    :host { display: block; }
    code { background: var(--surface-100); padding: 2px 6px; border-radius: var(--radius-xs); }
  `]
})
export class JobMonitorComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n = inject(I18nService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  triggering = signal(false);
  historyLoading = signal(false);
  jobs = signal<JobDefinition[]>([]);
  executions = signal<JobExecution[]>([]);
  selectedJobName = signal('');
  historyDialogVisible = false;

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading.set(true);
    this.apiclientSvc.get('/jobs').subscribe({
      next: (data) => this.jobs.set(data ?? []),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load jobs' }),
      complete: () => this.loading.set(false),
    });
  }

  /** Compute display label for job health status */
  getStatusLabel(row: JobDefinition): string {
    if (!row.last_status) return this.i18n.translate('common.unknown');
    if (row.last_status === 'failed') return this.i18n.translate('common.error');
    if (row.last_status === 'completed') {
      if (row.last_run_at) {
        const hoursSince = (Date.now() - new Date(row.last_run_at).getTime()) / 3_600_000;
        if (hoursSince > 24) return this.i18n.translate('common.overdue');
      }
      return this.i18n.translate('common.healthy');
    }
    return row.last_status;
  }

  getStatusSeverity(row: JobDefinition): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
    const label = this.getStatusLabel(row);
    if (label === 'Healthy') return 'success';
    if (label === 'Failed') return 'danger';
    if (label === 'Stale') return 'warning';
    return 'secondary';
  }

  /** Trigger a job manually */
  triggerJob(row: JobDefinition, event: Event): void {
    event.stopPropagation();
    this.triggering.set(true);
    this.apiclientSvc.post(`/jobs/${row.job_name}/trigger`, {}).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Triggered', detail: `${row.job_name} triggered` });
        setTimeout(() => this.loadJobs(), 2000);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to trigger job' }),
      complete: () => this.triggering.set(false),
    });
  }

  /** Show execution history dialog for a job */
  showHistory(row: JobDefinition, event: Event): void {
    event.stopPropagation();
    this.selectedJobName.set(row.job_name);
    this.historyDialogVisible = true;
    this.historyLoading.set(true);
    this.apiclientSvc.get(`/jobs/${row.job_name}/history`).subscribe({
      next: (data) => this.executions.set(data ?? []),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load history' }),
      complete: () => this.historyLoading.set(false),
    });
  }

  /** Handle row click — open history dialog */
  onRowClick(event: GrcRecord): void {
    if (event?.data) {
      this.showHistory(event.data, new MouseEvent('click'));
    }
  }
}
