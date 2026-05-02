import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import { CopilotActionCardComponent, ProposedAction } from './copilot-action-card.component';
import { AgrcAgentMeta } from '@app/shared/agrc-os-agent-registry';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  toolName?: string;
  timestamp: string;
  isError?: boolean;
  isThinking?: boolean;
  proposedActions?: ProposedAction[];
}

@Component({
    selector: 'app-copilot-message-stream',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, CopilotActionCardComponent],
    template: `
    <div class="copilot-messages" #messagesContainer>
      <!-- Welcome + Quick Prompts -->
      <div *ngIf="messages.length === 0" class="copilot-welcome">
        <i class="pi" [ngClass]="(activeAgent?.icon || 'pi-sparkles') + ' welcome-icon'"
           [style.color]="activeAgent?.color || '#6366f1'"></i>
        <p>{{ t('copilot.welcome') }}</p>
        <div *ngIf="activeAgent?.quickPrompts?.length" class="quick-prompts">
          <p class="quick-prompts-label">{{ t('copilot.quickPrompts') }}</p>
          <button *ngFor="let qp of activeAgent!.quickPrompts" class="quick-prompt-chip"
                  [style.border-color]="activeAgent!.color"
                  [style.color]="activeAgent!.color"
                  (click)="quickPrompt.emit(qp)">
            {{ i18n.localize(qp.en, qp.ar) }}
          </button>
        </div>
      </div>

      <!-- Chat messages -->
      <div *ngFor="let msg of messages" class="chat-msg"
           [class.user]="msg.role === 'user'"
           [class.assistant]="msg.role === 'assistant'"
           [class.error]="msg.isError"
           [class.thinking]="msg.isThinking">
        <div class="msg-bubble" [innerHTML]="formatMessage(msg.content)"></div>
        <div class="msg-meta" *ngIf="msg.agentId">
          <span class="agent-tag" [style.background]="getAgentBg(msg.agentId)" [style.color]="getAgentColor(msg.agentId)">
            <i class="pi" [ngClass]="getAgentIcon(msg.agentId)"></i> {{ msg.agentId }}
          </span>
        </div>

        <!-- Action Cards -->
        <div *ngIf="msg.proposedActions?.length" class="action-cards">
          <app-copilot-action-card
            *ngFor="let action of msg.proposedActions"
            [action]="action"
            [agentLabel]="activeAgent?.id || 'AI'"
            (approve)="approveAction.emit($event)"
            (reject)="rejectAction.emit($event)"
            (cancelAuto)="cancelAutoAction.emit($event)">
          </app-copilot-action-card>
        </div>
      </div>

      <!-- Typing indicator -->
      <div *ngIf="sending" class="chat-msg assistant">
        <div class="msg-bubble typing"><span></span><span></span><span></span></div>
      </div>
    </div>
  `,
    styles: [`
    .copilot-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 340px; }
    .copilot-welcome { text-align: center; padding: 24px 16px; color: var(--text-muted); }
    .welcome-icon { font-size: var(--font-size-4xl); margin-bottom: 8px; display: block; }
    .copilot-welcome p { font-size: var(--font-size-base); margin: 0 0 12px; }

    .quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
    .quick-prompts-label { font-size: var(--font-size-xs); color: var(--text-muted); margin: 0 0 4px; width: 100%; }
    .quick-prompt-chip {
      font-size: var(--font-size-sm); padding: 6px 12px; border-radius: var(--radius-xl);
      border: 1px solid; background: transparent; cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .quick-prompt-chip:hover { background: currentColor; color: #fff; }

    .chat-msg { display: flex; flex-direction: column; }
    .chat-msg.user { align-items: flex-end; }
    .chat-msg.assistant { align-items: flex-start; }
    .msg-bubble {
      max-width: 88%; padding: 10px 14px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); line-height: 1.5;
      word-break: break-word; white-space: pre-wrap;
    }
    .user .msg-bubble { background: var(--primary); color: #fff; border-bottom-right-radius: 4px; }
    .assistant .msg-bubble { background: var(--surface-sunken, var(--surface-ice)); color: var(--text, var(--text-heading)); border-bottom-left-radius: 4px; }
    .msg-meta { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
    .agent-tag {
      font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-md);
      display: inline-flex; align-items: center; gap: 3px; font-weight: 600;
    }
    .agent-tag .pi { font-size: var(--font-size-xs); }
    .chat-msg.error .msg-bubble { background: var(--status-danger-bg, #fff1f1); color: #991b1b; border-inline-start: 3px solid var(--error); }
    .chat-msg.thinking .msg-bubble { opacity: 0.7; font-style: italic; }

    .typing { display: flex; gap: 4px; padding: 12px 16px; }
    .typing span { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--text-muted); animation: bounce 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

    .action-cards { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; max-width: 88%; }
  `]
})
export class CopilotMessageStreamComponent implements AfterViewChecked {
  i18n = inject(I18nService);
  private htmlSanitizer = inject(HtmlSanitizerService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  @Input() messages: ChatMessage[] = [];
  @Input() sending = false;
  @Input() activeAgent: AgrcAgentMeta | null = null;
  @Input() shouldScroll = false;

  @Output() quickPrompt = new EventEmitter<{ en: string; ar: string }>();
  @Output() approveAction = new EventEmitter<ProposedAction>();
  @Output() rejectAction = new EventEmitter<ProposedAction>();
  @Output() cancelAutoAction = new EventEmitter<ProposedAction>();
  @Output() scrolled = new EventEmitter<void>();

  t(key: string): string { return this.i18n.translate(key); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.scrolled.emit();
    }
  }

  formatMessage(content: string): string {
    const html = content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--surface-ice);padding:1px 4px;border-radius:var(--radius-xs);font-size: var(--font-size-sm)">$1</code>')
      .replace(/\n/g, '<br>');
    return this.htmlSanitizer.sanitize(html);
  }

  getAgentColor(agentId: string): string {
    const colors: Record<string, string> = {
      A01: '#6366f1', A02: '#8b5cf6', A03: '#3b82f6', A04: '#10b981', A05: '#14b8a6',
      A06: 'var(--error)', A07: '#06b6d4', A08: '#f97316', A09: '#a855f7', A10: 'var(--text-muted)',
    };
    return colors[agentId] || '#0369a1';
  }

  getAgentBg(agentId: string): string {
    return this.getAgentColor(agentId) + '18';
  }

  getAgentIcon(agentId: string): string {
    const icons: Record<string, string> = {
      A01: 'pi-home', A02: 'pi-id-card', A03: 'pi-th-large', A04: 'pi-check-circle',
      A05: 'pi-folder-open', A06: 'pi-map', A07: 'pi-exclamation-triangle', A08: 'pi-book',
      A09: 'pi-truck', A10: 'pi-file-pdf',
    };
    return icons[agentId] || 'pi-microchip-ai';
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) { /* noop */ }
  }
}
