import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
import { DosNavItemComponent } from './nav-item.component';

/**
 * DosNavSection — labelled group of nav items.
 * Refined to use Carbon SideNav menu policies.
 */
@Component({
  selector: 'dos-nav-section',
  standalone: true,
  imports: [CommonModule, UIShellModule, DosNavItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (group.items?.length) {
      <cds-sidenav-menu [title]="group.label" [expanded]="true">
        @for (item of group.items; track item.id) {
          <dos-nav-item
            [item]="item"
            [active]="isActive(item)"
            (select)="select.emit($event)"
          ></dos-nav-item>
        }
      </cds-sidenav-menu>
    } @else {
       <!-- Flat items in a group without children are not standard in SideNav menus, 
            but we handle it as a single non-menu item if it had a route, 
            or just skip if it's an empty header. -->
    }
  `,
})
export class DosNavSectionComponent {
  @Input({ required: true }) group!: DosNavGroup;
  @Input() activeRoute: string | null = null;

  @Output() select = new EventEmitter<DosNavItem>();

  isActive(item: DosNavItem): boolean {
    if (!this.activeRoute || !item.route) return false;
    if (this.activeRoute === item.route) return true;
    return this.activeRoute.startsWith(item.route + '/');
  }
}
