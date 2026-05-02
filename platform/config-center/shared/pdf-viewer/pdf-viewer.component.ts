import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  template: `
    <div class="pdf-container" [style.height]="height">
      <ngx-extended-pdf-viewer
        *ngIf="useExtendedViewer && src"
        [src]="src"
        [height]="height"
        [zoom]="zoomPercent"
        [showToolbar]="showToolbar"
        [showSidebarButton]="showSidebar"
        [showFindButton]="true"
        [showPrintButton]="true"
        [showDownloadButton]="true"
        [showZoomButtons]="true"
        [showPagingButtons]="true"
        [textLayer]="true"
        [language]="language"
        (pageChange)="onPageChange($event)"
      ></ngx-extended-pdf-viewer>
      <iframe
        *ngIf="!useExtendedViewer && src"
        [src]="src"
        class="pdf-frame"
        [title]="title"
      ></iframe>
      <div *ngIf="!src" class="pdf-placeholder">
        <i class="pi pi-file-pdf"></i>
        <span>No PDF loaded</span>
      </div>
    </div>
    <div *ngIf="showToolbar && !useExtendedViewer && src" class="pdf-toolbar">
      <button class="toolbar-btn" (click)="zoomOut()" title="Zoom Out">
        <i class="pi pi-search-minus"></i>
      </button>
      <span class="zoom-level">{{ zoomPercent }}%</span>
      <button class="toolbar-btn" (click)="zoomIn()" title="Zoom In">
        <i class="pi pi-search-plus"></i>
      </button>
      <button class="toolbar-btn" (click)="downloadPdf()" title="Download">
        <i class="pi pi-download"></i>
      </button>
      <button class="toolbar-btn" (click)="printPdf()" title="Print">
        <i class="pi pi-print"></i>
      </button>
    </div>
  `,
  styles: [`
    .pdf-container { width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; position: relative; }
    .pdf-frame { width: 100%; height: 100%; border: none; }
    .pdf-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; color: var(--text-color-secondary); }
    .pdf-placeholder i { font-size: var(--font-size-6xl); }
    .pdf-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface-ground, #f9fafb); border-top: 1px solid var(--surface-border); }
    .toolbar-btn { background: none; border: 1px solid var(--surface-border); border-radius: var(--radius-xs); padding: 6px 10px; cursor: pointer; color: var(--text-color); transition: background 0.2s; }
    .toolbar-btn:hover { background: var(--surface-hover); }
    .zoom-level { font-size: var(--font-size-sm); font-weight: 500; min-width: 40px; text-align: center; }
  `],
})
export class PdfViewerComponent {
  @Input() src: string = '';
  @Input() height = '600px';
  @Input() title = 'PDF Document';
  @Input() showToolbar = true;
  @Input() showSidebar = false;
  @Input() useExtendedViewer = false;
  @Input() language = 'en';
  @Output() pageChange = new EventEmitter<number>();

  zoomPercent = 100;
  private zoomStep = 25;

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  zoomIn(): void {
    this.zoomPercent = Math.min(this.zoomPercent + this.zoomStep, 300);
  }

  zoomOut(): void {
    this.zoomPercent = Math.max(this.zoomPercent - this.zoomStep, 25);
  }

  downloadPdf(): void {
    if (!this.src) return;
    const a = document.createElement('a');
    a.href = this.src;
    a.download = this.title || 'document.pdf';
    a.click();
  }

  printPdf(): void {
    if (!this.src) return;
    const win = window.open(this.src, '_blank');
    if (win) {
      win.addEventListener('load', () => win.print());
    }
  }
}
