import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SliderModule } from 'carbon-components-angular';

/**
 * Carbon-backed slider wrapper. Carbon's `cds-slider` only exposes:
 *   min/max/step/value/id/shiftMultiplier/skeleton/label/disabled/readonly/disableArrowKeys
 * Helper / warn / invalid states ride on the parent form context.
 */
@Component({
  selector: 'dos-carbon-slider',
  standalone: true,
  imports: [CommonModule, SliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-slider
      [min]="min"
      [max]="max"
      [step]="step"
      [value]="value"
      [disabled]="disabled"
      [readonly]="readonly"
      [skeleton]="skeleton"
      [shiftMultiplier]="shiftMultiplier"
      [disableArrowKeys]="disableArrowKeys"
      [label]="label"
      (valueChange)="valueChange.emit($event)"
    ></cds-slider>
  `,
})
export class DosCarbonSliderComponent {
  @Input() label = '';
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() shiftMultiplier = 4;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() skeleton = false;
  @Input() disableArrowKeys = false;
  @Output() valueChange = new EventEmitter<number>();
}
