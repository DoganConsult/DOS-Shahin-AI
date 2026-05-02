/**
 * GRC Form Field Component
 *
 * Standardized form field wrapper that provides consistent labeling,
 * validation error display, and helper text across all GRC forms.
 * Integrates with Angular reactive forms via AbstractControl binding.
 *
 * Usage:
 * ```typescript
 * <grc-form-field label="Email" [required]="true" [control]="form.controls.email">
 *   <input pInputText [formControl]="form.controls.email" />
 * </grc-form-field>
 * ```
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

/** Default validation error messages keyed by validator name */
const VALIDATION_MESSAGES: Record<string, string> = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minlength: 'Value is too short',
  maxlength: 'Value is too long',
  pattern: 'Invalid format',
  min: 'Value is below minimum',
  max: 'Value exceeds maximum',
};

@Component({
    selector: 'grc-form-field',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="grc-field"
         [class.grc-field--compact]="variant === 'compact'"
         [class.grc-field--dense]="variant === 'dense'"
         [class.grc-field--error]="showError"
         [class.grc-field--disabled]="disabled">
      <label *ngIf="label" class="grc-field__label" [attr.for]="fieldId">
        {{ label }}
        <span *ngIf="required" class="grc-field__required" aria-hidden="true">*</span>
      </label>
      <div class="grc-field__control">
        <ng-content></ng-content>
      </div>
      <small *ngIf="showError" class="grc-field__error" role="alert" [attr.id]="fieldId + '-error'">
        {{ resolvedError }}
      </small>
      <small *ngIf="helperText && !showError" class="grc-field__help" [attr.id]="fieldId + '-help'">
        {{ helperText }}
      </small>
    </div>
  `,
    styles: [`
    .grc-field {
      display: flex;
      flex-direction: column;
      gap: var(--field-gap, 8px);
      margin-bottom: var(--field-margin, 16px);
    }
    .grc-field--compact { gap: 6px; margin-bottom: 12px; }
    .grc-field--dense { gap: 4px; margin-bottom: 8px; }

    .grc-field__label {
      font-size: var(--field-label-size, 0.875rem);
      font-weight: var(--field-label-weight, 500);
      color: var(--text-body);
      line-height: 1.4;
    }
    .grc-field--disabled .grc-field__label { opacity: var(--opacity-disabled, 0.5); }

    .grc-field__required {
      color: var(--field-required-color, var(--error));
      margin-inline-start: 2px;
    }

    .grc-field__control {
      display: flex;
      flex-direction: column;
    }
    /* Width 100% for projected PrimeNG controls — uses :host context trick:
       Angular passes through styles to slotted content via ng-content.
       We use a CSS custom property fallback that PrimeNG 19 honours via --p-* tokens. */
    .grc-field__control > * { width: 100%; }

    /* Error state — sets a CSS var that PrimeNG 19 reads via --p-inputtext-border-color */
    .grc-field--error {
      --p-inputtext-border-color: var(--error);
      --p-inputtext-focus-border-color: var(--error);
      --p-select-border-color: var(--error);
    }

    .grc-field__error {
      font-size: var(--field-helper-size, 0.75rem);
      color: var(--error);
      margin-top: var(--field-error-gap, 4px);
      line-height: 1.3;
    }

    .grc-field__help {
      font-size: var(--field-helper-size, 0.75rem);
      color: var(--text-muted);
      margin-top: var(--field-error-gap, 4px);
      line-height: 1.3;
    }
  `]
})
export class GrcFormFieldComponent {
  /** Label text displayed above the form control */
  @Input() label = '';

  /** Whether the field should display a required indicator */
  @Input() required = false;

  /** Helper text shown below the control when there is no error */
  @Input() helperText?: string;

  /** Manual error text override (takes precedence over control errors) */
  @Input() errorText?: string;

  /** Reactive form control for automatic validation display */
  @Input() control?: AbstractControl;

  /** Layout variant: default, compact, or dense spacing */
  @Input() variant: 'default' | 'compact' | 'dense' = 'default';

  /** Whether the field should appear disabled */
  @Input() disabled = false;

  /** HTML id for label-input association and ARIA references */
  @Input() fieldId = `grc-field-${Math.random().toString(36).slice(2, 8)}`;

  /** Determines whether the error message should be visible */
  get showError(): boolean {
    if (this.errorText) return true;
    if (this.control) return this.control.invalid && this.control.touched;
    return false;
  }

  /** Resolves the appropriate error message from manual text or control validators */
  get resolvedError(): string {
    if (this.errorText) return this.errorText;
    if (!this.control?.errors) return '';
    const firstKey = Object.keys(this.control.errors)[0];
    if (!firstKey) return '';
    const err = this.control.errors[firstKey];
    if (firstKey === 'minlength') return `Minimum ${err.requiredLength} characters required`;
    if (firstKey === 'maxlength') return `Maximum ${err.requiredLength} characters allowed`;
    if (firstKey === 'min') return `Minimum value is ${err.min}`;
    if (firstKey === 'max') return `Maximum value is ${err.max}`;
    return VALIDATION_MESSAGES[firstKey] || 'Invalid value';
  }
}
