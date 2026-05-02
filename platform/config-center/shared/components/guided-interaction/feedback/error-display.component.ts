/**
 * Error Display Component - Unified error display with recovery actions.
 * Requirements: 7.4, 7.9
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-display" role="alert">
      <i class="pi pi-exclamation-triangle error-icon"></i>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="error-actions">
        <button *ngIf="showRetry" class="retry-btn" (click)="retry.emit()">
          <i class="pi pi-refresh"></i> {{ retryLabel }}
        </button>
        <button *ngIf="showBack" class="back-btn" (click)="goBack.emit()">
          {{ backLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-display { display: flex; flex-direction: column; align-items: center; padding: 48px 24px; text-align: center; }
    .error-icon { font-size: var(--font-size-6xl); color: var(--red-400, #f87171); margin-bottom: 16px; }
    h3 { margin: 0 0 8px 0; font-size: var(--font-size-body-md); }
    p { margin: 0 0 16px 0; font-size: var(--font-size-body-sm); color: var(--text-color-secondary, #888); max-width: 400px; }
    .error-actions { display: flex; gap: 12px; }
    .retry-btn { padding: 8px 20px; border: none; border-radius: var(--radius-sm); background: var(--primary-color, #4f46e5); color: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .back-btn { padding: 8px 20px; border: 1px solid var(--surface-border, #ddd); border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
  `]
})
export class ErrorDisplayComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'An unexpected error occurred. Please try again.';
  @Input() showRetry = true;
  @Input() showBack = true;
  @Input() retryLabel = 'Try Again';
  @Input() backLabel = 'Go Back';
  @Output() retry = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
}
