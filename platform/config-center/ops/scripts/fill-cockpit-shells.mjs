#!/usr/bin/env node
// One-shot generator for the 5 remaining AI Cockpit placeholder pages.
// Each shell gets the canonical I18nService + ApiClientService pattern
// (RTL via dir(), bilingual EN/AR labels, loading/error/empty/ready
// state machine, real fetch on init).
//
// Run from repo root:  node ops/scripts/fill-cockpit-shells.mjs

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(here, '../../products/shahin-ai/app/src/app/blueprint/features/ai/pages');

// One descriptor per page. Endpoint is the AI-engine REST path (without
// the /api/ai-engine prefix because ApiClientService prepends environment.apiUrl).
const PAGES = [
  {
    file: 'agent-comparison',
    selector: 'app-agent-comparison',
    endpoint: '/ai-engine/agents',
    titleEn: 'Agent Comparison',
    titleAr: 'مقارنة الوكلاء',
    leadEn: 'Side-by-side metrics for all 13 canonical agents.',
    leadAr: 'مقارنة جنبًا إلى جنب للمؤشرات لجميع الوكلاء الـ13.',
    rowType: 'AgentRow',
    rowFields: 'agentCode: string; name: string; domain: string; runs24h: number; successRate: number; meanLatencyMs: number; eligibleForProduction: boolean;',
    columns: [
      ['agentCode',       'Agent',        'الوكيل'],
      ['name',            'Name',         'الاسم'],
      ['domain',          'Domain',       'المجال'],
      ['runs24h',         'Runs (24h)',   'التشغيلات (24س)'],
      ['successRate',     'Success %',    'نسبة النجاح'],
      ['meanLatencyMs',   'Latency (ms)', 'الزمن (مللي ثانية)'],
    ],
    extraImports: 'import { TableModule } from \'primeng/table\';\nimport { CardModule } from \'primeng/card\';',
    extraImportsList: ', TableModule, CardModule',
  },
  {
    file: 'agent-detail',
    selector: 'app-agent-detail',
    endpoint: '/ai-engine/agents',  // generic — will need :agentCode at call time
    titleEn: 'Agent Detail',
    titleAr: 'تفاصيل الوكيل',
    leadEn: 'Live status, current shift, recent runs and KPIs for the selected agent.',
    leadAr: 'الحالة الحيّة، الورديّة الحاليّة، آخر التشغيلات ومؤشرات الأداء للوكيل المحدد.',
    rowType: 'AgentDetail',
    rowFields: 'agentCode: string; name: string; status: string; shiftStart?: string | null; lastRunAt?: string | null; runs24h: number; meanLatencyMs: number;',
    columns: null, // detail view, not table
    extraImports: 'import { CardModule } from \'primeng/card\';\nimport { TagModule } from \'primeng/tag\';',
    extraImportsList: ', CardModule, TagModule',
    detail: true,
  },
  {
    file: 'agent-sandbox',
    selector: 'app-agent-sandbox',
    endpoint: '/ai-engine/agents',
    titleEn: 'Agent Sandbox',
    titleAr: 'بيئة اختبار الوكلاء',
    leadEn: 'Trigger a single-agent invocation against this tenant and watch the trace land.',
    leadAr: 'شغّل استدعاءً لوكيل واحد ضد هذا المستأجر وراقب التتبّع مباشرة.',
    rowType: 'AgentRow',
    rowFields: 'agentCode: string; name: string; domain: string;',
    columns: [
      ['agentCode',  'Agent',   'الوكيل'],
      ['name',       'Name',    'الاسم'],
      ['domain',     'Domain',  'المجال'],
    ],
    extraImports: 'import { TableModule } from \'primeng/table\';\nimport { CardModule } from \'primeng/card\';\nimport { ButtonModule } from \'primeng/button\';',
    extraImportsList: ', TableModule, CardModule, ButtonModule',
  },
  {
    file: 'node-viewer',
    selector: 'app-node-viewer',
    endpoint: '/ai-engine/temporal/workflows',
    titleEn: 'Node Viewer',
    titleAr: 'عارض العقد',
    leadEn: 'Inspect Temporal workflow nodes — activities, events, and pending tasks for the AI-OS task queue.',
    leadAr: 'فحص عقد Temporal للسير العمل — الأنشطة، الأحداث، والمهام المعلّقة لقائمة AI-OS.',
    rowType: 'WorkflowNode',
    rowFields: 'workflowId: string; runId: string; type: string; status: string; startedAt?: string;',
    columns: [
      ['workflowId', 'Workflow ID', 'معرّف سير العمل'],
      ['type',       'Type',        'النوع'],
      ['status',     'Status',      'الحالة'],
      ['startedAt',  'Started',     'بدأ في'],
    ],
    extraImports: 'import { TableModule } from \'primeng/table\';\nimport { CardModule } from \'primeng/card\';',
    extraImportsList: ', TableModule, CardModule',
  },
  {
    file: 'workflow-config-panel',
    selector: 'app-workflow-config-panel',
    endpoint: '/ai-engine/agrc-os/workflow-versions',
    titleEn: 'Workflow Config Panel',
    titleAr: 'لوحة إعداد سير العمل',
    leadEn: 'Versioned graph configurations for AI-OS workflows.',
    leadAr: 'إعدادات الرسم البياني المُحدَّثة لسير عمل AI-OS.',
    rowType: 'WorkflowVersion',
    rowFields: 'versionId: string; workflowKey: string; version: number; status: string; updatedAt?: string;',
    columns: [
      ['workflowKey', 'Workflow',   'سير العمل'],
      ['version',     'Version',    'الإصدار'],
      ['status',      'Status',     'الحالة'],
      ['updatedAt',   'Updated',    'تحديث'],
    ],
    extraImports: 'import { TableModule } from \'primeng/table\';\nimport { CardModule } from \'primeng/card\';',
    extraImportsList: ', TableModule, CardModule',
  },
];

const TS = (p) => `// AI Cockpit — ${p.titleEn} page.
// Phase 2 i18n + API hardening: I18nService + RTL via dir(), bilingual
// labels, ApiClientService fetch on init, explicit loading/error/empty/
// ready state machine. Generated by ops/scripts/fill-cockpit-shells.mjs.

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/blueprint/core/services/api-client.service';
${p.extraImports}

interface ${p.rowType} {
  ${p.rowFields}
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: '${p.selector}',
  standalone: true,
  imports: [CommonModule${p.extraImportsList}],
  templateUrl: './${p.file}.component.html',
})
export class ${classFor(p.file)}Component implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClientService);

  readonly rows = signal<${p.rowType}[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error' | 'empty'>('loading');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<{ data?: ${p.rowType}[] }>('${p.endpoint}').subscribe({
      next: (res) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res as any) ? (res as any) : []);
        this.rows.set(data);
        this.state.set(data.length === 0 ? 'empty' : 'ready');
      },
      error: (err) => {
        this.error.set(err?.message ?? String(err));
        this.state.set('error');
      },
    });
  }
}
`;

const HTML_TABLE = (p) => `<div class="grc-hub" [dir]="i18n.dir()">
  <header class="hub-toolbar">
    <h2>{{ i18n.isArabic() ? '${p.titleAr}' : '${p.titleEn}' }}</h2>
    <p class="muted">
      {{ i18n.isArabic() ? '${p.leadAr}' : '${p.leadEn}' }}
    </p>
  </header>

  <ng-container [ngSwitch]="state()">
    <p-card *ngSwitchCase="'loading'">
      <p>{{ i18n.isArabic() ? 'جارِ التحميل…' : 'Loading…' }}</p>
    </p-card>

    <p-card *ngSwitchCase="'error'" styleClass="state-error">
      <h3>{{ i18n.isArabic() ? 'تعذّر تحميل البيانات' : 'Failed to load data' }}</h3>
      <pre class="mono">{{ error() }}</pre>
    </p-card>

    <p-card *ngSwitchCase="'empty'">
      <p>{{ i18n.isArabic()
              ? 'لا توجد بيانات لعرضها بعد.'
              : 'No data to show yet.' }}</p>
    </p-card>

    <p-table *ngSwitchCase="'ready'" [value]="rows()" responsiveLayout="scroll" styleClass="p-datatable-sm">
      <ng-template pTemplate="header">
        <tr>
${p.columns.map(([_, en, ar]) => `          <th>{{ i18n.isArabic() ? '${ar}' : '${en}' }}</th>`).join('\n')}
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-r>
        <tr>
${p.columns.map(([k]) => `          <td>{{ r.${k} }}</td>`).join('\n')}
        </tr>
      </ng-template>
    </p-table>
  </ng-container>
</div>
`;

const HTML_DETAIL = (p) => `<div class="grc-hub" [dir]="i18n.dir()">
  <header class="hub-toolbar">
    <h2>{{ i18n.isArabic() ? '${p.titleAr}' : '${p.titleEn}' }}</h2>
    <p class="muted">{{ i18n.isArabic() ? '${p.leadAr}' : '${p.leadEn}' }}</p>
  </header>

  <ng-container [ngSwitch]="state()">
    <p-card *ngSwitchCase="'loading'"><p>{{ i18n.isArabic() ? 'جارِ التحميل…' : 'Loading…' }}</p></p-card>
    <p-card *ngSwitchCase="'error'"><pre class="mono">{{ error() }}</pre></p-card>
    <p-card *ngSwitchCase="'empty'"><p>{{ i18n.isArabic() ? 'لم يتم العثور على وكلاء.' : 'No agents found.' }}</p></p-card>

    <div *ngSwitchCase="'ready'" class="agent-grid">
      <p-card *ngFor="let a of rows()" styleClass="agent-card">
        <ng-template pTemplate="header"><h3>{{ a.agentCode }} — {{ a.name }}</h3></ng-template>
        <p><strong>{{ i18n.isArabic() ? 'الحالة:' : 'Status:' }}</strong> <p-tag [value]="a.status"></p-tag></p>
        <p *ngIf="a.lastRunAt"><strong>{{ i18n.isArabic() ? 'آخر تشغيل:' : 'Last run:' }}</strong> {{ a.lastRunAt }}</p>
        <p><strong>{{ i18n.isArabic() ? 'تشغيلات (24س):' : 'Runs (24h):' }}</strong> {{ a.runs24h }}</p>
        <p><strong>{{ i18n.isArabic() ? 'الزمن (مللي):' : 'Latency (ms):' }}</strong> {{ a.meanLatencyMs }}</p>
      </p-card>
    </div>
  </ng-container>
</div>
`;

function classFor(file) {
  return file.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

let written = 0;
for (const p of PAGES) {
  writeFileSync(join(pagesDir, `${p.file}.component.ts`), TS(p));
  writeFileSync(join(pagesDir, `${p.file}.component.html`), p.detail ? HTML_DETAIL(p) : HTML_TABLE(p));
  console.log(`✓ ${p.file}.component.ts + .html`);
  written += 2;
}
console.log(`\nWrote ${written} files for ${PAGES.length} cockpit pages.`);
