/**
 * SLA Breach Monitoring Dashboard — Real-time view of SLA breaches and at-risk tasks.
 *
 * Displays KPI cards (breached 24h/7d, warnings, open tasks, avg resolution hours)
 * with tabbed PrimeNG tables for breached and at-risk tasks.
 * Auto-refreshes every 60 seconds.
 *
 * API endpoints:
 *   GET /process-tasks/sla-stats
 *   GET /process-tasks/sla-breaches?since=24h
 *   GET /process-tasks/sla-warnings
 */

import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface SlaStats {
  breached_24h: number;
  breached_7d: number;
  warnings_active: number;
  open_tasks: number;
  avg_resolution_hours: number;
}

interface SlaBreachedTask {
  task_id: string;
  title: string;
  task_type: string;
  priority: string;
  assigned_user_name: string;
  team_name: string;
  sla_hours: number;
  breached_at: string;
  escalation_level: number;
  created_at: string;
}

interface SlaWarningTask {
  task_id: string;
  title: string;
  task_type: string;
  priority: string;
  assigned_user_name: string;
  team_name: string;
  sla_hours: number;
  sla_remaining_hours: number;
  due_date: string;
  created_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sla-monitoring',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent,
    CardModule, TableModule, TagModule, ButtonModule,
    TabViewModule, TooltipModule, ToastModule, SkeletonModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="clock"
      [title]="i18n.translate('slaMonitoring.title')"
      [subtitle]="i18n.translate('slaMonitoring.subtitle')"
      [breadcrumbs]="['Dashboard', 'SLA Monitoring']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('Refresh')"
                  (onClick)="loadAll()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      <!-- KPI Cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col" *ngFor="let kpi of kpiCards()">
          <div class="surface-card border-round p-3 text-center shadow-1">
            <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ kpi.label }}</div>
          </div>
        </div>
      </div>

      <!-- Tabbed Tables -->
      <p-tabView>
        <!-- Breached Tasks Tab -->
        <p-tabPanel [header]="i18n.translate('Breached Tasks') + ' (' + breachedTasks().length + ')'">
          <p-table aria-label="Breached SLA tasks" [value]="breachedTasks()" [paginator]="true" [rows]="15"
                   [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                   [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Team</th>
                <th>SLA (h)</th>
                <th>Breached At</th>
                <th>Escalation</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.title }}</td>
                <td>{{ row.task_type }}</td>
                <td>
                  <p-tag [value]="row.priority"
                         [severity]="row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'" />
                </td>
                <td>{{ row.assigned_user_name || '-' }}</td>
                <td>{{ row.team_name || '-' }}</td>
                <td>{{ row.sla_hours }}</td>
                <td>{{ row.breached_at | date:'short' }}</td>
                <td>
                  <p-tag [value]="'Level ' + row.escalation_level"
                         [severity]="row.escalation_level >= 3 ? 'danger' : row.escalation_level >= 2 ? 'warning' : 'info'" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="text-center text-color-secondary p-4">No breached tasks</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- At Risk Tab -->
        <p-tabPanel [header]="i18n.translate('At Risk') + ' (' + warningTasks().length + ')'">
          <p-table aria-label="At-risk SLA tasks" [value]="warningTasks()" [paginator]="true" [rows]="15"
                   [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                   [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Team</th>
                <th>SLA (h)</th>
                <th>Remaining (h)</th>
                <th>Due</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.title }}</td>
                <td>{{ row.task_type }}</td>
                <td>
                  <p-tag [value]="row.priority"
                         [severity]="row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'" />
                </td>
                <td>{{ row.assigned_user_name || '-' }}</td>
                <td>{{ row.team_name || '-' }}</td>
                <td>{{ row.sla_hours }}</td>
                <td [class.text-orange-500]="row.sla_remaining_hours < 4"
                    [class.font-bold]="row.sla_remaining_hours < 2">
                  {{ row.sla_remaining_hours | number:'1.1-1' }}
                </td>
                <td>{{ row.due_date | date:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="text-center text-color-secondary p-4">No at-risk tasks</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

    </app-page-shell>
  `,
  styles: [`
    :host { display: block; }
    .grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .col { flex: 1 1 0; min-width: 140px; }
  `],
})
export class SlaMonitoringComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n = inject(I18nService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  stats = signal<SlaStats>({ breached_24h: 0, breached_7d: 0, warnings_active: 0, open_tasks: 0, avg_resolution_hours: 0 });
  breachedTasks = signal<SlaBreachedTask[]>([]);
  warningTasks = signal<SlaWarningTask[]>([]);

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  /** Derived KPI card array for template iteration */
  kpiCards = signal<{ label: string; value: string | number; color: string }[]>([]);

  ngOnInit(): void {
    this.loadAll();
    this.refreshInterval = setInterval(() => this.loadAll(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadAll(): void {
    this.loading.set(true);
    Promise.all([
      this.apiclientSvc.get('/process-tasks/sla-stats').toPromise(),
      this.apiclientSvc.get('/process-tasks/sla-breaches?since=24h').toPromise(),
      this.apiclientSvc.get('/process-tasks/sla-warnings').toPromise(),
    ]).then(([statsRes, breachedRes, warningsRes]) => {
      const s = statsRes ?? { breached_24h: 0, breached_7d: 0, warnings_active: 0, open_tasks: 0, avg_resolution_hours: 0 };
      this.stats.set(s);
      this.breachedTasks.set(breachedRes ?? []);
      this.warningTasks.set(warningsRes ?? []);
      this.kpiCards.set([
        { label: this.i18n.translate('Breached (24h)'), value: s.breached_24h, color: '#ef4444' },
        { label: this.i18n.translate('Breached (7d)'), value: s.breached_7d, color: '#f97316' },
        { label: this.i18n.translate('Warnings Active'), value: s.warnings_active, color: '#eab308' },
        { label: this.i18n.translate('Open Tasks'), value: s.open_tasks, color: '#3b82f6' },
        { label: this.i18n.translate('Avg Resolution (h)'), value: s.avg_resolution_hours?.toFixed(1) ?? '-', color: '#22c55e' },
      ]);
    }).catch(() => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load SLA monitoring data' });
    }).finally(() => {
      this.loading.set(false);
    });
  }
}
