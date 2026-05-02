import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-jobs',
    imports: [CommonModule, AppDatePipe, PageShellComponent, TableModule, TagModule, ButtonModule],
    template: `
    <app-page-shell icon="clock" [title]="'Scheduled Jobs'"
      [subtitle]="'Background job scheduler and execution history'"
      [breadcrumbs]="['Dashboard', 'Jobs']" [loading]="loading">
      <p-table aria-label="Jobs table" [value]="jobs" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr><th>Job Name</th><th>Schedule</th><th>Status</th><th>Last Run</th><th>Next Run</th><th>Actions</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-j>
          <tr>
            <td>{{ j.name }}</td>
            <td><code>{{ j.cron || j.schedule || 'manual' }}</code></td>
            <td><p-tag [value]="j.status || 'idle'" [severity]="statusSeverity(j.status)" /></td>
            <td>{{ j.last_run | appDate:'short' }}</td>
            <td>{{ j.next_run | appDate:'short' }}</td>
            <td><p-button icon="pi pi-play" [text]="true" [rounded]="true" (onClick)="runJob(j)" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">No scheduled jobs</td></tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
    styles: [`.text-center{text-align:center}.p-4{padding:16px}code{background:var(--surface-ice);padding:2px 6px;border-radius:var(--radius-xs);font-size: var(--font-size-sm)}`]
})
export class JobsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; jobs: Record<string, unknown>[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/jobs').subscribe({
      next: (d: Record<string, unknown>) => { this.jobs = Array.isArray(d) ? d : d.jobs || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
  runJob(j: Record<string, unknown>) { this.apiclientSvc.post('/jobs/' + j.job_id + '/run', {}).subscribe({ next: () => this.ngOnInit() }); }
  statusSeverity(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'running') return 'warning'; if (s === 'completed') return 'success'; if (s === 'failed') return 'danger'; return 'info';
  }
}
