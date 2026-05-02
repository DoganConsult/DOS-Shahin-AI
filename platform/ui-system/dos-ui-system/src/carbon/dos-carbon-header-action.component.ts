import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';

/**
 * Carbon UIShell `cds-header-action` wrapper. Renders a single header action
 * slot. Use this inside `<dos-carbon-header-shell>` or directly inside a
 * `cds-header-global` slot via `headerGlobal` projection.
 */
@Component({
  selector: 'dos-carbon-header-action',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-header-action
      [description]="description"
      [active]="active"
      (selected)="selected.emit()"
    >
      <ng-content></ng-content>
    </cds-header-action>
  `,
})
export class DosCarbonHeaderActionComponent {
  @Input() description = '';
  @Input() active = false;
  @Output() selected = new EventEmitter<void>();
}
