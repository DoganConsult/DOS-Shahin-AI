import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimePickerModule, TimePickerSelectModule } from 'carbon-components-angular';

/**
 * Carbon-backed time picker. Optional `am/pm` and `tz` selectors live
 * inside `cds-timepicker-select` slots.
 */
@Component({
  selector: 'dos-carbon-time-picker',
  standalone: true,
  imports: [CommonModule, TimePickerModule, TimePickerSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-timepicker
      [label]="label"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [pattern]="pattern"
      [maxLength]="maxlength"
      [placeholder]="placeholder"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    >
      @if (showAmPm) {
        <cds-timepicker-select [(ngModel)]="ampm" name="ampm" [disabled]="disabled">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </cds-timepicker-select>
      }
      @if (timezones.length > 0) {
        <cds-timepicker-select [(ngModel)]="timezone" name="tz" [disabled]="disabled">
          <option *ngFor="let tz of timezones" [value]="tz">{{ tz }}</option>
        </cds-timepicker-select>
      }
    </cds-timepicker>
  `,
})
export class DosCarbonTimePickerComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() ampm: 'AM' | 'PM' = 'AM';
  @Input() timezone = '';
  @Input() timezones: string[] = [];
  @Input() showAmPm = true;
  @Input() pattern = '(1[012]|[1-9]):[0-5][0-9](\\\\s)?';
  @Input() maxlength = 5;
  @Input() placeholder = 'hh:mm';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';

  @Output() valueChange = new EventEmitter<string>();
}
