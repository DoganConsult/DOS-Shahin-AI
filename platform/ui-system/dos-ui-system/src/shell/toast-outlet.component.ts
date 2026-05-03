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
                  aria-label="dismiss"
                  (click)="dismiss(t)">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: fixed;
            inset-block-end: calc(env(safe-area-inset-bottom, 0) + 1rem);
            inset-inline-end: 1rem;
            z-index: 100;
            pointer-events: none; }
    .dos-toast-outlet { display: flex; flex-direction: column; gap: .5rem; max-width: 22rem; }
    .dos-toast {
      position: relative;
      pointer-events: auto;
      padding: .75rem 2.25rem .75rem 1rem;
      border-inline-start: 3px solid var(--cds-link-primary, #0f62fe);
      background: var(--cds-layer, #ffffff);
      color: var(--cds-text-primary, #161616);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      border-radius: 2px;
      font-size: .875rem;
    }
    .dos-toast--success { border-inline-start-color: var(--cds-support-success, #24a148); }
    .dos-toast--error   { border-inline-start-color: var(--cds-support-error,   #da1e28); }
    .dos-toast--warn    { border-inline-start-color: var(--cds-support-warning, #f1c21b); }
    .dos-toast--info    { border-inline-start-color: var(--cds-support-info,    #0043ce); }
    .dos-toast__summary { font-weight: 600; margin-block-end: .125rem; }
    .dos-toast__detail  { color: var(--cds-text-secondary, #525252); font-size: .8125rem; }
    .dos-toast__close {
      position: absolute; inset-block-start: .25rem; inset-inline-end: .25rem;
      width: 1.75rem; height: 1.75rem;
      background: none; border: 0; cursor: pointer;
      color: var(--cds-text-secondary, #525252); font-size: 1.25rem;
      line-height: 1; border-radius: 2px;
    }
    .dos-toast__close:hover { background: var(--cds-layer-hover, #e8e8e8); }
    @media (max-width: 480px) {
      :host { inset-inline: 1rem; inset-inline-end: 1rem; inset-block-end: calc(env(safe-area-inset-bottom, 0) + 80px); }
      .dos-toast-outlet { max-width: none; }
    }
  `],
})
export class DosToastOutletComponent {
  @Input() messages: readonly DosToastMessage[] = [];
  @Output() dismissed = new EventEmitter<DosToastMessage>();
  dismiss(t: DosToastMessage): void { this.dismissed.emit(t); }
}
