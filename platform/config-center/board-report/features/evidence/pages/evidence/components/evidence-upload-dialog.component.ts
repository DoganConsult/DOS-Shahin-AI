import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { EvidenceTableItem } from './evidence-table.component';

/**
 * Presentational component: submit evidence, new version, and file upload dialogs.
 */
@Component({
    selector: 'app-evidence-upload-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, AppNumberPipe, DialogModule, InputTextModule, InputTextarea, ButtonModule],
    template: `
    <!-- Submit Evidence Dialog -->
    <p-dialog [header]="i18n.translate('evidence.submit')"
      [(visible)]="submitVisible" [modal]="true" [style]="{width:'560px'}"
      (onHide)="submitVisibleChange.emit(false)">
      <div class="dialog-form">
        <label>{{ i18n.translate('evidence.controlId') }}</label>
        <input pInputText [(ngModel)]="form.controlId" class="w-full" placeholder="Control UUID" aria-label="Control UUID" />
        <label>Title</label>
        <input pInputText [(ngModel)]="form.title" class="w-full" placeholder="Evidence title" aria-label="Evidence title" />
        <label>Description</label>
        <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full" placeholder="Evidence description" aria-label="Evidence description"></textarea>
        <label>Content / URL</label>
        <textarea pInputTextarea [(ngModel)]="form.content" [rows]="3" class="w-full" placeholder="Evidence content, URL, or reference" aria-label="Evidence content, URL, or reference"></textarea>
        <label>Expiry Date (optional)</label>
        <input pInputText [(ngModel)]="form.expiryDate" class="w-full" placeholder="YYYY-MM-DD" aria-label="YYYY-MM-DD" />
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" [text]="true" (onClick)="submitVisibleChange.emit(false)" />
        <p-button [label]="i18n.translate('evidence.submit')" icon="pi pi-upload" (onClick)="submitEvidence.emit(form)" [disabled]="!form.controlId || !form.title" />
      </ng-template>
    </p-dialog>

    <!-- Version Dialog -->
    <p-dialog header="Submit New Version"
      [(visible)]="versionVisible" [modal]="true" [style]="{width:'520px'}"
      (onHide)="versionVisibleChange.emit(false)">
      <div class="dialog-form" *ngIf="versionTarget">
        <p class="text-muted">Creating new version for: <strong>{{ versionTarget.title }}</strong></p>
        <label>Title</label>
        <input pInputText [(ngModel)]="versionForm.title" class="w-full" />
        <label>Description</label>
        <textarea pInputTextarea [(ngModel)]="versionForm.description" [rows]="3" class="w-full"></textarea>
        <label>Expiry Date (optional)</label>
        <input pInputText [(ngModel)]="versionForm.expiryDate" class="w-full" placeholder="YYYY-MM-DD" aria-label="YYYY-MM-DD" />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="versionVisibleChange.emit(false)" />
        <p-button label="Submit Version" icon="pi pi-plus" (onClick)="submitVersion.emit(versionForm)" [disabled]="!versionForm.title" />
      </ng-template>
    </p-dialog>

    <!-- Upload File Dialog -->
    <p-dialog header="Upload Evidence File"
      [(visible)]="uploadVisible" [modal]="true" [style]="{width:'520px'}"
      (onHide)="uploadVisibleChange.emit(false)">
      <div *ngIf="uploadTarget" class="upload-dialog-body">
        <div class="upload-target-info">
          <i class="pi pi-file-edit"></i>
          <div>
            <span class="upload-target-label">Attach a file to:</span>
            <strong class="upload-target-name">{{ uploadTarget.title }}</strong>
          </div>
        </div>
        <div class="upload-dropzone" [class.has-file]="selectedFile">
          <input type="file" (change)="onFileSelect($event)" class="upload-file-input" id="evidenceFileInput" />
          <label for="evidenceFileInput" class="upload-dropzone-label">
            <i class="pi" [ngClass]="selectedFile ? 'pi-check-circle' : 'pi-cloud-upload'"></i>
            <span *ngIf="!selectedFile">Click to select a file</span>
            <span *ngIf="selectedFile" class="upload-file-name">{{ selectedFile.name }}</span>
            <small *ngIf="selectedFile">{{ (selectedFile.size / 1024) | appNumber:'decimal':'1.0-0' }} KB</small>
          </label>
        </div>
        <div *ngIf="uploading" class="upload-progress">
          <div class="upload-progress-bar"><div class="upload-progress-fill"></div></div>
          <small>Uploading...</small>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="uploadVisibleChange.emit(false)" />
        <p-button label="Upload" icon="pi pi-upload" (onClick)="uploadFile.emit(selectedFile)" [disabled]="!selectedFile" [loading]="uploading" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .dialog-form label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .w-full { width: 100%; }
    .text-muted { color: var(--text-muted, #9ca3af); }
    .upload-dialog-body { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .upload-target-info { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius-md); }
    .upload-target-info i { font-size: var(--font-size-2xl); color: #0284c7; }
    .upload-target-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted); }
    .upload-target-name { display: block; font-size: var(--font-size-base); color: var(--text-heading); }
    .upload-dropzone { position: relative; border: 2px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 24px; text-align: center; transition: all 0.2s; cursor: pointer; }
    .upload-dropzone:hover { border-color: var(--primary); background: #faf5ff; }
    .upload-dropzone.has-file { border-color: var(--success); background: var(--status-success-bg, #defbe6); }
    .upload-file-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .upload-dropzone-label { display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
    .upload-dropzone-label i { font-size: var(--font-size-3xl); color: var(--text-muted); }
    .upload-dropzone.has-file .upload-dropzone-label i { color: var(--success); }
    .upload-file-name { font-weight: 600; color: var(--text-heading); font-size: var(--font-size-base); }
    .upload-dropzone-label small { font-size: var(--font-size-sm); color: var(--text-muted); }
    .upload-progress { text-align: center; }
    .upload-progress small { font-size: var(--font-size-sm); color: var(--primary); }
    .upload-progress-bar { width: 100%; height: 6px; background: var(--border-subtle); border-radius: var(--radius-xs); overflow: hidden; margin-bottom: 4px; }
    .upload-progress-fill { width: 100%; height: 100%; background: linear-gradient(90deg, var(--primary), #818cf8); border-radius: var(--radius-xs); animation: progressPulse 1.5s ease-in-out infinite; }
    @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  `]
})
export class EvidenceUploadDialogComponent {
  @Input() submitVisible = false;
  @Input() form: Record<string, any> = { controlId: '', title: '', description: '', content: '', expiryDate: '' };

  @Input() versionVisible = false;
  @Input() versionTarget: EvidenceTableItem | null = null;
  @Input() versionForm: Record<string, any> = { title: '', description: '', expiryDate: '' };

  @Input() uploadVisible = false;
  @Input() uploadTarget: EvidenceTableItem | null = null;
  @Input() uploading = false;

  @Output() submitVisibleChange = new EventEmitter<boolean>();
  @Output() submitEvidence = new EventEmitter<Record<string, any>>();
  @Output() versionVisibleChange = new EventEmitter<boolean>();
  @Output() submitVersion = new EventEmitter<Record<string, any>>();
  @Output() uploadVisibleChange = new EventEmitter<boolean>();
  @Output() uploadFile = new EventEmitter<File | null>();

  selectedFile: File | null = null;

  constructor(public i18n: I18nService) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }
}
