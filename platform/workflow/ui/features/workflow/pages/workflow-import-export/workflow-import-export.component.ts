/**
 * Workflow Import/Export Component
 *
 * Provides workflow export (download as JSON) and import (upload JSON file)
 * functionality. The import section includes a file dropzone, preview of
 * the definition name and step count, and a confirmation button.
 */
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface WorkflowItem {
  workflow_id: string;
  name: string;
  status: string;
  version: number;
  module_code: string;
  created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-import-export',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule,
        DialogModule, ToastModule, FileUploadModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="upload"
      [title]="'Workflow Import / Export'"
      [subtitle]="'Export workflows as JSON or import from file'"
      [breadcrumbs]="['Dashboard', 'Workflows', 'Import / Export']"
      [loading]="!loaded">

      <p-toast />

      <!-- Workflow List for Export -->
      <section class="section">
        <h3 class="section-title">Export Workflows</h3>
        <p class="section-desc">Select a workflow to download its definition as JSON.</p>

        <p-table
          aria-label="Workflows table"
          [value]="workflows"
          [paginator]="workflows.length > 10"
          [rows]="10"
          styleClass="p-datatable-striped p-datatable-gridlines"
          *ngIf="workflows.length > 0">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Version</th>
              <th>Module</th>
              <th style="width:120px">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-wf>
            <tr>
              <td><strong>{{ wf.name || wf.title || '-' }}</strong></td>
              <td><app-status-badge [status]="wf.status || 'draft'" /></td>
              <td>v{{ wf.version || 1 }}</td>
              <td>{{ wf.module_code || '-' }}</td>
              <td>
                <p-button label="Export" icon="pi pi-download"
                          severity="secondary" [outlined]="true" size="small"
                          (onClick)="exportWorkflow(wf)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="empty-msg">No workflows found</td></tr>
          </ng-template>
        </p-table>

        <div *ngIf="loaded && workflows.length === 0" class="empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <p>No workflows available for export</p>
        </div>
      </section>

      <!-- Import Section -->
      <section class="section import-section">
        <h3 class="section-title">Import Workflow</h3>
        <p class="section-desc">Upload a JSON file to import a workflow definition.</p>

        <div class="dropzone"
             (dragover)="onDragOver($event)"
             (dragleave)="isDragging = false"
             (drop)="onDrop($event)"
             [class.dragging]="isDragging">
          <i class="pi pi-cloud-upload dropzone-icon"></i>
          <p>Drag and drop a .json file here, or</p>
          <label class="file-label">
            <input type="file" accept=".json" (change)="onFileSelected($event)"
                   class="file-input" aria-label="Select JSON file" />
            <span class="file-btn">Browse Files</span>
          </label>
        </div>

        <!-- Import Preview -->
        <div *ngIf="importPreview" class="import-preview">
          <h4>Import Preview</h4>
          <div class="preview-details">
            <p><strong>Name:</strong> {{ importPreview.name }}</p>
            <p><strong>Steps:</strong> {{ importPreview.stepsCount }}</p>
            <p><strong>Module:</strong> {{ importPreview.moduleCode || 'workflow' }}</p>
            <p *ngIf="importPreview.version"><strong>Source Version:</strong> v{{ importPreview.version }}</p>
          </div>
          <div class="preview-actions">
            <p-button label="Cancel" severity="secondary" [text]="true"
                      (onClick)="clearImport()" />
            <p-button label="Import" icon="pi pi-upload"
                      (onClick)="executeImport()" [loading]="importing" />
          </div>
        </div>
      </section>

      <!-- Export Confirm Dialog -->
      <p-dialog
        header="Export Complete"
        [(visible)]="showExportDialog"
        [modal]="true"
        [style]="{width:'400px'}">
        <p>Workflow exported successfully. Check your downloads.</p>
        <ng-template pTemplate="footer">
          <p-button label="OK" (onClick)="showExportDialog = false" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
  `,
    styles: [`
    .section { margin-bottom: var(--space-xl); }
    .section-title { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-0); margin: 0 0 4px; }
    .section-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 16px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }

    .import-section { border-top: 1px solid var(--border); padding-top: var(--space-lg); }

    .dropzone {
      border: 2px dashed var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-2xl);
      text-align: center;
      transition: all 200ms;
      background: var(--bg-0);
      cursor: pointer;
    }
    .dropzone:hover, .dropzone.dragging {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 5%, var(--bg-0));
    }
    .dropzone-icon { font-size: var(--font-size-6xl); color: var(--text-muted); display: block; margin-bottom: var(--space-sm); }
    .dropzone p { color: var(--text-muted); margin: var(--space-sm) 0; }

    .file-input { display: none; }
    .file-label { cursor: pointer; }
    .file-btn {
      display: inline-block;
      padding: 8px 20px;
      background: var(--primary);
      color: white;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: var(--font-size-sm);
      transition: background 150ms;
    }
    .file-btn:hover { opacity: 0.9; }

    .import-preview {
      margin-top: var(--space-lg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      background: var(--bg-1);
    }
    .import-preview h4 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .preview-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .preview-details p { margin: 0; font-size: var(--font-size-sm); }
    .preview-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `]
})
export class WorkflowImportExportComponent implements OnInit {
  workflows: WorkflowItem[] = [];
  loaded = false;
  showExportDialog = false;

  // Import state
  importPreview: { name: string; stepsCount: number; moduleCode: string; version: number } | null = null;
  importPayload: { definition: any; metadata: Record<string, unknown> } | null = null;
  importing = false;
  isDragging = false;

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get<any>('/workflows').subscribe({
      next: (res: Record<string, unknown>) => {
        const data = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
        this.workflows = data as WorkflowItem[];
        this.loaded = true;
      },
      error: () => { this.loaded = true; },
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────

  exportWorkflow(wf: WorkflowItem): void {
    const id = wf.workflow_id;
    this.apiclientSvc.get<any>(`/workflow-import-export/${id}/export`).subscribe({
      next: (res: Record<string, unknown>) => {
        const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${wf.name || id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.msg.add({
          severity: 'success',
          summary: 'Exported',
          detail: `Workflow "${wf.name}" exported successfully`,
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to export workflow',
          life: 4000,
        });
      },
    });
  }

  // ── Import: File handling ──────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.msg.add({ severity: 'warn', summary: 'File Too Large', detail: 'Maximum file size is 10 MB', life: 4000 });
      return;
    }
    if (!file.name.endsWith('.json')) {
      this.msg.add({
        severity: 'warn',
        summary: 'Invalid File',
        detail: 'Please select a .json file',
        life: 4000,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        const definition = content.definition || content;
        const metadata = content.metadata || {
          name: definition.name || definition.title || file.name.replace('.json', ''),
          version: definition.version || 1,
          module_code: definition.module_code || 'workflow',
        };

        const steps = definition.steps || [];
        this.importPreview = {
          name: metadata.name,
          stepsCount: Array.isArray(steps) ? steps.length : 0,
          moduleCode: metadata.module_code || 'workflow',
          version: metadata.version || 1,
        };
        this.importPayload = { definition, metadata };
      } catch {
        this.msg.add({
          severity: 'error',
          summary: 'Invalid JSON',
          detail: 'The selected file contains invalid JSON',
          life: 4000,
        });
      }
    };
    reader.readAsText(file);
  }

  clearImport(): void {
    this.importPreview = null;
    this.importPayload = null;
  }

  executeImport(): void {
    if (!this.importPayload) return;
    this.importing = true;

    this.apiclientSvc.post('/workflow-import-export/import', this.importPayload).subscribe({
      next: (res: Record<string, unknown>) => {
        this.importing = false;
        this.clearImport();
        this.load();
        this.msg.add({
          severity: 'success',
          summary: 'Imported',
          detail: `Workflow "${res?.name || 'New Workflow'}" imported (ID: ${res?.workflowId ?? '—'})`,
          life: 4000,
        });
      },
      error: () => {
        this.importing = false;
        this.msg.add({
          severity: 'error',
          summary: 'Import Failed',
          detail: 'Failed to import workflow. Check the JSON structure.',
          life: 4000,
        });
      },
    });
  }
}
