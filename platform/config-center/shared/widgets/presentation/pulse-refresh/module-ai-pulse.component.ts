import { Component, ChangeDetectionStrategy, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import { AccessStore } from '@dos/access-store';
import { TagModule } from 'primeng/tag';

interface AiAction {
  agentId: string;
  actionType: string;
  summary: string;
  createdAt: string;
}

interface AiPulseData {
  moduleCode: string;
  healthStatus: string;
  maturityLevel: string;
  certificationState: string;
  agentsActive: number;
  agentActions24h: number;
  discoveries24h: number;
  proposalsPending: number;
  lastAgentRunAt: string | null;
  recentActions: AiAction[];
}

@Component({
    selector: 'app-module-ai-pulse',
    imports: [CommonModule, TagModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="ai-pulse" *ngIf="pulse">
      <div class="ai-pulse-header">
        <span class="ai-pulse-icon">
          <i class="pi pi-bolt"></i>
        </span>
        <span class="ai-pulse-title">{{ i18n.localize('AI Operating Pulse', 'نبض عمليات الذكاء') }}</span>
        <p-tag [value]="pulse.healthStatus" [severity]="healthSeverity" styleClass="ai-pulse-health"></p-tag>
      </div>

      <div class="ai-pulse-metrics">
        <div class="ai-pulse-metric">
          <div class="ai-pulse-value">{{ pulse.agentsActive }}</div>
          <div class="ai-pulse-label">{{ i18n.localize('Active Agents', 'وكلاء نشطون') }}</div>
        </div>
        <div class="ai-pulse-metric">
          <div class="ai-pulse-value">{{ pulse.agentActions24h }}</div>
          <div class="ai-pulse-label">{{ i18n.localize('AI Actions (24h)', 'إجراءات (24 س)') }}</div>
        </div>
        <div class="ai-pulse-metric">
          <div class="ai-pulse-value">{{ pulse.discoveries24h }}</div>
          <div class="ai-pulse-label">{{ i18n.localize('Discoveries', 'اكتشافات') }}</div>
        </div>
        <div class="ai-pulse-metric" *ngIf="pulse.proposalsPending > 0">
          <div class="ai-pulse-value ai-pulse-pending">{{ pulse.proposalsPending }}</div>
          <div class="ai-pulse-label">{{ i18n.localize('Pending Approval', 'بانتظار الموافقة') }}</div>
        </div>
      </div>

      <div class="ai-pulse-maturity">
        <span class="ai-pulse-maturity-label">{{ i18n.localize('Maturity', 'النضج') }}:</span>
        <span class="ai-pulse-maturity-level" [attr.data-level]="pulse.maturityLevel">
          {{ maturityLabel }}
        </span>
        <span class="ai-pulse-cert" *ngIf="pulse.certificationState === 'CERTIFIED_A_PLUS_PLUS'">
          A++
        </span>
      </div>

      <div class="ai-pulse-feed" *ngIf="pulse.recentActions.length > 0">
        <div class="ai-pulse-feed-title">{{ i18n.localize('Recent AI Activity', 'نشاط الذكاء الأخير') }}</div>
        <div class="ai-pulse-feed-item" *ngFor="let action of pulse.recentActions; trackBy: trackAction">
          <span class="ai-pulse-feed-agent">{{ action.agentId }}</span>
          <span class="ai-pulse-feed-summary">{{ action.summary }}</span>
          <span class="ai-pulse-feed-time">{{ formatRelative(action.createdAt) }}</span>
        </div>
      </div>

      <div class="ai-pulse-empty" *ngIf="pulse.agentsActive === 0 && pulse.agentActions24h === 0">
        <i class="pi pi-info-circle"></i>
        <span>{{ i18n.localize(
          'AI agents are configured for this module. Activity will appear after the first autonomous cycle.',
          'تم إعداد وكلاء الذكاء الاصطناعي لهذا الموديول. سيظهر النشاط بعد أول دورة تشغيل.'
        ) }}</span>
      </div>
    </div>
  `,
    styles: [`
    .ai-pulse {
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1rem;
      background: var(--surface-card);
    }
    .ai-pulse-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .ai-pulse-icon { color: var(--primary-color); font-size: 1.1rem; }
    .ai-pulse-title { font-weight: 600; font-size: 0.95rem; flex: 1; }
    .ai-pulse-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .ai-pulse-metric {
      text-align: center;
      padding: 0.5rem;
      background: var(--surface-ground);
      border-radius: 6px;
    }
    .ai-pulse-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary-color);
    }
    .ai-pulse-pending { color: var(--orange-500); }
    .ai-pulse-label { font-size: 0.7rem; color: var(--text-color-secondary); margin-top: 2px; }
    .ai-pulse-maturity {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      padding: 0.5rem;
      background: var(--surface-ground);
      border-radius: 6px;
    }
    .ai-pulse-maturity-label { color: var(--text-color-secondary); }
    .ai-pulse-maturity-level { font-weight: 600; text-transform: capitalize; }
    .ai-pulse-maturity-level[data-level="leading"] { color: var(--green-600); }
    .ai-pulse-maturity-level[data-level="optimized"] { color: var(--teal-600); }
    .ai-pulse-maturity-level[data-level="established"] { color: var(--blue-600); }
    .ai-pulse-maturity-level[data-level="developing"] { color: var(--orange-600); }
    .ai-pulse-maturity-level[data-level="starter"] { color: var(--text-color-secondary); }
    .ai-pulse-cert {
      background: var(--green-100);
      color: var(--green-700);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-inline-start: auto;
    }
    .ai-pulse-feed { margin-top: 0.5rem; }
    .ai-pulse-feed-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-color-secondary);
      margin-bottom: 0.4rem;
    }
    .ai-pulse-feed-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0;
      font-size: 0.8rem;
      border-bottom: 1px solid var(--surface-border);
    }
    .ai-pulse-feed-item:last-child { border-bottom: none; }
    .ai-pulse-feed-agent {
      background: var(--primary-100);
      color: var(--primary-700);
      font-size: 0.7rem;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .ai-pulse-feed-summary { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ai-pulse-feed-time { color: var(--text-color-secondary); font-size: 0.7rem; white-space: nowrap; }
    .ai-pulse-empty {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--surface-ground);
      border-radius: 6px;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
    }
    .ai-pulse-empty i { margin-top: 2px; color: var(--blue-400); }
  `]
})
export class ModuleAiPulseComponent implements OnInit, OnChanges {
  @Input() moduleCode = '';
  @Input() lang: 'en' | 'ar' = 'en';

  i18n = inject(I18nService);
  private http: HttpClient = inject(HttpClient);
  private access = inject(AccessStore);

  pulse: AiPulseData | null = null;

  get healthSeverity(): 'success' | 'warning' | 'danger' | 'info' {
    if (!this.pulse) return 'info';
    switch (this.pulse.healthStatus) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'danger';
      default: return 'info';
    }
  }

  get maturityLabel(): string {
    if (!this.pulse) return '';
    const labels: Record<string, { en: string; ar: string }> = {
      starter: { en: 'Starter', ar: 'مبتدئ' },
      developing: { en: 'Developing', ar: 'متطور' },
      established: { en: 'Established', ar: 'مستقر' },
      optimized: { en: 'Optimized', ar: 'محسّن' },
      leading: { en: 'Leading', ar: 'رائد' },
    };
    const l = labels[this.pulse.maturityLevel] || { en: this.pulse.maturityLevel, ar: this.pulse.maturityLevel };
    return this.lang === 'ar' ? l.ar : l.en;
  }

  ngOnInit(): void {
    this.loadPulse();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['moduleCode'] && !changes['moduleCode'].firstChange) {
      this.loadPulse();
    }
  }

  trackAction = (_: number, a: AiAction) => a.agentId + a.createdAt;

  formatRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return this.lang === 'ar' ? 'الآن' : 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  }

  private loadPulse(): void {
    if (!this.moduleCode) return;
    // Capability-gated: never call runtime-health/ai-pulse unless ai-os is active.
    // During Foundation-only bring-up this prevents 404 noise on the active page.
    if (!this.access.canAccessModule('ai-os') || !this.access.canAccessModule('runtime-health')) {
      this.pulse = null as unknown as AiPulseData;
      return;
    }
    this.http.get<AiPulseData>(`${environment.apiUrl}/runtime-health/ai-pulse/${this.moduleCode}`).subscribe({
      next: (data) => { this.pulse = data; },
      error: () => {
        this.pulse = {
          moduleCode: this.moduleCode,
          healthStatus: 'unknown',
          maturityLevel: 'starter',
          certificationState: 'HIDDEN',
          agentsActive: 0,
          agentActions24h: 0,
          discoveries24h: 0,
          proposalsPending: 0,
          lastAgentRunAt: null,
          recentActions: [],
        };
      },
    });
  }
}
