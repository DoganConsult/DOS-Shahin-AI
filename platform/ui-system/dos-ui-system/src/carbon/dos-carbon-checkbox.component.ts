import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckboxModule } from 'carbon-components-angular';

/**
 * Carbon-backed checkbox wrapper. One-source rule: import this from
 * @dos/ui-system, never `cds-checkbox` directly from products/modules.
 */
@Component({
  selector: 'dos-carbon-checkbox',
  standalone: true,
  imports: [CommonModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-checkbox
      [checked]="checked"
      [disabled]="disabled"
      [readOnly]="readOnly"
      [indeterminate]="indeterminate"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [helperText]="helperText"
      [hideLabel]="hideLabel"
      [name]="name"
      [value]="value"
      (checkedChange)="checkedChange.emit($event)"
      (indeterminateChange)="indeterminateChange.emit($event)"
    >{{ label }}</cds-checkbox>
  `,
})
export class DosCarbonCheckboxComponent {
  @Input() label = '';
  @Input() checked = false;
  @Input() indeterminate = false;
  @Input() disabled = false;
  @Input() readOnly = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';
  @Input() helperText = '';
  @Input() hideLabel = false;
  @Input() name = '';
  @Input() value = '';
  @Output() checkedChange = new EventEmitter<boolean>();
  @Output() indeterminateChange = new EventEmitter<boolean>();
}
