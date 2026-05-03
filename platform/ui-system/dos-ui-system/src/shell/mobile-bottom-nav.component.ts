import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosBottomNavItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'dos-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-bottom-nav" aria-label="Bottom navigation">
      @for (item of items; track item.id) {
        <button
          type="button"
          class="dos-bottom-nav__item"
          [attr.aria-current]="item.active ? 'page' : null"
          (click)="select.emit(item)"
        >
          {{ item.label }}
        </button>
      }
    </nav>
  `,
})
export class DosMobileBottomNavComponent {
  @Input() items: DosBottomNavItem[] = [];
  @Output() select = new EventEmitter<DosBottomNavItem>();
}
