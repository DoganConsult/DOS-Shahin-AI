import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'carbon-components-angular';

export type DosCarbonButtonKind = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger-tertiary' | 'danger-ghost';
export type DosCarbonButtonSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * @dos/ui-system Carbon wrapper — Button.
 *
 * Wraps `cds-button` from carbon-components-angular. Consumers MUST use
 * `<dos-carbon-button>` instead of importing `ButtonModule` directly so
 * the carbon-boundary-guard can enforce one-source ownership.
 */
@Component({
  selector: 'dos-carbon-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      cdsButton
      [size]="size"
      [ngClass]="'cds--btn--' + kind"
      [disabled]="disabled"
      [type]="type"
      (click)="clicked.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class DosCarbonButtonComponent {
  @Input() kind: DosCarbonButtonKind = 'primary';
  @Input() size: DosCarbonButtonSize = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Output() clicked = new EventEmitter<MouseEvent>();
}
