import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverflowMenuModule } from 'carbon-components-angular';

export interface DosAccountMenuItem {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
}

@Component({
  selector: 'dos-account-menu',
  standalone: true,
  imports: [CommonModule, OverflowMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ibm-overflow-menu
      [flip]="true"
      [description]="buttonLabel"
      class="dos-account-menu__trigger"
      data-testid="dos-account-menu-trigger"
    >
      @if (userName) {
        <ibm-overflow-menu-option [disabled]="true">{{ userName }}</ibm-overflow-menu-option>
      }
      @if (userEmail) {
        <ibm-overflow-menu-option [disabled]="true">{{ userEmail }}</ibm-overflow-menu-option>
      }
      @for (item of items; track item.id) {
        <ibm-overflow-menu-option
          [type]="item.destructive ? 'danger' : null"
          (selected)="action.emit(item)"
        >{{ item.label }}</ibm-overflow-menu-option>
      }
    </ibm-overflow-menu>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
    }
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
