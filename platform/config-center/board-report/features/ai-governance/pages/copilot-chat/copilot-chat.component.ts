import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MessageService } from 'primeng/api';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-copilot-chat',
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, ButtonModule, InputTextModule, TagModule, ToastModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="comments" [title]="i18n.translate('copilotChat.title')"
      [subtitle]="i18n.translate('copilotChat.subtitle')"
      [breadcrumbs]="['Dashboard', i18n.translate('copilotChat.title')]" [loading]="false">
      <p-toast />
      <div class="grid">
        <div class="col-8">
          <p-card [header]="i18n.translate('copilotChat.conversation')" [style]="{'min-height': '500px'}">
            <div class="flex justify-content-end mb-2">
              <p-button label="Export audit (CSV)" icon="pi pi-download" [outlined]="true" size="small" (onClick)="exportAudit()" [loading]="exporting" />
            </div>
            <div class="flex flex-column gap-3" style="max-height:400px;overflow-y:auto">
              @for (msg of messages; track $index) {
                <div class="p-3 border-round" [ngClass]="msg.role === 'user' ? 'bg-blue-50 ml-6' : 'bg-gray-50 mr-6'">
                  <div class="flex align-items-center gap-2 text-xs text-color-secondary mb-1">
                    @if (msg.role !== 'user' && msg.agentId) {
                      <i class="pi" [ngClass]="getAgentIcon(msg.agentId)" [style.color]="getAgentColor(msg.agentId)"></i>
                      <span [style.color]="getAgentColor(msg.agentId)" style="font-weight:700">{{ getAgentName(msg.agentId) }}</span>
                    } @else {
                      <span>{{ msg.role === 'user' ? 'You' : 'Copilot' }}</span>
                    }
                  </div>
                  <div>{{ msg.content }}</div>
                  @if (msg.role === 'assistant' && msg.contextUsed) {
                    <div class="mt-2">
                      <button type="button" class="p-button-text p-button-sm text-xs" (click)="toggleContext($index)">
                        {{ expandedContext[$index] ? 'Hide context used' : 'View context used' }}
                      </button>
                      @if (expandedContext[$index]) {
                        <div class="surface-ground p-2 border-round mt-1 text-xs">
                          @if (msg.contextUsed.pageContext) { <div><strong>Page:</strong> {{ msg.contextUsed.pageContext }}</div> }
                          @if (msg.contextUsed.agentId) { <div><strong>Agent:</strong> {{ msg.contextUsed.agentId }}</div> }
                          @if (msg.contextUsed.toolName) { <div><strong>Tool:</strong> {{ msg.contextUsed.toolName }}</div> }
                          @if (msg.contextUsed.contextKeys?.length) { <div><strong>Data keys:</strong> {{ msg.contextUsed.contextKeys.join(', ') }}</div> }
                          @if (msg.contextUsed.snippet) { <div class="mt-1"><strong>Snippet:</strong> {{ msg.contextUsed.snippet }}</div> }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
              @if (messages.length === 0) {
                <div class="text-center text-color-secondary p-6">Ask the AI copilot anything about your GRC posture</div>
              }
            </div>
            <div class="flex gap-2 mt-3">
              <input pInputText [(ngModel)]="userQuery" [placeholder]="i18n.translate('copilotChat.askQuestion')" [attr.aria-label]="i18n.translate('copilotChat.askQuestion')" class="flex-1" (keyup.enter)="send()" />
              <p-button icon="pi pi-send" (onClick)="send()" [loading]="sending" />
            </div>
          </p-card>
        </div>
        <div class="col-4">
          <p-card [header]="i18n.translate('copilotChat.agentPerformance')">
            <div *ngIf="performance.length > 0">
              @for (p of performance; track p.agentId) {
                <div class="flex justify-content-between align-items-center mb-2 p-2 surface-ground border-round">
                  <div class="flex align-items-center gap-2">
                    <i class="pi" [ngClass]="getAgentIcon(p.agentId || p.agent_id)" [style.color]="getAgentColor(p.agentId || p.agent_id)"></i>
                    <span style="font-weight:600">{{ getAgentName(p.agentId || p.agent_id) }}</span>
                  </div>
                  <p-tag [value]="p.avgResponseTime ? p.avgResponseTime + 'ms' : '-'" />
                </div>
              }
            </div>
            <div *ngIf="performance.length === 0" class="text-color-secondary text-center p-3">No performance data</div>
          </p-card>
          <p-card [header]="i18n.translate('copilotChat.quickPrompts')" styleClass="mt-3">
            @for (prompt of quickPrompts; track prompt) {
              <p-button [label]="prompt" [text]="true" size="small" class="mb-1 w-full" (onClick)="userQuery = prompt; send()" />
            }
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class CopilotChatComponent {
    private operationsSvc = inject(GrcOperationsService);
  messages: GrcRecord[] = [];
  userQuery = '';
  sending = false;
  exporting = false;
  sessionId = crypto.randomUUID();
  performance: GrcRecord[] = [];
  agents: GrcRecord[] = [];
  agentMap: Record<string, any> = {};
  expandedContext: Record<number, boolean> = {};
  quickPrompts = [
    'What is my current compliance score?',
    'Show me top 5 open risks',
    'Which controls need evidence?',
    'Summarize my NCA ECC gaps',
    'What policies expire this month?',
  ];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {
    this.apiclientSvc.get('/copilot/agent-performance').subscribe({
      next: (d) => { this.performance = d || []; }
    });
    this.operationsSvc.getPublicAgents().subscribe({
      next: (res) => {
        this.agents = res?.agents || [];
        for (const a of this.agents) this.agentMap[a.id] = a;
      }
    });
  }
  getAgentIcon(agentId: string): string { return this.agentMap[agentId]?.icon || 'pi-microchip-ai'; }
  getAgentColor(agentId: string): string { return this.agentMap[agentId]?.color || 'var(--text-muted)'; }
  getAgentName(agentId: string): string { return this.agentMap[agentId]?.name || agentId; }
  toggleContext(index: number): void {
    this.expandedContext[index] = !this.expandedContext[index];
  }
  send(): void {
    if (!this.userQuery.trim()) return;
    const q = this.userQuery;
    this.messages.push({ role: 'user', content: q });
    this.userQuery = '';
    this.sending = true;
    this.apiclientSvc.post('/copilot/chat', { sessionId: this.sessionId, query: q }).subscribe({
      next: (d) => {
        const content = d.response || d.message || d.answer || JSON.stringify(d);
        this.messages.push({
          role: 'assistant',
          content,
          agentId: d.agentId || d.agent_id,
          contextUsed: d.contextUsed,
        });
        this.sending = false;
      },
      error: () => {
        this.messages.push({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
        this.sending = false;
      },
    });
  }
  private msg = inject(MessageService);

  exportAudit(): void {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = from.toISOString();
    const toStr = to.toISOString();
    this.exporting = true;
    this.apiclientSvc.getBlob(`/copilot/export?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}&format=csv`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `copilot-audit-${fromStr.slice(0, 10)}-to-${toStr.slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('copilotChat.exportDownloaded') || 'Audit export downloaded', life: 3000 });
      },
      error: () => {
        this.exporting = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoad') || 'Export failed', life: 4000 });
      },
    });
  }
}
