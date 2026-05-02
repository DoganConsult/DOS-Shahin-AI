/**
 * Setup Wizard Chat — Displays the conversational message thread.
 *
 * Presentational component that renders assistant/user chat bubbles,
 * framework recommendation cards, and role recommendation cards.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChatMessage } from '../setup-wizard.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-setup-wizard-chat',
    imports: [CommonModule],
    template: `
    <div class="chat-area" #chatContainer>
      @for (msg of messages(); track msg.id) {
        <div class="chat-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
          @if (msg.role === 'assistant') {
            <div class="msg-avatar">
              <i class="pi pi-microchip-ai"></i>
            </div>
          }
          <div class="msg-bubble" [class.user-bubble]="msg.role === 'user'" [class.ai-bubble]="msg.role === 'assistant'">
            @if (msg.isTyping) {
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            } @else {
              <p class="msg-text">{{ isAr() ? msg.contentAr : msg.contentEn }}</p>

              <!-- Framework cards -->
              @if (msg.frameworks && msg.frameworks.length > 0) {
                <div class="framework-cards">
                  @for (fw of msg.frameworks; track fw.frameworkId) {
                    <div class="fw-card" [class.essential]="fw.priority === 'essential'"
                         [class.recommended]="fw.priority === 'recommended'"
                         [class.optional]="fw.priority === 'optional'">
                      <div class="fw-header">
                        <span class="fw-name">{{ isAr() ? fw.nameAr : fw.nameEn }}</span>
                        <span class="fw-badge" [class.essential]="fw.priority === 'essential'"
                              [class.recommended]="fw.priority === 'recommended'"
                              [class.optional]="fw.priority === 'optional'">
                          {{ getPriorityLabel(fw.priority) }}
                        </span>
                      </div>
                      <p class="fw-reason">{{ isAr() ? fw.reasonAr : fw.reason }}</p>
                    </div>
                  }
                </div>
              }

              <!-- Role recommendation cards -->
              @if (msg.roles && msg.roles.length > 0) {
                <div class="role-cards">
                  @for (role of msg.roles; track role.profileId) {
                    <div class="role-card" [class.consolidated]="role.isConsolidated">
                      <div class="role-header">
                        <i class="pi pi-user"></i>
                        <span class="role-name">{{ isAr() ? role.nameAr : role.nameEn }}</span>
                        @if (role.isConsolidated) {
                          <span class="role-consolidated-badge">
                            {{ isAr() ? 'دور مدمج' : 'Consolidated' }}
                          </span>
                        }
                      </div>
                      <p class="role-justification">{{ isAr() ? role.justificationAr : role.justification }}</p>
                      @if (role.isConsolidated && role.consolidatedWith && role.consolidatedWith.length > 0) {
                        <p class="role-consolidated-info">
                          {{ isAr() ? 'يشمل أيضاً:' : 'Also covers:' }}
                          {{ role.consolidatedWith.join(', ') }}
                        </p>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
          @if (msg.role === 'user') {
            <div class="msg-avatar user-avatar">
              <i class="pi pi-user"></i>
            </div>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    /* ── Chat area ── */
    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-md) 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .chat-msg {
      display: flex;
      gap: var(--space-sm);
      align-items: flex-start;
      animation: fadeIn 300ms ease;
    }

    .chat-msg.user {
      justify-content: flex-end;
    }

    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--surface-ice);
      border: 1px solid var(--border-primary);
      color: var(--primary);
      font-size: var(--font-size-base);
    }

    .msg-avatar.user-avatar {
      background: var(--surface-warm);
      border-color: var(--border-subtle);
      color: var(--text-muted);
    }

    .msg-bubble {
      max-width: 75%;
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius);
      line-height: 1.5;
    }

    .ai-bubble {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius) var(--radius) var(--radius) 4px;
    }

    .user-bubble {
      background: var(--primary);
      color: var(--text-on-primary);
      border-radius: var(--radius) var(--radius) 4px var(--radius);
    }

    .msg-text {
      margin: 0;
      font-size: var(--font-size-sm);
      white-space: pre-wrap;
    }

    /* ── Typing indicator ── */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 4px 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-pill);
      background: var(--text-muted);
      animation: typingBounce 1.2s infinite;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Framework cards ── */
    .framework-cards {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin-top: var(--space-sm);
    }

    .fw-card {
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      border-inline-start: 3px solid var(--border-subtle);
      background: var(--surface-sunken);
    }

    .fw-card.essential { border-inline-start-color: var(--danger); }
    .fw-card.recommended { border-inline-start-color: var(--warning); }
    .fw-card.optional { border-inline-start-color: var(--info); }

    .fw-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      margin-bottom: 4px;
    }

    .fw-name {
      font-weight: var(--font-bold);
      font-size: var(--font-size-sm);
      color: var(--text-heading);
    }

    .fw-badge {
      font-size: var(--font-size-xs);
      padding: 2px 8px;
      border-radius: var(--radius-md);
      font-weight: var(--font-medium);
      text-transform: uppercase;
    }

    .fw-badge.essential { background: rgba(var(--module-accent-red-rgb), 0.12); color: var(--danger); }
    .fw-badge.recommended { background: rgba(var(--module-accent-amber-rgb), 0.12); color: var(--warning); }
    .fw-badge.optional { background: rgba(var(--module-accent-blue-rgb), 0.12); color: var(--info); }

    .fw-reason {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* ── Role cards ── */
    .role-cards {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin-top: var(--space-sm);
    }

    .role-card {
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      background: var(--surface-sunken);
      border: 1px solid var(--border-subtle);
    }

    .role-card.consolidated {
      border-color: var(--warning);
      border-style: dashed;
    }

    .role-header {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      margin-bottom: 4px;
    }

    .role-header i {
      color: var(--primary);
      font-size: var(--font-size-sm);
    }

    .role-name {
      font-weight: var(--font-bold);
      font-size: var(--font-size-sm);
      color: var(--text-heading);
    }

    .role-consolidated-badge {
      font-size: var(--font-size-xs);
      padding: 1px 6px;
      border-radius: var(--radius);
      background: rgba(var(--module-accent-amber-rgb), 0.12);
      color: var(--warning);
      font-weight: var(--font-medium);
    }

    .role-justification {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .role-consolidated-info {
      margin: 4px 0 0;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-style: italic;
    }

    @media (max-width: 768px) {
      .msg-bubble {
        max-width: 90%;
      }
    }
  `]
})
export class SetupWizardChatComponent implements AfterViewChecked {
  /** Chat messages to render */
  readonly messages = input.required<ChatMessage[]>();

  /** Whether the current language is Arabic */
  readonly isAr = input.required<boolean>();

  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  private shouldScrollToBottom = true;

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /** Scroll chat to bottom when new messages arrive */
  scrollToBottom(): void {
    if (this.chatContainer?.nativeElement) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  /** Mark that the chat should scroll on next view check */
  requestScroll(): void {
    this.shouldScrollToBottom = true;
  }

  getPriorityLabel(priority: 'essential' | 'recommended' | 'optional'): string {
    if (this.isAr()) {
      switch (priority) {
        case 'essential': return 'أساسي';
        case 'recommended': return 'موصى به';
        case 'optional': return 'اختياري';
      }
    }
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
}
