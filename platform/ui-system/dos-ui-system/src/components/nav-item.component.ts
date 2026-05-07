import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
import type { DosNavItem, DosNavDisabledReason } from '@dos/ui-contracts';

/**
 * DosNavItem — single workspace nav row.
 * Refined to use Carbon SideNav item policies.
 */
@Component({
  selector: 'dos-nav-item',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav-item
      [active]="active"
      (selected)="onClick()"
      [attr.aria-disabled]="!item.enabled"
      [attr.title]="!item.enabled ? disabledTitle() : null"
    >
      @if (item.icon) {
        <span class="dos-nav-item__icon" aria-hidden="true">{{ item.icon }}</span>
      }
      <span class="dos-nav-item__label">{{ item.label }}</span>
      @if (item.badge) {
        <span class="dos-nav-item__badge cds--side-nav__item-badge">{{ item.badge }}</span>
      }
    </cds-sidenav-item>
  `,
  styles: [`
    :host { display: block; }
    .dos-nav-item__icon {
      margin-inline-end: var(--cds-spacing-03, 0.5rem);
    }
  `]
})
export class DosNavItemComponent {
  @Input({ required: true }) item!: DosNavItem;
  @Input() active = false;

  @Output() select = new EventEmitter<DosNavItem>();

  onClick(): void {
    if (!this.item?.enabled) return;
    this.select.emit(this.item);
  }

  disabledTitle(): string {
    const reason: DosNavDisabledReason | undefined = this.item.disabledReason;
    return typeof reason === 'string' ? reason : '';
  }
}
