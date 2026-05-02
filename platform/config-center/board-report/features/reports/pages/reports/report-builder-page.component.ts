import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-builder-page',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, ButtonModule, DropdownModule, CalendarModule, InputTextModule, CardModule, TableModule],
  template: `
    <main class="main-content">
      <h2>{{ i18n.translate('reports.builder') || 'Report Builder' }}</h2>
      <p-card>
        <div class="report-form">
          <div class="form-row">
            <label>{{ i18n.translate('reports.template') || 'Template' }}</label>
            <p-dropdown [(ngModel)]="selectedTemplate" [options]="templates" optionLabel="name" optionValue="id"
              [placeholder]="i18n.translate('reports.selectTemplate') || 'Select template'"></p-dropdown>
          </div>
          <div class="form-row">
            <label>{{ i18n.translate('reports.format') || 'Format' }}</label>
            <p-dropdown [(ngModel)]="format" [options]="formats" optionLabel="label" optionValue="value"></p-dropdown>
          </div>
          <div class="form-row">
            <label>{{ i18n.translate('reports.dateRange') || 'Date Range' }}</label>
            <p-calendar [(ngModel)]="dateRange" selectionMode="range" [showIcon]="true" dateFormat="yy-mm-dd"></p-calendar>
          </div>
          <div class="form-actions">
            <button pButton [label]="i18n.translate('reports.generate') || 'Generate'" icon="pi pi-file"
              (click)="generate()" [disabled]="!selectedTemplate"></button>
            <button pButton [label]="i18n.translate('reports.schedule') || 'Schedule'" icon="pi pi-clock"
              class="p-button-outlined" (click)="schedule()"></button>
          </div>
        </div>
      </p-card>
      <p-card [header]="i18n.translate('reports.generated') || 'Generated Reports'" class="mt-3">
        <p-table aria-label="Reports table" [value]="reports" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[5,10,20]">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('reports.name') || 'Name' }}</th>
              <th>{{ i18n.translate('reports.type') || 'Type' }}</th>
              <th>{{ i18n.translate('reports.date') || 'Date' }}</th>
              <th>{{ i18n.translate('reports.actions') || 'Actions' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.title || r.name }}</td>
              <td>{{ r.format || r.type }}</td>
              <td>{{ r.created_at | appDate:'short' }}</td>
              <td>
                <button aria-label="Download" pButton icon="pi pi-download" class="p-button-text p-button-sm" (click)="download(r)"></button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </main>
  `,
  styles: [`
    .main-content { padding: 24px; }
    .report-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: flex; flex-direction: column; gap: 4px; }
    .form-row label { font-weight: 600; font-size: var(--font-size-sm); }
    .form-actions { display: flex; gap: 8px; margin-top: 8px; }
    .mt-3 { margin-top: 16px; }
  `]
})
export class ReportBuilderPageComponent implements OnInit {
  templates: Record<string, any>[] = [];
  reports: Record<string, any>[] = [];
  selectedTemplate = '';
  format = 'pdf';
  dateRange: Date[] = [];
  formats = [
    { label: 'PDF', value: 'pdf' },
    { label: 'Excel', value: 'excel' },
    { label: 'JSON', value: 'json' }
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.apiclientSvc.get('/report-ext/templates').subscribe({
      next: (data: any) => this.templates = data || [],
      error: () => this.templates = []
    });
  }

  generate() {
    const body: Record<string, any> = { template_id: this.selectedTemplate, format: this.format };
    if (this.dateRange.length === 2) {
      body.start_date = this.dateRange[0]?.toISOString();
      body.end_date = this.dateRange[1]?.toISOString();
    }
    this.apiclientSvc.post('/report-ext/generate', body).subscribe({
      next: (r: Record<string, any>) => this.reports = [r, ...this.reports]
    });
  }

  schedule() {
    // Placeholder for schedule dialog
  }

  download(r: Record<string, any>) {
    window.open(`${(this.grc as GrcRecord).api}/reports/${r.report_id}/${this.format}`, '_blank');
  }
}
