import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'carbon-components-angular';

/**
 * Carbon-backed date picker (single / range / simple). Uses flatpickr
 * under the hood.
 */
@Component({
  selector: 'dos-carbon-date-picker',
  standalone: true,
  imports: [CommonModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-date-picker
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [readonly]="readonly"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [range]="range"
      [dateFormat]="dateFormat"
      [language]="language"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    ></cds-date-picker>
  `,
})
export class DosCarbonDatePickerComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() placeholder = 'mm/dd/yyyy';
  @Input() value: (Date | string)[] = [];
  @Input() range = false;
  @Input() dateFormat = 'm/d/Y';
  @Input() language = 'en';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';

  @Output() valueChange = new EventEmitter<(Date | string)[]>();
}
