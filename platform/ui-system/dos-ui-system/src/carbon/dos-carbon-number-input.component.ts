import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';

/**
 * Carbon-backed numeric input. Carbon ships `cdsNumber` as a directive
 * applied to a native `<input type="number">`. This wrapper composes
 * the directive with `cds-text-label` for label + helper-text rhythm.
 */
@Component({
  selector: 'dos-carbon-number-input',
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
        cdsNumber
        type="number"
        [size]="size"
        [disabled]="disabled"
        [attr.min]="min"
        [attr.max]="max"
        [attr.step]="step"
        [value]="value"
        (input)="onInput($event)"
      />
    </cds-text-label>
  `,
})
export class DosCarbonNumberInputComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() value: number | null = 0;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step = 1;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Output() valueChange = new EventEmitter<number | null>();

  onInput(ev: Event): void {
    const raw = (ev.target as HTMLInputElement).value;
    const num = Number(raw);
    this.value = Number.isFinite(num) ? num : null;
    this.valueChange.emit(this.value);
  }
}
