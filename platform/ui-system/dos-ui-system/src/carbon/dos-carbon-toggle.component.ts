import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleModule } from 'carbon-components-angular';

/**
 * Carbon-backed toggle. Carbon's `cds-toggle` is a ControlValueAccessor —
 * checked state binds via ngModel.
 */
@Component({
  selector: 'dos-carbon-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-toggle
      [size]="size"
      [skeleton]="skeleton"
      [hideLabel]="hideLabel"
      [label]="label"
      [offText]="offText"
      [onText]="onText"
      [(ngModel)]="checked"
      (ngModelChange)="checkedChange.emit($event)"
    ></cds-toggle>
  `,
})
export class DosCarbonToggleComponent {
  @Input() label = '';
  @Input() checked = false;
  @Input() skeleton = false;
  @Input() hideLabel = false;
  @Input() onText = 'On';
  @Input() offText = 'Off';
  @Input() size: 'sm' | 'md' = 'md';
  @Output() checkedChange = new EventEmitter<boolean>();
}
