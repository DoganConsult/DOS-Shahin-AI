import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'carbon-components-angular';

/**
 * Carbon-backed tooltip wrapper. Carbon's tooltip is a `<cds-tooltip>`
 * element that wraps the trigger via content projection.
 *
 * Inputs: id/enterDelayMs/leaveDelayMs/disabled/description/templateContext.
 */
@Component({
  selector: 'dos-carbon-tooltip',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-tooltip
      [description]="description"
      [enterDelayMs]="enterDelayMs"
      [leaveDelayMs]="leaveDelayMs"
      [disabled]="disabled"
    >
      <ng-content></ng-content>
    </cds-tooltip>
  `,
})
export class DosCarbonTooltipComponent {
  @Input() description = '';
  @Input() enterDelayMs = 100;
  @Input() leaveDelayMs = 100;
  @Input() disabled = false;
}
