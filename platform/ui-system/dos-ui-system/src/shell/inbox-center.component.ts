/**
 * Phase WS-2 — workspace.inbox-center wrapper.
 * Selector: dos-inbox-center
 * Carbon primitive: modal.
 * Mobile_mode: drawer (full-height bottom drawer at ≤480px).
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { InboxMessage } from './workspace-shell.contracts';

@Component({
  selector: 'dos-inbox-center',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-inbox-center"
           [class.dos-inbox-center--mobile]="mobileMode"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="ariaLabel || null"
           data-testid="dos-inbox-center"
           data-cds-component="modal">
        <header class="dos-inbox-center__hdr">
          <strong>{{ title }}</strong>
          <button type="button"
                  class="dos-inbox-center__close"
                  (click)="closed.emit()"
                  [attr.aria-label]="closeLabel || null">×</button>
        </header>
        @if (messages.length) {
          <ul class="dos-inbox-center__list">
            @for (m of messages; track m.id) {
              <li class="dos-inbox-center__msg"
                  [class.dos-inbox-center__msg--unread]="m.unread"
                  [attr.data-source]="m.source"
                  [attr.data-msg-id]="m.id"
                  (click)="select.emit(m)">
                <strong>{{ m.subject.fallback ?? m.subject.i18nKey }}</strong>
                @if (m.preview) { <p>{{ m.preview.fallback ?? m.preview.i18nKey }}</p> }
                <time>{{ m.receivedAt | date:'short' }}</time>
              </li>
            }
          </ul>
        } @else {
          <p class="dos-inbox-center__empty">{{ emptyText }}</p>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .dos-inbox-center { position: fixed; inset-block-start: 0; inset-inline-end: 0; bottom: 0; width: min(420px, 100vw); background: var(--cds-layer, #fff); border-inline-start: 1px solid var(--cds-border-subtle, #e0e0e0); padding: 1rem; z-index: 80; display: flex; flex-direction: column; gap: .5rem; }
    .dos-inbox-center--mobile { width: 100vw; inset: auto 0 0 0; max-height: 80vh; border-block-start: 1px solid var(--cds-border-subtle, #e0e0e0); border-inline: 0; }
    .dos-inbox-center__hdr { display: flex; align-items: center; justify-content: space-between; }
    .dos-inbox-center__close { background: transparent; border: 0; font-size: 1.5rem; cursor: pointer; }
    .dos-inbox-center__list { list-style: none; margin: 0; padding: 0; overflow: auto; }
    .dos-inbox-center__msg { padding: .5rem; cursor: pointer; border-block-end: 1px solid var(--cds-border-subtle, #e0e0e0); }
    .dos-inbox-center__msg--unread { background: var(--cds-layer-hover, #f4f4f4); font-weight: 600; }
    .dos-inbox-center__empty { color: var(--cds-text-secondary, #6f6f6f); }
  `],
})
export class DosInboxCenterComponent {
  @Input() messages: InboxMessage[] = [];
  @Input() open = false;
  @Input() mobileMode = false;
  @Input() title = '';
  @Input() ariaLabel: string | null = null;
  @Input() closeLabel: string | null = null;
  @Input() emptyText = '';
  @Output() select = new EventEmitter<InboxMessage>();
  @Output() closed = new EventEmitter<void>();
}
