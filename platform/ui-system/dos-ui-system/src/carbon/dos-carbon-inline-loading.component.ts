import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineLoadingModule } from 'carbon-components-angular';

/**
 * Carbon-backed inline loading. Used for save/submit buttons and
 * form-level progress (active → finished/error transitions).
 */
@Component({
  selector: 'dos-carbon-inline-loading',
  standalone: true,
  imports: [CommonModule, InlineLoadingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-inline-loading
      [state]="state"
      [loadingText]="loadingText"
      [successText]="successText"
      [errorText]="errorText"
      (onSuccess)="finished.emit()"
    ></cds-inline-loading>
  `,
})
export class DosCarbonInlineLoadingComponent {
  @Input() state: 'inactive' | 'active' | 'finished' | 'error' = 'active';
  @Input() loadingText = 'Loading…';
  @Input() successText = 'Success';
  @Input() errorText  = 'Error';
  @Output() finished = new EventEmitter<void>();
}
