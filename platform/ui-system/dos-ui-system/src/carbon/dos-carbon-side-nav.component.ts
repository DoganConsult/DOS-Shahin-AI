import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';

export interface DosCarbonSideNavItem {
  id: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  /** Permission key — when present, host must wrap with *dosCanRender. */
  permission?: string | null;
  children?: DosCarbonSideNavItem[];
}

/**
 * Carbon UI-Shell SideNav wrapper. Permission-gating per item is the host's
 * responsibility (use *dosCanRender on the consuming `<dos-carbon-side-nav>`
 * usage when filtering nav from AccessStore).
 */
@Component({
  selector: 'dos-carbon-side-nav',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav [expanded]="expanded" [attr.aria-label]="ariaLabel">
      @if (items.length > 0) {
        @for (g of items; track g.id) {
          @if (g.children?.length) {
            <cds-sidenav-menu [title]="g.label">
              @for (c of g.children; track c.id) {
                <cds-sidenav-item
                  [route]="[c.route ?? '/']"
                  (selected)="itemSelected.emit(c)"
                >{{ c.label }}</cds-sidenav-item>
              }
            </cds-sidenav-menu>
          } @else {
            <cds-sidenav-item
              [route]="[g.route ?? '/']"
              (selected)="itemSelected.emit(g)"
            >{{ g.label }}</cds-sidenav-item>
          }
        }
      } @else {
        <ng-content></ng-content>
      }
    </cds-sidenav>
  `,
})
export class DosCarbonSideNavComponent {
  @Input() items: DosCarbonSideNavItem[] = [];
  @Input() expanded = true;
  @Input() ariaLabel = 'Side navigation';
  @Output() itemSelected = new EventEmitter<DosCarbonSideNavItem>();
}

/**
 * Sidenav menu group wrapper — exposes `cds-sidenav-menu` for content
 * projection scenarios (e.g. routed nav items with routerLink/Active).
 */
@Component({
  selector: 'dos-carbon-side-nav-menu',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav-menu [title]="title" [expanded]="expanded">
      <ng-content></ng-content>
    </cds-sidenav-menu>
  `,
})
export class DosCarbonSideNavMenuComponent {
  @Input() title = '';
  @Input() expanded = true;
}

/**
 * Sidenav item wrapper. For Angular Router integration, the consumer
 * applies `routerLink` / `routerLinkActive` on this host element
 * (Angular's RouterLink directive selector matches it transparently).
 */
@Component({
  selector: 'dos-carbon-side-nav-item',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav-item (selected)="selected.emit()">
      <ng-content></ng-content>
    </cds-sidenav-item>
  `,
})
export class DosCarbonSideNavItemComponent {
  @Output() selected = new EventEmitter<void>();
}
