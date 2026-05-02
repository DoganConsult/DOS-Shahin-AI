import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { GrcOperationsService } from '@app/api';

export interface RaciAssignment {
  assignment_id: string;
  entity_type: string;
  entity_id: string;
  raci_role: 'responsible' | 'accountable' | 'consulted' | 'informed';
  team_id?: string;
  team_name?: string;
  dept_id?: string;
  dept_name?: string;
  user_id?: string;
  user_name?: string;
  assignment_source?: string;
  notes?: string;
  is_active?: boolean;
}

const RACI_COLORS: Record<string, string> = {
  responsible: '#3b82f6',
  accountable: '#ef4444',
  consulted: '#f59e0b',
  informed: '#6b7280',
};

const RACI_ICONS: Record<string, string> = {
  responsible: 'pi-user',
  accountable: 'pi-shield',
  consulted: 'pi-comments',
  informed: 'pi-bell',
};

const RACI_LABELS_EN: Record<string, string> = {
  responsible: 'Responsible',
  accountable: 'Accountable',
  consulted: 'Consulted',
  informed: 'Informed',
};
const RACI_LABELS_AR: Record<string, string> = {
  responsible: 'المسؤول',
  accountable: 'المحاسب',
  consulted: 'المستشار',
  informed: 'المطّلع',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-raci-panel',
    imports: [CommonModule, TooltipModule, DialogModule, DropdownModule, InputTextModule, FormsModule],
    template: `
    <!-- Compact inline strip (default) -->
    <div class="raci-panel" *ngIf="!loading()">
      <div class="raci-header">
        <span class="raci-title">
          <i class="pi pi-sitemap"></i>
          {{ i18n.localize('RACI Assignments', 'تعيينات RACI') }}
        </span>
        <span class="raci-gap-badge" *ngIf="hasGaps()">
          <i class="pi pi-exclamation-triangle"></i>
          {{ i18n.localize('Gaps', 'فجوات') }}
        </span>
        <button class="raci-add-btn" (click)="showAssignDialog = true"
                *ngIf="canEdit"
                [pTooltip]="i18n.localize('Assign RACI Role', 'تعيين دور RACI')" tooltipPosition="top">
          <i class="pi pi-plus"></i>
        </button>
      </div>

      <!-- RACI Role Groups -->
      <div class="raci-grid">
        <div class="raci-group" *ngFor="let role of raciRoles">
          <div class="raci-role-header" [style.--raci-color]="getColor(role)">
            <i class="pi" [ngClass]="getIcon(role)"></i>
            <span class="raci-role-label">{{ getRoleLabel(role) }}</span>
            <span class="raci-role-letter">{{ role.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="raci-assignees">
            <ng-container *ngIf="getAssignees(role).length; else noAssignee">
              <div class="raci-assignee" *ngFor="let a of getAssignees(role)">
                <span class="assignee-name">{{ a.team_name || a.user_name || a.dept_name || '—' }}</span>
                <span class="assignee-source" *ngIf="a.assignment_source">{{ a.assignment_source }}</span>
                <button class="raci-remove-btn" *ngIf="canEdit && a.assignment_source !== 'auto_provision'"
                        (click)="removeAssignment(a.assignment_id)"
                        [pTooltip]="i18n.localize('Remove', 'إزالة')" tooltipPosition="top">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            </ng-container>
            <ng-template #noAssignee>
              <span class="raci-empty">{{ i18n.localize('Not assigned', 'غير معيّن') }}</span>
            </ng-template>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div class="raci-panel raci-loading" *ngIf="loading()">
      <div class="raci-skeleton" *ngFor="let _ of [1,2,3,4]"></div>
    </div>

    <!-- Assign Dialog -->
    <p-dialog [header]="i18n.localize('Assign RACI Role', 'تعيين دور RACI')"
              [(visible)]="showAssignDialog" [modal]="true" [style]="{width: '420px'}" [closable]="true">
      <div class="assign-form">
        <label>{{ i18n.localize('RACI Role', 'الدور') }}</label>
        <p-dropdown [options]="raciRoleOptions" [(ngModel)]="newAssignment.raciRole"
                    optionLabel="label" optionValue="value" [placeholder]="i18n.localize('Select role', 'اختر الدور')">
        </p-dropdown>

        <label>{{ i18n.localize('Assign To (Team Code)', 'تعيين إلى (رمز الفريق)') }}</label>
        <input pInputText [(ngModel)]="newAssignment.teamId" [placeholder]="i18n.localize('e.g. ERM, CYBER_GOV', 'مثال: ERM')" />

        <label>{{ i18n.localize('Or User ID', 'أو معرّف المستخدم') }}</label>
        <input pInputText [(ngModel)]="newAssignment.userId" [placeholder]="i18n.localize('User ID (optional)', 'معرف المستخدم (اختياري)')" />

        <label>{{ i18n.localize('Notes', 'ملاحظات') }}</label>
        <input pInputText [(ngModel)]="newAssignment.notes" [placeholder]="i18n.localize('Optional notes', 'ملاحظات اختيارية')" />
      </div>
      <ng-template pTemplate="footer">
        <button class="raci-btn raci-btn-secondary" (click)="showAssignDialog = false">{{ i18n.localize('Cancel', 'إلغاء') }}</button>
        <button class="raci-btn raci-btn-primary" (click)="assignRole()" [disabled]="!newAssignment.raciRole">{{ i18n.localize('Assign', 'تعيين') }}</button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .raci-panel {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius, 8px);
      padding: 12px;
      background: var(--surface-card, #fff);
      margin-bottom: 12px;
    }
    .raci-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .raci-title {
      font-size: var(--font-size-tag); font-weight: 700; color: var(--text-color, #1e293b);
      display: flex; align-items: center; gap: 6px; flex: 1;
    }
    .raci-title .pi { font-size: var(--font-size-body-sm); color: var(--primary, #3b82f6); }
    .raci-gap-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: var(--radius-lg, 12px);
      background: rgba(var(--module-accent-red-rgb), 0.1); color: var(--error, #ef4444);
      font-size: var(--font-size-xs); font-weight: 700;
    }
    .raci-add-btn {
      width: 26px; height: 26px; border: 1px dashed var(--border-color, #cbd5e1);
      border-radius: var(--radius-sm, 4px); background: transparent;
      color: var(--text-muted, #94a3b8); cursor: pointer; display: flex;
      align-items: center; justify-content: center; font-size: var(--font-size-sm);
      transition: all 150ms;
    }
    .raci-add-btn:hover { border-color: var(--primary); color: var(--primary); background: rgba(var(--module-accent-blue-rgb), 0.05); }
    .raci-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }
    @media (max-width: 768px) {
      .raci-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .raci-group {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-sm, 4px);
      overflow: hidden;
    }
    .raci-role-header {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px;
      background: color-mix(in srgb, var(--raci-color) 8%, transparent);
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      font-size: var(--font-size-sm); font-weight: 700; color: var(--raci-color);
    }
    .raci-role-header .pi { font-size: var(--font-size-caption); }
    .raci-role-letter {
      margin-left: auto;
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--raci-color); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-2xs); font-weight: 800;
    }
    .raci-assignees {
      padding: 6px 8px;
      min-height: 36px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .raci-assignee {
      display: flex; align-items: center; gap: 4px;
      font-size: var(--font-size-sm); color: var(--text-color);
    }
    .assignee-name { flex: 1; font-weight: 500; }
    .assignee-source {
      font-size: 0.6rem; color: var(--text-muted);
      padding: 1px 4px; border-radius: 3px;
      background: var(--surface-ground, #f1f5f9);
    }
    .raci-remove-btn {
      width: 18px; height: 18px; border: none; border-radius: 50%;
      background: transparent; color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6rem; transition: all 150ms;
    }
    .raci-remove-btn:hover { background: rgba(var(--module-accent-red-rgb), 0.1); color: var(--error); }
    .raci-empty {
      font-size: var(--font-size-xs); color: var(--text-muted);
      font-style: italic; padding: 4px 0;
    }
    .raci-loading { display: flex; gap: 8px; }
    .raci-skeleton {
      flex: 1; height: 80px; border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--surface-ground, #f1f5f9) 25%, var(--surface-hover, #e2e8f0) 50%, var(--surface-ground, #f1f5f9) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .assign-form { display: flex; flex-direction: column; gap: 10px; }
    .assign-form label { font-size: var(--font-size-caption); font-weight: 600; color: var(--text-color); }
    .raci-btn {
      padding: 6px 16px; border-radius: var(--radius-sm); border: none;
      font-size: var(--font-size-caption); font-weight: 600; cursor: pointer;
    }
    .raci-btn-primary { background: var(--primary); color: #fff; }
    .raci-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .raci-btn-secondary { background: var(--surface-ground); color: var(--text-color); }
  `]
})
export class RaciPanelComponent implements OnInit, OnChanges {
    private operationsSvc = inject(GrcOperationsService);
  public i18n = inject(I18nService);
  private auth = inject(SessionService);

  /** Entity type: control | risk | evidence | incident | policy | audit | vendor | bcp */
  @Input() entityType = '';
  /** Entity ID (e.g., control_id, risk_id) */
  @Input() entityId = '';
  /** Whether the user can edit assignments */
  @Input() canEdit = false;

  readonly raciRoles = ['responsible', 'accountable', 'consulted', 'informed'] as const;
  assignments = signal<RaciAssignment[]>([]);
  loading = signal(true);
  showAssignDialog = false;

  newAssignment = { raciRole: '', teamId: '', userId: '', notes: '' };

  raciRoleOptions = [
    { label: 'Responsible (R)', value: 'responsible' },
    { label: 'Accountable (A)', value: 'accountable' },
    { label: 'Consulted (C)', value: 'consulted' },
    { label: 'Informed (I)', value: 'informed' },
  ];

  ngOnInit(): void {
    this.loadAssignments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['entityType'] || changes['entityId']) && this.entityType && this.entityId) {
      this.loadAssignments();
    }
  }

  hasGaps(): boolean {
    const a = this.assignments();
    const hasR = a.some(x => x.raci_role === 'responsible');
    const hasA = a.some(x => x.raci_role === 'accountable');
    return !hasR || !hasA;
  }

  getColor(role: string): string { return RACI_COLORS[role] || '#6b7280'; }
  getIcon(role: string): string { return RACI_ICONS[role] || 'pi-user'; }
  getRoleLabel(role: string): string {
    return this.i18n.localize(RACI_LABELS_EN[role] || role, RACI_LABELS_AR[role] || role);
  }

  getAssignees(role: string): RaciAssignment[] {
    return this.assignments().filter(a => a.raci_role === role);
  }

  private loadAssignments(): void {
    if (!this.entityType || !this.entityId) { this.loading.set(false); return; }
    this.loading.set(true);
    this.operationsSvc.getRaciForEntity(this.entityType, this.entityId).subscribe({
      next: (res) => {
        this.assignments.set((res as any)?.assignments || (res as any)?.data || res || []);
        this.loading.set(false);
      },
      error: () => {
        this.assignments.set([]);
        this.loading.set(false);
      },
    });
  }

  assignRole(): void {
    const a = this.newAssignment;
    this.operationsSvc.assignRaci({
      entityType: this.entityType,
      entityId: this.entityId,
      raciRole: a.raciRole,
      teamId: a.teamId || undefined,
      userId: a.userId || undefined,
      notes: a.notes || undefined,
    }).subscribe({
      next: () => {
        this.showAssignDialog = false;
        this.newAssignment = { raciRole: '', teamId: '', userId: '', notes: '' };
        this.loadAssignments();
      },
      error: (e: unknown) => console.error('[RACI] assign failed', e),
    });
  }

  removeAssignment(assignmentId: string): void {
    this.operationsSvc.removeRaciAssignment(assignmentId).subscribe({
      next: () => this.loadAssignments(),
      error: (e: unknown) => console.error('[RACI] remove failed', e),
    });
  }
}
