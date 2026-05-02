import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy,
  ChangeDetectorRef, SecurityContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="markdown-body" [class.rtl]="rtl" [innerHTML]="renderedHtml"></div>
  `,
  styles: [`
    :host { display: block; }
    .markdown-body {
      font-size: var(--font-size-base, 14px);
      line-height: 1.7;
      color: var(--text-body);
      font-family: var(--font-stack-ltr, inherit);
    }
    .markdown-body.rtl { direction: rtl; text-align: right; font-family: var(--font-stack-rtl, inherit); }
    .markdown-body h1 { font-size: 1.5em; margin: 1em 0 0.5em; font-weight: 700; color: var(--text-heading); }
    .markdown-body h2 { font-size: 1.3em; margin: 0.8em 0 0.4em; font-weight: 600; color: var(--text-heading); }
    .markdown-body h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; font-weight: 600; color: var(--text-heading); }
    .markdown-body p { margin: 0 0 0.8em; }
    .markdown-body code {
      background: var(--surface-sunken);
      padding: 2px 6px;
      border-radius: var(--radius-xs, 4px);
      font-family: var(--font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.9em;
    }
    .markdown-body pre {
      background: var(--surface-sunken);
      padding: 12px 16px;
      border-radius: var(--radius);
      overflow-x: auto;
    }
    .markdown-body pre code { background: none; padding: 0; }
    .markdown-body blockquote {
      border-inline-start: 3px solid var(--primary);
      padding-inline-start: 12px;
      margin: 0.5em 0;
      color: var(--text-muted);
    }
    .markdown-body ul, .markdown-body ol { padding-inline-start: 24px; margin: 0.4em 0; }
    .markdown-body a { color: var(--primary); text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
    .markdown-body th, .markdown-body td { border: 1px solid var(--border-subtle); padding: 8px 12px; text-align: start; }
    .markdown-body th { background: var(--surface-sunken); font-weight: 600; }
  `],
})
export class MarkdownViewerComponent implements OnChanges {
  @Input() markdown = '';
  @Input() rtl = false;

  renderedHtml: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['markdown']) {
      await this.render();
    }
  }

  private async render(): Promise<void> {
    if (!this.markdown) {
      this.renderedHtml = '';
      this.cdr.markForCheck();
      return;
    }

    try {
      const commonmark = await import('commonmark');
      const reader = new commonmark.Parser();
      const writer = new commonmark.HtmlRenderer({ safe: true });
      const parsed = reader.parse(this.markdown);
      const html = writer.render(parsed);
      const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
      this.renderedHtml = this.sanitizer.bypassSecurityTrustHtml(sanitized);
    } catch {
      this.renderedHtml = this.sanitizer.bypassSecurityTrustHtml(
        this.markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      );
    }
    this.cdr.markForCheck();
  }
}
