/**
 * Evidence Auto-Collection Schedule Manager — Manage evidence generation schedules.
 *
 * Displays evidence collection schedules with toggle switches (enabled/disabled),
 * a manual "Generate Now" trigger, and generation history.
 *
 * API endpoints:
 *   GET    /evidence-tasks/schedules
 *   PATCH  /evidence-tasks/schedules/:id
 *   POST   /evidence-tasks/generate-now
 *   GET    /evidence-tasks/generation-history
 */

import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceSchedule {
  id: string;
  control_id: string;
  control_title: string;
  evidence_type_code: string;
  cron_expression: string;
  enabled: boolean;
  last_reminded_at: string | null;
  updated_at: string;
}

interface GenerationRun {
  run_id: string;
  status: string;
  tasks_created: number;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-schedules',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        CardModule, TableModule, TagModule, ButtonModule,
        TooltipModule, ToastModule, InputSwitchModule, InputTextModule, SkeletonModule,
    ],
    providers: [MessageService],
    template: `
    <p-toast />
    <app-page-shell
      icon="calendar"
      [title]="i18n.translate('evidenceSchedules.title')"
      [subtitle]="i18n.translate('evidenceSchedules.subtitle')"
      [breadcrumbs]="['Evidence', 'Schedules']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-bolt" [label]="i18n.translate('Generate Now')"
                  (onClick)="generateNow()" [loading]="generating()" severity="warning" />
      </div>

      <!-- Last Generation Run Status Card -->
      <div class="mb-4" *ngIf="lastRun() as run">
        <div class="surface-card border-round p-3 shadow-1 flex align-items-center gap-3">
          <i class="pi pi-history text-2xl text-primary" aria-hidden="true"></i>
          <div class="flex-1">
            <span class="font-semibold">{{ i18n.translate('Last Generation') }}:</span>
            <span class="ml-2">{{ run.started_at | date:'medium' }}</span>
            <span class="ml-2">-</span>
            <span class="ml-2">{{ run.tasks_created }} tasks created</span>
          </div>
          <p-tag [value]="run.status"
                 [severity]="run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'info'" />
        </div>
      </div>

      <!-- Schedule Table -->
      <h3 class="mt-0 mb-2">{{ i18n.translate('Collection Schedules') }}</h3>
      <p-table aria-label="Evidence schedules" [value]="schedules()" [paginator]="true" [rows]="20"
               [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>Control</th>
            <th>Evidence Type</th>
            <th>Cron Expression</th>
            <th>Enabled</th>
            <th>Last Reminded</th>
            <th>Updated</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td pTooltip="{{ row.control_id }}">{{ row.control_title || row.control_id }}</td>
            <td>{{ row.evidence_type_code }}</td>
            <td>
              <input pInputText [(ngModel)]="row.cron_expression"
                     (blur)="updateSchedule(row)" class="p-inputtext-sm" style="width:140px" />
            </td>
            <td>
              <p-inputSwitch [(ngModel)]="row.enabled" (onChange)="updateSchedule(row)" />
            </td>
            <td>{{ row.last_reminded_at ? (row.last_reminded_at | date:'short') : '-' }}</td>
            <td>{{ row.updated_at | date:'short' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center text-color-secondary p-4">No schedules configured</td></tr>
        </ng-template>
      </p-table>

      <!-- Generation History -->
      <h3 class="mt-4 mb-2">{{ i18n.translate('Generation History') }}</h3>
      <p-table aria-label="Generation history" [value]="history()" [paginator]="true" [rows]="10"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>Run ID</th>
            <th>Status</th>
            <th>Tasks Created</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Error</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="text-xs">{{ row.run_id }}</td>
            <td>
              <p-tag [value]="row.status"
                     [severity]="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" />
            </td>
            <td>{{ row.tasks_created }}</td>
            <td>{{ row.started_at | date:'medium' }}</td>
            <td>{{ row.completed_at ? (row.completed_at | date:'medium') : '-' }}</td>
            <td class="text-xs text-red-500">{{ row.error || '-' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center text-color-secondary p-4">No generation runs yet</td></tr>
        </ng-template>
      </p-table>

    </app-page-shell>
  `,
    styles: [`
    :host { display: block; }
  `]
})
export class EvidenceSchedulesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n = inject(I18nService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  generating = signal(false);
  schedules = signal<EvidenceSchedule[]>([]);
  history = signal<GenerationRun[]>([]);
  lastRun = signal<GenerationRun | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    Promise.all([
      this.apiclientSvc.get('/evidence-tasks/schedules').toPromise(),
      this.apiclientSvc.get('/evidence-tasks/generation-history').toPromise(),
    ]).then(([schedulesRes, historyRes]) => {
      this.schedules.set(schedulesRes ?? []);
      const h = historyRes ?? [];
      this.history.set(h);
      this.lastRun.set(h.length > 0 ? h[0] : null);
    }).catch(() => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load evidence schedules' });
    }).finally(() => {
      this.loading.set(false);
    });
  }

  /** Toggle enabled or update cron expression for a schedule row */
  updateSchedule(row: EvidenceSchedule): void {
    this.apiclientSvc.patch(`/evidence-tasks/schedules/${row.id}`, {
      enabled: row.enabled,
      cron_expression: row.cron_expression,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Schedule updated' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update schedule' });
      },
    });
  }

  /** Manually trigger evidence generation */
  generateNow(): void {
    this.generating.set(true);
    this.apiclientSvc.post('/evidence-tasks/generate-now', {}).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Triggered', detail: 'Evidence generation started' });
        /* Reload history after a short delay to capture the new run */
        setTimeout(() => this.loadAll(), 2000);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to trigger generation' });
      },
      complete: () => {
        this.generating.set(false);
      },
    });
  }
}
