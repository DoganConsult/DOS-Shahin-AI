import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-bottom-sheet" role="dialog" aria-modal="true">
        <header class="dos-stack-h">
          @if (title) { <strong>{{ title }}</strong> }
          <button type="button" class="dos-command-bar__btn" (click)="closed.emit()">×</button>
        </header>
        <ng-content></ng-content>
      </div>
    }
  `,
})
export class DosBottomSheetComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();
}
