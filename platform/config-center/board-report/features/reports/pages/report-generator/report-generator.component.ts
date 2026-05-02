import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-generator',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, ToastModule, EmptyStateComponent],
    providers: [MessageService],
    template: `
    <app-page-shell icon="file-text" [title]="i18n.translate('reportGenerator.title')"
      [subtitle]="i18n.translate('reportGenerator.subtitle')"
      [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('reportGenerator.title')]" [loading]="loading">
      <app-empty-state
        *ngIf="!error && !loading && templates.length === 0"
        [title]="i18n.translate('reportGenerator.noTemplates')"
        [description]="i18n.translate('reportGenerator.noTemplatesDesc')"
        variant="default" />
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Templates table" [value]="templates" styleClass="p-datatable-sm" *ngIf="!error && (loading || templates.length > 0)">
        <ng-template pTemplate="header"><tr><th>Template</th><th>Description</th><th>Category</th><th>Actions</th></tr></ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td><strong>{{ t.key || t.name }}</strong></td>
            <td>{{ t.description || '—' }}</td>
            <td><p-tag [value]="t.category || 'general'" /></td>
            <td class="actions">
              <p-button [label]="i18n.translate('reportGenerator.generate')" icon="pi pi-file" class="p-button-sm" (onClick)="openGenerate(t)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">{{ i18n.translate('common.noDataAvailable') }}</td></tr></ng-template>
      </p-table>

      <!-- Generated Reports -->
      <div class="section" *ngIf="generatedReports.length > 0 && !error">
        <h3>Generated Reports</h3>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Generated Reports table" [value]="generatedReports" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>Template</th><th>Generated</th><th>Status</th><th>Data</th></tr></ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.templateKey }}</td>
              <td>{{ r.generatedAt | appDate:'short' }}</td>
              <td><p-tag value="Complete" severity="success" /></td>
              <td><p-button [label]="i18n.translate('reportGenerator.view')" icon="pi pi-eye" class="p-button-sm p-button-text" (onClick)="viewReport(r)" /></td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Generate Dialog -->
      <p-dialog [header]="i18n.translate('reportGenerator.generateReport')" [(visible)]="showGenerate" [modal]="true" [style]="{width:'500px'}">
        <div class="field"><label>Template: {{ selectedTemplate?.key || selectedTemplate?.name }}</label></div>
        <div class="field">
          <label>Parameters (JSON)</label>
          <textarea pInputTextarea [(ngModel)]="generateParams" rows="5" class="w-full mono" placeholder='{"startDate":"2025-01-01"}'></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('reportGenerator.cancel')" class="p-button-text" (onClick)="showGenerate = false" />
          <p-button [label]="i18n.translate('reportGenerator.generate')" icon="pi pi-cog" (onClick)="generate()" [loading]="generateLoading" [disabled]="generateLoading" />
        </ng-template>
      </p-dialog>

      <!-- View Report Dialog -->
      <p-dialog [header]="i18n.translate('reportGenerator.reportData')" [(visible)]="showReportView" [modal]="true" [style]="{width:'700px'}">
        <pre class="mono">{{ viewingReport | json }}</pre>
      </p-dialog>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="retry()">{{ i18n.translate('common.retry') }}</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
    styles: [`
    .actions { display: flex; gap: 4px; }
    .section { margin-top: 24px; }
    .section h3 { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 12px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; }
    .mono { font-family: 'Fira Code', monospace; font-size: var(--font-size-sm); }
    pre { background: var(--surface-ground); padding: 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); overflow-x: auto; max-height: 400px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class ReportGeneratorComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  error = '';
  templates: GrcRecord[] = [];
  generatedReports: GrcRecord[] = [];
  showGenerate = false;
  showReportView = false;
  selectedTemplate: GrcRecord | null = null;
  generateParams = '';
  viewingReport: GrcRecord | null = null;

  constructor(public i18n: I18nService, private msg: MessageService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getReportGeneratorTemplates().subscribe({
      next: (d) => { this.templates = d || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('common.failedToLoad'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openGenerate(t: GrcRecord) { this.selectedTemplate = t; this.generateParams = '{}'; this.showGenerate = true; }

  generateLoading = false;

  retry() { this.error = ''; this.ngOnInit(); }

  generate() {
    const key = String(this.selectedTemplate?.['key'] || this.selectedTemplate?.['name'] || '');
    try {
      const params = JSON.parse(this.generateParams);
      this.generateLoading = true;
      this.operationsSvc.generateReport(key, params).subscribe({
        next: (d) => {
          this.generatedReports.unshift({ templateKey: key, generatedAt: new Date().toISOString(), data: d } as GrcRecord);
          this.showGenerate = false;
          this.generateLoading = false;
          this.cdr.markForCheck();
          this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('reportGenerator.reportGenerated') });
        },
        error: (e: Record<string, unknown>) => {
          this.generateLoading = false;
          this.cdr.markForCheck();
          this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: String((e['error'] as Record<string, unknown>)?.['error'] || e['message'] || '') });
        }
      });
    } catch {
      this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('reportGenerator.invalidJson') });
    }
  }

  viewReport(r: GrcRecord) { this.viewingReport = (r['data'] ?? r) as GrcRecord; this.showReportView = true; }
}
