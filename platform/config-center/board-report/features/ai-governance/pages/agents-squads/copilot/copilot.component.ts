import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { AiAgentApiService, AgentPerformanceDto, GovAIRecommendationDto } from '@app/ai/ai-agent-api.service';
import { AiBadgeComponent } from '@app/shared/components/ai-badge.component';
import { environment } from '@env/environment';
import { forkJoin, catchError, of } from 'rxjs';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  agentId?: string;
}

interface PendingAction {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-copilot',
    imports: [CommonModule, FormsModule, AiBadgeComponent],
    template: `
    <div class="copilot-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-sparkles"></i></div>
          <div>
            <h1>{{ i18n.translate('copilot.title') }}</h1>
            <p class="subtitle">{{ i18n.translate('copilot.subtitle') }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-outline" (click)="clearChat()"><i class="pi pi-trash"></i> Clear</button>
          <button class="btn-primary" (click)="loadDashboardData()"><i class="pi pi-refresh"></i> Refresh</button>
        </div>
      </header>

      <div class="stats-strip">
        @for (stat of stats(); track stat.label) {
          <div class="stat-card">
            <span class="stat-value" [style.color]="stat.color">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        }
      </div>

      <div class="copilot-layout">
        <section class="chat-section">
          <div class="chat-messages" #chatContainer>
            @if (messages().length === 0 && !chatLoading()) {
              <div class="chat-welcome">
                <i class="pi pi-sparkles welcome-icon"></i>
                <h3>{{ i18n.translate('copilot.welcomeTitle') }}</h3>
                <p>{{ i18n.translate('copilot.welcomeDesc') }}</p>
                <div class="suggestion-chips">
                  @for (s of suggestions(); track s) {
                    <button class="chip" (click)="sendMessage(s)">{{ s }}</button>
                  }
                </div>
              </div>
            }
            @for (msg of messages(); track msg.id) {
              <div class="msg" [class.msg-user]="msg.role === 'user'" [class.msg-assistant]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <div class="msg-avatar"><i class="pi pi-sparkles"></i></div>
                }
                <div class="msg-bubble">
                  <div class="msg-content">{{ msg.content }}</div>
                  <div class="msg-meta">
                    @if (msg.model) { <app-ai-badge variant="subtle" [model]="msg.model" /> }
                    <span class="msg-time">{{ msg.timestamp | date:'shortTime' }}</span>
                  </div>
                </div>
              </div>
            }
            @if (chatLoading()) {
              <div class="msg msg-assistant">
                <div class="msg-avatar"><i class="pi pi-sparkles"></i></div>
                <div class="msg-bubble typing">
                  <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
              </div>
            }
          </div>
          <div class="chat-input-bar">
            <input class="chat-input"
              [(ngModel)]="userInput"
              (keydown.enter)="sendMessage(userInput)"
              [placeholder]="i18n.translate('copilot.placeholder')"
              [disabled]="chatLoading()" />
            <button class="send-btn" (click)="sendMessage(userInput)" [disabled]="chatLoading() || !userInput.trim()">
              <i class="pi pi-send"></i>
            </button>
          </div>
        </section>

        <aside class="sidebar-section">
          <div class="sidebar-card">
            <h3>Agent Performance</h3>
            @if (agentPerformance().length === 0) {
              <p class="muted">No agent data yet</p>
            }
            @for (a of agentPerformance(); track a.agentId) {
              <div class="agent-row">
                <span class="agent-id">{{ a.agentId }}</span>
                <div class="agent-bar-wrap">
                  <div class="agent-bar" [style.width.%]="a.successRate"></div>
                </div>
                <span class="agent-rate">{{ a.successRate }}%</span>
              </div>
            }
          </div>

          <div class="sidebar-card">
            <h3>Pending Actions</h3>
            @if (pendingActions().length === 0) {
              <p class="muted">No pending actions</p>
            }
            @for (action of pendingActions(); track action.id) {
              <div class="action-row">
                <span class="action-title">{{ action.title }}</span>
                <span class="action-priority" [class]="'priority-' + action.priority">{{ action.priority }}</span>
                <div class="action-btns">
                  <button class="icon-btn" (click)="approveAction(action)" title="Approve"><i class="pi pi-check"></i></button>
                  <button class="icon-btn" (click)="rejectAction(action)" title="Reject"><i class="pi pi-times"></i></button>
                </div>
              </div>
            }
          </div>

          <div class="sidebar-card">
            <h3>AI Recommendations</h3>
            @if (recommendations().length === 0) {
              <p class="muted">No recommendations</p>
            }
            @for (rec of recommendations(); track rec.id) {
              <div class="rec-row">
                <span class="rec-title">{{ rec.title }}</span>
                <span class="rec-priority" [class]="'priority-' + rec.priority">{{ rec.priority }}</span>
                <button class="btn-sm" (click)="acceptRecommendation(rec)">Accept</button>
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
    styles: [`
    .copilot-page { min-height: 100vh; background: var(--surface-ground, #f4f4f4); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--purple-50, #faf5ff); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--purple-500, #a855f7); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .header-actions { display: flex; gap: 8px; }
    .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); background: var(--primary-500, #3b82f6); color: #fff; cursor: pointer; font-size: var(--font-size-base); font-weight: 500; }
    .btn-primary:hover { background: var(--primary-600); }
    .btn-outline { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-base); }
    .btn-outline:hover { background: var(--surface-100); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px 18px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; display: block; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; display: block; }
    .copilot-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
    @media (max-width: 1024px) { .copilot-layout { grid-template-columns: 1fr; } }
    .chat-section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); display: flex; flex-direction: column; min-height: 500px; max-height: 70vh; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .chat-welcome { text-align: center; padding: 40px 20px; color: var(--text-color-secondary); }
    .welcome-icon { font-size: var(--font-size-6xl); color: var(--purple-300); margin-bottom: 12px; }
    .chat-welcome h3 { margin: 0 0 8px; color: var(--text-color); }
    .suggestion-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
    .chip { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--surface-border); background: var(--surface-50); cursor: pointer; font-size: var(--font-size-xs-plus); }
    .chip:hover { background: var(--primary-50); border-color: var(--primary-200); }
    .msg { display: flex; gap: 10px; max-width: 80%; }
    .msg-user { align-self: flex-end; flex-direction: row-reverse; }
    .msg-assistant { align-self: flex-start; }
    .msg-avatar { width: 32px; height: 32px; border-radius: var(--radius); background: var(--purple-50); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .msg-avatar i { font-size: var(--font-size-base); color: var(--purple-500); }
    .msg-bubble { padding: 10px 14px; border-radius: var(--radius-lg); font-size: var(--font-size-base); line-height: 1.5; }
    .msg-user .msg-bubble { background: var(--primary-500); color: #fff; border-bottom-right-radius: 4px; }
    .msg-assistant .msg-bubble { background: var(--surface-100); color: var(--text-color); border-bottom-left-radius: 4px; }
    .msg-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: var(--font-size-2xs); opacity: 0.7; }
    .msg-time { font-size: var(--font-size-2xs); }
    .typing { display: flex; gap: 4px; align-items: center; padding: 12px 18px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-color-secondary); animation: bounce 1.4s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
    .chat-input-bar { display: flex; gap: 8px; padding: 14px 16px; border-top: 1px solid var(--surface-border); }
    .chat-input { flex: 1; padding: 10px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius-md); font-size: var(--font-size-base); outline: none; }
    .chat-input:focus { border-color: var(--primary-400); box-shadow: 0 0 0 2px var(--primary-50); }
    .send-btn { width: 40px; height: 40px; border-radius: var(--radius-md); border: none; background: var(--primary-500); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn:hover:not(:disabled) { background: var(--primary-600); }
    .sidebar-section { display: flex; flex-direction: column; gap: 16px; }
    .sidebar-card { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 16px; }
    .sidebar-card h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 600; }
    .muted { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .agent-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: var(--font-size-xs-plus); }
    .agent-id { width: 32px; font-weight: 600; font-size: var(--font-size-sm); color: var(--primary-600); }
    .agent-bar-wrap { flex: 1; height: 6px; background: var(--surface-200); border-radius: 3px; }
    .agent-bar { height: 100%; background: var(--primary-500); border-radius: 3px; transition: width 0.3s; }
    .agent-rate { width: 36px; text-align: end; font-size: var(--font-size-sm); font-weight: 600; }
    .action-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-xs-plus); }
    .action-title { flex: 1; }
    .action-priority, .rec-priority { font-size: var(--font-size-2xs); padding: 2px 8px; border-radius: var(--radius); font-weight: 600; text-transform: uppercase; }
    .priority-high, .priority-critical { background: var(--red-50); color: var(--red-700); }
    .priority-medium { background: var(--yellow-50); color: var(--yellow-700); }
    .priority-low { background: var(--green-50); color: var(--green-700); }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); }
    .icon-btn:hover { background: var(--surface-100); }
    .rec-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-xs-plus); }
    .rec-title { flex: 1; }
    .btn-sm { padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--primary-300); background: var(--primary-50); color: var(--primary-700); font-size: var(--font-size-2xs); font-weight: 600; cursor: pointer; }
    .btn-sm:hover { background: var(--primary-100); }
  `]
})
export class CopilotComponent implements OnInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private aiApi = inject(AiAgentApiService);
  i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  chatLoading = signal(false);
  userInput = '';
  messages = signal<ChatMessage[]>([]);
  agentPerformance = signal<AgentPerformanceDto[]>([]);
  pendingActions = signal<PendingAction[]>([]);
  recommendations = signal<GovAIRecommendationDto[]>([]);

  suggestions = signal([
    'What is our current compliance posture?',
    'Show top risks that need attention',
    'Generate a policy for data classification',
    'Explain NCA-ECC requirements for our sector',
  ]);

  stats = computed(() => {
    const perf = this.agentPerformance();
    const totalTasks = perf.reduce((s, a) => s + a.taskCount, 0);
    const avgRate = perf.length ? Math.round(perf.reduce((s, a) => s + a.successRate, 0) / perf.length) : 0;
    return [
      { value: String(this.messages().length), label: 'Messages', color: 'var(--primary-600)' },
      { value: String(totalTasks), label: 'Agent Tasks', color: 'var(--purple-600)' },
      { value: `${avgRate}%`, label: 'AI Success Rate', color: 'var(--green-600)' },
      { value: String(this.pendingActions().length), label: 'Pending Actions', color: 'var(--orange-600)' },
    ];
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    forkJoin({
      performance: this.aiApi.getAgentPerformance().pipe(catchError(() => of([]))),
      recommendations: this.aiApi.govAiRecommendations({ status: 'pending' }).pipe(catchError(() => of([]))),
      pendingActions: this.http.get<{ actions: PendingAction[] }>(`${this.apiUrl}/copilot/actions/pending`).pipe(catchError(() => of({ actions: [] }))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.agentPerformance.set(res.performance);
      this.recommendations.set(res.recommendations.slice(0, 5));
      this.pendingActions.set(res.pendingActions.actions?.slice(0, 10) || []);
      this.loading.set(false);
    });
  }

  sendMessage(text: string): void {
    const content = text.trim();
    if (!content) return;
    this.userInput = '';

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.chatLoading.set(true);
    this.scrollToBottom();

    this.http.post<{ response: string; model?: string; agentId?: string }>(
      `${this.apiUrl}/copilot/chat`, { message: content }
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.response || 'No response received.',
          timestamp: new Date().toISOString(),
          model: res.model,
          agentId: res.agentId,
        };
        this.messages.update(msgs => [...msgs, assistantMsg]);
        this.chatLoading.set(false);
        this.scrollToBottom();
      },
      error: () => {
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Unable to reach the AI service. Please try again.',
          timestamp: new Date().toISOString(),
        };
        this.messages.update(msgs => [...msgs, errMsg]);
        this.chatLoading.set(false);
        this.scrollToBottom();
      },
    });
  }

  clearChat(): void {
    this.messages.set([]);
  }

  approveAction(action: PendingAction): void {
    this.http.patch(`${this.apiUrl}/copilot/actions/${action.id}/approve`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pendingActions.update(list => list.filter(a => a.id !== action.id));
      });
  }

  rejectAction(action: PendingAction): void {
    this.http.patch(`${this.apiUrl}/copilot/actions/${action.id}/reject`, { reason: 'Rejected from copilot' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pendingActions.update(list => list.filter(a => a.id !== action.id));
      });
  }

  acceptRecommendation(rec: GovAIRecommendationDto): void {
    this.aiApi.govAiAcceptRec(rec.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.recommendations.update(list => list.filter(r => r.id !== rec.id));
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
