import { Component, Input, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export type AIModule =
  | 'risks'
  | 'compliance'
  | 'governance'
  | 'audit'
  | 'incidents'
  | 'vendors'
  | 'evidence'
  | 'policy'
  | 'policies'
  | 'controls'
  | 'framework'
  | 'frameworks'
  | 'bcp'
  | 'findings'
  | 'assets'
  | 'exceptions'
  | 'remediation'
  | 'privacy'
  | 'vendor-risk'
  | 'sox-compliance'
  | 'subflows'
  | 'bulk-import'
  | 'business-calendar'
  | 'content-manager'
  | 'control-testing'
  | 'copilot-channels'
  | 'custom-objects'
  | 'dashboard-sharing'
  | 'data-explorer'
  | 'entity-links'
  | 'esg'
  | 'form-builder'
  | 'governance-os'
  | 'locations'
  | 'login-history'
  | 'mappings'
  | 'modules'
  | 'processes'
  | 'products'
  | 'raci-matrix'
  | 'role-profiles'
  | 'scoring-policies'
  | 'shared-dashboard'
  | 'workflow-templates'
  | 'rbac-admin'
  | 'sla-management'
  | (string & {});

export const MODULE_ENDPOINTS: Record<string, string> = {
  risks: '/ai/risk-assessment/summary',
  compliance: '/ai/gap-analysis/summary',
  governance: '/ai/insights',
  audit: '/ai/audit-prep/summary',
  incidents: '/ai/triage-incident/summary',
  vendors: '/ai/vendor-risk/summary',
  evidence: '/ai/evidence-gap/summary',
  policy: '/ai/insights',
  policies: '/ai/insights',
  controls: '/ai/gap-analysis/summary',
  framework: '/ai/gap-analysis/summary',
  frameworks: '/ai/gap-analysis/summary',
  bcp: '/ai/bcp-analysis/summary',
  findings: '/ai/gap-analysis/summary',
  assets: '/ai/risk-assessment/summary',
  exceptions: '/ai/gap-analysis/summary',
  remediation: '/ai/gap-analysis/summary',
  privacy: '/ai/gap-analysis/summary',
  'vendor-risk': '/ai/vendor-risk/summary',
  'sox-compliance': '/ai/gap-analysis/summary',
  subflows: '/ai/insights',
  'bulk-import': '/ai/risk-assessment/summary',
  'business-calendar': '/ai/gap-analysis/summary',
  'content-manager': '/ai/insights',
  'control-testing': '/ai/gap-analysis/summary',
  'copilot-channels': '/ai/insights',
  'custom-objects': '/ai/insights',
  'dashboard-sharing': '/ai/gap-analysis/summary',
  'data-explorer': '/ai/risk-assessment/summary',
  'entity-links': '/ai/gap-analysis/summary',
  esg: '/ai/gap-analysis/summary',
  'form-builder': '/ai/insights',
  'governance-os': '/ai/insights',
  locations: '/ai/risk-assessment/summary',
  'login-history': '/ai/audit-prep/summary',
  mappings: '/ai/gap-analysis/summary',
  modules: '/ai/insights',
  processes: '/ai/insights',
  products: '/ai/risk-assessment/summary',
  'raci-matrix': '/ai/insights',
  'role-profiles': '/ai/insights',
  'scoring-policies': '/ai/risk-assessment/summary',
  'shared-dashboard': '/ai/gap-analysis/summary',
  'workflow-templates': '/ai/insights',
  'rbac-admin': '/ai/insights',
  'sla-management': '/ai/gap-analysis/summary',
};

export const MODULE_LABEL_KEYS: Record<string, string> = {
  risks: 'aiPanel.risks',
  compliance: 'aiPanel.compliance',
  governance: 'aiPanel.governance',
  audit: 'aiPanel.audit',
  incidents: 'aiPanel.incidents',
  vendors: 'aiPanel.vendors',
  evidence: 'aiPanel.evidence',
  policy: 'aiPanel.policy',
  policies: 'aiPanel.policy',
  controls: 'aiPanel.compliance',
  framework: 'aiPanel.framework',
  frameworks: 'aiPanel.framework',
  bcp: 'aiPanel.bcp',
  findings: 'aiPanel.findings',
  assets: 'aiPanel.assets',
  exceptions: 'aiPanel.exceptions',
  remediation: 'aiPanel.remediation',
  privacy: 'aiPanel.privacy',
  'vendor-risk': 'aiPanel.vendorRisk',
  'sox-compliance': 'aiPanel.compliance',
  subflows: 'aiPanel.governance',
  'bulk-import': 'aiPanel.risks',
  'business-calendar': 'aiPanel.compliance',
  'content-manager': 'aiPanel.governance',
  'control-testing': 'aiPanel.compliance',
  'copilot-channels': 'aiPanel.governance',
  'custom-objects': 'aiPanel.governance',
  'dashboard-sharing': 'aiPanel.compliance',
  'data-explorer': 'aiPanel.risks',
  'entity-links': 'aiPanel.compliance',
  esg: 'aiPanel.compliance',
  'form-builder': 'aiPanel.governance',
  'governance-os': 'aiPanel.governance',
  locations: 'aiPanel.risks',
  'login-history': 'aiPanel.audit',
  mappings: 'aiPanel.compliance',
  modules: 'aiPanel.governance',
  processes: 'aiPanel.governance',
  products: 'aiPanel.risks',
  'raci-matrix': 'aiPanel.governance',
  'role-profiles': 'aiPanel.governance',
  'scoring-policies': 'aiPanel.risks',
  'shared-dashboard': 'aiPanel.compliance',
  'workflow-templates': 'aiPanel.governance',
  'rbac-admin': 'aiPanel.governance',
  'sla-management': 'aiPanel.compliance',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-panel',
    imports: [CommonModule, ButtonModule, SkeletonModule],
    template: `
    <div class="ai-panel" [class.collapsed]="collapsed()">
      <button class="ai-toggle" (click)="toggle()">
        <i class="pi" [ngClass]="collapsed() ? 'pi-chevron-left' : 'pi-chevron-right'"></i>
        <span *ngIf="collapsed()" class="ai-toggle-label">AI</span>
      </button>
      <div class="ai-content" *ngIf="!collapsed()">
        <div class="ai-header">
          <i class="pi pi-sparkles"></i>
          <span>{{ getLabel() }}</span>
        </div>
        <div *ngIf="loading()" class="ai-loading">
          <p-skeleton width="100%" height="20px" styleClass="mb-2" />
          <p-skeleton width="80%" height="20px" styleClass="mb-2" />
          <p-skeleton width="60%" height="20px" styleClass="mb-2" />
          <p-skeleton width="90%" height="20px" styleClass="mb-2" />
          <p-skeleton width="70%" height="20px" />
        </div>
        <div *ngIf="error() && !loading()" class="ai-error">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ i18n.translate('aiPanel.loadFailed') }}</span>
          <span *ngIf="retryCount() > 0" class="retry-info">
            {{ i18n.translate('aiPanel.attempt') }} {{ retryCount() }}/{{ maxRetries }}
          </span>
          <button pButton
            [label]="i18n.translate('aiPanel.retry')"
            icon="pi pi-refresh"
            class="p-button-sm p-button-text"
            [loading]="retrying()"
            (click)="retryLoad()">
          </button>
        </div>
        <div *ngIf="insights() && !loading() && !error()" class="ai-results">
          <div *ngFor="let item of insightItems()" class="ai-card">
            <div class="ai-card-title">{{ item.title }}</div>
            <div class="ai-card-body">{{ item.description }}</div>
            <div class="ai-card-meta" *ngIf="item.severity">
              <span class="severity-badge" [class]="'sev-' + item.severity">{{ item.severity }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .ai-panel { position: relative; border-inline-start: 1px solid var(--border-subtle); background: var(--surface); min-height: 200px; transition: width 300ms; }
    .ai-panel.collapsed { width: 40px; }
    .ai-panel:not(.collapsed) { width: 320px; }
    .ai-toggle { position: absolute; top: 12px; inset-inline-start: -16px; width: 32px; height: 32px; border-radius: var(--radius-pill); background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: var(--z-base); box-shadow: var(--shadow-sm); }
    .ai-toggle-label { font-size: var(--font-size-xs); font-weight: 700; writing-mode: vertical-rl; margin-top: 8px; }
    .ai-content { padding: 16px; overflow-y: auto; max-height: calc(100vh - 100px); }
    .ai-header { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); margin-bottom: 16px; }
    .ai-header .pi { color: var(--primary); }
    .ai-loading { padding: 8px 0; }
    .ai-error { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; text-align: center; color: var(--status-danger); font-size: var(--font-size-sm); }
    .ai-error .retry-info { font-size: var(--font-size-xs); color: var(--text-muted); }
    .ai-results { display: flex; flex-direction: column; gap: 10px; }
    .ai-card { padding: 12px; border-radius: var(--radius); background: var(--surface-sunken); border: 1px solid var(--border-subtle); }
    .ai-card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); margin-bottom: 4px; }
    .ai-card-body { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.5; }
    .ai-card-meta { margin-top: 6px; }
    .severity-badge { font-size: var(--font-size-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill); text-transform: uppercase; }
    .sev-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .sev-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .sev-medium { background: #fefce8; color: #ca8a04; }
    .sev-low { background: var(--status-success-bg, #defbe6); color: var(--success); }
  `]
})
export class AiPanelComponent {
  @Input() module!: AIModule;

  collapsed = signal(true);
  loading = signal(false);
  error = signal(false);
  retrying = signal(false);
  retryCount = signal(0);
  insights = signal<unknown>(null);
  insightItems = signal<{ title: string; description: string; severity?: string }[]>([]);

  readonly maxRetries = MAX_RETRIES;

  constructor(public i18n: I18nService, private http: HttpClient) {}

  toggle(): void {
    this.collapsed.update(v => !v);
    if (!this.collapsed() && !this.insights()) {
      this.loadInsights();
    }
  }

  getLabel(): string {
    const key = MODULE_LABEL_KEYS[this.module];
    if (key) {
      const translated = this.i18n.translate(key);
      if (translated && translated !== key) return translated;
    }
    return this.i18n.translate('aiPanel.insights');
  }

  loadInsights(): void {
    this.loading.set(true);
    this.error.set(false);
    this.retryCount.set(0);
    this.fetchInsights();
  }

  retryLoad(): void {
    this.retrying.set(true);
    this.error.set(false);
    this.loading.set(true);
    this.fetchInsights();
  }

  private fetchInsights(): void {
    const endpoint = MODULE_ENDPOINTS[this.module] || '/ai/risk-assessment/summary';
    this.http.get<unknown>(`${environment.apiUrl}${endpoint}`).subscribe({
      next: (data) => {
        this.insights.set(data);
        this.insightItems.set(this.parseInsights(data));
        this.loading.set(false);
        this.retrying.set(false);
        this.retryCount.set(0);
      },
      error: () => {
        const currentRetry = this.retryCount();
        if (currentRetry < MAX_RETRIES) {
          this.retryCount.set(currentRetry + 1);
          setTimeout(() => this.fetchInsights(), RETRY_DELAY_MS * (currentRetry + 1));
        } else {
          this.error.set(true);
          this.loading.set(false);
          this.retrying.set(false);
        }
      },
    });
  }

  private parseInsights(data: any): { title: string; description: string; severity?: string }[] {
    if (Array.isArray(data)) {
      return data.map((d: Record<string, unknown>) => ({
        title: (d['title'] as string) || (d['name'] as string) || 'Insight',
        description: (d['description'] as string) || (d['message'] as string) || JSON.stringify(d),
        severity: d['severity'] as string | undefined,
      }));
    }
    const obj = data as Record<string, unknown> | null;
    if (obj?.['recommendations']) {
      return (obj['recommendations'] as Record<string, unknown>[]).map((r: Record<string, unknown>) => ({
        title: (r['title'] as string) || 'Recommendation',
        description: (r['description'] as string) || (r['message'] as string) || String(r),
        severity: r['priority'] as string | undefined,
      }));
    }
    if (obj?.['message']) {
      return [{ title: 'AI Response', description: obj['message'] as string }];
    }
    return [{ title: 'Analysis Complete', description: JSON.stringify(data).slice(0, 200) }];
  }

}
