import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
import { DosNavItemComponent } from './nav-item.component';

/**
 * DosNavSection — labelled group of nav items.
 *
 * Renders the group label (uppercase, muted) and a vertical list of
 * `<dos-nav-item>`. Re-emits child select events upward unchanged.
 *
 * Consumers: DosWorkspaceNav.
 */
@Component({
  selector: 'dos-nav-section',
  standalone: true,
  imports: [CommonModule, DosNavItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-nav-section" [attr.aria-label]="group.label">
      <header class="dos-nav-section__head">{{ group.label }}</header>
      <ul class="dos-nav-list">
        @for (item of group.items; track item.id) {
          <li class="dos-nav-section__item">
            <dos-nav-item
              [item]="item"
              [active]="isActive(item)"
              (select)="select.emit($event)"
            ></dos-nav-item>
          </li>
        }
      </ul>
    </section>
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
