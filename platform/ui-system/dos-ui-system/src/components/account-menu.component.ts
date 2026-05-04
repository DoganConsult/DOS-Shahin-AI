import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'carbon-components-angular';
import { UIShellModule } from 'carbon-components-angular/ui-shell';

export interface DosAccountMenuItem {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
}

@Component({
  selector: 'dos-account-menu',
  standalone: true,
  imports: [CommonModule, DialogModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-header-action
      [description]="buttonLabel"
      [ariaLabel]="buttonLabel"
      [cdsOverflowMenu]="menuPane"
      [flip]="true"
      [offset]="{ x: 0, y: 8 }"
      class="dos-account-menu__trigger"
      data-testid="dos-account-menu-trigger"
    >
      <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M16 4a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm0 14c-5.33 0-10 2.67-10 6v2h20v-2c0-3.33-4.67-6-10-6Z"></path>
      </svg>
    </cds-header-action>

    <ng-template #menuPane>
      <cds-overflow-menu-pane [attr.aria-label]="buttonLabel">
        @if (userName) {
          <cds-overflow-menu-option [disabled]="true">{{ userName }}</cds-overflow-menu-option>
        }
        @if (userEmail) {
          <cds-overflow-menu-option [disabled]="true">{{ userEmail }}</cds-overflow-menu-option>
        }
        @for (item of items; track item.id) {
          <cds-overflow-menu-option
            [type]="item.destructive ? 'danger' : null"
            (selected)="action.emit(item)"
          >{{ item.label }}</cds-overflow-menu-option>
        }
      </cds-overflow-menu-pane>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .dos-account-menu__trigger {
      color: var(--cds-text-on-color, #fff);
    }
  `],
})
export class DosAccountMenuComponent {
  @Input() userName = '';
  @Input() userEmail = '';
  @Input() items: DosAccountMenuItem[] = [];
  @Input() buttonLabel = 'Account';
  @Output() action = new EventEmitter<DosAccountMenuItem>();
}
