import { Component, OnInit, inject, DestroyRef, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/core/services/api-client.service';
import { EmptyStateComponent } from '@app/shared/components';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { GrcLiveService } from '@app/grc/services/grc-live.service';

const IMPORT_MODULES = [
  { label: 'Risks', value: 'risk' },
  { label: 'Controls', value: 'control' },
  { label: 'Policies', value: 'policy' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Vendors', value: 'vendor' },
  { label: 'Assets', value: 'asset' },
  { label: 'Incidents', value: 'incident' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bulk-import',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule,
    DropdownModule, TooltipModule, ToastModule, ProgressBarModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="upload"
      [title]="i18n.translate('bulkImport.title')"
      [subtitle]="i18n.translate('bulkImport.subtitle')"
      [breadcrumbs]="['Dashboard', 'Bulk Import']"
      [loading]="!loaded">

      <p-toast />

      <!-- Upload Section -->
      <div class="upload-section">
        <h3 class="section-title">
          <i class="pi pi-cloud-upload"></i>
          {{ i18n.translate('bulkImport.uploadFile') }}
        </h3>

        <div class="upload-controls">
          <div class="upload-field">
            <label>{{ i18n.translate('bulkImport.module') }}</label>
            <p-dropdown [(ngModel)]="selectedModule" [options]="moduleOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('bulkImport.selectModule')" />
          </div>
          <div class="upload-field">
            <label>{{ i18n.translate('bulkImport.file') }}</label>
            <div class="file-input-wrap">
              <input #fileInput type="file" accept=".csv,.xlsx,.xls" (change)="onFileSelect($event)" class="file-input" />
              <span class="file-name" *ngIf="selectedFile">{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</span>
              <span class="file-name placeholder" *ngIf="!selectedFile">{{ i18n.translate('bulkImport.chooseFile') }}</span>
            </div>
          </div>
          <div class="upload-action">
            <p-button
              [label]="i18n.translate('bulkImport.import')"
              icon="pi pi-upload"
              (onClick)="startImport()"
              [loading]="uploading"
              [disabled]="!selectedFile || !selectedModule" />
          </div>
        </div>

        <div class="progress-wrap" *ngIf="uploadProgress > 0 && uploadProgress < 100">
          <p-progressBar [value]="uploadProgress" [showValue]="true" />
          <span class="progress-label">{{ i18n.translate('bulkImport.processing') }}</span>
        </div>

        <div class="result-card" *ngIf="importResult" [class.result-success]="importResult.status === 'completed'" [class.result-error]="importResult.status === 'failed'">
          <div class="result-header">
            <i class="pi" [ngClass]="importResult.status === 'completed' ? 'pi-check-circle' : 'pi-times-circle'"></i>
            <span>{{ importResult.status === 'completed'
              ? i18n.translate('bulkImport.importCompleted')
              : i18n.translate('bulkImport.importFailed') }}</span>
          </div>
          <div class="result-stats">
            <div class="rs-item"><span class="rs-val">{{ importResult.records_total ?? 0 }}</span><span class="rs-lbl">{{ i18n.translate('bulkImport.totalRecords') }}</span></div>
            <div class="rs-item rs-success"><span class="rs-val">{{ importResult.records_success ?? 0 }}</span><span class="rs-lbl">{{ i18n.translate('bulkImport.success') }}</span></div>
            <div class="rs-item rs-fail"><span class="rs-val">{{ importResult.records_failed ?? 0 }}</span><span class="rs-lbl">{{ i18n.translate('bulkImport.failed') }}</span></div>
          </div>
        </div>
      </div>

      <!-- Import History Table -->
      <h3 class="section-title">
        <i class="pi pi-history"></i>
        {{ i18n.translate('bulkImport.importHistory') }}
      </h3>

      <p-table aria-label="History Items table" [value]="historyItems" [paginator]="historyItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="historyItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('bulkImport.fileName') }}</th>
            <th>{{ i18n.translate('bulkImport.module') }}</th>
            <th>{{ i18n.translate('bulkImport.records') }}</th>
            <th>{{ i18n.translate('common.status') }}</th>
            <th>{{ i18n.translate('bulkImport.date') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.filename ?? item.file_name ?? '-' }}</strong></td>
            <td><p-tag [value]="item.type ?? item.module ?? '-'" severity="info" /></td>
            <td>
              <span class="record-stats">
                {{ item.records_total ?? 0 }}
                <span class="stat-ok" *ngIf="item.records_success">({{ item.records_success }})</span>
                <span class="stat-fail" *ngIf="item.records_failed">({{ item.records_failed }})</span>
              </span>
            </td>
            <td>
              <p-tag [value]="item.status ?? 'pending'"
                     [severity]="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'" />
            </td>
            <td>{{ item.created_at | appDate:'medium' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-msg">{{ i18n.translate('common.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && historyItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('bulkImport.noPreviousImports') }}</p>
      </div>

    </app-page-shell>
    <app-ai-panel module="bulk-import" />
  `,
  styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .section-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); display: flex; align-items: center; gap: 8px; margin: 0 0 16px; }
    .section-title .pi { font-size: var(--font-size-base); color: var(--primary); }
    .upload-section { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 20px; margin-bottom: 24px; }
    .upload-controls { display: grid; grid-template-columns: 1fr 2fr auto; gap: 16px; align-items: end; margin-bottom: 16px; }
    .upload-field { display: flex; flex-direction: column; gap: 6px; }
    .upload-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .upload-action { padding-bottom: 2px; }
    .file-input-wrap { position: relative; }
    .file-input { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .file-name { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; display: block; }
    .file-name.placeholder { color: var(--text-muted); }
    .w-full { width: 100%; }
    .progress-wrap { margin-bottom: 16px; }
    .progress-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; display: block; }
    .result-card { padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; }
    .result-success { background: var(--status-success-bg, #defbe6); border: 1px solid #bbf7d0; }
    .result-error { background: var(--status-danger-bg, #fff1f1); border: 1px solid var(--status-danger-bg, #fff1f1); }
    .result-header { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; margin-bottom: 12px; }
    .result-success .result-header { color: var(--success); }
    .result-success .result-header .pi { color: var(--success); }
    .result-error .result-header { color: var(--error); }
    .result-error .result-header .pi { color: var(--error); }
    .result-stats { display: flex; gap: 20px; }
    .rs-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .rs-val { font-size: var(--font-size-xl); font-weight: 800; color: var(--text-heading, var(--text-heading)); }
    .rs-lbl { font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 600; }
    .rs-success .rs-val { color: var(--success); }
    .rs-fail .rs-val { color: var(--error); }
    .record-stats { font-size: var(--font-size-sm); }
    .stat-ok { color: var(--success); font-weight: 600; }
    .stat-fail { color: var(--error); font-weight: 600; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: 48px; margin-bottom: var(--space-md); display: block; }
    @media (max-width: 768px) {
      .upload-controls { grid-template-columns: 1fr; }
    }
  `]
})
export class BulkImportComponent implements OnInit {
  historyItems: Record<string, any>[] = [];
  loaded = false;
  selectedModule = '';
  selectedFile: File | null = null;
  uploading = false;
  uploadProgress = 0;
  importResult: Record<string, any> | null = null;

  moduleOptions = IMPORT_MODULES;

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  private api = inject(ApiClientService);
  constructor(
    public i18n: I18nService,
    private msg: MessageService,
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadHistory());
    this.loadHistory();
  }

  loadHistory(): void {
    this.api.get('/bulk-import/history').pipe(catchError(() => of({ imports: [] }))).subscribe((res: Record<string, any>) => {
      const data = res.imports ?? res.history ?? res;
      this.historyItems = Array.isArray(data) ? data : [];
      this.loaded = true;
    });
  }

  onFileSelect(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const exts = ['.csv', '.xlsx', '.xls'];
      if (exts.some(ext => file.name.toLowerCase().endsWith(ext))) {
        this.selectedFile = file;
        this.importResult = null;
      } else {
        this.msg.add({ severity: 'warn', summary: this.i18n.translate('common.invalidFile'), detail: this.i18n.translate('common.pleaseSelectCsvOrExcel'), life: 4000 });
      }
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  startImport(): void {
    if (!this.selectedFile || !this.selectedModule) return;
    this.uploading = true;
    this.uploadProgress = 20;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('type', this.selectedModule);

    this.api.postFormData('/bulk-import/upload', formData).pipe(
      catchError(() => of({ status: 'failed', records_total: 0, records_success: 0, records_failed: 0 }))
    ).subscribe((res: Record<string, any>) => {
      this.uploadProgress = 100;
      this.importResult = res;
      this.uploading = false;
      this.selectedFile = null;
      this.loadHistory();

      if (res.status === 'completed') {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.importedRecordsCount', { count: res.records_success ?? 0 }), life: 3000 });
      } else {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.importFailed'), life: 4000 });
      }

      setTimeout(() => { this.uploadProgress = 0; }, 2000);
    });
  }

  exportCSV(): void {
    if (!this.historyItems.length) return;
    const headers = Object.keys(this.historyItems[0]);
    const csv = [headers.join(','), ...this.historyItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'import-history.csv'; a.click();
  }
}
