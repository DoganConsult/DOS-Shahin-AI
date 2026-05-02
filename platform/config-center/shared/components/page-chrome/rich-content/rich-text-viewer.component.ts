import { Component, Input, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';

/**
 * Rich Text Viewer Component
 * 
 * Displays HTML content with safe sanitization using DOMPurify.
 * Replaces Angular's DomSanitizer with DOMPurify for more robust security.
 * 
 * Requirements: ui-ux-s2
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rich-text-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rtv-content" *ngIf="content" [innerHTML]="safeContent"></div>
    <span *ngIf="!content" class="rtv-empty">{{ emptyText }}</span>
  `,
  styles: [`
    .rtv-content {
      font-size: var(--font-size-base); line-height: 1.6; color: var(--text-color);
    }
    .rtv-content :first-child { margin-top: 0; }
    .rtv-content :last-child { margin-bottom: 0; }
    .rtv-empty { color: var(--text-color-secondary); font-style: italic; font-size: var(--font-size-sm); }
  `]
})
export class RichTextViewerComponent {
  @Input() content = '';
  @Input() emptyText = '—';

  private htmlSanitizer = inject(HtmlSanitizerService);

  get safeContent(): string {
    return this.htmlSanitizer.sanitize(this.content || '');
  }
}
