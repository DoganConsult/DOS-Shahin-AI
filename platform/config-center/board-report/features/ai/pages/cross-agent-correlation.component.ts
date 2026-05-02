import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface CrossAgentEntry {
  agent_id: string;
  check_type: string;
  decision: string;
  count: number;
}

interface AgentSummary {
  agent_id: string;
  totalAllow: number;
  totalBlock: number;
  total: number;
  blockRate: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cross-agent-correlation',
  standalone: true,
  imports: [CommonModule, PageShellComponent, ToastModule, CardModule, TableModule, TagModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="chart-bar" [title]="i18n.isArabic() ? 'ارتباط الوكلاء المتقاطع' : 'Cross-Agent Correlation'" [subtitle]="i18n.isArabic() ? 'مقارنة قرارات الحوكمة عبر جميع الوكلاء' : 'Compare governance decisions across all agents'" [breadcrumbs]="['Dashboard','AI','Cross-Agent']" [loading]="loading()">

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--info)">{{ agentSummaries().length }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'الوكلاء النشطون' : 'Active Agents' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--success)">{{ totalAllows() }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'إجمالي المسموح' : 'Total Allows' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--severity-critical)">{{ totalBlocks() }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'إجمالي المحظور' : 'Total Blocks' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--warning)">{{ overallBlockRate() }}%</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'معدل الحظر' : 'Block Rate' }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card [header]="i18n.isArabic() ? 'ملخص لكل وكيل' : 'Per-Agent Summary'">
            <p-table [value]="agentSummaries()" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'blockRate'" [sortOrder]="-1">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="agent_id">{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }} <p-sortIcon field="agent_id" /></th>
                  <th pSortableColumn="totalAllow">{{ i18n.isArabic() ? 'مسموح' : 'Allow' }} <p-sortIcon field="totalAllow" /></th>
                  <th pSortableColumn="totalBlock">{{ i18n.isArabic() ? 'محظور' : 'Block' }} <p-sortIcon field="totalBlock" /></th>
                  <th pSortableColumn="total">{{ i18n.isArabic() ? 'الإجمالي' : 'Total' }} <p-sortIcon field="total" /></th>
                  <th pSortableColumn="blockRate">{{ i18n.isArabic() ? 'معدل الحظر' : 'Block %' }} <p-sortIcon field="blockRate" /></th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-a>
                <tr>
                  <td><strong>{{ a.agent_id }}</strong></td>
                  <td style="color: var(--success)">{{ a.totalAllow }}</td>
                  <td style="color: var(--severity-critical)">{{ a.totalBlock }}</td>
                  <td>{{ a.total }}</td>
                  <td>
                    <p-tag [value]="a.blockRate + '%'" [severity]="a.blockRate > 20 ? 'danger' : (a.blockRate > 5 ? 'warning' : 'success')" />
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="5" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد بيانات' : 'No data' }}</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <div class="col-12 md:col-6">
          <p-card [header]="i18n.isArabic() ? 'التفاصيل الخام' : 'Raw Breakdown'">
            <p-table [value]="rawEntries()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                  <th>{{ i18n.isArabic() ? 'نوع الفحص' : 'Check' }}</th>
                  <th>{{ i18n.isArabic() ? 'القرار' : 'Decision' }}</th>
                  <th>{{ i18n.isArabic() ? 'العدد' : 'Count' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td><strong>{{ e.agent_id }}</strong></td>
                  <td><p-tag [value]="e.check_type" severity="info" /></td>
                  <td><p-tag [value]="e.decision" [severity]="e.decision === 'allow' ? 'success' : 'danger'" /></td>
                  <td class="font-bold">{{ e.count }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد سجلات' : 'No records' }}</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
})
export class CrossAgentCorrelationComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly rawEntries = signal<CrossAgentEntry[]>([]);
  readonly agentSummaries = signal<AgentSummary[]>([]);
  readonly totalAllows = signal(0);
  readonly totalBlocks = signal(0);
  readonly overallBlockRate = signal(0);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/audit/cross-agent?days=30&limit=500`).subscribe({
      next: (res) => {
        const entries: CrossAgentEntry[] = res?.data || [];
        this.rawEntries.set(entries);

        const map = new Map<string, { allow: number; block: number }>();
        for (const e of entries) {
          const cur = map.get(e.agent_id) || { allow: 0, block: 0 };
          if (e.decision === 'allow') cur.allow += e.count;
          else cur.block += e.count;
          map.set(e.agent_id, cur);
        }

        const summaries: AgentSummary[] = Array.from(map.entries()).map(([id, v]) => ({
          agent_id: id,
          totalAllow: v.allow,
          totalBlock: v.block,
          total: v.allow + v.block,
          blockRate: v.allow + v.block > 0 ? Math.round((v.block / (v.allow + v.block)) * 100) : 0,
        }));
        this.agentSummaries.set(summaries);

        const tAllow = summaries.reduce((s, a) => s + a.totalAllow, 0);
        const tBlock = summaries.reduce((s, a) => s + a.totalBlock, 0);
        this.totalAllows.set(tAllow);
        this.totalBlocks.set(tBlock);
        this.overallBlockRate.set(tAllow + tBlock > 0 ? Math.round((tBlock / (tAllow + tBlock)) * 100) : 0);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load cross-agent data' });
      },
    });
  }
}
