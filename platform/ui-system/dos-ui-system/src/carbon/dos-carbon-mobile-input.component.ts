import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';

let __dosCarbonMobileTextSeq = 0;

/**
 * @dos/ui-system Mobile Carbon wrapper — Text Input.
 *
 * Mobile-optimized text input with 16px minimum font size (iOS requirement),
 * larger touch targets, enhanced padding, and auto-focus handling.
 * Wraps `cds-text` from carbon-components-angular with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-input',
  standalone: true,
  imports: [CommonModule, InputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-text-label
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
    >
      {{ label }}
      <input
        cdsText
        [theme]="theme"
        [size]="size"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [attr.name]="name || null"
        [attr.id]="fieldId"
        [attr.autocomplete]="autocomplete"
        [attr.inputmode]="inputmode"
        [attr.type]="type"
        [value]="value"
        [style.fontSize.px]="fontSize"
        [style.padding.px]="padding"
        [style.min-height.px]="touchTargetSize"
        (input)="onInput($event)"
        (blur)="handleBlur()"
        (focus)="handleFocus()"
      />
    </cds-text-label>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    input {
      transition: border-color 0.12s ease-out;
    }
    input:focus {
      transform: scale(1.01);
    }
  `],
})
export class DosCarbonMobileInputComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'lg';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() name = '';
  @Input() id = '';
  @Input() autocomplete: string | null = null;
  @Input() inputmode: string | null = null;
  @Input() type: 'text' | 'email' | 'tel' | 'url' | 'search' = 'text';
  @Input() fontSize = 16; // iOS minimum to prevent zoom
  @Input() padding = 12;
  @Input() touchTargetSize = 44;
  @Input() autoFocus = false;
  @Input() hapticFeedback = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();
  @Output() focused = new EventEmitter<void>();
  private readonly _autoId = `dos-carbon-mobile-text-${++__dosCarbonMobileTextSeq}`;
  get fieldId(): string {
    return this.id || this.name || this._autoId;
  }

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }

  handleBlur(): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.blurred.emit();
  }

  handleFocus(): void {
    if (this.autoFocus) {
      this.scrollToInput();
    }
    this.focused.emit();
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(5); // Very light feedback
    }
  }

  private scrollToInput(): void {
    setTimeout(() => {
      const el = document.getElementById(this.fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}
