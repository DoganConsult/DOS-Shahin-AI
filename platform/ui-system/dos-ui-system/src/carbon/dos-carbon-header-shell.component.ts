import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';

export interface DosCarbonHeaderAction {
  id: string;
  label: string;
  icon?: string | null;
  permission?: string | null;
}

/**
 * Carbon UI-Shell wrapper. Renders a `cds-header` with brand, side-nav
 * trigger, and a slot for global actions. Permission-gated rendering
 * for individual actions is delegated to *dosCanRender on the consumer.
 */
@Component({
  selector: 'dos-carbon-header-shell',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-header
      [name]="brand"
      [brand]="brandShort"
      [attr.aria-label]="ariaLabel"
    >
      <cds-hamburger
        *ngIf="showHamburger"
        (selected)="sideNavToggled.emit(!sideNavOpen)"
        [active]="sideNavOpen"
      ></cds-hamburger>
      <cds-header-navigation *ngIf="showHeaderNav">
        <ng-content select="[headerNav]"></ng-content>
      </cds-header-navigation>
      <cds-header-global>
        <ng-content select="[headerGlobal]"></ng-content>
      </cds-header-global>
      <ng-content select="[headerSideNav]"></ng-content>
    </cds-header>
  `,
})
export class DosCarbonHeaderShellComponent {
  @Input() brand = 'DOS Platform';
  @Input() brandShort = 'DOS';
  @Input() ariaLabel = 'Application header';
  @Input() showHamburger = true;
  @Input() showHeaderNav = false;
  @Input() sideNavOpen = false;
  @Output() sideNavToggled = new EventEmitter<boolean>();
}
