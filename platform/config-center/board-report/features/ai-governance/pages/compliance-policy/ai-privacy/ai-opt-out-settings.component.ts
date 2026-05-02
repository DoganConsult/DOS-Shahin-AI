import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiBadgeComponent } from '@app/shared/components/ai/ai-badge.component';
import { environment } from '@env/environment';

interface AiOptOutConfig {
  globalOptOut: boolean;
  optOutModules: Record<string, boolean>;
  dataRetentionDays: number;
  anonymizePrompts: boolean;
  disableTraining: boolean;
  lastUpdated: string;
  updatedBy: string;
}

const DEFAULT_MODULES: Record<string, { label: string; description: string }> = {
  copilot: { label: 'AI Copilot', description: 'Interactive AI assistant for GRC queries and actions' },
  risk_scoring: { label: 'AI Risk Scoring', description: 'Automated risk assessment and scoring engine' },
  compliance_recommendations: { label: 'Compliance Recommendations', description: 'AI-driven compliance gap analysis and recommendations' },
  evidence_analysis: { label: 'Evidence Analysis', description: 'Multimodal evidence classification and validation' },
  report_generation: { label: 'Report Generation', description: 'AI-assisted report drafting and summaries' },
  anomaly_detection: { label: 'Anomaly Detection', description: 'Behavioral anomaly and drift detection' },
  regulatory_intelligence: { label: 'Regulatory Intelligence', description: 'KSA regulatory change tracking and impact analysis' },
  workflow_automation: { label: 'Workflow Automation', description: 'AI-driven workflow suggestions and auto-routing' },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-opt-out-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AiBadgeComponent],
  template: `
    <div class="opt-out-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-shield"></i></div>
          <div>
            <h1>{{ i18n.translate('ai.optOut.title') }} <app-ai-badge variant="subtle" label="AI Controls" /></h1>
            <p class="subtitle">{{ i18n.translate('ai.optOut.subtitle') }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" [disabled]="saving()" (click)="saveConfig()">
            <i class="pi" [class.pi-save]="!saving()" [class.pi-spin]="saving()" [class.pi-spinner]="saving()"></i>
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-state"><i class="pi pi-spin pi-spinner"></i> Loading AI settings...</div>
      } @else {
        <div class="settings-grid">
          <div class="settings-card global-card" [class.opted-out]="config().globalOptOut">
            <div class="card-header">
              <h2>Global AI Toggle</h2>
              <label class="toggle">
                <input type="checkbox" [checked]="!config().globalOptOut" (change)="toggleGlobal()">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <p class="card-desc">{{ config().globalOptOut ? 'All AI features are currently DISABLED for this tenant.' : 'AI features are enabled. Configure individual modules below.' }}</p>
            @if (config().globalOptOut) {
              <div class="warning-banner"><i class="pi pi-exclamation-triangle"></i> All AI-powered features are disabled. Manual processes will be used instead.</div>
            }
          </div>

          <div class="settings-card">
            <h2>Per-Module AI Controls</h2>
            <p class="card-desc">Enable or disable AI for specific platform modules.</p>
            <div class="module-list">
              @for (mod of moduleEntries; track mod.key) {
                <div class="module-row" [class.disabled]="config().globalOptOut">
                  <div class="module-info">
                    <span class="module-label">{{ mod.label }}</span>
                    <span class="module-desc">{{ mod.description }}</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox"
                      [checked]="!config().optOutModules[mod.key]"
                      [disabled]="config().globalOptOut"
                      (change)="toggleModule(mod.key)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              }
            </div>
          </div>

          <div class="settings-card">
            <h2>Data Privacy Controls</h2>
            <div class="privacy-controls">
              <div class="control-row">
                <div class="control-info">
                  <span class="control-label">Anonymize AI Prompts</span>
                  <span class="control-desc">Strip PII from all prompts sent to AI models</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" [checked]="config().anonymizePrompts" (change)="toggleAnonymize()">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="control-row">
                <div class="control-info">
                  <span class="control-label">Disable Model Training</span>
                  <span class="control-desc">Prevent tenant data from being used for model improvement</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" [checked]="config().disableTraining" (change)="toggleTraining()">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="control-row">
                <div class="control-info">
                  <span class="control-label">AI Log Retention (days)</span>
                  <span class="control-desc">How long to keep AI audit logs</span>
                </div>
                <input type="number" class="retention-input" [value]="config().dataRetentionDays" min="7" max="365"
                  (change)="updateRetention($event)">
              </div>
            </div>
          </div>

          @if (config().lastUpdated) {
            <div class="last-updated">Last updated: {{ config().lastUpdated | date:'medium' }} by {{ config().updatedBy }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .opt-out-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--purple-50, #faf5ff); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--purple-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading-state { text-align: center; padding: 60px; color: var(--text-color-secondary); }
    .settings-grid { display: flex; flex-direction: column; gap: 16px; max-width: 800px; }
    .settings-card { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px 24px; }
    .global-card.opted-out { border-color: var(--red-300); background: var(--red-50, #fef2f2); }
    .card-header { display: flex; align-items: center; justify-content: space-between; }
    .card-header h2, .settings-card h2 { margin: 0 0 8px; font-size: var(--font-size-lg); font-weight: 600; }
    .card-desc { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin: 0 0 16px; }
    .warning-banner { background: var(--red-100); color: var(--red-700); padding: 10px 14px; border-radius: var(--radius); font-size: var(--font-size-xs-plus); display: flex; align-items: center; gap: 8px; }
    .module-list { display: flex; flex-direction: column; gap: 2px; }
    .module-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--surface-100); }
    .module-row.disabled { opacity: 0.5; }
    .module-row:last-child { border-bottom: none; }
    .module-info { display: flex; flex-direction: column; gap: 2px; }
    .module-label { font-size: var(--font-size-base); font-weight: 600; }
    .module-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .privacy-controls { display: flex; flex-direction: column; gap: 2px; }
    .control-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--surface-100); }
    .control-row:last-child { border-bottom: none; }
    .control-info { display: flex; flex-direction: column; gap: 2px; }
    .control-label { font-size: var(--font-size-base); font-weight: 600; }
    .control-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .retention-input { width: 80px; padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: var(--surface-300); border-radius: var(--radius-lg); cursor: pointer; transition: .3s; }
    .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #fff; left: 3px; top: 3px; transition: .3s; }
    .toggle input:checked + .toggle-slider { background: var(--primary-500); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }
    .toggle input:disabled + .toggle-slider { opacity: 0.4; cursor: not-allowed; }
    .last-updated { font-size: var(--font-size-sm); color: var(--text-color-secondary); text-align: end; }
  `],
})
export class AiOptOutSettingsComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly config = signal<AiOptOutConfig>({
    globalOptOut: false,
    optOutModules: {},
    dataRetentionDays: 90,
    anonymizePrompts: false,
    disableTraining: false,
    lastUpdated: '',
    updatedBy: '',
  });

  readonly moduleEntries = Object.entries(DEFAULT_MODULES).map(([key, val]) => ({ key, ...val }));

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.http
      .get<{ success: boolean; data: AiOptOutConfig }>(`${environment.apiUrl}/ai-governance/ops/opt-out-config`)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ success: false, data: this.config() })),
      )
      .subscribe((res) => {
        if (res.data) {
          this.config.set({ ...this.config(), ...res.data });
        }
        this.loading.set(false);
      });
  }

  toggleGlobal(): void {
    this.config.update((c) => ({ ...c, globalOptOut: !c.globalOptOut }));
  }

  toggleModule(key: string): void {
    this.config.update((c) => ({
      ...c,
      optOutModules: { ...c.optOutModules, [key]: !c.optOutModules[key] },
    }));
  }

  toggleAnonymize(): void {
    this.config.update((c) => ({ ...c, anonymizePrompts: !c.anonymizePrompts }));
  }

  toggleTraining(): void {
    this.config.update((c) => ({ ...c, disableTraining: !c.disableTraining }));
  }

  updateRetention(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (val >= 7 && val <= 365) {
      this.config.update((c) => ({ ...c, dataRetentionDays: val }));
    }
  }

  saveConfig(): void {
    this.saving.set(true);
    this.http
      .put<{ success: boolean }>(`${environment.apiUrl}/ai-governance/ops/opt-out-config`, this.config())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ success: false })),
      )
      .subscribe(() => this.saving.set(false));
  }
}
