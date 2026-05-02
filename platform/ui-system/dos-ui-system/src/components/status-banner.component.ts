import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosStatusKind = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'dos-status-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-status-banner" role="status" [attr.data-kind]="kind">
      @if (title) { <strong>{{ title }}</strong>&nbsp; }
      <span><ng-content></ng-content></span>
    </div>
  `,
})
export class DosStatusBannerComponent {
  @Input() kind: DosStatusKind = 'info';
  @Input() title = '';
}
