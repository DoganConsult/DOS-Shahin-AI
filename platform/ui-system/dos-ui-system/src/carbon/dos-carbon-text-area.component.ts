import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';

/**
 * Carbon-backed text-area wrapper. Multi-line input with Carbon's
 * `cdsTextArea` directive for native styling + a11y.
 */
@Component({
  selector: 'dos-carbon-text-area',
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
      <textarea
        cdsTextArea
        [theme]="theme"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [rows]="rows"
        [cols]="cols"
        [attr.maxlength]="maxlength"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      ></textarea>
    </cds-text-label>
  `,
})
export class DosCarbonTextAreaComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() rows = 4;
  @Input() cols?: number;
  @Input() maxlength?: number;
  @Input() theme: 'light' | 'dark' = 'light';
  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  onInput(ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }
}
