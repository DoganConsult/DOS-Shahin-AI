#!/usr/bin/env node
// Fill the 40 governance UI shells that have no API integration with
// real ApiClientService fetches against the canonical platform routes
// (ai-engine + ai-governance). Each component:
//   - injects I18nService (RTL via dir(), bilingual EN/AR labels)
//   - injects ApiClientService and fetches on ngOnInit()
//   - renders explicit loading / error / empty / ready states
//   - hits a REAL endpoint that exists today (no scaffold endpoints)
//
// The mapping below ties each shell's basename to the closest canonical
// route. Where a shell could match multiple endpoints, the pick favors
// the GET endpoint that returns a list-like shape so the table renders.
//
// Re-runnable. Run from repo root:
//   node ops/scripts/fill-governance-shells.mjs

import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pagesRoot = resolve(here, '../../products/shahin-ai/app/src/app/blueprint/features/ai-governance/pages');

// Per-shell config. `dir` is relative to pagesRoot. `endpoint` is the
// REST path WITHOUT the environment.apiUrl prefix (ApiClientService
// already prepends it). Real endpoints only — verified against the
// engine + governance route trees.
const SHELLS = [
  // Core governance roster
  { dir: '.',                                               name: 'ai-governance-roles',           ep: '/ai-governance/agent-authority',           en: 'AI Governance Roles',          ar: 'أدوار حوكمة الذكاء',                cols: ['id','tenant_id','data','status','updated_at'] },
  // Agents & squads
  { dir: 'agents-squads/ai-agents',                         name: 'ai-agent-performance-dashboard',ep: '/ai-engine/agent-health/dashboard',        en: 'Agent Performance',            ar: 'أداء الوكلاء',                      cols: ['agentCode','runs24h','successRate','meanLatencyMs'] },
  { dir: 'agents-squads/ai-agents',                         name: 'ai-agents',                     ep: '/ai-engine/agents',                        en: 'AI Agents',                    ar: 'وكلاء الذكاء',                       cols: ['agentCode','name','domain','status'] },
  { dir: 'agents-squads/ai-suite',                          name: 'ai-suite',                      ep: '/ai-engine/dashboard',                     en: 'AI Suite Overview',            ar: 'لمحة عن جناح الذكاء',                detail: 'agents,runs24h,pendingApprovals,openIncidents' },
  { dir: 'agents-squads/unified-squad',                     name: 'agent-monitoring-dashboard',    ep: '/ai-engine/agent-health/dashboard',        en: 'Squad Monitoring',             ar: 'مراقبة فريق الوكلاء',                cols: ['agentCode','status','lastRunAt','errors24h'] },
  { dir: 'agents-squads/unified-squad',                     name: 'erp-config',                    ep: '/ai-engine/agrc-os/integration',           en: 'ERP Integration Config',       ar: 'إعداد تكامل ERP',                    cols: ['integrationKey','vendor','status','updated_at'] },
  { dir: 'agents-squads/unified-squad',                     name: 'intervention-dialog',           ep: '/ai-engine/hitl/queue',                    en: 'Intervention Queue',           ar: 'قائمة التدخّل',                       cols: ['state_id','entity_type','hitl_state','ai_agent_id'] },
  { dir: 'agents-squads/unified-squad',                     name: 'unified-squad-dashboard',       ep: '/ai-engine/squad/unified-squad',           en: 'Unified Squad',                ar: 'الفريق الموحّد',                      cols: ['squadId','agents','runStatus','updatedAt'] },
  { dir: 'agents-squads/unified-squad',                     name: 'workflow-visualizer',           ep: '/ai-engine/agrc-os/workflow-versions',     en: 'Workflow Versions',            ar: 'إصدارات سير العمل',                   cols: ['versionId','workflowKey','version','status'] },
  // Asset registry
  { dir: 'assets-registry/ai-assets-registry',              name: 'ai-assets',                     ep: '/ai-governance/system-registry',           en: 'AI Asset Registry',            ar: 'سجل أصول الذكاء',                     cols: ['id','data','status','updated_at'] },
  // Autonomous
  { dir: 'autonomous/autonomous-monitor',                   name: 'autonomous-monitor',            ep: '/ai-engine/agent-health/dashboard',        en: 'Autonomous Monitor',           ar: 'المراقب الآلي',                       cols: ['agentCode','autonomyLevel','status','lastRunAt'] },
  // Compliance / Policy
  { dir: 'compliance-policy/ai-compliance',                 name: 'ai-compliance-framework-dashboard', ep: '/ai-governance/conformity-status',     en: 'Compliance Frameworks',        ar: 'لوحات الامتثال',                      cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-compliance',                 name: 'ai-impact-assessment',          ep: '/ai-governance/privacy-impact',            en: 'Impact Assessments',           ar: 'تقييمات الأثر',                       cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-compliance',                 name: 'ai-mismatches',                 ep: '/ai-governance/serious-incidents',         en: 'Mismatches & Incidents',       ar: 'التضاربات والحوادث',                  cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-privacy',                    name: 'ai-dpia-dashboard',             ep: '/ai-governance/privacy-impact',            en: 'DPIA Dashboard',               ar: 'لوحة DPIA',                          cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-regulatory',                 name: 'ai-enforcement',                ep: '/ai-governance/corrective-actions',        en: 'Enforcement Actions',          ar: 'إجراءات الإنفاذ',                     cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-regulatory',                 name: 'ai-ethics-board',               ep: '/ai-governance/declarations',              en: 'Ethics Board Declarations',    ar: 'إقرارات لجنة الأخلاقيات',             cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-regulatory',                 name: 'ai-eu-classification',          ep: '/ai-governance/risk-classification',       en: 'EU AI Act Classification',     ar: 'تصنيف قانون الذكاء الأوروبي',          cols: ['id','data','status','updated_at'] },
  { dir: 'compliance-policy/ai-regulatory',                 name: 'ai-regulatory-changes',         ep: '/ai-governance/post-market',               en: 'Regulatory Changes',           ar: 'التغيّرات التنظيمية',                  cols: ['id','data','status','updated_at'] },
  // Decision execution
  { dir: 'decision-execution/ai-execution-plans',           name: 'ai-execution-plans',            ep: '/ai-engine/temporal/workflows',            en: 'Execution Plans',              ar: 'خطط التنفيذ',                         cols: ['workflowId','runId','type','status'] },
  // Governance dashboards
  { dir: 'governance-dashboards/ai-governance-core',        name: 'ai-audit',                      ep: '/ai-engine/governance/explainability',     en: 'AI Audit Trail',                ar: 'سجل تدقيق الذكاء',                    cols: ['recordId','agentId','decisionType','outcome'] },
  { dir: 'governance-dashboards/ai-governance-core',        name: 'ai-bindings',                   ep: '/ai-governance/agent-authority',           en: 'AI-Role Bindings',              ar: 'ربط الأدوار',                         cols: ['id','data','status','updated_at'] },
  { dir: 'governance-dashboards/ai-governance-core',        name: 'ai-board-summary',              ep: '/ai-engine/dashboard',                     en: 'Board-Level Summary',           ar: 'ملخص لمجلس الإدارة',                   detail: 'agents,runs24h,pendingApprovals,openIncidents' },
  { dir: 'governance-dashboards/ai-governance-core',        name: 'ai-governance-ops',             ep: '/ai-engine/governance/explainability',     en: 'Governance Operations',         ar: 'عمليات الحوكمة',                       cols: ['recordId','agentId','decisionType','outcome'] },
  { dir: 'governance-dashboards/ai-governance-core',        name: 'ai-governance-shell',           ep: '/ai-engine/dashboard',                     en: 'Governance Shell',              ar: 'هيكل الحوكمة',                         detail: 'agents,runs24h,pendingApprovals,openIncidents' },
  { dir: 'governance-dashboards/ai-governance-dashboard',   name: 'ai-governance-dashboard',       ep: '/ai-engine/dashboard',                     en: 'AI Governance Dashboard',       ar: 'لوحة حوكمة الذكاء',                    detail: 'agents,runs24h,pendingApprovals,openIncidents' },
  { dir: 'governance-dashboards/ai-hub',                    name: 'ai-hub',                        ep: '/ai-engine',                                en: 'AI Hub',                        ar: 'مركز الذكاء',                           detail: 'service,version,mounts' },
  { dir: 'governance-dashboards/ai-os-dashboard/decision-detail', name: 'decision-detail',         ep: '/ai-governance/automated-decisions',       en: 'Automated Decision',            ar: 'القرار الآلي',                          cols: ['id','data','status','updated_at'] },
  { dir: 'governance-dashboards/ai-os-dashboard/decisions-list', name: 'decisions-list',           ep: '/ai-governance/automated-decisions',       en: 'Automated Decisions',           ar: 'القرارات الآلية',                       cols: ['id','data','status','updated_at'] },
  { dir: 'governance-dashboards/ai-os-dashboard/trace-detail', name: 'trace-detail',               ep: '/ai-engine/temporal/workflows',            en: 'Trace Detail',                  ar: 'تفاصيل التتبّع',                        cols: ['workflowId','runId','type','status'] },
  { dir: 'governance-dashboards/ai-os-dashboard',           name: 'ai-os-dashboard',               ep: '/ai-engine/dashboard',                     en: 'AI-OS Dashboard',               ar: 'لوحة AI-OS',                            detail: 'agents,runs24h,pendingApprovals,openIncidents' },
  // MCP admin
  { dir: 'mcp-admin',                                       name: 'mcp-admin',                     ep: '/ai-engine/openclaw/a2a',                  en: 'MCP Admin',                     ar: 'إدارة MCP',                              cols: ['serverId','name','status','toolCount'] },
  // Model management
  { dir: 'model-management/ai-models',                      name: 'ai-model-drift',                ep: '/ai-governance/model-provenance',          en: 'Model Drift',                   ar: 'انجراف النماذج',                         cols: ['id','data','status','updated_at'] },
  { dir: 'model-management/ai-models',                      name: 'ai-model-risk-dashboard',       ep: '/ai-governance/risk-classification',       en: 'Model Risk',                    ar: 'مخاطر النماذج',                          cols: ['id','data','status','updated_at'] },
  { dir: 'model-management/ai-models',                      name: 'ai-models',                     ep: '/ai-governance/model-provenance',          en: 'AI Models',                     ar: 'نماذج الذكاء',                            cols: ['id','data','status','updated_at'] },
  { dir: 'model-management/ai-models',                      name: 'ai-prompts',                    ep: '/ai-engine/governance/explainability',     en: 'Prompt Library',                ar: 'مكتبة الأوامر',                          cols: ['recordId','agentId','decisionType','outcome'] },
  // Operations
  { dir: 'operations/ai-monitoring',                        name: 'ai-alerts-killswitch',          ep: '/ai-engine/governance/explainability',     en: 'Alerts & Kill-Switches',        ar: 'التنبيهات ومفاتيح الإيقاف',               cols: ['recordId','agentId','decisionType','outcome'] },
  { dir: 'operations/ai-monitoring',                        name: 'ai-explainability-dashboard',   ep: '/ai-engine/governance/explainability',     en: 'Explainability Dashboard',      ar: 'لوحة التفسير',                          cols: ['recordId','agentId','decisionType','outcome'] },
  { dir: 'operations/ai-monitoring',                        name: 'ai-fairness',                   ep: '/ai-engine/governance/explainability',     en: 'Fairness Monitor',              ar: 'مراقبة الإنصاف',                         cols: ['recordId','agentId','decisionType','outcome'] },
  { dir: 'operations/ai-monitoring',                        name: 'ai-maturity-scorecard',         ep: '/ai-engine/dashboard',                     en: 'Maturity Scorecard',            ar: 'بطاقة النضج',                            detail: 'agents,runs24h,pendingApprovals,openIncidents' },
];

const classFor = (file) => file.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Component';

const TABLE_TS = (s) => `// AI Governance — ${s.en} page (${s.name}).
// Phase 2 i18n + API hardening: I18nService bindings (RTL via dir(),
// bilingual labels), ApiClientService fetch against the canonical
// platform endpoint ${s.ep}, explicit loading/error/empty/ready
// states. Generated by ops/scripts/fill-governance-shells.mjs — re-run
// to refresh after endpoint contract changes.

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/blueprint/core/services/api-client.service';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

interface Row {
  ${s.cols.map(c => `${c}?: string | number | boolean | null;`).join('\n  ')}
  [key: string]: unknown;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-${s.name}',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule],
  templateUrl: './${s.name}.component.html',
})
export class ${classFor(s.name)} implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClientService);

  readonly rows = signal<Row[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error' | 'empty'>('loading');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<unknown>('${s.ep}').subscribe({
      next: (res) => {
        // Engine + governance endpoints return either a bare array or
        // a {data: [...]} envelope. Tolerate both shapes.
        const arr = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown[] })?.data)
            ? (res as { data: unknown[] }).data
            : (res && typeof res === 'object' ? [res] : []);
        const data = arr as Row[];
        this.rows.set(data);
        this.state.set(data.length === 0 ? 'empty' : 'ready');
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? String(err));
        this.state.set('error');
      },
    });
  }
}
`;

const TABLE_HTML = (s) => `<div class="grc-hub" [dir]="i18n.dir()">
  <header class="hub-toolbar">
    <h2>{{ i18n.isArabic() ? '${s.ar}' : '${s.en}' }}</h2>
    <p class="muted">
      {{ i18n.isArabic()
         ? 'بيانات حيّة من نقطة النهاية ${s.ep}.'
         : 'Live data from ${s.ep}.' }}
    </p>
  </header>

  <ng-container [ngSwitch]="state()">
    <p-card *ngSwitchCase="'loading'">
      <p>{{ i18n.isArabic() ? 'جارِ التحميل…' : 'Loading…' }}</p>
    </p-card>

    <p-card *ngSwitchCase="'error'" styleClass="state-error">
      <h3>{{ i18n.isArabic() ? 'تعذّر تحميل البيانات' : 'Failed to load' }}</h3>
      <pre class="mono">{{ error() }}</pre>
    </p-card>

    <p-card *ngSwitchCase="'empty'">
      <p>{{ i18n.isArabic() ? 'لا توجد سجلات بعد.' : 'No records yet.' }}</p>
    </p-card>

    <p-table *ngSwitchCase="'ready'" [value]="rows()" responsiveLayout="scroll" styleClass="p-datatable-sm">
      <ng-template pTemplate="header">
        <tr>
${s.cols.map(c => `          <th>${c}</th>`).join('\n')}
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-r>
        <tr>
${s.cols.map(c => `          <td>{{ r.${c} }}</td>`).join('\n')}
        </tr>
      </ng-template>
    </p-table>
  </ng-container>
</div>
`;

const DETAIL_TS = (s) => `// AI Governance — ${s.en} page (${s.name}).
// Detail variant: fetches a summary object from ${s.ep} and renders
// the canonical KPIs as a card grid. Bilingual + RTL via I18nService.

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/blueprint/core/services/api-client.service';
import { CardModule } from 'primeng/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-${s.name}',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './${s.name}.component.html',
})
export class ${classFor(s.name)} implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClientService);

  readonly summary = signal<Record<string, unknown> | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<unknown>('${s.ep}').subscribe({
      next: (res) => {
        const data = (res && typeof res === 'object' && (res as { data?: unknown }).data)
          ? (res as { data: Record<string, unknown> }).data
          : (res as Record<string, unknown>);
        this.summary.set(data ?? null);
        this.state.set('ready');
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? String(err));
        this.state.set('error');
      },
    });
  }
}
`;

const DETAIL_HTML = (s) => {
  const fields = (s.detail || '').split(',').filter(Boolean);
  return `<div class="grc-hub" [dir]="i18n.dir()">
  <header class="hub-toolbar">
    <h2>{{ i18n.isArabic() ? '${s.ar}' : '${s.en}' }}</h2>
    <p class="muted">
      {{ i18n.isArabic() ? 'بيانات حيّة من ${s.ep}.' : 'Live data from ${s.ep}.' }}
    </p>
  </header>

  <ng-container [ngSwitch]="state()">
    <p-card *ngSwitchCase="'loading'">
      <p>{{ i18n.isArabic() ? 'جارِ التحميل…' : 'Loading…' }}</p>
    </p-card>
    <p-card *ngSwitchCase="'error'" styleClass="state-error">
      <pre class="mono">{{ error() }}</pre>
    </p-card>
    <div *ngSwitchCase="'ready'" class="kpi-grid">
${fields.map(f => `      <p-card>\n        <h3>${f}</h3>\n        <p class="kpi">{{ summary()?.['${f}'] }}</p>\n      </p-card>`).join('\n')}
    </div>
  </ng-container>
</div>
`;
};

let written = 0; let skipped = 0;
for (const s of SHELLS) {
  const tsPath = join(pagesRoot, s.dir, `${s.name}.component.ts`);
  const htmlPath = join(pagesRoot, s.dir, `${s.name}.component.html`);
  if (!existsSync(tsPath)) { console.warn(`  ! missing ${tsPath} — skipping (path drift?)`); skipped++; continue; }
  const isDetail = !!s.detail;
  writeFileSync(tsPath, isDetail ? DETAIL_TS(s) : TABLE_TS(s));
  writeFileSync(htmlPath, isDetail ? DETAIL_HTML(s) : TABLE_HTML(s));
  written += 2;
}
console.log(`\nWrote ${written} files for ${SHELLS.length} governance shells (skipped ${skipped}).`);
