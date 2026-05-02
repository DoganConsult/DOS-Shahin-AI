import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AI Assistant FAB. There MUST be only one FAB per shell. Consumers
 * must not render their own page-local fixed-position buttons.
 */
@Component({
  selector: 'dos-ai-assistant-fab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="dos-fab"
      [attr.aria-label]="label"
      (click)="open.emit()"
    >
      AI
    </button>
  `,
})
export class DosAiAssistantFabComponent {
  @Input() label = 'Open AI Assistant';
  @Output() open = new EventEmitter<void>();
}
