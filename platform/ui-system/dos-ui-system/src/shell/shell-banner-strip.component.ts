/**
 * Workspace Host Kit — shell banner strip (covers §B.9 items #34-#37 and
 * the banner face of #25 global error frame).
 *
 * A single in-flow strip above the content slot that multiplexes four
 * opt-in banner channels by kind: trial/subscription, impersonation,
 * offline/reconnect, session-expiry. The ShellHost decides which banners
 * to show and in what order; this wrapper is stateless presentation only.
 *
 * Carbon tokens only, RTL-safe (logical properties), role="status".
 * Intentionally does NOT read from any service — stays dependency-free of
 * platform/product code so §B.9.5 ("UI-system package isolation") holds.
 */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosShellBannerKind =
  | 'info' | 'success' | 'warning' | 'danger';

export interface DosShellBanner {
  id: string;
  kind: DosShellBannerKind;
  title?: string;
  message: string;
  dismissible?: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

@Component({
  selector: 'dos-shell-banner-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-shell-banner-strip" role="status" aria-live="polite">
      @for (b of banners; track b.id) {
        <div class="dos-shell-banner"
             [attr.data-id]="b.id"
             [attr.data-kind]="b.kind"
             [class.dos-shell-banner--info]="b.kind === 'info'"
             [class.dos-shell-banner--success]="b.kind === 'success'"
             [class.dos-shell-banner--warning]="b.kind === 'warning'"
             [class.dos-shell-banner--danger]="b.kind === 'danger'">
          <div class="dos-shell-banner__body">
            @if (b.title) { <strong class="dos-shell-banner__title">{{ b.title }}</strong> }
            <span class="dos-shell-banner__msg">{{ b.message }}</span>
          </div>
          <div class="dos-shell-banner__actions">
            @if (b.actionLabel) {
              <button type="button"
                      class="dos-shell-banner__action"
                      (click)="action.emit(b)">{{ b.actionLabel }}</button>
            }
            @if (b.dismissible) {
              <button type="button"
                      class="dos-shell-banner__close"
                      [attr.aria-label]="'dismiss-' + b.id"
                      (click)="dismiss.emit(b)">&times;</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dos-shell-banner-strip { display: flex; flex-direction: column; gap: .25rem; }
    .dos-shell-banner {
      display: flex; align-items: center; gap: 1rem;
      padding: .5rem 1rem;
      border-inline-start: 4px solid var(--cds-link-primary, #0f62fe);
      background: var(--cds-layer-01, #f4f4f4);
      color: var(--cds-text-primary, #161616);
      font-size: .875rem;
    }
    .dos-shell-banner--info    { border-inline-start-color: var(--cds-support-info,    #0043ce); }
    .dos-shell-banner--success { border-inline-start-color: var(--cds-support-success, #24a148); }
    .dos-shell-banner--warning { border-inline-start-color: var(--cds-support-warning, #f1c21b); background: var(--cds-notification-background-warning, #fcf4d6); }
    .dos-shell-banner--danger  { border-inline-start-color: var(--cds-support-error,   #da1e28); background: var(--cds-notification-background-error,   #fff1f1); }
    .dos-shell-banner__body { flex: 1 1 auto; display: flex; gap: .5rem; flex-wrap: wrap; align-items: baseline; }
    .dos-shell-banner__title { font-weight: 600; }
    .dos-shell-banner__actions { display: flex; gap: .25rem; flex: 0 0 auto; }
    .dos-shell-banner__action {
      background: none; border: 1px solid var(--cds-border-strong-01, #8d8d8d);
      padding: .25rem .75rem; cursor: pointer; color: inherit; font-size: .8125rem;
      border-radius: 2px;
    }
    .dos-shell-banner__action:hover { background: var(--cds-layer-hover, #e8e8e8); }
    .dos-shell-banner__close {
      width: 1.75rem; height: 1.75rem;
      background: none; border: 0; cursor: pointer;
      color: var(--cds-text-secondary, #525252); font-size: 1.25rem; line-height: 1;
      border-radius: 2px;
    }
    .dos-shell-banner__close:hover { background: var(--cds-layer-hover, #e8e8e8); }
  `],
})
export class DosShellBannerStripComponent {
  @Input() banners: readonly DosShellBanner[] = [];
  @Output() action  = new EventEmitter<DosShellBanner>();
  @Output() dismiss = new EventEmitter<DosShellBanner>();
}
