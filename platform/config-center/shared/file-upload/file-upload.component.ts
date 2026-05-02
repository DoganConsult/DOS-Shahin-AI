import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxDropzoneModule, NgxDropzoneChangeEvent } from 'ngx-dropzone';

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, NgxDropzoneModule],
  template: `
    <ngx-dropzone
      [accept]="accept"
      [multiple]="multiple"
      [maxFileSize]="maxSizeMb * 1024 * 1024"
      [disabled]="disabled"
      (change)="onFilesAdded($event)"
      class="upload-dropzone"
    >
      <ngx-dropzone-label>
        <i class="pi pi-cloud-upload upload-icon"></i>
        <span class="upload-text">{{ label }}</span>
        <span class="upload-hint" *ngIf="hint">{{ hint }}</span>
      </ngx-dropzone-label>
      <ngx-dropzone-preview
        *ngFor="let f of files"
        [removable]="true"
        (removed)="removeFile(f)"
      >
        <ngx-dropzone-label>{{ f.name }} ({{ formatSize(f.size) }})</ngx-dropzone-label>
      </ngx-dropzone-preview>
    </ngx-dropzone>
  `,
  styles: [`
    .upload-dropzone { min-height: 120px; border: 2px dashed var(--surface-border, #d1d5db); border-radius: var(--radius, 8px); background: var(--surface-card, #fff); }
    .upload-icon { font-size: var(--font-size-4xl); color: var(--primary-color, #3b82f6); display: block; margin-bottom: 8px; }
    .upload-text { font-weight: 600; color: var(--text-color); display: block; }
    .upload-hint { font-size: var(--font-size-sm); color: var(--text-color-secondary); display: block; margin-top: 4px; }
    :host ngx-dropzone-label { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  `],
})
export class FileUploadComponent {
  @Input() accept = '*/*';
  @Input() multiple = true;
  @Input() maxSizeMb = 25;
  @Input() disabled = false;
  @Input() label = 'اسحب الملفات هنا أو انقر للتحميل';
  @Input() hint = '';
  @Output() filesSelected = new EventEmitter<UploadedFile[]>();
  @Output() fileRejected = new EventEmitter<File>();

  files: UploadedFile[] = [];

  onFilesAdded(event: NgxDropzoneChangeEvent): void {
    for (const file of event.addedFiles) {
      this.files.push({ file, name: file.name, size: file.size, type: file.type });
    }
    for (const file of event.rejectedFiles) {
      this.fileRejected.emit(file);
    }
    this.filesSelected.emit([...this.files]);
  }

  removeFile(uploaded: UploadedFile): void {
    const idx = this.files.indexOf(uploaded);
    if (idx >= 0) {
      this.files.splice(idx, 1);
      this.filesSelected.emit([...this.files]);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
