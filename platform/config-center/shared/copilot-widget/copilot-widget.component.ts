import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgrcAgentMeta, resolveAgentFromRoute } from '@app/shared/agrc-os-agent-registry';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { HtmlSanitizerService } from '@app/infrastructure';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

interface ActionTrail {
  grantId?: string;
  scope?: string;
  delegationActionId?: string;
  processTaskId?: string;
  assignedTeam?: string;
  assignedUser?: string;
  slaHours?: number;
  raciRole?: string;
  raci?: {
    responsible?: string[];
    accountable?: string[];
    consulted?: string[];
    informed?: string[];
  };
}

interface ProposedAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'auto_completed' | 'failed' | 'escalated';
  autoExecuteAt?: string;
  autoExecuteEnabled?: boolean;
  countdownSeconds?: number;
  executionMethod?: string;
  trail?: ActionTrail;
  failureReason?: string;
}

const TIMER_TOTAL: Record<string, number> = { critical: 60, high: 120, medium: 300, low: 0 };

interface Suggestion {
  id: string;
  text: string;
  textAr: string;
}

interface ChatMessage {
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-copilot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  template: `
    <!-- Floating Action Button — dynamic agent identity -->
    <button *ngIf="!open()" class="copilot-fab" (click)="toggle()"
            [style.background]="activeAgent()
              ? 'linear-gradient(135deg, ' + activeAgent()!.color + ', ' + activeAgent()!.color + 'cc)'
              : 'linear-gradient(135deg, #0ea5e9, #6366f1)'"
            [attr.aria-label]="t('copilot.title')">
      <i class="pi" [ngClass]="activeAgent()?.icon || 'pi-comments'"></i>
    </button>

    <!-- Chat Panel -->
    <div *ngIf="open()" class="copilot-panel" [class.rtl]="i18n.direction() === 'rtl'">
      <!-- Header — agent identity -->
      <div class="copilot-header"
           [style.background]="activeAgent()
             ? 'linear-gradient(135deg, ' + activeAgent()!.color + ', ' + activeAgent()!.color + 'cc)'
             : 'linear-gradient(135deg, #0ea5e9, #6366f1)'">
        <div class="copilot-title">
          <i class="pi" [ngClass]="activeAgent()?.icon || 'pi-microchip-ai'"></i>
          <div class="title-stack">
            <span class="agent-name">{{ agentDisplayName }}</span>
            <span class="agent-domain" *ngIf="activeAgent()">
              {{ i18n.localize(activeAgent()!.domain, activeAgent()!.domainAr) }}
            </span>
          </div>
        </div>
        <div class="copilot-header-actions">
          <span class="page-context-badge" *ngIf="currentPage" [title]="currentPage">
            <i class="pi pi-map-marker"></i> {{ currentPageLabel }}
          </span>
          <button [attr.aria-label]="t('common.close')" class="close-btn" (click)="toggle()"><i class="pi pi-times"></i></button>
        </div>
      </div>

      <!-- Messages -->
      <div class="copilot-messages" #messagesContainer>
        <!-- Welcome + Quick Prompts -->
        <div *ngIf="messages().length === 0" class="copilot-welcome">
          <i class="pi" [ngClass]="(activeAgent()?.icon || 'pi-sparkles') + ' welcome-icon'"
             [style.color]="activeAgent()?.color || '#6366f1'"></i>
          <p>{{ t('copilot.welcome') }}</p>
          <div *ngIf="activeAgent()?.quickPrompts?.length" class="quick-prompts">
            <p class="quick-prompts-label">{{ t('copilot.quickPrompts') }}</p>
            <button *ngFor="let qp of activeAgent()!.quickPrompts" class="quick-prompt-chip"
                    [style.border-color]="activeAgent()!.color"
                    [style.color]="activeAgent()!.color"
                    (click)="sendQuickPrompt(qp)">
              {{ i18n.localize(qp.en, qp.ar) }}
            </button>
          </div>
        </div>

        <!-- Chat messages -->
        <div *ngFor="let msg of messages()" class="chat-msg"
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
            <div *ngFor="let action of msg.proposedActions" class="action-card"
                 [class]="'priority-' + action.priority"
                 [class.approved]="action.status === 'approved' || action.status === 'completed'"
                 [class.rejected]="action.status === 'rejected'"
                 [class.executing]="action.status === 'executing'"
                 [class.auto-completed]="action.status === 'auto_completed'"
                 [class.failed]="action.status === 'failed'"
                 [class.escalated]="action.status === 'escalated'">
              <div class="action-header">
                <span class="action-type-badge">{{ formatActionType(action.type) }}</span>
                <span class="action-priority-badge" [class]="'priority-badge-' + action.priority">{{ action.priority }}</span>
              </div>
              <p class="action-title">{{ action.title }}</p>
              <p class="action-desc">{{ action.description }}</p>

              <!-- Countdown bar -->
              <div *ngIf="action.status === 'pending' && action.autoExecuteEnabled && action.countdownSeconds != null && action.countdownSeconds > 0" class="countdown-bar">
                <div class="countdown-fill" [class.urgent]="action.countdownSeconds! < 15"
                     [style.width.%]="(action.countdownSeconds! / getTimerTotal(action.priority)) * 100"></div>
                <span class="countdown-text">{{ t('copilot.autoExecuteIn').replace('{seconds}', '' + action.countdownSeconds) }}</span>
              </div>

              <!-- Pending action buttons -->
              <div class="action-buttons" *ngIf="action.status === 'pending'">
                <button class="approve-btn" (click)="approveAction(action)">
                  <i class="pi pi-check"></i> {{ t('copilot.approve') }}
                </button>
                <button class="reject-btn" (click)="rejectAction(action)">
                  <i class="pi pi-times"></i> {{ t('copilot.reject') }}
                </button>
                <button *ngIf="action.autoExecuteEnabled" class="cancel-auto-btn" (click)="cancelAutoExecute(action)">
                  <i class="pi pi-pause"></i> {{ t('copilot.cancelAuto') }}
                </button>
              </div>

              <!-- Status badges -->
              <div class="action-status-badge" *ngIf="action.status === 'executing'">
                <i class="pi pi-spin pi-spinner"></i> {{ t('copilot.executing') }}
              </div>
              <div class="action-status-badge approved-badge" *ngIf="action.status === 'approved' || action.status === 'completed'">
                <i class="pi pi-check-circle"></i> {{ t('copilot.actionApproved') }}
              </div>
              <div class="action-status-badge rejected-badge" *ngIf="action.status === 'rejected'">
                <i class="pi pi-ban"></i> {{ t('copilot.actionRejected') }}
              </div>
              <div class="action-status-badge auto-badge" *ngIf="action.status === 'auto_completed'">
                <i class="pi pi-bolt"></i> {{ t('copilot.actionAutoExecuted') }}
              </div>
              <div class="action-status-badge failed-badge" *ngIf="action.status === 'failed'">
                <i class="pi pi-exclamation-circle"></i> {{ action.failureReason || t('copilot.qualityGateFailed') }}
              </div>
              <div class="action-status-badge escalated-badge" *ngIf="action.status === 'escalated'">
                <i class="pi pi-arrow-up-right"></i> {{ t('copilot.actionEscalated') }}
              </div>

              <!-- Visual Action Trail -->
              <div *ngIf="(action.status === 'completed' || action.status === 'auto_completed' || action.status === 'approved') && action.trail" class="action-trail">
                <div class="trail-step"><i class="pi pi-microchip-ai"></i> {{ t('copilot.trailProposed') }} {{ getAgentLabel(action) }}</div>
                <div class="trail-connector">&darr;</div>
                <div class="trail-step"><i class="pi pi-check-circle"></i> {{ action.executionMethod === 'auto_execute' ? t('copilot.trailAutoApproved') : t('copilot.trailApproved') }}</div>
                <div class="trail-connector">&darr;</div>
                <div *ngIf="action.trail.grantId" class="trail-step">
                  <i class="pi pi-shield"></i> {{ t('copilot.trailGrant') }}: {{ action.trail.grantId!.slice(0,8) }}... ({{ action.trail.scope }})
                </div>
                <ng-container *ngIf="action.trail.assignedTeam">
                  <div class="trail-connector">&darr;</div>
                  <div class="trail-step"><i class="pi pi-users"></i> &rarr; {{ action.trail.assignedTeam }} ({{ action.trail.raciRole }})</div>
                  <div class="trail-connector">&darr;</div>
                  <div class="trail-step"><i class="pi pi-user"></i> {{ t('copilot.trailAssigned') }}: {{ action.trail.assignedUser }} &mdash; {{ t('copilot.trailSla') }}: {{ action.trail.slaHours }}h</div>
                </ng-container>
                <!-- RACI badges -->
                <div *ngIf="action.trail.raci" class="trail-raci">
                  <span *ngIf="action.trail.raci!.responsible?.length" class="raci-badge raci-r">R: {{ action.trail.raci!.responsible!.join(', ') }}</span>
                  <span *ngIf="action.trail.raci!.accountable?.length" class="raci-badge raci-a">A: {{ action.trail.raci!.accountable!.join(', ') }}</span>
                  <span *ngIf="action.trail.raci!.consulted?.length" class="raci-badge raci-c">C: {{ action.trail.raci!.consulted!.join(', ') }}</span>
                  <span *ngIf="action.trail.raci!.informed?.length" class="raci-badge raci-i">I: {{ action.trail.raci!.informed!.join(', ') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div *ngIf="sending()" class="chat-msg assistant">
          <div class="msg-bubble typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <!-- Suggestions -->
      <div *ngIf="suggestions().length > 0" class="suggestions-area">
        <div tabindex="0" role="button" (keyup.enter)="sendSuggestion(s)" *ngFor="let s of suggestions()" class="suggestion-card"
             [style.border-inline-start-color]="activeAgent()?.color || '#0ea5e9'"
             (click)="sendSuggestion(s)">
          <span>{{ i18n.localize(s.text, s.textAr) }}</span>
          <button [attr.aria-label]="t('common.close')" class="dismiss-btn" (click)="dismissSuggestion($event, s.id)"><i class="pi pi-times"></i></button>
        </div>
      </div>

      <!-- Delegation note -->
      <div *ngIf="activeAgent()" class="delegation-note">
        <i class="pi pi-shield"></i> {{ t('copilot.delegationNote') }}
      </div>

      <!-- Input -->
      <div class="copilot-input">
        <input type="text" [(ngModel)]="inputText"
               [placeholder]="t('copilot.placeholder')" [attr.aria-label]="t('copilot.placeholder')"
               (keydown.enter)="send()" [disabled]="sending()" />
        <button [attr.aria-label]="t('common.send')" class="send-btn" (click)="send()" [disabled]="!inputText.trim() || sending()"
                [style.background]="activeAgent()?.color || '#0ea5e9'">
          <i class="pi pi-send"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* === FAB === */
    .copilot-fab {
      position: fixed; bottom: 24px; inset-inline-end: 24px; z-index: var(--z-splash);
      width: 56px; height: 56px; border-radius: var(--radius-pill); border: none; cursor: pointer;
      color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform 200ms, box-shadow 200ms;
      animation: fabPulse 2s ease-in-out 1;
    }
    .copilot-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
    .copilot-fab .pi { font-size: var(--font-size-2xl); }
    @keyframes fabPulse { 0%,100%{ box-shadow: 0 4px 20px rgba(0,0,0,0.25); } 50%{ box-shadow: 0 4px 30px rgba(99,102,241,0.6); } }

    /* === Panel === */
    .copilot-panel {
      position: fixed; bottom: 24px; inset-inline-end: 24px; z-index: var(--z-splash);
      width: 400px; max-height: 600px; border-radius: var(--radius-xl);
      background: var(--surface, #fff); border: 1px solid var(--border-subtle, var(--border-subtle));
      box-shadow: var(--shadow-xl); display: flex; flex-direction: column;
      overflow: hidden;
    }
    @media (max-width: 480px) { .copilot-panel { width: calc(100vw - 16px); inset-inline-end: 8px; bottom: 8px; max-height: 80vh; } }

    /* === Header === */
    .copilot-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; color: #fff;
    }
    .copilot-title { display: flex; align-items: center; gap: 10px; }
    .copilot-title .pi { font-size: var(--font-size-xl); }
    .title-stack { display: flex; flex-direction: column; }
    .agent-name { font-weight: 700; font-size: var(--font-size-base); line-height: 1.2; }
    .agent-domain { font-size: var(--font-size-xs); opacity: 0.8; line-height: 1.2; }
    .copilot-header-actions { display: flex; align-items: center; gap: 8px; }
    .page-context-badge {
      font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-md);
      background: rgba(255,255,255,0.2); color: #fff; max-width: 120px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      display: flex; align-items: center; gap: 3px;
    }
    .page-context-badge .pi { font-size: var(--font-size-xs); }
    .close-btn { background: none; border: none; color: #fff; cursor: pointer; opacity: 0.8; font-size: var(--font-size-md); padding: 4px; }
    .close-btn:hover { opacity: 1; }

    /* === Messages === */
    .copilot-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 340px; }
    .copilot-welcome { text-align: center; padding: 24px 16px; color: var(--text-muted); }
    .welcome-icon { font-size: var(--font-size-4xl); margin-bottom: 8px; display: block; }
    .copilot-welcome p { font-size: var(--font-size-base); margin: 0 0 12px; }

    /* Quick prompts */
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
    .quick-prompts-label { font-size: var(--font-size-xs); color: var(--text-muted); margin: 0 0 4px; width: 100%; }
    .quick-prompt-chip {
      font-size: var(--font-size-sm); padding: 6px 12px; border-radius: var(--radius-xl);
      border: 1px solid; background: transparent; cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .quick-prompt-chip:hover { background: currentColor; color: #fff; }

    /* Chat bubbles */
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

    /* Typing animation */
    .typing { display: flex; gap: 4px; padding: 12px 16px; }
    .typing span { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--text-muted); animation: bounce 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

    /* === Action Cards === */
    .action-cards { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; max-width: 88%; }
    .action-card {
      border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius-md);
      padding: 10px 12px; border-inline-start: 3px solid var(--primary);
      background: var(--surface, #fff); transition: opacity 200ms;
    }
    .action-card.priority-critical { border-inline-start-color: var(--error); }
    .action-card.priority-high { border-inline-start-color: var(--risk-high); }
    .action-card.priority-medium { border-inline-start-color: var(--primary); }
    .action-card.priority-low { border-inline-start-color: var(--text-muted); }
    .action-card.approved { border-inline-start-color: #10b981; }
    .action-card.rejected { opacity: 0.5; border-inline-start-color: var(--text-muted); }
    .action-card.executing { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{ opacity: 1; } 50%{ opacity: 0.7; } }

    .action-header { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
    .action-type-badge { font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius-sm); background: #e0f2fe; color: #0369a1; font-weight: 600; text-transform: uppercase; }
    .action-priority-badge { font-size: var(--font-size-xs); padding: 1px 5px; border-radius: var(--radius-sm); font-weight: 600; text-transform: uppercase; }
    .priority-badge-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-badge-high { background: var(--status-warning-bg, #fcf4d6); color: #9a3412; }
    .priority-badge-medium { background: #eff6ff; color: #1e40af; }
    .priority-badge-low { background: var(--surface-ice); color: #475569; }
    .action-title { font-size: var(--font-size-sm); font-weight: 600; margin: 0 0 2px; color: var(--text, var(--text-heading)); }
    .action-desc { font-size: var(--font-size-xs); margin: 0 0 8px; color: var(--text-muted, var(--text-muted)); line-height: 1.4; }
    .action-buttons { display: flex; gap: 6px; }
    .approve-btn, .reject-btn {
      font-size: var(--font-size-xs); padding: 4px 10px; border-radius: var(--radius-sm); border: none; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px; font-weight: 600; transition: filter 150ms;
    }
    .approve-btn { background: #10b981; color: #fff; }
    .approve-btn:hover { filter: brightness(1.1); }
    .reject-btn { background: var(--border-subtle); color: #475569; }
    .reject-btn:hover { background: #cbd5e1; }
    .action-card.auto-completed { border-inline-start-color: var(--primary); }
    .action-card.failed { border-inline-start-color: var(--error); opacity: 0.85; }
    .action-card.escalated { border-inline-start-color: var(--warning); }

    .action-status-badge { font-size: var(--font-size-xs); display: flex; align-items: center; gap: 4px; font-weight: 500; margin-top: 4px; }
    .approved-badge { color: #10b981; }
    .rejected-badge { color: var(--text-muted); }
    .auto-badge { color: var(--primary); }
    .failed-badge { color: var(--error); }
    .escalated-badge { color: var(--warning); }

    /* Countdown bar */
    .countdown-bar { position: relative; height: 20px; background: var(--surface-ice); border-radius: var(--radius-xs); margin: 6px 0; overflow: hidden; }
    .countdown-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #60a5fa); transition: width 1s linear; }
    .countdown-fill.urgent { background: linear-gradient(90deg, var(--error), #f87171); }
    .countdown-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading); }
    .cancel-auto-btn { font-size: var(--font-size-xs); padding: 3px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: transparent; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
    .cancel-auto-btn:hover { background: var(--surface-ice); }

    /* Action trail */
    .action-trail { margin-top: 8px; padding: 8px; background: var(--surface-sunken, var(--surface-ice)); border-radius: var(--radius); font-size: var(--font-size-xs); }
    .trail-step { display: flex; align-items: center; gap: 6px; color: #334155; padding: 2px 0; }
    .trail-step .pi { font-size: var(--font-size-xs); color: var(--text-muted); width: 14px; text-align: center; }
    .trail-connector { color: #cbd5e1; font-size: 8px; padding-inline-start: 4px; line-height: 1; }

    /* RACI badges */
    .trail-raci { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .raci-badge { font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius-sm); font-weight: 600; }
    .raci-r { background: #dbeafe; color: #1e40af; }
    .raci-a { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .raci-c { background: #e0e7ff; color: #3730a3; }
    .raci-i { background: var(--surface-ice); color: #475569; }

    /* === Suggestions === */
    .suggestions-area { padding: 8px 12px 0; display: flex; flex-direction: column; gap: 4px; }
    .suggestion-card {
      font-size: var(--font-size-sm); padding: 8px 10px; border-radius: var(--radius); cursor: pointer;
      background: var(--surface-sunken, var(--surface-ice)); border: 1px solid var(--border-subtle, var(--border-subtle));
      border-inline-start: 3px solid var(--primary);
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      transition: background 150ms;
    }
    .suggestion-card:hover { background: var(--surface-hover, var(--surface-ice)); }
    .dismiss-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; font-size: var(--font-size-xs); }

    /* === Delegation note === */
    .delegation-note {
      font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); padding: 4px 12px;
      display: flex; align-items: center; gap: 4px; border-top: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .delegation-note .pi { font-size: var(--font-size-xs); }

    /* === Input === */
    .copilot-input {
      display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .copilot-input input {
      flex: 1; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius);
      padding: 8px 12px; font-size: var(--font-size-sm); outline: none; background: var(--surface, #fff);
      color: var(--text, var(--text-heading));
    }
    .copilot-input input:focus { border-color: var(--primary); }
    .send-btn {
      width: 36px; height: 36px; border-radius: var(--radius); border: none; cursor: pointer;
      color: #fff; display: flex; align-items: center; justify-content: center;
      transition: filter 150ms;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { filter: brightness(1.1); }

    /* === RTL === */
    .rtl .user .msg-bubble { border-bottom-right-radius: 12px; border-bottom-left-radius: 4px; }
    .rtl .assistant .msg-bubble { border-bottom-left-radius: 12px; border-bottom-right-radius: 4px; }
  `],
})
export class CopilotWidgetComponent implements AfterViewChecked, OnDestroy {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private htmlSanitizer = inject(HtmlSanitizerService);
  private authService = inject(GrcAuthService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  open = signal(false);
  messages = signal<ChatMessage[]>([]);
  sending = signal(false);
  activeAgent = signal<AgrcAgentMeta | null>(null);
  suggestions = signal<Suggestion[]>([]);

  inputText = '';
  private sessionId = '';
  currentPage = '';
  private shouldScroll = false;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;

  // Agent display name (localized)
  get agentDisplayName(): string {
    const a = this.activeAgent();
    if (!a) return this.t('copilot.title');
    return this.i18n.localize(a.name, a.nameAr);
  }

  get currentPageLabel(): string {
    const segments = this.currentPage.split('/').filter(Boolean);
    return segments[segments.length - 1] || '/';
  }

  constructor() {
    this.currentPage = this.router.url;
    this.updateActiveAgent(this.currentPage);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentPage = e.urlAfterRedirects || e.url;
      this.updateActiveAgent(this.currentPage);
    });
  }

  t(key: string): string { return this.i18n.translate(key); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  toggle(): void {
    this.open.update(v => !v);
    if (this.open() && this.activeAgent()) {
      this.loadSuggestions(this.activeAgent()!.id);
    }
  }

  // === Route → Agent Detection ===

  private updateActiveAgent(route: string): void {
    const agent = resolveAgentFromRoute(route);
    this.activeAgent.set(agent || null);
    if (agent && this.open()) {
      this.loadSuggestions(agent.id);
    }
  }

  // === Messaging ===

  /**
   * Send a query via SSE streaming endpoint for real-time typewriter effect.
   * Falls back to POST /copilot/chat if SSE connection fails.
   */
  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.sending()) return;

    const now = new Date().toISOString();
    this.messages.update(msgs => [...msgs, { role: 'user', content: text, timestamp: now }]);
    this.inputText = '';
    this.sending.set(true);
    this.shouldScroll = true;

    // Close any existing SSE connection
    this.eventSource?.close();
    this.eventSource = null;

    // Get JWT token for SSE query param auth (EventSource cannot set headers)
    let token: string;
    try {
      token = await this.authService.getToken();
    } catch {
      token = '';
    }

    // If no token available, fall back to POST-based request
    if (!token) {
      this.sendViaPost(text);
      return;
    }

    // Build SSE URL with query params
    const params = new URLSearchParams({
      token,
      query: text,
      sessionId: this.sessionId || '',
      pageContext: this.currentPage,
    });
    const agentId = this.activeAgent()?.id;
    if (agentId) params.set('activeAgentId', agentId);

    // Track streaming response state
    let streamedText = '';
    let assistantMsgAdded = false;
    let receivedMeta: { agentId?: string; toolName?: string; contextUsed?: GrcRecord } = {};

    this.eventSource = new EventSource(`${environment.apiUrl}/copilot/stream?${params.toString()}`);

    this.eventSource.onmessage = (event: MessageEvent) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch { return; }

      switch (data.type) {
        case 'thinking':
          // Show thinking indicator as a temporary assistant message
          if (!assistantMsgAdded) {
            this.messages.update(msgs => [...msgs, {
              role: 'assistant',
              content: data.message || 'Thinking...',
              timestamp: new Date().toISOString(),
              isThinking: true,
            } as ChatMessage]);
            assistantMsgAdded = true;
            this.shouldScroll = true;
          }
          break;

        case 'session':
          if (data.sessionId) this.sessionId = data.sessionId as string;
          break;

        case 'meta':
          receivedMeta = {
            agentId: data.agentId as string | undefined,
            toolName: data.toolName as string | undefined,
            contextUsed: data.contextUsed as GrcRecord | undefined,
          };
          break;

        case 'chunk':
          streamedText += data.text as string;
          // Replace thinking message with streamed content, or update existing
          this.messages.update(msgs => {
            const updated = [...msgs];
            const lastAssistantIdx = this.findLastAssistantIdx(updated);
            if (lastAssistantIdx >= 0) {
              updated[lastAssistantIdx] = {
                ...updated[lastAssistantIdx],
                content: streamedText,
                agentId: receivedMeta.agentId,
                toolName: receivedMeta.toolName,
                isThinking: false,
              } as ChatMessage;
            } else {
              updated.push({
                role: 'assistant',
                content: streamedText,
                agentId: receivedMeta.agentId,
                toolName: receivedMeta.toolName,
                timestamp: new Date().toISOString(),
              });
              assistantMsgAdded = true;
            }
            return updated;
          });
          this.shouldScroll = true;
          break;

        case 'actions': {
          const proposedActions: ProposedAction[] = ((data.actions || []) as any[]).map((a) => ({
            ...a,
            id: a.id || crypto.randomUUID(),
            status: a.status || 'pending',
            autoExecuteAt: a.autoExecuteAt,
            autoExecuteEnabled: a.autoExecuteEnabled ?? false,
            countdownSeconds: a.autoExecuteAt ? Math.max(0, Math.round((new Date(a.autoExecuteAt).getTime() - Date.now()) / 1000)) : undefined,
          }));
          if (proposedActions.length > 0) {
            // Attach actions to the last assistant message
            this.messages.update(msgs => {
              const updated = [...msgs];
              const lastAssistantIdx = this.findLastAssistantIdx(updated);
              if (lastAssistantIdx >= 0) {
                updated[lastAssistantIdx] = {
                  ...updated[lastAssistantIdx],
                  proposedActions,
                };
              }
              return updated;
            });
            if (proposedActions.some(a => a.autoExecuteEnabled && a.countdownSeconds)) {
              this.startCountdown();
            }
          }
          this.shouldScroll = true;
          break;
        }

        case 'done':
          this.sending.set(false);
          this.suggestions.set([]);
          this.eventSource?.close();
          this.eventSource = null;
          this.shouldScroll = true;
          break;

        case 'error':
          this.sending.set(false);
          this.eventSource?.close();
          this.eventSource = null;
          // If we have no streamed content, show error message
          if (!streamedText) {
            this.messages.update(msgs => {
              const updated = [...msgs];
              const lastAssistantIdx = this.findLastAssistantIdx(updated);
              if (lastAssistantIdx >= 0) {
                updated[lastAssistantIdx] = {
                  ...updated[lastAssistantIdx],
                  content: data.message || this.t('copilot.error'),
                  isError: true,
                  isThinking: false,
                } as ChatMessage;
              } else {
                updated.push({
                  role: 'assistant',
                  content: data.message || this.t('copilot.error'),
                  timestamp: new Date().toISOString(),
                  isError: true,
                });
              }
              return updated;
            });
          }
          this.shouldScroll = true;
          break;
      }
    };

    this.eventSource.onerror = () => {
      // SSE connection failed — fall back to POST if no content streamed yet
      this.eventSource?.close();
      this.eventSource = null;
      if (!streamedText && this.sending()) {
        // Remove the thinking message before falling back
        if (assistantMsgAdded) {
          this.messages.update(msgs => {
            const updated = [...msgs];
            const lastAssistantIdx = this.findLastAssistantIdx(updated);
            if (lastAssistantIdx >= 0 && (updated[lastAssistantIdx] as any).isThinking) {
              updated.splice(lastAssistantIdx, 1);
            }
            return updated;
          });
        }
        this.sendViaPost(text);
      } else {
        this.sending.set(false);
      }
    };
  }

  /** Find the index of the last assistant message (non-action) in the list. */
  private findLastAssistantIdx(msgs: ChatMessage[]): number {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') return i;
    }
    return -1;
  }

  /** POST-based fallback when SSE is unavailable. */
  private sendViaPost(text: string): void {
    this.http.post<Record<string, any>>(`${environment.apiUrl}/copilot/chat`, {
      query: text,
      sessionId: this.sessionId,
      pageContext: this.currentPage,
      activeAgentId: this.activeAgent()?.id || undefined,
    }).subscribe({
      next: (res) => {
        if (res.sessionId) this.sessionId = res.sessionId as string;
        const proposedActions: ProposedAction[] = ((res.proposedActions || []) as any[]).map((a) => ({
          ...a,
          id: a.id || crypto.randomUUID(),
          status: a.status || 'pending',
          autoExecuteAt: a.autoExecuteAt,
          autoExecuteEnabled: a.autoExecuteEnabled ?? false,
          countdownSeconds: a.autoExecuteAt ? Math.max(0, Math.round((new Date(a.autoExecuteAt).getTime() - Date.now()) / 1000)) : undefined,
        }));
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: res.message || 'No response',
          agentId: res.agentId,
          toolName: res.toolName,
          timestamp: new Date().toISOString(),
          proposedActions: proposedActions.length > 0 ? proposedActions : undefined,
        }]);
        this.sending.set(false);
        this.shouldScroll = true;
        this.suggestions.set([]);
        if (proposedActions.some(a => a.autoExecuteEnabled && a.countdownSeconds)) {
          this.startCountdown();
        }
      },
      error: () => {
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: this.t('copilot.error'),
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
        this.sending.set(false);
        this.shouldScroll = true;
      },
    });
  }

  sendQuickPrompt(qp: { en: string; ar: string }): void {
    this.inputText = this.i18n.localize(qp.en, qp.ar);
    this.send();
  }

  sendSuggestion(s: Suggestion): void {
    this.inputText = this.i18n.localize(s.text, s.textAr);
    this.suggestions.update(list => list.filter(x => x.id !== s.id));
    this.send();
  }

  dismissSuggestion(event: Event, id: string): void {
    event.stopPropagation();
    this.suggestions.update(list => list.filter(x => x.id !== id));
  }

  // === Delegation Actions ===

  approveAction(action: ProposedAction): void {
    action.status = 'executing';
    action.autoExecuteEnabled = false; // stop countdown
    this.http.patch<Record<string, any>>(`${environment.apiUrl}/copilot/actions/${action.id}/approve`, {}).subscribe({
      next: (res) => {
        action.status = res.status || 'completed';
        action.executionMethod = 'manual_approve';
        if (res.trail) action.trail = res.trail;
        if (res.failureReason) { action.failureReason = res.failureReason; action.status = 'failed'; }
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: res.message || this.t('copilot.actionApproved'),
          agentId: this.activeAgent()?.id,
          timestamp: new Date().toISOString(),
        }]);
        this.shouldScroll = true;
      },
      error: (err: any) => {
        if (err?.error?.error === 'already_processed') {
          action.status = err.error.currentStatus || 'completed';
        } else {
          action.status = 'pending';
          action.autoExecuteEnabled = false;
        }
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: this.t('copilot.actionFailed') + (err?.error?.error ? ` (${err.error.error})` : ''),
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
        this.shouldScroll = true;
      },
    });
  }

  rejectAction(action: ProposedAction): void {
    action.status = 'rejected';
    action.autoExecuteEnabled = false;
    this.http.patch(`${environment.apiUrl}/copilot/actions/${action.id}/reject`, { reason: 'User rejected' }).subscribe({ error: (e) => devError("[API]", e) });
  }

  cancelAutoExecute(action: ProposedAction): void {
    action.autoExecuteEnabled = false;
    action.countdownSeconds = undefined;
    this.http.patch(`${environment.apiUrl}/copilot/actions/${action.id}/cancel-auto`, {}).subscribe({ error: (e) => devError("[API]", e) });
  }

  // === Suggestions ===

  private loadSuggestions(agentId: string): void {
    this.http.get<{ suggestions: Suggestion[] }>(
      `${environment.apiUrl}/copilot/suggestions`,
      { params: { page: this.currentPage, agentId } },
    ).subscribe({
      next: (res) => this.suggestions.set(res.suggestions || []),
      error: (e) => devError("[API]", e),
    });
  }

  // === Agent Identity Helpers ===

  getAgentColor(agentId: string): string {
    const colors: Record<string, string> = {
      A01: '#6366f1', A02: '#8b5cf6', A03: '#3b82f6', A04: '#10b981', A05: '#14b8a6',
      A06: 'var(--error)', A07: '#06b6d4', A08: '#f97316', A09: '#a855f7', A10: 'var(--text-muted)',
    };
    return colors[agentId] || '#0369a1';
  }

  getAgentBg(agentId: string): string {
    const color = this.getAgentColor(agentId);
    return color + '18'; // 10% opacity hex
  }

  getAgentIcon(agentId: string): string {
    const icons: Record<string, string> = {
      A01: 'pi-home', A02: 'pi-id-card', A03: 'pi-th-large', A04: 'pi-check-circle',
      A05: 'pi-folder-open', A06: 'pi-map', A07: 'pi-exclamation-triangle', A08: 'pi-book',
      A09: 'pi-truck', A10: 'pi-file-pdf',
    };
    return icons[agentId] || 'pi-microchip-ai';
  }

  formatActionType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  formatMessage(content: string): any {
    // Basic markdown-like formatting: **bold**, `code`, newlines
    // Then sanitize with DOMPurify for security
    const html = content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--surface-ice);padding:1px 4px;border-radius:var(--radius-xs);font-size: var(--font-size-sm)">$1</code>')
      .replace(/\n/g, '<br>');
    return this.htmlSanitizer.sanitize(html);
  }

  getTimerTotal(priority: string): number {
    return TIMER_TOTAL[priority] || 300;
  }

  getAgentLabel(action: ProposedAction): string {
    // Try to derive agent label from the action context or the active agent
    return this.activeAgent()?.id || 'AI';
  }

  // === Countdown Timer ===

  private startCountdown(): void {
    if (this.countdownInterval) return; // already running
    this.countdownInterval = setInterval(() => {
      let anyActive = false;
      this.messages().forEach(msg => {
        msg.proposedActions?.forEach(a => {
          if (a.status === 'pending' && a.autoExecuteEnabled && a.countdownSeconds != null && a.countdownSeconds > 0) {
            a.countdownSeconds = Math.max(0, a.countdownSeconds - 1);
            anyActive = true;
          }
        });
      });
      if (!anyActive) {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.eventSource?.close();
    this.eventSource = null;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) { /* noop */ }
  }

}
