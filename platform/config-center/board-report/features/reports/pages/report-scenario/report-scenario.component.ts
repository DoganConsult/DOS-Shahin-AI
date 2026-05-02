import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-scenario',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, TagModule, ButtonModule, TabViewModule, TableModule],
    template: `
    <app-page-shell icon="file-export" [title]="'Report Scenarios'"
      [subtitle]="'Generate and schedule compliance reports'"
      [breadcrumbs]="['Dashboard', 'Report Scenarios']" [loading]="loading">
      <p-tabView>
        <p-tabPanel header="Scenarios">
          <div class="scenario-grid">
            <p-card *ngFor="let s of scenarios" styleClass="scenario-card">
              <div class="scenario-header">
                <h3>{{ s.name || s.type }}</h3>
                <p-tag [value]="s.type" severity="info" />
              </div>
              <p class="scenario-desc">{{ s.description }}</p>
              <p-button label="Generate" icon="pi pi-file-export" size="small" (onClick)="generate(s)" />
            </p-card>
          </div>
        </p-tabPanel>
        <p-tabPanel header="Schedules">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Schedules table" [value]="schedules" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>Report</th><th>Schedule</th><th>Next Run</th><th>Status</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-s>
              <tr>
                <td>{{ s.report_type }}</td>
                <td>{{ s.cron || s.frequency }}</td>
                <td>{{ s.next_run | appDate:'short' }}</td>
                <td><p-tag [value]="s.status || 'active'" [severity]="s.status === 'active' ? 'success' : 'warning'" /></td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
    styles: [`
    .scenario-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
    .scenario-header{display:flex;justify-content:space-between;align-items:center}
    .scenario-header h3{margin:0;font-size: var(--font-size-base);font-weight:700}
    .scenario-desc{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin:8px 0 12px}
  `]
})
export class ReportScenarioComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; scenarios: Record<string, any>[] = []; schedules: Record<string, any>[] = [];
  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}
  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getReportScenarios().subscribe({
      next: (d: Record<string, any>) => { this.scenarios = Array.isArray(d) ? d : d.scenarios || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.operationsSvc.getReportSchedules().subscribe({
      next: (d: Record<string, any>) => { this.schedules = Array.isArray(d) ? d : d.schedules || []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }
  generate(s: Record<string, any>) {
    this.operationsSvc.generateReportScenario(s.type, {}).subscribe({ next: () => this.ngOnInit() });
  }

}
