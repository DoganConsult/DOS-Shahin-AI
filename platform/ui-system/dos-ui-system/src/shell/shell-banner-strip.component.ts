/**
 * Phase WS-2 + Carbon-Wiring — shell.banner-strip wrapper.
 * Selector: dos-shell-banner-strip
 * Carbon primitive: notification (NotificationModule → cds-actionable-notification)
 * DB: dos.dynamic_ui_component_registry component_key='shell.banner-strip' carbon_key='notification'
 *
 * Token stack:
 *   --cds-notification-*  (Carbon notification tokens)
 *   --shell-z-sticky      (z-index)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModule } from 'carbon-components-angular';
import type { DosCarbonNotificationKind } from '../carbon/dos-carbon-notification.component';

export interface ShellBanner {
  id: string;
  kind: DosCarbonNotificationKind | 'danger';
  title: string;
  /** Optional body text rendered as notification subtitle. */
  message?: string;
  subtitle?: string;
  actionLabel?: string;
  /** Internal route to navigate to when action button is clicked. */
  actionRoute?: string;
  dismissible?: boolean;
}

@Component({
  selector: 'dos-shell-banner-strip',
  standalone: true,
  imports: [CommonModule, NotificationModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (banners.length) {
      <div class="dos-banner-strip"
           role="status"
           aria-live="polite"
           data-testid="dos-shell-banner-strip"
           data-cds-component="notification">
        @for (b of banners; track b.id) {
          <!-- cds-actionable-notification (carbon_key=notification) -->
          <cds-actionable-notification
            [kind]="resolveKind(b.kind)"
            [title]="b.title"
            [subtitle]="b.message || b.subtitle || ''"
            [lowContrast]="false"
            [hideCloseButton]="!b.dismissible"
            [actionButtonLabel]="b.actionLabel || ''"
            class="dos-banner-strip__notification"
            [attr.data-banner-id]="b.id"
            (action)="action.emit(b)"
            (close)="dismiss.emit(b)">
          </cds-actionable-notification>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .dos-banner-strip {
      display: flex;
      flex-direction: column;
      gap: 0;
      position: sticky;
      inset-block-start: 3rem; /* below 48px Carbon header */
      z-index: var(--shell-z-sticky, 6000);
    }

    /* Full-width banners — override Carbon's max-width */
    .dos-banner-strip__notification {
      width: 100%;
      max-inline-size: 100% !important;
    }

    :host ::ng-deep .cds--actionable-notification {
      max-inline-size: 100%;
    }
  `],
})
export class DosShellBannerStripComponent {
  @Input() banners: ShellBanner[] = [];
  @Output() action  = new EventEmitter<ShellBanner>();
  @Output() dismiss = new EventEmitter<ShellBanner>();

  /** Carbon doesn't expose a 'danger' notification kind; map to 'error'. */
  resolveKind(kind: ShellBanner['kind']): DosCarbonNotificationKind {
    return kind === 'danger' ? 'error' : kind as DosCarbonNotificationKind;
  }
}
