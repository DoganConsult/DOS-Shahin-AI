import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { DropdownModule } from 'primeng/select';

/**
 * Tab 4: Workload & Capacity -- displays team workload metrics and member performance.
 */
@Component({
  selector: 'app-workload-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    TableModule, TagModule, ButtonModule, ToolbarModule, TooltipModule, ProgressBarModule, DropdownModule,
  ],
  template: `
    <!-- Independent team selector -->
    <p-toolbar styleClass="mb-3">
      <div class="p-toolbar-group-start">
        <p-dropdown [options]="teamDropdownOptions()" [(ngModel)]="selectedTeamIdValue"
          (ngModelChange)="teamSelected.emit($event)"
          optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('teamManagement.selectTeam')"
          [style]="{minWidth:'280px'}" [filter]="true" filterPlaceholder="Search..." />
      </div>
    </p-toolbar>

    @if (workloadData()) {
      <div class="workload-grid">
        @for (w of workloadItems(); track w.key) {
          <div class="wl-card">
            <div class="wl-icon" [style.background]="w.color"><i class="pi" [ngClass]="'pi-' + w.icon"></i></div>
            <div class="wl-body">
              <div class="wl-value">{{ w.value }}</div>
              <div class="wl-label">{{ i18n.localize(w.label, w.labelAr) }}</div>
            </div>
            @if (w.max) {
              <p-progressBar [value]="(w.value / w.max) * 100" [showValue]="false"
                styleClass="wl-bar" [style]="{'height': '6px'}" />
            }
          </div>
        }
      </div>

      <div *ngIf="workloadData()?.teamCompletionRate !== undefined" class="flex gap-3 mt-3 mb-3">
        <div class="wl-card" style="flex:1">
          <div class="wl-icon" style="background:#6366f1"><i class="pi pi-percentage"></i></div>
          <div class="wl-body">
            <div class="wl-value">{{ workloadData().teamCompletionRate || workloadData().team_completion_rate || 0 }}%</div>
            <div class="wl-label">{{ i18n.translate('teamManagement.completionRate') }}</div>
          </div>
        </div>
        <div class="wl-card" style="flex:1">
          <div class="wl-icon" style="background:#14b8a6"><i class="pi pi-chart-line"></i></div>
          <div class="wl-body">
            <div class="wl-value">{{ workloadData().averageLoad || workloadData().average_load || 0 }}</div>
            <div class="wl-label">{{ i18n.translate('teamManagement.avgLoadmember') }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="workloadData()?.members?.length" class="mt-3">
        <h4 class="mb-2" style="color:var(--primary)">
          <i class="pi pi-users"></i> {{ i18n.translate('teamManagement.memberPerformance') }}
        </h4>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="workloadData().members" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('teamManagement.member') }}</th>
              <th>{{ i18n.translate('teamManagement.role') }}</th>
              <th class="text-center">{{ i18n.translate('teamManagement.open') }}</th>
              <th class="text-center">{{ i18n.translate('teamManagement.done') }}</th>
              <th class="text-center">{{ i18n.translate('teamManagement.overdue') }}</th>
              <th class="text-center">{{ i18n.translate('teamManagement.controls') }}</th>
              <th class="text-center">{{ i18n.translate('teamManagement.evidence') }}</th>
              <th>{{ i18n.translate('teamManagement.efficiency') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-m>
            <tr>
              <td class="font-semibold">{{ getMemberName(m.userId || m.user_id) || m.userId || m.user_id }}</td>
              <td><p-tag [value]="m.teamRole || 'member'" [severity]="roleSeverity(m.teamRole)" size="small" /></td>
              <td class="text-center">{{ m.openTasks || 0 }}</td>
              <td class="text-center">{{ m.completedTasks || 0 }}</td>
              <td class="text-center"><span [class]="m.overdueTasks > 0 ? 'text-red-500 font-bold' : ''">{{ m.overdueTasks || 0 }}</span></td>
              <td class="text-center">{{ m.controlsOwned || 0 }}</td>
              <td class="text-center">
                <span [pTooltip]="(i18n.translate('teamManagement.pending')) + (m.evidencePending || 0) + ' | ' + (i18n.translate('teamManagement.done2')) + (m.evidenceCompleted || 0)">
                  {{ (m.evidencePending || 0) + (m.evidenceCompleted || 0) }}
                </span>
              </td>
              <td>
                <div class="flex align-items-center gap-2">
                  <p-progressBar [value]="m.efficiencyScore || 0" [showValue]="false" [style]="{'height':'8px','width':'60px','border-radius':'4px'}" />
                  <span class="text-sm font-semibold" [class]="m.efficiencyScore >= 70 ? 'text-green-500' : m.efficiencyScore >= 40 ? 'text-yellow-500' : 'text-red-500'">{{ m.efficiencyScore || 0 }}%</span>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-color-secondary p-3">{{ i18n.translate('teamManagement.noMembers') }}</td></tr>
          </ng-template>
        </p-table>
      </div>
    } @else if (selectedTeamId()) {
      <div class="text-center text-color-secondary p-5">
        <i class="pi pi-spin pi-spinner" style="font-size:2rem"></i>
        <p>{{ i18n.translate('teamManagement.loadingWorkload') }}</p>
      </div>
    } @else {
      <div class="wl-empty-state">
        <div class="wl-empty-icon"><i class="pi pi-chart-bar"></i></div>
        <h4>{{ i18n.translate('teamManagement.workloadPerformanceMonitoring') }}</h4>
        <p>{{ i18n.translate('teamManagement.selectATeamAboveToViewTaskDistributionCo') }}</p>
        <div class="wl-empty-features">
          <span><i class="pi pi-list"></i> {{ i18n.translate('teamManagement.tasks') }}</span>
          <span><i class="pi pi-shield"></i> {{ i18n.translate('teamManagement.controls') }}</span>
          <span><i class="pi pi-file"></i> {{ i18n.translate('teamManagement.evidence') }}</span>
          <span><i class="pi pi-chart-line"></i> {{ i18n.translate('teamManagement.efficiency') }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .workload-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .wl-card {
      background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg);
      padding: 16px; display: flex; flex-direction: column; gap: 10px;
    }
    .wl-icon {
      width: 40px; height: 40px; border-radius: var(--radius-md); color: white;
      display: flex; align-items: center; justify-content: center; font-size: var(--font-size-body-md);
    }
    .wl-body { flex: 1; }
    .wl-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-color); }
    .wl-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .text-sm { font-size: 0.82rem; }
    .wl-empty-state {
      text-align: center; padding: 48px 24px;
      background: var(--surface-card); border-radius: var(--radius-lg); border: 1px dashed var(--surface-border);
    }
    .wl-empty-icon { width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--primary-50, #eff6ff); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .wl-empty-icon .pi { font-size: var(--font-size-2xl); color: var(--primary-500, var(--primary)); }
    .wl-empty-state h4 { margin: 0 0 8px; font-size: var(--font-size-md); font-weight: 600; color: var(--text-heading); }
    .wl-empty-state p { margin: 0 0 16px; font-size: var(--font-size-sm); color: var(--text-color-secondary); max-width: 480px; margin-inline-start: auto; margin-inline-end: auto; }
    .wl-empty-features { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .wl-empty-features span { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--text-color-secondary); padding: 6px 12px; border-radius: var(--radius-sm); background: var(--surface-ground); }
    .wl-empty-features .pi { font-size: var(--font-size-base); }
  `]
})
export class WorkloadTabComponent {
  readonly i18n = inject(I18nService);

  // -- Inputs --
  workloadData = input<unknown>(null);
  selectedTeamId = input<string | null>(null);
  teamDropdownOptions = input.required<{ label: string; value: string }[]>();
  allMembers = input<any[]>([]);

  // -- Outputs --
  teamSelected = output<string>();

  // -- Local bridge for dropdown two-way binding --
  selectedTeamIdValue: string | null = null;

  workloadItems = computed(() => {
    const w = this.workloadData();
    if (!w) return [];
    return [
      { key: 'total', icon: 'list', value: w.totalTasks ?? w.total_tasks ?? 0, label: 'Total Tasks', labelAr: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0647\u0627\u0645', color: '#3b82f6', max: 0 },
      { key: 'open', icon: 'clock', value: w.openTasks ?? w.open_tasks ?? 0, label: 'Open Tasks', labelAr: '\u0645\u0647\u0627\u0645 \u0645\u0641\u062A\u0648\u062D\u0629', color: '#f59e0b', max: w.totalTasks ?? w.total_tasks ?? 1 },
      { key: 'overdue', icon: 'exclamation-triangle', value: w.overdueTasks ?? w.overdue_tasks ?? 0, label: 'Overdue', labelAr: '\u0645\u062A\u0623\u062E\u0631\u0629', color: '#ef4444', max: w.totalTasks ?? w.total_tasks ?? 1 },
      { key: 'completed', icon: 'check-circle', value: w.completedTasks ?? w.completed_tasks ?? 0, label: 'Completed', labelAr: '\u0645\u0643\u062A\u0645\u0644\u0629', color: '#10b981', max: w.totalTasks ?? w.total_tasks ?? 1 },
      { key: 'controls', icon: 'shield', value: w.controlsOwned ?? w.controls_owned ?? 0, label: 'Controls Owned', labelAr: '\u0636\u0648\u0627\u0628\u0637 \u0645\u0645\u0644\u0648\u0643\u0629', color: '#8b5cf6', max: 0 },
      { key: 'evidence', icon: 'file', value: w.evidencePending ?? w.evidence_pending ?? 0, label: 'Evidence Pending', labelAr: '\u0623\u062F\u0644\u0629 \u0645\u0639\u0644\u0642\u0629', color: '#06b6d4', max: 0 },
    ];
  });

  // -- Helpers --
  getMemberName(userId: string): string {
    const m = this.allMembers().find((mem) => mem.user_id === userId || mem.userId === userId);
    return m?.name || m?.email || '';
  }

  roleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      lead: 'info', admin: 'danger', owner: 'info', manager: 'warning',
      auditor: 'warning', member: 'secondary', reviewer: 'success', approver: 'info',
    };
    return map[role?.toLowerCase()] || 'secondary';
  }
}
