import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface AgentModelConfig {
  agent_id: string;
  preferred_model: string;
  preferred_provider: string;
  max_tokens: number;
  temperature: number;
  complexity_tier: string;
  fallback_model: string | null;
  fallback_provider: string | null;
  enabled: boolean;
}

const AGENT_NAMES: Record<string, { en: string; ar: string }> = {
  A01: { en: 'Onboarding Agent', ar: 'وكيل الإعداد' },
  A02: { en: 'Identity Agent', ar: 'وكيل الهوية' },
  A03: { en: 'Framework Mapping', ar: 'وكيل الأطر' },
  A04: { en: 'Control Authoring', ar: 'وكيل الضوابط' },
  A05: { en: 'Evidence Collection', ar: 'وكيل الأدلة' },
  A06: { en: 'Gap Remediation', ar: 'وكيل المعالجة' },
  A07: { en: 'Risk Register', ar: 'وكيل المخاطر' },
  A08: { en: 'Policy Lifecycle', ar: 'وكيل السياسات' },
  A09: { en: 'Vendor Risk', ar: 'وكيل الموردين' },
  A10: { en: 'Audit Reporting', ar: 'وكيل التدقيق' },
  A11: { en: 'BCP Continuity', ar: 'وكيل الاستمرارية' },
};

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'auto', label: 'Auto (tier-based)' },
];

const TIER_OPTIONS = [
  { value: 'low', label: 'Low (fast, cheap)' },
  { value: 'medium', label: 'Medium (balanced)' },
  { value: 'high', label: 'High (quality)' },
  { value: 'critical', label: 'Critical (best model)' },
];

@Component({
    selector: 'app-ai-model-config',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="model-config-page">
      <div class="page-header">
        <h2>{{ i18n.localize('AI Agent Model Configuration', 'إعدادات نماذج الوكلاء') }}</h2>
        <p class="subtitle">{{ i18n.localize(
          'Configure which AI model each agent uses, including temperature, token limits, and complexity tier.',
          'قم بتكوين نموذج الذكاء الاصطناعي لكل وكيل، بما في ذلك درجة الحرارة وحدود الرموز ومستوى التعقيد.'
        ) }}</p>
      </div>

      <div class="agent-grid" *ngIf="configs.length > 0; else loadingTpl">
        <div class="agent-card" *ngFor="let cfg of configs" [class.disabled]="!cfg.enabled">
          <div class="agent-header">
            <span class="agent-id">{{ cfg.agent_id }}</span>
            <span class="agent-name">{{ getAgentName(cfg.agent_id) }}</span>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="cfg.enabled" (ngModelChange)="save(cfg)">
              <span class="toggle-label">{{ cfg.enabled ? i18n.localize('Enabled', 'مفعّل') : i18n.localize('Disabled', 'معطّل') }}</span>
            </label>
          </div>

          <div class="config-fields" *ngIf="cfg.enabled">
            <div class="field">
              <label>{{ i18n.localize('Model', 'النموذج') }}</label>
              <select [(ngModel)]="cfg.preferred_model" (ngModelChange)="save(cfg)">
                <option *ngFor="let m of modelOptions" [value]="m.value">{{ m.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>{{ i18n.localize('Complexity Tier', 'مستوى التعقيد') }}</label>
              <select [(ngModel)]="cfg.complexity_tier" (ngModelChange)="save(cfg)">
                <option *ngFor="let t of tierOptions" [value]="t.value">{{ t.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>{{ i18n.localize('Temperature', 'درجة الحرارة') }}: {{ cfg.temperature }}</label>
              <input type="range" min="0" max="1" step="0.1"
                     [(ngModel)]="cfg.temperature" (ngModelChange)="save(cfg)">
            </div>

            <div class="field">
              <label>{{ i18n.localize('Max Tokens', 'الحد الأقصى للرموز') }}</label>
              <input type="number" min="256" max="16384" step="256"
                     [(ngModel)]="cfg.max_tokens" (ngModelChange)="save(cfg)">
            </div>

            <div class="field" *ngIf="cfg.fallback_model">
              <label>{{ i18n.localize('Fallback Model', 'النموذج الاحتياطي') }}</label>
              <span class="fallback-value">{{ cfg.fallback_model }}</span>
            </div>
          </div>

          <div class="save-status" *ngIf="saveStatus[cfg.agent_id]">
            {{ saveStatus[cfg.agent_id] }}
          </div>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading">{{ i18n.localize('Loading agent configurations...', 'جارٍ تحميل إعدادات الوكلاء...') }}</div>
      </ng-template>
    </div>
  `,
    styles: [`
    .model-config-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header h2 { margin: 0 0 8px; font-size: var(--font-size-xl); font-weight: 700; }
    .subtitle { color: var(--text-color-secondary, #6b7280); font-size: var(--font-size-sm); margin-bottom: 24px; }
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .agent-card { border: 1px solid var(--surface-border, #e5e7eb); border-radius: var(--radius-lg); padding: 16px; background: var(--surface-card, #fff); }
    .agent-card.disabled { opacity: 0.5; }
    .agent-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .agent-id { font-weight: 800; color: var(--primary-color, #0ea5e9); font-size: var(--font-size-base); }
    .agent-name { flex: 1; font-weight: 600; font-size: var(--font-size-sm); }
    .toggle { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: var(--font-size-xs); }
    .toggle input { width: 16px; height: 16px; }
    .config-fields { display: flex; flex-direction: column; gap: 10px; }
    .field label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .field select, .field input[type="number"] { width: 100%; padding: 6px 10px; border: 1px solid var(--surface-border, #d1d5db); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .field input[type="range"] { width: 100%; }
    .fallback-value { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .save-status { font-size: var(--font-size-xs); color: #10b981; margin-top: 8px; text-align: right; }
    .loading { text-align: center; padding: 48px; color: var(--text-color-secondary); }
  `]
})
export class AiModelConfigComponent implements OnInit {
  configs: AgentModelConfig[] = [];
  saveStatus: Record<string, string> = {};
  modelOptions = MODEL_OPTIONS;
  tierOptions = TIER_OPTIONS;

  private saveTimers: Record<string, any> = {};

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  getAgentName(agentId: string): string {
    const names = AGENT_NAMES[agentId];
    return names ? this.i18n.localize(names.en, names.ar) : agentId;
  }

  save(cfg: AgentModelConfig): void {
    // Debounce saves per agent (300ms)
    if (this.saveTimers[cfg.agent_id]) clearTimeout(this.saveTimers[cfg.agent_id]);
    this.saveTimers[cfg.agent_id] = setTimeout(() => this.doSave(cfg), 300);
  }

  private doSave(cfg: AgentModelConfig): void {
    const { agent_id, ...body } = cfg;
    this.http.put(`/api/ai-enhanced/model-config/${agent_id}`, body).subscribe({
      next: () => {
        this.saveStatus[agent_id] = this.i18n.localize('Saved', 'تم الحفظ');
        setTimeout(() => { this.saveStatus[agent_id] = ''; }, 2000);
      },
      error: () => {
        this.saveStatus[agent_id] = this.i18n.localize('Save failed', 'فشل الحفظ');
      },
    });
  }

  private loadConfigs(): void {
    this.http.get<{ configs: AgentModelConfig[] }>('/api/ai-enhanced/model-config').subscribe({
      next: (data) => {
        // Ensure all 11 agents have entries
        const existing = new Map(data.configs.map(c => [c.agent_id, c]));
        this.configs = Object.keys(AGENT_NAMES).map(id => existing.get(id) || {
          agent_id: id,
          preferred_model: 'auto',
          preferred_provider: 'auto',
          max_tokens: 4096,
          temperature: 0.3,
          complexity_tier: 'medium',
          fallback_model: null,
          fallback_provider: null,
          enabled: true,
        });
      },
      error: () => {
        // Fallback: show defaults
        this.configs = Object.keys(AGENT_NAMES).map(id => ({
          agent_id: id,
          preferred_model: 'auto',
          preferred_provider: 'auto',
          max_tokens: 4096,
          temperature: 0.3,
          complexity_tier: 'medium',
          fallback_model: null,
          fallback_provider: null,
          enabled: true,
        }));
      },
    });
  }
}
