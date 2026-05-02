import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface TimelineEntry {
  id: number;
  check_type: string;
  decision: string;
  reason: string;
  tool_name: string;
  run_id: string;
  user_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface DecisionStat {
  check_type: string;
  decision: string;
  count: number;
}

interface ToolStat {
  tool_name: string;
  decision: string;
  count: number;
}

interface GuardBlock {
  id: number;
  check_type: string;
  decision: string;
  reason: string;
  tool_name: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface Delegation {
  id: number;
  delegation_type: string;
  delegated_to: string;
  delegated_by: string;
  status: string;
  scope: string;
  created_at: string;
  expires_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-trail-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, InputTextModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="search" [title]="i18n.isArabic() ? 'مستكشف مسار التدقيق' : 'Audit Trail Explorer'" [subtitle]="i18n.isArabic() ? 'تصفح سجلات الحوكمة لكل وكيل' : 'Browse governance audit logs per agent'" [breadcrumbs]="['Dashboard','AI','Audit Explorer']" [loading]="loading()">

      <div class="flex align-items-center gap-3 mb-3" [dir]="i18n.direction()">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="agentFilter" [placeholder]="i18n.isArabic() ? 'رمز الوكيل (مثل A01)' : 'Agent code (e.g. A01)'" (keydown.enter)="loadAgent()" />
        </span>
        <button pButton [label]="i18n.isArabic() ? 'تحميل' : 'Load'" icon="pi pi-download" (click)="loadAgent()" [disabled]="!agentFilter"></button>
      </div>

      <div *ngIf="currentAgent()" class="mb-3">
        <div class="grid mb-3">
          <div class="col-12 md:col-3">
            <p-card>
              <div class="text-center">
                <div class="text-3xl font-bold" style="color: var(--info)">{{ totalDecisions() }}</div>
                <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'إجمالي القرارات' : 'Total Decisions' }}</div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card>
              <div class="text-center">
                <div class="text-3xl font-bold" style="color: var(--success)">{{ allowCount() }}</div>
                <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'مسموح' : 'Allowed' }}</div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card>
              <div class="text-center">
                <div class="text-3xl font-bold" style="color: var(--severity-critical)">{{ blockCount() }}</div>
                <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'محظور' : 'Blocked' }}</div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card>
              <div class="text-center">
                <div class="text-3xl font-bold" style="color: var(--warning)">{{ delegations().length }}</div>
                <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'التفويضات' : 'Delegations' }}</div>
              </div>
            </p-card>
          </div>
        </div>

        <p-tabView [dir]="i18n.direction()">
          <p-tabPanel [header]="i18n.isArabic() ? 'الجدول الزمني' : 'Timeline'">
            <p-table [value]="timeline()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'created_at'" [sortOrder]="-1">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'النوع' : 'Check' }}</th>
                  <th>{{ i18n.isArabic() ? 'القرار' : 'Decision' }}</th>
                  <th>{{ i18n.isArabic() ? 'السبب' : 'Reason' }}</th>
                  <th>{{ i18n.isArabic() ? 'الأداة' : 'Tool' }}</th>
                  <th>{{ i18n.isArabic() ? 'التاريخ' : 'Date' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td><p-tag [value]="e.check_type" severity="info" /></td>
                  <td><p-tag [value]="e.decision" [severity]="e.decision === 'allow' ? 'success' : 'danger'" /></td>
                  <td class="text-sm">{{ e.reason | slice:0:80 }}{{ e.reason?.length > 80 ? '...' : '' }}</td>
                  <td class="font-mono text-sm">{{ e.tool_name || '—' }}</td>
                  <td>{{ e.created_at | date:'short' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="5" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد سجلات' : 'No audit records' }}</td></tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isArabic() ? 'إحصائيات القرارات' : 'Decision Stats'">
            <p-table [value]="decisionStats()" styleClass="p-datatable-sm" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'نوع الفحص' : 'Check Type' }}</th>
                  <th>{{ i18n.isArabic() ? 'القرار' : 'Decision' }}</th>
                  <th>{{ i18n.isArabic() ? 'العدد' : 'Count' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td><p-tag [value]="s.check_type" severity="info" /></td>
                  <td><p-tag [value]="s.decision" [severity]="s.decision === 'allow' ? 'success' : 'danger'" /></td>
                  <td class="font-bold">{{ s.count }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isArabic() ? 'استخدام الأدوات' : 'Tool Usage'">
            <p-table [value]="toolStats()" styleClass="p-datatable-sm" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'الأداة' : 'Tool' }}</th>
                  <th>{{ i18n.isArabic() ? 'القرار' : 'Decision' }}</th>
                  <th>{{ i18n.isArabic() ? 'العدد' : 'Count' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-t>
                <tr>
                  <td class="font-mono text-sm">{{ t.tool_name }}</td>
                  <td><p-tag [value]="t.decision" [severity]="t.decision === 'allow' ? 'success' : 'danger'" /></td>
                  <td class="font-bold">{{ t.count }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isArabic() ? 'الحظر' : 'Guard Blocks'">
            <p-table [value]="guardBlocks()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'النوع' : 'Check' }}</th>
                  <th>{{ i18n.isArabic() ? 'السبب' : 'Reason' }}</th>
                  <th>{{ i18n.isArabic() ? 'الأداة' : 'Tool' }}</th>
                  <th>{{ i18n.isArabic() ? 'التاريخ' : 'Date' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-g>
                <tr>
                  <td><p-tag [value]="g.check_type" severity="danger" /></td>
                  <td class="text-sm">{{ g.reason }}</td>
                  <td class="font-mono text-sm">{{ g.tool_name || '—' }}</td>
                  <td>{{ g.created_at | date:'short' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد سجلات حظر' : 'No guard blocks recorded' }}</td></tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isArabic() ? 'التفويضات' : 'Delegations'">
            <p-table [value]="delegations()" styleClass="p-datatable-sm" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'النوع' : 'Type' }}</th>
                  <th>{{ i18n.isArabic() ? 'إلى' : 'To' }}</th>
                  <th>{{ i18n.isArabic() ? 'من' : 'By' }}</th>
                  <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                  <th>{{ i18n.isArabic() ? 'النطاق' : 'Scope' }}</th>
                  <th>{{ i18n.isArabic() ? 'الانتهاء' : 'Expires' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-d>
                <tr>
                  <td>{{ d.delegation_type }}</td>
                  <td><strong>{{ d.delegated_to }}</strong></td>
                  <td>{{ d.delegated_by }}</td>
                  <td><app-status-badge [status]="d.status" /></td>
                  <td>{{ d.scope }}</td>
                  <td>{{ d.expires_at | date:'short' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد تفويضات' : 'No delegations' }}</td></tr>
              </ng-template>
            </p-table>
          </p-tabPanel>
        </p-tabView>
      </div>

      <div *ngIf="!currentAgent()" class="text-center p-5" style="color: var(--text-muted)">
        {{ i18n.isArabic() ? 'أدخل رمز الوكيل لاستعراض سجلات التدقيق' : 'Enter an agent code to explore audit records' }}
      </div>
    </app-page-shell>
  `,
})
export class AuditTrailExplorerComponent {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(false);
  readonly currentAgent = signal<string | null>(null);
  agentFilter = '';

  readonly timeline = signal<TimelineEntry[]>([]);
  readonly decisionStats = signal<DecisionStat[]>([]);
  readonly toolStats = signal<ToolStat[]>([]);
  readonly guardBlocks = signal<GuardBlock[]>([]);
  readonly delegations = signal<Delegation[]>([]);
  readonly totalDecisions = signal(0);
  readonly allowCount = signal(0);
  readonly blockCount = signal(0);

  loadAgent(): void {
    const code = this.agentFilter.trim().toUpperCase();
    if (!code) return;
    this.currentAgent.set(code);
    this.loading.set(true);

    this.http.get<any>(`${environment.apiUrl}/ai/audit/${code}/timeline?limit=100`).subscribe({
      next: (res) => this.timeline.set(res?.data || []),
      error: () => {},
    });

    this.http.get<any>(`${environment.apiUrl}/ai/audit/${code}/decisions`).subscribe({
      next: (res) => {
        const d = res?.data || {};
        this.decisionStats.set(d.stats || []);
        this.totalDecisions.set(d.total || 0);
        const stats: DecisionStat[] = d.stats || [];
        this.allowCount.set(stats.filter(s => s.decision === 'allow').reduce((sum, s) => sum + s.count, 0));
        this.blockCount.set(stats.filter(s => s.decision === 'block').reduce((sum, s) => sum + s.count, 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http.get<any>(`${environment.apiUrl}/ai/audit/${code}/tools`).subscribe({
      next: (res) => this.toolStats.set(res?.data || []),
      error: () => {},
    });

    this.http.get<any>(`${environment.apiUrl}/ai/audit/${code}/guards`).subscribe({
      next: (res) => this.guardBlocks.set(res?.data || []),
      error: () => {},
    });

    this.http.get<any>(`${environment.apiUrl}/ai/audit/${code}/delegations`).subscribe({
      next: (res) => this.delegations.set(res?.data || []),
      error: () => {},
    });
  }
}
