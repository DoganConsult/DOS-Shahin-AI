import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'carbon-components-angular';

/**
 * Carbon-backed determinate / indeterminate progress bar.
 */
@Component({
  selector: 'dos-carbon-progress-bar',
  standalone: true,
  imports: [CommonModule, ProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-progress-bar
      [label]="label"
      [helperText]="helperText"
      [type]="type"
      [size]="size"
      [status]="status"
      [hideLabel]="hideLabel"
      [value]="value"
      [max]="max"
    ></cds-progress-bar>
  `,
})
export class DosCarbonProgressBarComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() value = 0;
  @Input() max = 100;
  @Input() type: 'default' | 'inline' | 'indented' = 'default';
  @Input() size: 'small' | 'big' = 'big';
  @Input() status: 'active' | 'finished' | 'error' = 'active';
  @Input() hideLabel = false;
}
