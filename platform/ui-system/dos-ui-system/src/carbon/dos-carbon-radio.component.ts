import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioModule } from 'carbon-components-angular';

export interface DosCarbonRadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Carbon-backed radio group. Carbon's `cds-radio-group` exposes
 * `value` two-way and emits `change` when the selection changes.
 */
@Component({
  selector: 'dos-carbon-radio',
  standalone: true,
  imports: [CommonModule, RadioModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-radio-group
      [orientation]="orientation"
      [legend]="legend"
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [skeleton]="skeleton"
      [name]="name"
      [disabled]="disabled"
      [value]="value"
      (change)="onChange($event)"
    >
      <cds-radio
        *ngFor="let opt of options"
        [value]="opt.value"
        [disabled]="opt.disabled || false"
      >{{ opt.label }}</cds-radio>
    </cds-radio-group>
  `,
})
export class DosCarbonRadioComponent {
  @Input() options: DosCarbonRadioOption[] = [];
  @Input() value: string | null = null;
  @Input() name = '';
  @Input() legend = '';
  @Input() orientation: 'horizontal' | 'vertical' = 'vertical';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';
  @Input() skeleton = false;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string | null>();

  onChange(ev: { value?: string }): void {
    const v = ev?.value ?? null;
    this.value = v;
    this.valueChange.emit(v);
  }
}
