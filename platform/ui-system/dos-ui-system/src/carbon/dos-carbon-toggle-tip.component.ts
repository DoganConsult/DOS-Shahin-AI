import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggletipModule } from 'carbon-components-angular';

/**
 * Carbon-backed toggle-tip (info-button + popover panel). Carbon ships
 * `<cds-toggletip>` element with `[cdsToggletipButton]` and
 * `[cdsToggletipContent]` directive slots.
 *
 * Inputs: id/isOpen.
 */
@Component({
  selector: 'dos-carbon-toggle-tip',
  standalone: true,
  imports: [CommonModule, ToggletipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-toggletip [isOpen]="isOpen">
      <button cdsToggletipButton type="button" [attr.aria-label]="buttonLabel">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.5 11h-1v-5h1v5Zm0-7h-1V4h1v1Z"/>
        </svg>
      </button>
      <span cdsToggletipContent>
        <ng-content select="[slot=content]"></ng-content>
        <ng-content></ng-content>
      </span>
    </cds-toggletip>
  `,
})
export class DosCarbonToggleTipComponent {
  @Input() isOpen = false;
  @Input() buttonLabel = 'More info';
}
