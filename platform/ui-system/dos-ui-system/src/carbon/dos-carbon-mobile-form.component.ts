import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @dos/ui-system Mobile Carbon wrapper — Form.
 *
 * Mobile-optimized form container with stacked layout, larger inputs,
 * auto-scroll to errors, and enhanced touch targets.
 * Provides mobile-specific form behavior wrapper.
 */
@Component({
  selector: 'dos-carbon-mobile-form',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="dos-mobile-form"
      [class.dos-mobile-form--stacked]="stackedLayout"
      (submit)="handleSubmit($event)"
      (ngSubmit)="handleSubmit($event)"
    >
      <ng-content></ng-content>
    </form>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .dos-mobile-form {
      width: 100%;
      padding: 16px;
    }
    .dos-mobile-form--stacked {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dos-mobile-form input,
    .dos-mobile-form select,
    .dos-mobile-form textarea,
    .dos-mobile-form button {
      min-height: 44px;
      font-size: 16px;
    }
    .dos-mobile-form button[type="submit"] {
      margin-top: 24px;
    }
  `],
})
export class DosCarbonMobileFormComponent {
  @Input() stackedLayout = true;
  @Input() largerInputs = true;
  @Input() autoScrollErrors = true;
  @Input() hapticFeedback = false;
  @Output() submitted = new EventEmitter<Event>();
  @Output() formError = new EventEmitter<{ field: string; message: string }>();

  handleSubmit(event: Event): void {
    event.preventDefault();
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    if (this.autoScrollErrors) {
      this.scrollToFirstError();
    }
    this.submitted.emit(event);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const errorElement = document.querySelector('.cds--form-requirement, .cds--text-input--invalid');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}
