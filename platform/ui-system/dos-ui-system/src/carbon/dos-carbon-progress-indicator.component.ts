import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressIndicatorModule } from 'carbon-components-angular';

export interface DosCarbonProgressStep {
  state: 'incomplete' | 'current' | 'complete' | 'invalid' | 'disabled';
  label: string;
  optionalLabel?: string;
  description?: string;
}

/**
 * Carbon-backed progress indicator (stepper). Supports horizontal
 * and vertical orientation. Required on multi-step wizards.
 */
@Component({
  selector: 'dos-carbon-progress-indicator',
  standalone: true,
  imports: [CommonModule, ProgressIndicatorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-progress-indicator
      [steps]="steps"
      [orientation]="orientation"
      [skeleton]="skeleton"
      [spacing]="spaceEqually ? 'equal' : 'default'"
      [current]="current"
      (stepSelected)="stepSelected.emit($event)"
    ></cds-progress-indicator>
  `,
})
export class DosCarbonProgressIndicatorComponent {
  @Input() steps: DosCarbonProgressStep[] = [];
  @Input() current = 0;
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() skeleton = false;
  @Input() spaceEqually = false;
  @Output() stepSelected = new EventEmitter<number>();
}
