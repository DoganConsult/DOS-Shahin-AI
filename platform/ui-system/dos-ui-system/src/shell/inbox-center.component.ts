/**
 * Phase WS-2 + Carbon-Wiring — workspace.inbox-center wrapper.
 * Selector: dos-inbox-center
 * Carbon primitive: modal (ModalModule → cds-modal) + contained-list
 * DB: dos.dynamic_ui_component_registry component_key=workspace.inbox-center carbon_key=modal
 *
 * Token stack:
 *   --cds-modal-*         (Carbon modal tokens)
 *   --shell-z-modal       (z-index)
 *   premium-fade-up       (panel entry — design-tokens.css)
 *   breathing-glow        (high-priority unread — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ModalModule, ContainedListModule } from 'carbon-components-angular';
import { DosCarbonTagComponent, type DosCarbonTagType } from '../carbon/dos-carbon-tag.component';
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';
import type { InboxMessage } from './workspace-shell.contracts';
import { sanitizeAccessibleText } from './shell-accessible-text';

type MsgSource = InboxMessage['source'];
type MsgPriority = Exclude<InboxMessage['priority'], undefined>;

const SOURCE_TAG: Record<MsgSource, DosCarbonTagType> = {
  notification: 'cyan',
  inbox:        'blue',
  system:       'cool-gray',
  agent:        'purple',
};

const PRIORITY_TAG: Record<MsgPriority, DosCarbonTagType> = {
  high: 'magenta',
  med:  'warm-gray',
  low:  'gray',
};

@Component({
  selector: 'dos-inbox-center',
  standalone: true,
  imports: [CommonModule, DatePipe, ModalModule, ContainedListModule, DosCarbonTagComponent, DosCarbonSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Desktop: cds-modal (sm, scrollable) — carbon_key=modal -->
    @if (!mobileMode) {
      <cds-modal
        [open]="open"
        size="sm"
        [hasScrollingContent]="true"
        [attr.aria-label]="inboxSurfaceAria()"
        data-testid="dos-inbox-center"
        (close)="closed.emit()"
      >
        <cds-modal-header (closeSelect)="closed.emit()">
          <h3 cdsModalHeaderHeading>
            {{ title }}
            @if (unreadCount > 0) {
              <dos-carbon-tag type="blue" size="sm" class="dos-inbox-count">
                {{ unreadCount }}
              </dos-carbon-tag>
            }
          </h3>
        </cds-modal-header>

        <section cdsModalContent [hasScrollingContent]="true">
          @if (loading) {
            <div class="dos-inbox-skeleton">
              @for (_ of [1,2,3]; track _) {
                <dos-carbon-skeleton shape="text" [paragraph]="true" [lineCount]="2"></dos-carbon-skeleton>
              }
            </div>
          } @else if (messages.length) {
            <cds-contained-list [label]="''" kind="on-page" size="md">
              @for (m of messages; track m.id) {
                <cds-contained-list-item
                  [attr.data-msg-id]="m.id"
                  [attr.data-source]="m.source"
                  (clicked)="onMessageClick(m)"
                >
                  <div class="dos-inbox-msg"
                       [class.dos-inbox-msg--unread]="m.unread"
                       [class.dos-inbox-msg--high]="m.priority === 'high'">
                    <div class="dos-inbox-msg__header">
                      <dos-carbon-tag
                        [type]="sourceTag(m.source)"
                        size="sm">{{ m.source }}</dos-carbon-tag>
                      @if (m.priority && m.priority !== 'low') {
                        <dos-carbon-tag
                          [type]="priorityTag(m.priority)"
                          size="sm">{{ m.priority }}</dos-carbon-tag>
                      }
                      @if (m.unread) {
                        <span class="dos-inbox-msg__dot"
                              [attr.aria-label]="unreadDotAria()"
                              [attr.aria-hidden]="unreadDotAriaHidden()"></span>
                      }
                      <time class="dos-inbox-msg__time">
                        {{ m.receivedAt | date:'shortTime' }}
                      </time>
                    </div>
                    <strong class="dos-inbox-msg__subject">
                      {{ m.subject?.fallback ?? m.subject?.i18nKey ?? '' }}
                    </strong>
                    @if (m.preview) {
                      <p class="dos-inbox-msg__preview">
                        {{ m.preview?.fallback ?? m.preview?.i18nKey ?? '' }}
                      </p>
                    }
                  </div>
                </cds-contained-list-item>
              }
            </cds-contained-list>
          } @else {
            <div class="dos-inbox-empty">
              <p>{{ emptyText }}</p>
            </div>
          }
        </section>
      </cds-modal>
    }

    <!-- Mobile: bottom-drawer (fixed overlay) -->
    @if (mobileMode && open) {
      <div class="dos-inbox-drawer"
           role="dialog"
           [attr.aria-label]="inboxSurfaceAria()"
           data-testid="dos-inbox-center"
           data-cds-component="modal">
        <div class="dos-inbox-drawer__handle" aria-hidden="true"></div>
        <header class="dos-inbox-drawer__hdr">
          <strong class="dos-inbox-drawer__title">{{ title }}</strong>
          @if (unreadCount > 0) {
            <dos-carbon-tag type="blue" size="sm">{{ unreadCount }}</dos-carbon-tag>
          }
          <button type="button"
                  class="dos-inbox-drawer__close"
                  [attr.aria-label]="closeLabelAttr()"
                  (click)="closed.emit()">
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div class="dos-inbox-drawer__body">
          @for (m of messages; track m.id) {
            <button type="button"
                    class="dos-inbox-msg dos-inbox-drawer__item"
                    [class.dos-inbox-msg--unread]="m.unread"
                    (click)="onMessageClick(m)">
              <div class="dos-inbox-msg__header">
                <dos-carbon-tag [type]="sourceTag(m.source)" size="sm">{{ m.source }}</dos-carbon-tag>
                @if (m.unread) {
                  <span class="dos-inbox-msg__dot"
                        [attr.aria-label]="unreadDotAria()"
                        [attr.aria-hidden]="unreadDotAriaHidden()"></span>
                }
              </div>
              <span class="dos-inbox-msg__subject">{{ m.subject?.fallback ?? m.subject?.i18nKey ?? '' }}</span>
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Unread count badge in modal header ────────────── */
    .dos-inbox-count { margin-inline-start: var(--cds-spacing-03); vertical-align: middle; }

    /* ── Skeleton loading ────────────────────────────── */
    .dos-inbox-skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-05);
      padding: var(--cds-spacing-05);
    }

    /* ── Message row ─────────────────────────────────── */
    .dos-inbox-msg {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-03) 0;
      width: 100%;
      transition: background 0.1s;
    }

    .dos-inbox-msg__header {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-02);
      flex-wrap: wrap;
    }

    .dos-inbox-msg__dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--cds-support-info);
      flex: 0 0 auto;
      animation: premium-pulse-ring 1.8s ease-out infinite;
    }

    .dos-inbox-msg__time {
      margin-inline-start: auto;
      font-size: 0.75rem;
      color: var(--cds-text-secondary);
    }

    .dos-inbox-msg__subject {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cds-text-primary);
      display: block;
    }

    .dos-inbox-msg--unread .dos-inbox-msg__subject {
      color: var(--cds-link-primary);
    }

    .dos-inbox-msg__preview {
      font-size: 0.8125rem;
      color: var(--cds-text-secondary);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* High priority: breathing glow border */
    .dos-inbox-msg--high {
      border-inline-start: var(--dos-inbox-error-border-width) solid var(--cds-support-error);
      padding-inline-start: var(--cds-spacing-03);
      animation: breathing-glow 2s ease-in-out infinite;
    }

    /* ── Empty state ──────────────────────────────────── */
    .dos-inbox-empty {
      padding: var(--cds-spacing-07) var(--cds-spacing-05);
      text-align: center;
      color: var(--cds-text-secondary);
    }

    /* ── Mobile drawer ───────────────────────────────── */
    .dos-inbox-drawer {
      position: fixed;
      inset-block-end: 0;
      inset-inline: 0;
      max-block-size: 80vh;
      background: var(--cds-layer);
      border-block-start: 1px solid var(--cds-border-subtle);
      border-radius: var(--cds-spacing-03) var(--cds-spacing-03) 0 0;
      z-index: var(--shell-z-modal);
      display: flex;
      flex-direction: column;
      animation: premium-fade-up 0.2s ease-out both;
      padding-block-end: env(safe-area-inset-bottom, 0);
    }

    .dos-inbox-drawer__handle {
      width: 2.5rem;
      height: 0.25rem;
      background: var(--cds-border-subtle);
      border-radius: 999px;
      margin: var(--cds-spacing-03) auto;
      flex: 0 0 auto;
    }

    .dos-inbox-drawer__hdr {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      border-block-end: 1px solid var(--cds-border-subtle);
      flex: 0 0 auto;
    }

    .dos-inbox-drawer__title { flex: 1; font-weight: 600; }

    .dos-inbox-drawer__close {
      background: none; border: none; cursor: pointer;
      color: var(--cds-icon-secondary);
      padding: var(--cds-spacing-02);
      font-size: 1rem;
    }

    .dos-inbox-drawer__body {
      overflow-y: auto;
      flex: 1;
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
    }

    .dos-inbox-drawer__item {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-02);
      width: 100%;
      text-align: start;
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--cds-spacing-03) 0;
      border-block-end: 1px solid var(--cds-border-subtle-00);
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes premium-fade-up {
      0%   { opacity: 0; transform: translateY(16px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes premium-pulse-ring {
      0%   { transform: scale(1); opacity: 0.6; }
      70%  { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes breathing-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(218,30,40,0.10); }
      50%      { box-shadow: 0 0 18px rgba(218,30,40,0.24); }
    }
  `],
})
export class DosInboxCenterComponent {
  @Input() messages: InboxMessage[] = [];
  @Input() open = false;
  @Input() mobileMode = false;
  @Input() loading = false;
  @Input() title = '';
  @Input() ariaLabel: string | null = null;
  @Input() closeLabel: string | null = null;
  @Input() emptyText = '';
  @Input() unreadLabel = '';

  @Output() select = new EventEmitter<InboxMessage>();
  @Output() closed = new EventEmitter<void>();

  get unreadCount(): number {
    return this.messages.filter(m => m.unread).length;
  }

  sourceTag(source: MsgSource): DosCarbonTagType {
    return SOURCE_TAG[source] ?? 'gray';
  }

  priorityTag(priority: MsgPriority): DosCarbonTagType {
    return PRIORITY_TAG[priority] ?? 'gray';
  }

  onMessageClick(m: InboxMessage): void {
    this.select.emit(m);
  }

  /** Modal / drawer accessible name: prefer runtime ariaLabel, else sanitized title. */
  inboxSurfaceAria(): string | null {
    const a = sanitizeAccessibleText(this.ariaLabel ?? '');
    if (a.length) return a;
    const t = sanitizeAccessibleText(this.title);
    return t.length ? t : null;
  }

  unreadDotAria(): string | null {
    const s = sanitizeAccessibleText(this.unreadLabel);
    return s.length ? s : null;
  }

  /** Decorative unread indicator when no runtime unreadLabel — avoids unnamed control warnings. */
  unreadDotAriaHidden(): boolean | null {
    return this.unreadDotAria() ? null : true;
  }

  closeLabelAttr(): string | null {
    const s = sanitizeAccessibleText(this.closeLabel ?? '');
    return s.length ? s : null;
  }
}
