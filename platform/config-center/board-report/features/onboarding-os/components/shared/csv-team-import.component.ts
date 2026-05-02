import { Component, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-csv-team-import',
    imports: [CommonModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="csv-import" [class.rtl]="lang === 'ar'">
      <div class="csv-header">
        <i class="pi pi-upload"></i>
        {{ lang === 'ar' ? 'استيراد الفريق من CSV' : 'Import Team from CSV' }}
      </div>
      <div class="csv-dropzone"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
        [class.dragging]="dragging()">
        <i class="pi pi-cloud-upload"></i>
        <p>{{ lang === 'ar' ? 'اسحب ملف CSV هنا أو' : 'Drag a CSV file here or' }}</p>
        <label class="csv-browse">
          {{ lang === 'ar' ? 'تصفح' : 'Browse' }}
          <input type="file" accept=".csv" (change)="onFileSelected($event)" style="display:none" />
        </label>
        <span class="csv-hint">{{ lang === 'ar' ? 'الأعمدة: الاسم، البريد، المسمى، القسم' : 'Columns: Name, Email, Title, Department' }}</span>
      </div>
      <div class="csv-result" *ngIf="fileName()">
        <i class="pi pi-file"></i>
        <span>{{ fileName() }}</span>
        <span class="csv-rows">{{ rowCount() }} {{ lang === 'ar' ? 'صف' : 'rows' }}</span>
        <button pButton icon="pi pi-times" class="p-button-text p-button-sm p-button-danger" (click)="clear()"></button>
      </div>
    </div>
  `,
    styles: [`
    .csv-import { margin: 1rem 0; }
    .csv-header {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: var(--font-size-tag); font-weight: 700; color: var(--text-heading);
      margin-bottom: 0.5rem;
    }
    .csv-header i { color: var(--primary); }
    .csv-dropzone {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
      padding: 1.5rem; border: 2px dashed var(--border-subtle);
      border-radius: var(--radius-lg, 12px); text-align: center;
      transition: all 200ms; cursor: pointer;
    }
    .csv-dropzone:hover, .csv-dropzone.dragging {
      border-color: var(--primary); background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.04));
    }
    .csv-dropzone i { font-size: var(--font-size-2xl); color: var(--text-muted); }
    .csv-dropzone p { font-size: 0.82rem; color: var(--text-muted); margin: 0; }
    .csv-browse {
      font-size: 0.82rem; font-weight: 600; color: var(--primary);
      cursor: pointer; text-decoration: underline;
    }
    .csv-hint {
      font-size: 0.68rem; color: var(--text-muted); opacity: 0.7;
    }
    .csv-result {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.6rem 0.85rem; margin-top: 0.5rem;
      background: rgba(var(--success-rgb), 0.04); border: 1px solid rgba(var(--success-rgb), 0.15);
      border-radius: var(--radius, 8px); font-size: 0.82rem;
    }
    .csv-result i { color: var(--status-success, #24a148); }
    .csv-rows { color: var(--text-muted); font-size: var(--font-size-sm); margin-inline-start: auto; }
    .rtl { direction: rtl; }
  `]
})
export class CsvTeamImportComponent {
  @Output() fileUploaded = new EventEmitter<{ file: File; rows: number }>();
  lang: 'en' | 'ar' = 'en';

  dragging = signal(false);
  fileName = signal('');
  rowCount = signal(0);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.name.endsWith('.csv')) this.processFile(file);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const lines = (reader.result as string).split('\n').filter(l => l.trim());
      const rows = Math.max(0, lines.length - 1); // Subtract header
      this.rowCount.set(rows);
      this.fileUploaded.emit({ file, rows });
    };
    reader.readAsText(file);
  }

  clear(): void {
    this.fileName.set('');
    this.rowCount.set(0);
  }
}
