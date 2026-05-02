import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';

/**
 * Carbon-backed password input with show/hide toggle button.
 */
@Component({
  selector: 'dos-carbon-password-input',
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
        cdsPassword
        [type]="visible() ? 'text' : 'password'"
        [theme]="theme"
        [size]="size"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [autocomplete]="autocomplete"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      />
      <button
        type="button"
        class="dos-cb-pwd__toggle"
        [attr.aria-label]="visible() ? hideLabel : showLabel"
        (click)="visible.set(!visible())"
      >{{ visible() ? hideLabel : showLabel }}</button>
    </cds-text-label>
  `,
  styles: [`
    .dos-cb-pwd__toggle {
      appearance: none;
      cursor: pointer;
      background: transparent;
      border: 0;
      color: var(--cds-link-primary);
      font: 600 var(--dos-caption-size, .75rem)/1 inherit;
      margin-inline-start: var(--dos-space-2, .5rem);
    }
  `],
})
export class DosCarbonPasswordInputComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() autocomplete: 'current-password' | 'new-password' | 'off' = 'current-password';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() showLabel = 'Show';
  @Input() hideLabel = 'Hide';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  readonly visible = signal(false);

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }
}
