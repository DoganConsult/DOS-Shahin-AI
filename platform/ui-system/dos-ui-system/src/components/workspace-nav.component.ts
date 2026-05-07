import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';

import type { DosNavItem, DosNavGroup, DosShellNavConfig } from '@dos/ui-contracts';
import { DosNavSectionComponent } from './nav-section.component';

/**
 * DosWorkspaceNav — top-level workspace navigation.
 * Refined to use Carbon SideNav policies.
 */
@Component({
  selector: 'dos-workspace-nav',
  standalone: true,
  imports: [CommonModule, UIShellModule, DosNavSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav [expanded]="true" aria-label="Workspace navigation">
      @for (group of orderedGroups(); track group.id) {
        <dos-nav-section
          [group]="group"
          [activeRoute]="activeRoute"
          (select)="select.emit($event)"
        ></dos-nav-section>
      }
    </cds-sidenav>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DosWorkspaceNavComponent {
  @Input({ required: true }) set config(value: DosShellNavConfig) {
    this._config.set(value);
  }
  @Input() activeRoute: string | null = null;

  @Output() select = new EventEmitter<DosNavItem>();

  private readonly _config = signal<DosShellNavConfig>({ groups: [] });

  readonly orderedGroups = computed<readonly DosNavGroup[]>(() => {
    const groups = this._config().groups ?? [];
    return [...groups].sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  });
}
