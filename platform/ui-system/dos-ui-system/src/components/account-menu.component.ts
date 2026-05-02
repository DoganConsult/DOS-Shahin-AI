import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosAccountMenuItem {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
}

@Component({
  selector: 'dos-account-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-account-menu" role="menu">
      @if (userName) { <div><strong>{{ userName }}</strong></div> }
      @if (userEmail) { <div class="dos-page-header__description">{{ userEmail }}</div> }
      @for (item of items; track item.id) {
        <button
          type="button"
          role="menuitem"
          class="dos-bottom-nav__item"
          (click)="action.emit(item)"
        >
          {{ item.label }}
        </button>
      }
    </div>
  `,
})
export class DosAccountMenuComponent {
  @Input() userName = '';
  @Input() userEmail = '';
  @Input() items: DosAccountMenuItem[] = [];
  @Output() action = new EventEmitter<DosAccountMenuItem>();
}
