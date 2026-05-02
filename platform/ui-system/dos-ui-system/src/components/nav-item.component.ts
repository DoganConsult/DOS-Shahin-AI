import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { DosNavItem, DosNavDisabledReason } from '@dos/ui-contracts';

/**
 * DosNavItem — single workspace nav row.
 *
 * Pure presentational primitive. Renders a button (NOT an anchor) so the
 * host owns route-binding and active-state. Token-only styling. LTR/RTL
 * safe via padding-inline / margin-inline. Disabled rows expose
 * aria-disabled + a tooltip explaining why (driven by DosNavDisabledReason).
 *
 * Consumers: DosNavSection / DosWorkspaceNav.
 * Adapters MUST output `DosNavItem` shapes (see @dos/ui-contracts).
 */
@Component({
  selector: 'dos-nav-item',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="dos-nav-item"
      [class.dos-nav-item--active]="active"
      [class.dos-nav-item--disabled]="!item.enabled"
      [attr.aria-current]="active ? 'page' : null"
      [attr.aria-disabled]="!item.enabled"
      [attr.title]="!item.enabled ? disabledTitle() : null"
      [disabled]="!item.enabled"
      (click)="onClick()"
    >
      @if (item.icon) {
        <span class="dos-nav-item__icon" aria-hidden="true">{{ item.icon }}</span>
      }
      <span class="dos-nav-item__label">{{ item.label }}</span>
      @if (item.badge) {
        <span class="dos-nav-item__badge">{{ item.badge }}</span>
      }
    </button>
  `,
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
    switch (reason) {
      case 'not-entitled':       return 'Not entitled for this tenant';
      case 'missing-permission': return 'Missing required permission';
      case 'backend-offline':    return 'Backend service offline';
      case 'route-not-wired':    return 'Route not yet wired';
      case 'coming-soon':        return 'Coming soon';
      default:                   return 'Unavailable';
    }
  }
}
