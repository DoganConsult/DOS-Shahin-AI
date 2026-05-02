import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { SliderModule } from 'primeng/slider';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-autonomy',
    imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, CardModule, TagModule, ButtonModule, DialogModule, TableModule, DropdownModule, ToolbarModule, SliderModule, ProgressBarModule, TooltipModule],
    template: `
    <app-page-shell icon="robot" [title]="'Autonomy Engine'"
      [subtitle]="'AI agent autonomy levels, decision boundaries, and override controls'"
      [breadcrumbs]="['Dashboard', 'Autonomy']" [loading]="loading">

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon-wrap"><i class="pi pi-android"></i></div>
          <div>
            <div class="kpi-value">{{ agents.length }}</div>
            <div class="kpi-label">Total Agents</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap green"><i class="pi pi-check-circle"></i></div>
          <div>
            <div class="kpi-value">{{ activeAgentCount() }}</div>
            <div class="kpi-label">Active</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap blue"><i class="pi pi-bolt"></i></div>
          <div>
            <div class="kpi-value">{{ totalDecisions() }}</div>
            <div class="kpi-label">Decisions (30d)</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap orange"><i class="pi pi-exclamation-circle"></i></div>
          <div>
            <div class="kpi-value">{{ totalOverrides() }}</div>
            <div class="kpi-label">Human Overrides</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap purple"><i class="pi pi-chart-line"></i></div>
          <div>
            <div class="kpi-value">{{ avgAutonomy() | appNumber:'decimal':'1.1-1' }}</div>
            <div class="kpi-label">Avg Level</div>
          </div>
        </div>
      </div>

      <!-- Agent Cards -->
      <div class="agent-grid">
        @for (a of agents; track a.agent_id || a.name) {
          <div class="agent-card" [class.card-paused]="a.status === 'paused'">
            <div class="agent-header">
              <div class="agent-name">
                <i class="pi pi-android"></i>
                <h3>{{ a.name || a.agent_id }}</h3>
              </div>
              <p-tag [value]="'L' + (a.autonomy_level || 0)" [severity]="levelSeverity(a.autonomy_level)" />
            </div>
            <p class="agent-desc">{{ a.description || 'Autonomous GRC agent' }}</p>
            <div class="agent-domain" *ngIf="a.domain">
              <p-tag [value]="a.domain" severity="info" />
              <p-tag *ngIf="a.status" [value]="a.status" [severity]="a.status === 'active' ? 'success' : 'warning'" />
            </div>

            <!-- Level Bar -->
            <div class="level-bar">
              <div class="level-label">
                <span>Autonomy Level</span>
                <span class="level-num">{{ a.autonomy_level || 0 }} / 5</span>
              </div>
              <p-progressBar [value]="((a.autonomy_level || 0) / 5) * 100" [showValue]="false" [style]="{ height: '8px' }" />
            </div>

            <!-- Stats -->
            <div class="agent-stats">
              <div class="stat">
                <span class="stat-value">{{ a.decisions_count || 0 }}</span>
                <span class="stat-label">Decisions</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ a.overrides_count || 0 }}</span>
                <span class="stat-label">Overrides</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ a.accuracy_pct || 0 }}%</span>
                <span class="stat-label">Accuracy</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ a.last_run | appDate:'short' }}</span>
                <span class="stat-label">Last Run</span>
              </div>
            </div>

            <div class="agent-actions">
              <p-button icon="pi pi-sliders-h" label="Configure" size="small" [outlined]="true" (onClick)="configureAgent(a)" />
              <p-button icon="pi pi-history" [text]="true" size="small" (onClick)="showDecisionLog(a)" pTooltip="Decision Log" />
              <p-button icon="pi pi-play" [text]="true" size="small" severity="success" (onClick)="runAgent(a)" pTooltip="Run Now" />
            </div>
          </div>
        }
      </div>

      @if (agents.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-android empty-icon"></i>
          <p>No autonomy agents configured</p>
        </div>
      }

      <!-- Decision Log -->
      @if (decisionLog.length > 0) {
        <h3 class="section-title">{{ logTitle }}</h3>
        <p-table aria-label="Decision Log table" [value]="decisionLog" [rows]="10" [paginator]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Time</th><th>Agent</th><th>Decision</th><th>Entity</th><th>Confidence</th><th>Overridden</th><th>Reason</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-d>
            <tr>
              <td>{{ d.decided_at | appDate:'short' }}</td>
              <td class="font-semibold">{{ d.agent_name }}</td>
              <td><p-tag [value]="d.decision_type || 'auto'" /></td>
              <td>{{ d.entity_type }} {{ d.entity_id | slice:0:8 }}</td>
              <td>
                <span class="confidence" [class.high]="d.confidence >= 0.8" [class.low]="d.confidence < 0.5">
                  {{ (d.confidence || 0) * 100 | appNumber:'decimal':'1.0-0' }}%
                </span>
              </td>
              <td>
                <p-tag [value]="d.overridden ? 'Yes' : 'No'" [severity]="d.overridden ? 'warning' : 'success'" />
              </td>
              <td class="truncate">{{ d.reason || '—' }}</td>
            </tr>
          </ng-template>
        </p-table>
      }

      <!-- Configure Dialog -->
      <p-dialog header="Configure Agent" [(visible)]="showConfigDialog" [modal]="true" [style]="{ width: '480px' }">
        @if (selectedAgent) {
          <div class="form-grid">
            <div class="form-field">
              <label>Agent: {{ selectedAgent.name }}</label>
            </div>
            <div class="form-field">
              <label>Autonomy Level (0-5)</label>
              <p-slider [(ngModel)]="configForm.autonomy_level" [min]="0" [max]="5" [step]="1" />
              <div class="level-desc">{{ levelDescription(configForm.autonomy_level) }}</div>
            </div>
            <div class="form-field">
              <label>Status</label>
              <p-dropdown [options]="statusOptions" [(ngModel)]="configForm.status" appendTo="body" class="w-full" />
            </div>
            <div class="form-field">
              <label>Max Decisions Per Hour</label>
              <input pInputText type="number" [(ngModel)]="configForm.max_decisions_per_hour" class="w-full" />
            </div>
          </div>
        }
        <ng-template pTemplate="footer">
          <p-button label="Cancel" [text]="true" (onClick)="showConfigDialog = false" />
          <p-button label="Save" icon="pi pi-check" (onClick)="saveConfig()" />
        </ng-template>
      </p-dialog>

      <div *ngIf="error" class="error-state">
        <p>{{ error }}</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="danger" [outlined]="true" (onClick)="error=''; ngOnInit()" />
      </div>
    </app-page-shell>
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); }
    .kpi-icon-wrap { width: 42px; height: 42px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--primary-light, #eff6ff); color: var(--primary, #2563eb); font-size: var(--font-size-xl); }
    .kpi-icon-wrap.green { background: var(--status-success-bg, #defbe6); color: var(--success); }
    .kpi-icon-wrap.blue { background: #eff6ff; color: var(--primary); }
    .kpi-icon-wrap.orange { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .kpi-icon-wrap.purple { background: var(--purple-50, #f5f3ff); color: #7c3aed; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .agent-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-0, #fff); border: 1px solid var(--border, var(--border-subtle)); transition: all 200ms; }
    .agent-card:hover { border-color: var(--primary); box-shadow: var(--shadow-card); }
    .agent-card.card-paused { opacity: 0.6; border-style: dashed; }
    .agent-header { display: flex; justify-content: space-between; align-items: center; }
    .agent-name { display: flex; align-items: center; gap: 8px; }
    .agent-name i { font-size: var(--font-size-lg); color: var(--primary); }
    .agent-name h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .agent-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 8px 0; }
    .agent-domain { display: flex; gap: 6px; margin-bottom: 10px; }
    .level-bar { margin: 12px 0; }
    .level-label { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px; }
    .level-num { font-weight: 700; color: var(--text-0); }
    .agent-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; padding: 10px; background: var(--bg-1, var(--surface-ice)); border-radius: var(--radius); }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: var(--font-size-base); font-weight: 700; color: var(--text-0); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
    .agent-actions { display: flex; gap: 6px; align-items: center; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 24px 0 12px; color: var(--text-0); }
    .font-semibold { font-weight: 600; }
    .confidence { font-weight: 600; } .confidence.high { color: var(--success); } .confidence.low { color: var(--error); }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); display: block; margin-bottom: 12px; }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-1); }
    .level-desc { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; margin-top: 4px; }
    .w-full { width: 100%; }
  `]
})
export class AutonomyComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; agents: Record<string, unknown>[] = []; decisionLog: Record<string, unknown>[] = [];
  showConfigDialog = false; selectedAgent: Record<string, unknown> | null = null; logTitle = 'Decision Log';
  configForm: Record<string, unknown> = { autonomy_level: 1, status: 'active', max_decisions_per_hour: 100 };
  statusOptions = [
    { label: 'Active', value: 'active' }, { label: 'Paused', value: 'paused' }, { label: 'Disabled', value: 'disabled' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/autonomy/agents').subscribe({
      next: (d: Record<string, unknown>) => { this.agents = Array.isArray(d) ? d : d.agents || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load agents'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  activeAgentCount(): number { return this.agents.filter(a => a.status === 'active').length; }
  totalDecisions(): number { return this.agents.reduce((s, a) => s + (a.decisions_count || 0), 0); }
  totalOverrides(): number { return this.agents.reduce((s, a) => s + (a.overrides_count || 0), 0); }
  avgAutonomy(): number {
    if (!this.agents.length) return 0;
    return this.agents.reduce((s, a) => s + (a.autonomy_level || 0), 0) / this.agents.length;
  }

  configureAgent(a: Record<string, unknown>) {
    this.selectedAgent = a;
    this.configForm = { autonomy_level: a.autonomy_level || 1, status: a.status || 'active', max_decisions_per_hour: a.max_decisions_per_hour || 100 };
    this.showConfigDialog = true;
  }

  saveConfig() {
    this.apiclientSvc.put(`/autonomy/agents/${this.selectedAgent.agent_id || this.selectedAgent.id}`, this.configForm).subscribe({
      next: () => { this.showConfigDialog = false; this.ngOnInit(); }
    });
  }

  runAgent(a: Record<string, unknown>) {
    this.apiclientSvc.post(`/autonomy/agents/${a.agent_id || a.id}/run`, {}).subscribe({ next: () => this.ngOnInit() });
  }

  showDecisionLog(a: Record<string, unknown>) {
    this.logTitle = `Decisions: ${a.name}`;
    this.apiclientSvc.get(`/autonomy/agents/${a.agent_id || a.id}/decisions`).subscribe({
      next: (d: Record<string, unknown>) => this.decisionLog = Array.isArray(d) ? d : d.decisions || []
    });
  }

  levelSeverity(level: number): 'success' | 'warning' | 'danger' | 'info' {
    if (level >= 4) return 'danger';
    if (level >= 3) return 'warning';
    if (level >= 2) return 'success';
    return 'info';
  }

  levelDescription(level: number): string {
    const desc = ['Fully manual', 'Suggest only', 'Suggest & auto-draft', 'Auto-execute with review', 'Auto-execute with alerts', 'Fully autonomous'];
    return desc[level] || '';
  }
}
