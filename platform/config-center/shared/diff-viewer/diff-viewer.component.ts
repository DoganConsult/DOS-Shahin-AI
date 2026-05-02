import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-diff-viewer',
    imports: [CommonModule],
    template: `
    <div class="diff-viewer" [innerHTML]="diffHtml"></div>
  `,
    styles: [`
    .diff-viewer { border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: auto; font-family: 'IBM Plex Mono', monospace; font-size: var(--font-size-sm); }
    :host .d2h-wrapper { padding: 0; }
  `]
})
export class DiffViewerComponent implements OnChanges {
  @Input() oldText = '';
  @Input() newText = '';
  @Input() oldFileName = 'before';
  @Input() newFileName = 'after';
  @Input() outputFormat: 'side-by-side' | 'line-by-line' = 'line-by-line';

  diffHtml: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['oldText'] || changes['newText']) {
      await this.renderDiff();
    }
  }

  private async renderDiff(): Promise<void> {
    try {
      const Diff2Html = await import('diff2html');

      const unifiedDiff = this.createUnifiedDiff(this.oldText, this.newText, this.oldFileName, this.newFileName);

      const html = Diff2Html.html(unifiedDiff, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: this.outputFormat === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      });

      this.diffHtml = this.sanitizer.bypassSecurityTrustHtml(html);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('[DiffViewer] Render failed:', err);
    }
  }

  private createUnifiedDiff(oldStr: string, newStr: string, oldName: string, newName: string): string {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    let diff = `--- a/${oldName}\n+++ b/${newName}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
    for (const line of oldLines) diff += `-${line}\n`;
    for (const line of newLines) diff += `+${line}\n`;
    return diff;
  }
}
