import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface DirectoryAgent {
  agentCode: string;
  name: string;
  version: string;
  agentType: string;
  ownerLayer: string;
  ownerCode: string;
  executionMode: string;
  uiExposurePolicy: string;
  toolCount: number;
  tools: Array<{ toolCode: string; name: string; riskLevel: string; readWrite: string }>;
  governance: { requiresApprovalForWrite: boolean; selfApprovalBlocked: boolean; humanReviewRequired: boolean; fallbackResponse: string };
  health?: { posture: string; consecutiveFailures: number; runs24h: number; failures24h: number; avgDurationMs: number };
  escalationRules: Array<{ condition: string; target: string; description: string }>;
  replacementPosture: string;
  eventSubscriptions: string[];
  instructionSource: string;
  diagnostics?: Record<string, unknown>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-agent-directory',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, DialogModule, ProgressBarModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="users" [title]="i18n.isArabic() ? 'دليل الوكلاء' : 'Agent Directory'" [subtitle]="i18n.isArabic() ? 'سجل شامل للوكلاء والأدوات والصحة' : 'Complete registry of agents, tools & health'" [breadcrumbs]="['Dashboard','AI','Agent Directory']" [loading]="loading()">

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis()">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? kpi.labelAr : kpi.label }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'جميع الوكلاء' : 'All Agents'">
          <p-table [value]="agents()" [paginator]="true" [rows]="12" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'agentCode'" [sortOrder]="1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="agentCode">{{ i18n.isArabic() ? 'الرمز' : 'Code' }} <p-sortIcon field="agentCode" /></th>
                <th pSortableColumn="name">{{ i18n.isArabic() ? 'الاسم' : 'Name' }} <p-sortIcon field="name" /></th>
                <th>{{ i18n.isArabic() ? 'النوع' : 'Type' }}</th>
                <th>{{ i18n.isArabic() ? 'الوضع' : 'Mode' }}</th>
                <th>{{ i18n.isArabic() ? 'المالك' : 'Owner' }}</th>
                <th>{{ i18n.isArabic() ? 'الأدوات' : 'Tools' }}</th>
                <th>{{ i18n.isArabic() ? 'الصحة' : 'Health' }}</th>
                <th>{{ i18n.isArabic() ? 'الموافقة' : 'Approval' }}</th>
                <th>{{ i18n.isArabic() ? 'التفاصيل' : 'Detail' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr>
                <td><strong>{{ a.agentCode }}</strong></td>
                <td>{{ a.name }}</td>
                <td><p-tag [value]="a.agentType" severity="info" /></td>
                <td><p-tag [value]="a.executionMode" [severity]="modeSeverity(a.executionMode)" /></td>
                <td>{{ a.ownerCode }}</td>
                <td class="text-center">{{ a.toolCount }}</td>
                <td>
                  <app-status-badge *ngIf="a.health" [status]="a.health.posture" />
                  <span *ngIf="!a.health" style="color: var(--text-muted)">—</span>
                </td>
                <td>
                  <p-tag *ngIf="a.governance.requiresApprovalForWrite" value="write-approval" severity="warning" />
                  <p-tag *ngIf="a.governance.humanReviewRequired" value="human-review" severity="danger" />
                  <span *ngIf="!a.governance.requiresApprovalForWrite && !a.governance.humanReviewRequired" style="color: var(--text-muted)">auto</span>
                </td>
                <td><button pButton icon="pi pi-eye" class="p-button-text p-button-sm" (click)="openDetail(a)"></button></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="9" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد وكلاء مسجلون' : 'No agents registered' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'حسب النوع' : 'By Type'">
          <div class="grid">
            <div class="col-12 md:col-4" *ngFor="let group of agentsByType()">
              <p-card [header]="group.type + ' (' + group.agents.length + ')'">
                <div *ngFor="let a of group.agents" class="flex justify-content-between align-items-center py-1 border-bottom-1" style="border-color: var(--surface-border)">
                  <span><strong>{{ a.agentCode }}</strong> — {{ a.name }}</span>
                  <app-status-badge *ngIf="a.health" [status]="a.health.posture" />
                </div>
              </p-card>
            </div>
          </div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'أدوات الوكلاء' : 'Tool Inventory'">
          <p-table [value]="allTools()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'الأداة' : 'Tool Code' }}</th>
                <th>{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</th>
                <th>{{ i18n.isArabic() ? 'المخاطر' : 'Risk' }}</th>
                <th>{{ i18n.isArabic() ? 'القراءة/الكتابة' : 'R/W' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td><strong>{{ t.agentCode }}</strong></td>
                <td class="font-mono text-sm">{{ t.toolCode }}</td>
                <td>{{ t.name }}</td>
                <td><p-tag [value]="t.riskLevel" [severity]="riskSeverity(t.riskLevel)" /></td>
                <td>{{ t.readWrite }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <p-dialog [(visible)]="detailVisible" [modal]="true" [style]="{ width: '700px', maxHeight: '80vh' }" [header]="selectedAgent()?.agentCode + ' — ' + selectedAgent()?.name" [closable]="true">
        <div *ngIf="selectedAgent()" class="flex flex-column gap-3">
          <div class="grid">
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'النوع' : 'Type' }}:</strong> {{ selectedAgent()!.agentType }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الوضع' : 'Mode' }}:</strong> {{ selectedAgent()!.executionMode }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'المالك' : 'Owner' }}:</strong> {{ selectedAgent()!.ownerLayer }}/{{ selectedAgent()!.ownerCode }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الإصدار' : 'Version' }}:</strong> {{ selectedAgent()!.version }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'مصدر التعليمات' : 'Instruction' }}:</strong> {{ selectedAgent()!.instructionSource }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الاستبدال' : 'Replacement' }}:</strong> {{ selectedAgent()!.replacementPosture }}</div>
          </div>

          <h4>{{ i18n.isArabic() ? 'الحوكمة' : 'Governance' }}</h4>
          <div class="grid">
            <div class="col-6">{{ i18n.isArabic() ? 'موافقة للكتابة' : 'Write Approval' }}: <p-tag [value]="selectedAgent()!.governance.requiresApprovalForWrite ? 'Yes' : 'No'" [severity]="selectedAgent()!.governance.requiresApprovalForWrite ? 'warning' : 'success'" /></div>
            <div class="col-6">{{ i18n.isArabic() ? 'مراجعة بشرية' : 'Human Review' }}: <p-tag [value]="selectedAgent()!.governance.humanReviewRequired ? 'Required' : 'No'" [severity]="selectedAgent()!.governance.humanReviewRequired ? 'danger' : 'success'" /></div>
            <div class="col-6">{{ i18n.isArabic() ? 'حظر الموافقة الذاتية' : 'Self-Approval Blocked' }}: {{ selectedAgent()!.governance.selfApprovalBlocked ? 'Yes' : 'No' }}</div>
            <div class="col-6">{{ i18n.isArabic() ? 'الاحتياط' : 'Fallback' }}: {{ selectedAgent()!.governance.fallbackResponse }}</div>
          </div>

          <h4 *ngIf="selectedAgent()!.health">{{ i18n.isArabic() ? 'الصحة' : 'Health' }}</h4>
          <div *ngIf="selectedAgent()!.health" class="grid">
            <div class="col-4">{{ i18n.isArabic() ? 'الوضع' : 'Posture' }}: <app-status-badge [status]="selectedAgent()!.health!.posture" /></div>
            <div class="col-4">{{ i18n.isArabic() ? 'تشغيلات 24 ساعة' : 'Runs 24h' }}: {{ selectedAgent()!.health!.runs24h }}</div>
            <div class="col-4">{{ i18n.isArabic() ? 'إخفاقات 24 ساعة' : 'Failures 24h' }}: {{ selectedAgent()!.health!.failures24h }}</div>
            <div class="col-4">{{ i18n.isArabic() ? 'متوسط الكمون' : 'Avg Latency' }}: {{ selectedAgent()!.health!.avgDurationMs }}ms</div>
            <div class="col-4">{{ i18n.isArabic() ? 'إخفاقات متتالية' : 'Consecutive Failures' }}: {{ selectedAgent()!.health!.consecutiveFailures }}</div>
          </div>

          <h4>{{ i18n.isArabic() ? 'الأدوات' : 'Tools' }} ({{ selectedAgent()!.tools.length }})</h4>
          <p-table [value]="selectedAgent()!.tools" styleClass="p-datatable-sm" *ngIf="selectedAgent()!.tools.length > 0">
            <ng-template pTemplate="body" let-t>
              <tr>
                <td class="font-mono text-sm">{{ t.toolCode }}</td>
                <td>{{ t.name }}</td>
                <td><p-tag [value]="t.riskLevel" [severity]="riskSeverity(t.riskLevel)" /></td>
                <td>{{ t.readWrite }}</td>
              </tr>
            </ng-template>
          </p-table>

          <h4 *ngIf="selectedAgent()!.escalationRules.length > 0">{{ i18n.isArabic() ? 'قواعد التصعيد' : 'Escalation Rules' }}</h4>
          <div *ngFor="let r of selectedAgent()!.escalationRules" class="py-1 border-bottom-1" style="border-color: var(--surface-border)">
            <strong>{{ r.condition }}</strong> → {{ r.target }} — {{ r.description }}
          </div>

          <h4 *ngIf="selectedAgent()!.eventSubscriptions.length > 0">{{ i18n.isArabic() ? 'اشتراكات الأحداث' : 'Event Subscriptions' }}</h4>
          <div class="flex flex-wrap gap-1">
            <p-tag *ngFor="let e of selectedAgent()!.eventSubscriptions" [value]="e" severity="info" />
          </div>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
})
export class AiAgentDirectoryComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly agents = signal<DirectoryAgent[]>([]);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  readonly selectedAgent = signal<DirectoryAgent | null>(null);
  detailVisible = false;

  readonly agentsByType = computed(() => {
    const map = new Map<string, DirectoryAgent[]>();
    for (const a of this.agents()) {
      const list = map.get(a.agentType) || [];
      list.push(a);
      map.set(a.agentType, list);
    }
    return Array.from(map.entries()).map(([type, agents]) => ({ type, agents }));
  });

  readonly allTools = computed(() => {
    const result: Array<{ agentCode: string; toolCode: string; name: string; riskLevel: string; readWrite: string }> = [];
    for (const a of this.agents()) {
      for (const t of a.tools) {
        result.push({ agentCode: a.agentCode, ...t });
      }
    }
    return result;
  });

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/platform/agents/directory`).subscribe({
      next: (res) => {
        const data = res?.data || res || {};
        const agentList: DirectoryAgent[] = data.agents || [];
        this.agents.set(agentList);
        this.kpis.set([
          { label: 'Total Agents', labelAr: 'إجمالي الوكلاء', value: data.totalAgents || agentList.length, color: 'var(--info)' },
          { label: 'Total Tools', labelAr: 'إجمالي الأدوات', value: data.totalTools || 0, color: 'var(--success)' },
          { label: 'Healthy', labelAr: 'بصحة جيدة', value: agentList.filter(a => a.health?.posture === 'healthy').length, color: 'var(--success)' },
          { label: 'Degraded/Down', labelAr: 'منخفض/متوقف', value: agentList.filter(a => a.health && a.health.posture !== 'healthy').length, color: 'var(--severity-critical)' },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load agent directory' });
      },
    });
  }

  openDetail(agent: DirectoryAgent): void {
    this.http.get<any>(`${environment.apiUrl}/platform/agents/directory/${agent.agentCode}`).subscribe({
      next: (res) => {
        this.selectedAgent.set(res?.data || res || agent);
        this.detailVisible = true;
      },
      error: () => {
        this.selectedAgent.set(agent);
        this.detailVisible = true;
      },
    });
  }

  modeSeverity(mode: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (mode) {
      case 'observe-only': return 'info';
      case 'advisory': return 'success';
      case 'drafting': case 'co-pilot': return 'warning';
      case 'delegated-executor': case 'bounded-autonomous': return 'danger';
      default: return 'info';
    }
  }

  riskSeverity(risk: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (risk) {
      case 'safe': return 'success';
      case 'moderate': return 'warning';
      case 'high': case 'critical': return 'danger';
      default: return 'info';
    }
  }
}
