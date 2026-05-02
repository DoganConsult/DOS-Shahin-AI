import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeSnippetModule } from 'carbon-components-angular';

/**
 * Carbon-backed code snippet. Three display modes:
 *   • inline    — short keyword
 *   • single    — single-line code with copy button
 *   • multi     — multi-line code with show-more / copy
 */
@Component({
  selector: 'dos-carbon-code-snippet',
  standalone: true,
  imports: [CommonModule, CodeSnippetModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-code-snippet
      [display]="display"
      [theme]="theme"
      [skeleton]="skeleton"
      [hideCopyButton]="hideCopyButton"
      [feedbackText]="feedback"
      [feedbackTimeout]="feedbackTimeout"
      [wrapText]="wrapText"
      (copyCode)="copied.emit($event)"
    >{{ code }}</cds-code-snippet>
  `,
})
export class DosCarbonCodeSnippetComponent {
  @Input() code = '';
  @Input() display: 'single' | 'multi' | 'inline' = 'single';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() skeleton = false;
  @Input() hideCopyButton = false;
  @Input() feedback = 'Copied!';
  @Input() feedbackTimeout = 2000;
  @Input() wrapText = false;
  @Output() copied = new EventEmitter<string>();
}
