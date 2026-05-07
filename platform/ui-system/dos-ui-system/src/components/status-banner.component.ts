import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCarbonNotificationComponent, DosCarbonNotificationKind } from '../carbon/dos-carbon-notification.component';

export type DosStatusKind = 'info' | 'success' | 'warning' | 'danger';

/**
 * DosStatusBanner — inline notification.
 * Refined to use Carbon InlineNotification policies.
 */
@Component({
  selector: 'dos-status-banner',
  standalone: true,
  imports: [CommonModule, DosCarbonNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-notification
      variant="inline"
      [kind]="mapKind(kind)"
      [title]="title"
      [subtitle]="subtitle"
      [hideClose]="true"
    >
      <ng-content></ng-content>
    </dos-carbon-notification>
  `,
})
export class DosStatusBannerComponent {
  @Input() kind: DosStatusKind = 'info';
  @Input() title = '';
  @Input() subtitle: string | null = null;

  mapKind(k: DosStatusKind): DosCarbonNotificationKind {
    switch (k) {
      case 'danger': return 'error';
      default: return k;
    }
  }
}
