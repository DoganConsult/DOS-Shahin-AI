import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentBadgeComponent, HubHelpPanelComponent, ToastModule, CardModule, TableModule, TagModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="grc-hub" [dir]="i18n.direction()">
      <div class="hub-toolbar">
        <app-agent-badge agentId="A01" />
        <app-hub-help-panel hubRoute="/ai" />
      </div>

      <div class="hub-kpi-bar" *ngIf="stats()">
        <div class="kpi-chip">
          <span class="kpi-val">{{ stats()?.totalAgents || 0 }}</span>
          <span class="kpi-lbl">{{ i18n.isArabic() ? 'الوكلاء' : 'Agents' }}</span>
        </div>
        <div class="kpi-chip kpi-success">
          <span class="kpi-val">{{ stats()?.activeRuns || 0 }}</span>
          <span class="kpi-lbl">{{ i18n.isArabic() ? 'نشط' : 'Active Runs' }}</span>
        </div>
        <div class="kpi-chip kpi-warning">
          <span class="kpi-val">{{ stats()?.failedRuns || 0 }}</span>
          <span class="kpi-lbl">{{ i18n.isArabic() ? 'فشل' : 'Failed' }}</span>
        </div>
        <div class="kpi-chip kpi-info">
          <span class="kpi-val">{{ stats()?.guardrailBlocks || 0 }}</span>
          <span class="kpi-lbl">{{ i18n.isArabic() ? 'حظر' : 'Blocked' }}</span>
        </div>
      </div>

      <div class="hub-content">
        <div class="hub-grid">
          <p-card [header]="i18n.isArabic() ? 'وكلاء الذكاء الاصطناعي' : 'AI Agents (A01–A10)'">
            <p-table [value]="agents()" [rows]="10" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'الرمز' : 'ID' }}</th>
                  <th>{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                  <th>{{ i18n.isArabic() ? 'آخر تشغيل' : 'Last Run' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-agent>
                <tr>
                  <td>{{ agent.agentId }}</td>
                  <td>{{ agent.name }}</td>
                  <td><p-tag [severity]="agent.status === 'active' ? 'success' : 'warning'" [value]="agent.status" /></td>
                  <td>{{ agent.lastRun || '—' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </div>
  `,
})
export class AiDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);

  readonly stats = signal<{ totalAgents: number; activeRuns: number; failedRuns: number; guardrailBlocks: number } | null>(null);
  readonly agents = signal<Array<{ agentId: string; name: string; status: string; lastRun: string }>>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/agents`).subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.agents.set(Array.isArray(list) ? list : []);
        this.stats.set({
          totalAgents: Array.isArray(list) ? list.length : 0,
          activeRuns: Array.isArray(list) ? list.filter((a: any) => a.status === 'active').length : 0,
          failedRuns: 0,
          guardrailBlocks: 0,
        });
      },
      error: () => this.stats.set({ totalAgents: 10, activeRuns: 0, failedRuns: 0, guardrailBlocks: 0 }),
    });
  }
}
