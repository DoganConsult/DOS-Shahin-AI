/**
 * Workspace Host Kit — toast outlet (#32 from §B.9).
 *
 * Thin DOM-only wrapper that reads the platform ToastService signal and
 * renders transient messages. Carbon-token-styled, RTL-safe, safe-area
 * aware. Intentionally does NOT pull from carbon-components-angular's
 * Notification module (toast UX here is a rolling stack; Carbon's static
 * inline notifications are used elsewhere via DosStatusBanner).
 *
 * Visibility: mounted once by ShellHostComponent. Shell does not gate
 * this on workspace_shell_binding — toast is a singleton primitive, not
 * a workspace.* surface key per §B.9.5.
 */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shape accepted by DosToastOutletComponent. Decoupled from any specific
 * platform service so the `@dos/ui-system` package stays dependency-free
 * of product / platform toast buses. ShellHost pipes its ToastService
 * signal through `[messages]` and reacts to `(dismiss)`.
 */
export interface DosToastMessage {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
  life?: number;
}

@Component({
  selector: 'dos-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-toast-outlet" role="region" aria-live="polite" aria-atomic="false">
      @for (t of messages; track t) {
        <div class="dos-toast"
             [attr.data-severity]="t.severity"
             [class.dos-toast--success]="t.severity === 'success'"
             [class.dos-toast--error]="t.severity === 'error'"
             [class.dos-toast--warn]="t.severity === 'warn'"
             [class.dos-toast--info]="t.severity === 'info'">
          <div class="dos-toast__summary">{{ t.summary }}</div>
          @if (t.detail) { <div class="dos-toast__detail">{{ t.detail }}</div> }
          <button type="button"
                  class="dos-toast__close"
                  [attr.aria-label]="dismissLabel || null"
                  (click)="dismiss(t)">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: fixed;
            inset-block-end: calc(env(safe-area-inset-bottom, 0) + var(--cds-spacing-05));
            inset-inline-end: var(--cds-spacing-05);
            z-index: var(--dos-z-toast);
            pointer-events: none; }
    .dos-toast-outlet { display: flex; flex-direction: column; gap: var(--cds-spacing-02); max-width: 22rem; }
    .dos-toast {
      position: relative;
      pointer-events: auto;
      padding: var(--cds-spacing-04) var(--cds-spacing-08) var(--cds-spacing-04) var(--cds-spacing-05);
      border-inline-start: var(--dos-sidebar-active-border-width) solid var(--cds-link-primary);
      background: var(--cds-layer);
      color: var(--cds-text-primary);
      box-shadow: var(--cds-shadow);
      border-radius: var(--cds-border-radius);
      font-size: var(--cds-body-short-01-font-size);
    }
    .dos-toast--success { border-inline-start-color: var(--cds-support-success); }
    .dos-toast--error   { border-inline-start-color: var(--cds-support-error); }
    .dos-toast--warn    { border-inline-start-color: var(--cds-support-warning); }
    .dos-toast--info    { border-inline-start-color: var(--cds-support-info); }
    .dos-toast__summary { font-weight: 600; margin-block-end: var(--cds-spacing-01); }
    .dos-toast__detail  { color: var(--cds-text-secondary); font-size: var(--cds-caption-01-font-size); }
    .dos-toast__close {
      position: absolute; inset-block-start: var(--cds-spacing-02); inset-inline-end: var(--cds-spacing-02);
      width: var(--cds-spacing-07); height: var(--cds-spacing-07);
      background: none; border: 0; cursor: pointer;
      color: var(--cds-text-secondary); font-size: var(--cds-heading-01-font-size);
      line-height: 1; border-radius: var(--cds-border-radius);
    }
    .dos-toast__close:hover { background: var(--cds-layer-hover); }
    @media (max-width: 33rem) {
      :host { inset-inline: var(--cds-spacing-05); inset-block-end: calc(env(safe-area-inset-bottom, 0) + var(--dos-mobile-nav-height) + var(--cds-spacing-05)); }
      .dos-toast-outlet { max-width: none; }
    }
  `],
})
export class DosToastOutletComponent {
  @Input() messages: readonly DosToastMessage[] = [];
  @Input() dismissLabel = '';
  @Output() dismissed = new EventEmitter<DosToastMessage>();
  dismiss(t: DosToastMessage): void { this.dismissed.emit(t); }
}
