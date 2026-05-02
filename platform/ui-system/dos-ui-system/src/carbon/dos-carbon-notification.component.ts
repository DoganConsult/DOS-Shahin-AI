import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModule } from 'carbon-components-angular';

export type DosCarbonNotificationKind =
  | 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';

/**
 * Carbon Notification wrapper. Variants:
 *   - inline (default): `cds-inline-notification`
 *   - actionable:       `cds-actionable-notification` (renders an action button)
 *   - toast:            `cds-toast-notification`
 */
@Component({
  selector: 'dos-carbon-notification',
  standalone: true,
  imports: [CommonModule, NotificationModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (variant) {
      @case ('actionable') {
        <cds-actionable-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          [actionButtonLabel]="actionLabel"
          (action)="action.emit()"
          (close)="closed.emit()"
        ></cds-actionable-notification>
      }
      @case ('toast') {
        <cds-toast-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          (close)="closed.emit()"
        ></cds-toast-notification>
      }
      @default {
        <cds-inline-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          (close)="closed.emit()"
        ></cds-inline-notification>
      }
    }
  `,
})
export class DosCarbonNotificationComponent {
  @Input() variant: 'inline' | 'actionable' | 'toast' = 'inline';
  @Input() kind: DosCarbonNotificationKind = 'info';
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() lowContrast = false;
  @Input() hideClose = false;
  @Input() actionLabel = 'Action';
  @Output() action = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
