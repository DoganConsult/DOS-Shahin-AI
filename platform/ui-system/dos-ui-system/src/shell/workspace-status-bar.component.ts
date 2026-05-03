/**
 * Phase WS-2 — workspace.status-bar wrapper.
 * Selector: dos-workspace-status-bar
 * Carbon primitive: Tag.
 * Mobile_mode: collapsible (count-only at ≤480px).
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { StatusBarSignal } from './workspace-shell.contracts';

@Component({
  selector: 'dos-workspace-status-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-status-bar"
         [class.dos-status-bar--mobile]="mobileMode"
         role="status"
         aria-live="polite"
         data-testid="dos-workspace-status-bar">
      @for (s of signals; track s.id) {
        <button type="button"
                class="dos-status-bar__chip"
                [attr.data-level]="s.level"
                [attr.data-signal-id]="s.id"
                (click)="signalClick.emit(s)"
                data-cds-component="tag">
          <span class="dos-status-bar__dot" [attr.data-level]="s.level" aria-hidden="true"></span>
          <span class="dos-status-bar__label">{{ s.label.fallback ?? s.label.i18nKey }}</span>
          @if (s.value) { <span class="dos-status-bar__value">{{ s.value }}</span> }
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dos-status-bar { display: flex; gap: .5rem; padding: .25rem .5rem; border-block-start: 1px solid var(--cds-border-subtle, #e0e0e0); }
    .dos-status-bar__chip { display: inline-flex; gap: .25rem; align-items: center; padding: .15rem .5rem; border: 0; background: transparent; cursor: pointer; }
    .dos-status-bar__dot { width: .5rem; height: .5rem; border-radius: 50%; background: var(--cds-support-info, #0f62fe); }
    .dos-status-bar__dot[data-level=ok] { background: var(--cds-support-success, #24a148); }
    .dos-status-bar__dot[data-level=warn] { background: var(--cds-support-warning, #f1c21b); }
    .dos-status-bar__dot[data-level=error], .dos-status-bar__dot[data-level=critical] { background: var(--cds-support-error, #da1e28); }
    .dos-status-bar--mobile .dos-status-bar__label { display: none; }
  `],
})
export class DosWorkspaceStatusBarComponent {
  @Input() signals: StatusBarSignal[] = [];
  @Input() mobileMode = false;
  @Output() signalClick = new EventEmitter<StatusBarSignal>();
}
