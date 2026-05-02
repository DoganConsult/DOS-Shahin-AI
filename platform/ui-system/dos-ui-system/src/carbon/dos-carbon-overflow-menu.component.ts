import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'carbon-components-angular';

export interface DosCarbonOverflowMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

/**
 * Carbon-backed overflow (kebab) menu wrapper.
 *
 * Carbon's overflow-menu is a directive (`cdsOverflowMenu`) attached to
 * a trigger button; the menu options live in `cds-overflow-menu-pane`.
 * This wrapper composes both with a sensible default trigger.
 */
@Component({
  selector: 'dos-carbon-overflow-menu',
  standalone: true,
  imports: [CommonModule, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="cds--overflow-menu"
      [cdsOverflowMenu]="menuPane"
      [flip]="flip"
      [offset]="offset"
      [attr.aria-label]="buttonLabel"
    >
      <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
        <circle cx="16" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="16" cy="24" r="2"/>
      </svg>
    </button>
    <ng-template #menuPane>
      <cds-overflow-menu-pane>
        <ng-container *ngFor="let item of items">
          <cds-overflow-menu-option
            *ngIf="!item.divider"
            [disabled]="item.disabled || false"
            [type]="item.danger ? 'danger' : null"
            (selected)="selected.emit(item.id)"
          >{{ item.label }}</cds-overflow-menu-option>
        </ng-container>
      </cds-overflow-menu-pane>
    </ng-template>
  `,
})
export class DosCarbonOverflowMenuComponent {
  @Input() items: DosCarbonOverflowMenuItem[] = [];
  @Input() flip = false;
  @Input() offset: { x: number; y: number } = { x: 0, y: 0 };
  @Input() buttonLabel = 'Options';
  @Output() selected = new EventEmitter<string>();
}
