import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TreatmentItemDto, TreatmentBoardDto, RiskRegisterItemDto } from '@app/features/risk/pages/risk-workspace/risk-workspace.models';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { GanttChartComponent, GanttTask, GanttLink } from '@app/shared/gantt-chart/gantt-chart.component';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-treatments-page',
    imports: [
        CommonModule, FormsModule, PageShellComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, TextareaModule,
        SelectModule, TooltipModule, ToastModule, ConfirmDialogModule, AppDatePipe, HasPermissionDirective, GanttChartComponent,
    ],
    providers: [MessageService, ConfirmationService],
    template: `
    <app-page-shell
      icon="wrench"
      [title]="L().treatments"
      [subtitle]="L().treatmentsSubtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().treatments]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <p-toast />
      <p-confirmDialog />

      <div class="health-strip" *ngIf="!loading()">
        <div class="health-card">
          <div class="health-value">{{ healthTotal() }}</div>
          <div class="health-label">{{ L().totalLabel }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--error)">{{ healthOverdue() }}</div>
          <div class="health-label">{{ L().overdueLabel }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--success)">{{ healthCompleted() }}</div>
          <div class="health-label">{{ L().completedLabel }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--primary)">{{ healthInProgress() }}</div>
          <div class="health-label">{{ L().inProgressLabel }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#d97706">{{ healthPending() }}</div>
          <div class="health-label">{{ L().pendingLabel }}</div>
        </div>
      </div>

      <div class="treatment-view-toggle mb-3">
        <p-button [label]="L().listView" [severity]="view === 'list' ? 'primary' : 'secondary'" [outlined]="view !== 'list'" (onClick)="view='list'" icon="pi pi-list" styleClass="me-2" />
        <p-button [label]="L().boardView" [severity]="view === 'board' ? 'primary' : 'secondary'" [outlined]="view !== 'board'" (onClick)="view='board'; loadBoard()" icon="pi pi-th-large" styleClass="me-2" />
        <p-button [label]="L().ganttView" [severity]="view === 'gantt' ? 'primary' : 'secondary'" [outlined]="view !== 'gantt'" (onClick)="view='gantt'" icon="pi pi-calendar" styleClass="me-2" />
        <p-button [label]="L().effectivenessView" [severity]="view === 'effectiveness' ? 'primary' : 'secondary'" [outlined]="view !== 'effectiveness'" (onClick)="view='effectiveness'; loadEffectiveness()" icon="pi pi-chart-bar" styleClass="me-2" />
        <p-button *appHasPermission="'risk.record.write'" [label]="L().createTreatment" icon="pi pi-plus" severity="secondary" [outlined]="true" (onClick)="openCreateDialog()" styleClass="me-2" />
        <app-export-button module="risk-treatments" [label]="L().export" [data]="treatments()" />
      </div>

      <div *ngIf="view === 'list'">
        <p-table aria-label="Data table" [value]="treatments()" [rows]="20" [paginator]="true" styleClass="p-datatable-sm p-datatable-striped" *ngIf="treatments().length > 0">
          <ng-template pTemplate="header">
            <tr>
              <th>ID</th><th>{{ L().title }}</th><th>{{ L().linkedRisk }}</th><th>{{ L().owner }}</th><th>{{ L().strategy }}</th>
              <th>{{ L().targetDate }}</th><th>{{ L().status }}</th><th>{{ L().overdue }}</th><th>{{ L().actions }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-t>
            <tr [class.overdue-row]="t.overdue">
              <td class="font-mono text-xs">{{ t.treatmentId }}</td>
              <td class="font-semibold">{{ t.title || '—' }}</td>
              <td>{{ t.linkedRiskTitle || t.linkedRiskId || '—' }}</td>
              <td>{{ t.owner || '—' }}</td>
              <td><p-tag [value]="t.strategy || 'mitigate'" [rounded]="true" /></td>
              <td>{{ t.targetDate | appDate:'medium' }}</td>
              <td><app-status-badge [status]="t.status" /></td>
              <td><i *ngIf="t.overdue" class="pi pi-exclamation-triangle text-danger"></i></td>
              <td>
                <div class="row-actions">
                  <button *appHasPermission="'risk.record.write'" aria-label="Edit" class="icon-btn" (click)="openEditDialog(t)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                  <button *appHasPermission="'risk.record.delete'" aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(t)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        <div *ngIf="treatments().length === 0 && !loading()" class="empty-section">
          <i class="pi pi-wrench"></i>
          <p>{{ L().emptyTreatments }}</p>
          <p-button *appHasPermission="'risk.record.write'" [label]="L().createTreatment" icon="pi pi-plus" (onClick)="openCreateDialog()" />
        </div>
      </div>

      <div *ngIf="view === 'board' && board()" class="treatment-board">
        <div *ngFor="let col of boardColumns" class="board-column">
          <div class="board-column-header" [class]="'board-' + col.key">
            <span class="board-col-title">{{ i18n.localize(col.labelEn, col.labelAr) }}</span>
            <span class="board-col-count">{{ (board()?.[col.key] || []).length }}</span>
          </div>
          <div class="board-column-body">
            <div tabindex="0" role="button" (keyup.enter)="openEditDialog(card)" *ngFor="let card of (board()?.[col.key] || [])" class="board-card" [class.overdue-card]="card.overdue" (click)="openEditDialog(card)">
              <div class="board-card-title">{{ card.title || card.linkedRiskTitle || 'Treatment' }}</div>
              <div class="board-card-meta">
                <span *ngIf="card.owner"><i class="pi pi-user"></i> {{ card.owner }}</span>
                <span *ngIf="card.targetDate"><i class="pi pi-calendar"></i> {{ card.targetDate | appDate:'short' }}</span>
              </div>
            </div>
            <div *ngIf="!(board()?.[col.key]?.length)" class="board-empty">—</div>
          </div>
        </div>
      </div>

      <!-- Gantt Timeline View (dhtmlx-gantt) -->
      <div *ngIf="view === 'gantt' && treatments().length > 0">
        <app-gantt-chart
          [tasks]="ganttTasks()"
          [links]="ganttLinks()"
          [readonly]="true"
          height="500px"
          (taskSelected)="onGanttTaskSelected($event)" />
      </div>

      <!-- Effectiveness View -->
      <div *ngIf="view === 'effectiveness'" class="effectiveness-container">
        <div class="eff-summary" *ngIf="effectiveness()">
          <div class="eff-card">
            <div class="eff-value" style="color:var(--success)">{{ effectiveness()?.effectiveCount || 0 }}</div>
            <div class="eff-label">{{ L().effective }}</div>
          </div>
          <div class="eff-card">
            <div class="eff-value" style="color:var(--error)">{{ effectiveness()?.ineffectiveCount || 0 }}</div>
            <div class="eff-label">{{ L().ineffective }}</div>
          </div>
          <div class="eff-card">
            <div class="eff-value" style="color:var(--warning)">{{ effectiveness()?.pendingValidation || 0 }}</div>
            <div class="eff-label">{{ L().pendingValidation }}</div>
          </div>
        </div>
        <p-table aria-label="Effectiveness table" [value]="effectiveness()?.items || []" [rows]="15" [paginator]="true" styleClass="p-datatable-sm" *ngIf="effectiveness()?.items?.length">
          <ng-template pTemplate="header">
            <tr><th>{{ L().linkedRisk }}</th><th>{{ L().planned }}</th><th>{{ L().actual }}</th><th>{{ L().effective }}</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-semibold">{{ item.riskTitle }}</td>
              <td>{{ item.plannedReduction }}%</td>
              <td>{{ item.actualReduction }}%</td>
              <td>
                <i [class]="item.effective ? 'pi pi-check-circle text-success' : 'pi pi-times-circle text-danger'"></i>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <p-dialog [header]="editMode ? L().editTreatment : L().createTreatment" [(visible)]="dialogVisible" [modal]="true" [style]="{width:'550px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ L().title }}</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ L().description }}</label><textarea pTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ L().owner }}</label><input pInputText [(ngModel)]="form.owner" class="w-full" /></div>
            <div class="field"><label>{{ L().linkedRisk }}</label><p-select [(ngModel)]="form.linkedRiskId" [options]="riskOptions()" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" [filter]="true" filterBy="label" /></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ L().strategy }}</label>
              <p-select [(ngModel)]="form.strategy" [options]="strategyOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
            <div class="field">
              <label>{{ L().status }}</label>
              <p-select [(ngModel)]="form.status" [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
          </div>
          <div class="field"><label>{{ L().targetDate }}</label><input pInputText type="date" [(ngModel)]="form.targetDate" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="L().cancel" severity="secondary" [text]="true" (onClick)="dialogVisible=false" />
          <p-button [label]="L().save" icon="pi pi-check" (onClick)="saveTreatment()" [disabled]="!form.title.trim()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; text-align: center; padding: 14px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: default; transition: box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-card); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .treatment-view-toggle { display: flex; gap: var(--space-sm, 8px); align-items: center; flex-wrap: wrap; }
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .me-2 { margin-inline-end: var(--space-sm, 8px); }
    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-danger { color: var(--error); }
    .overdue-row { background: rgba(var(--module-accent-red-rgb), .04); }
    .row-actions { display: flex; gap: var(--space-xs, 4px); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: var(--surface-ice, rgba(var(--color-black-rgb), .05)); color: var(--primary); }
    .icon-btn.danger:hover { background: rgba(var(--module-accent-red-rgb), .08); color: var(--error); }
    .treatment-board { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-md, 12px); min-height: 300px; overflow-x: auto; }
    .board-column { min-width: 180px; }
    .board-column-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm, 8px) var(--space-md, 12px); border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0; background: var(--surface-ice, #f5f5f5); border: 1px solid var(--border-subtle); border-bottom: 2px solid var(--primary); }
    .board-column-header.board-overdue { border-bottom-color: var(--error); }
    .board-column-header.board-done { border-bottom-color: var(--success); }
    .board-col-title { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text); }
    .board-col-count { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-muted); }
    .board-column-body { display: flex; flex-direction: column; gap: var(--space-sm, 8px); padding: var(--space-sm, 8px); background: var(--surface-card); border: 1px solid var(--border-subtle); border-top: none; border-radius: 0 0 var(--radius-sm, 4px) var(--radius-sm, 4px); min-height: 200px; }
    .board-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm, 4px); padding: var(--space-sm, 8px) var(--space-md, 12px); border-inline-start: 3px solid var(--primary); cursor: pointer; transition: all 150ms; }
    .board-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .board-card.overdue-card { border-inline-start-color: var(--error); background: rgba(var(--module-accent-red-rgb), .03); }
    .board-card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text); margin-bottom: var(--space-xs, 4px); }
    .board-card-meta { display: flex; gap: var(--space-md, 12px); font-size: var(--font-size-xs); color: var(--text-muted); }
    .board-card-meta i { font-size: var(--font-size-xs); margin-inline-end: 2px; }
    .board-empty { text-align: center; color: var(--text-muted); padding: var(--space-lg, 16px); }
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: var(--font-size-5xl); color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); margin-bottom: var(--space-md, 12px); }
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 12px); }
    .w-full { width: 100%; }
    .clickable { cursor: pointer; }
    .clickable:hover { text-decoration: underline; color: var(--primary); }
    .text-success { color: var(--success); }
    .gantt-container { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .gantt-header { display: grid; grid-template-columns: 200px 1fr; padding: 10px 14px; background: var(--surface-ice, #f5f5f5); border-bottom: 1px solid var(--border-subtle); font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); }
    .gantt-row { display: grid; grid-template-columns: 200px 1fr; padding: 6px 14px; border-bottom: 1px solid var(--surface-ice, #f0f0f0); align-items: center; }
    .gantt-row:last-child { border-bottom: none; }
    .gantt-title { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gantt-timeline { position: relative; height: 24px; background: var(--surface-ice, #f8f8f8); border-radius: var(--radius-xs); }
    .gantt-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 3px; background: var(--primary-200, #93c5fd); display: flex; align-items: center; padding: 0 6px; min-width: 20px; transition: all .15s; }
    .gantt-bar-done { background: var(--success, #22c55e); opacity: .85; }
    .gantt-bar-overdue { background: var(--error, #ef4444); opacity: .85; }
    .gantt-bar-progress { background: var(--primary, #3b82f6); }
    .gantt-bar-label { font-size: var(--font-size-nano); color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .effectiveness-container { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .eff-summary { display: flex; gap: 12px; flex-wrap: wrap; }
    .eff-card { flex: 1; min-width: 140px; text-align: center; padding: 16px 10px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .eff-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .eff-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
  `]
})
export class RiskTreatmentsPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  public i18n = inject(I18nService);

  loading = signal(true);
  treatments = signal<TreatmentItemDto[]>([]);
  board = signal<TreatmentBoardDto | null>(null);
  risks = signal<RiskRegisterItemDto[]>([]);
  riskOptions = computed(() => this.risks().map(r => ({ label: `${r.riskId} — ${r.title}`, value: r.riskId })));
  view: 'list' | 'board' | 'gantt' | 'effectiveness' = 'list';
  effectiveness = signal<GrcRecord | null>(null);
  ganttTasks = computed<GanttTask[]>(() => {
    return this.treatments().map(t => {
      const start = t.createdAt ? new Date(t.createdAt) : new Date(Date.now() - 30 * 86400000);
      const end = t.targetDate ? new Date(t.targetDate) : new Date();
      const durationMs = Math.max(end.getTime() - start.getTime(), 86400000);
      const durationDays = Math.ceil(durationMs / 86400000);
      const progress = t.status === 'done' || t.status === 'completed' ? 1
        : t.status === 'in_progress' || t.status === 'inProgress' ? 0.5
        : t.status === 'validation' ? 0.8 : 0.1;
      const color = t.overdue ? '#ef4444' : t.status === 'done' || t.status === 'completed' ? '#22c55e'
        : t.status === 'in_progress' || t.status === 'inProgress' ? '#3b82f6' : '#93c5fd';
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} 00:00`;
      return { id: t.treatmentId, text: t.title || t.treatmentId, start_date: fmt(start), duration: durationDays, progress, color };
    });
  });
  ganttLinks = computed<GanttLink[]>(() => []);
  dialogVisible = false;
  editMode = false;
  editingId = '';
  form = { title: '', description: '', owner: '', targetDate: '', linkedRiskId: '', strategy: 'mitigate', status: 'planned' };

  tabs = RISK_PRIMARY_TABS;
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  L = computed(() => this.isAr() ? AR : EN);

  healthTotal = computed(() => this.treatments().length);
  healthOverdue = computed(() => this.treatments().filter(t => t.overdue).length);
  healthCompleted = computed(() => this.treatments().filter(t => t.status === 'done' || t.status === 'completed').length);
  healthInProgress = computed(() => this.treatments().filter(t => t.status === 'inProgress' || t.status === 'in_progress').length);
  healthPending = computed(() => this.treatments().filter(t => t.status === 'planned' || t.status === 'approved' || t.status === 'validation').length);

  boardColumns = [
    { key: 'planned', labelEn: 'Planned', labelAr: 'مخطط' },
    { key: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
    { key: 'inProgress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
    { key: 'overdue', labelEn: 'Overdue', labelAr: 'متأخر' },
    { key: 'validation', labelEn: 'Validation', labelAr: 'التحقق' },
    { key: 'done', labelEn: 'Done', labelAr: 'مكتمل' },
  ];

  get strategyOptions() {
    return [
      { label: this.i18n.translate('risk.mitigate'), value: 'mitigate' },
      { label: this.i18n.translate('risk.accept'), value: 'accept' },
      { label: this.i18n.translate('risk.transfer'), value: 'transfer' },
      { label: this.i18n.translate('risk.avoid'), value: 'avoid' },
    ];
  }
  get statusOptions() {
    return [
      { label: this.i18n.translate('risk.planned'), value: 'planned' },
      { label: this.i18n.translate('risk.approved'), value: 'approved' },
      { label: this.i18n.translate('risk.inProgress'), value: 'inProgress' },
      { label: this.i18n.translate('risk.validation'), value: 'validation' },
      { label: this.i18n.translate('risk.done'), value: 'done' },
    ];
  }

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  private load(): void {
    this.api.getTreatments().subscribe({
      next: (d) => { this.treatments.set(d.treatments || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
    this.api.getRegister().subscribe({
      next: (d) => this.risks.set(d.risks || []),
      error: (e) => devError("[API]", e),
    });
  }

  loadBoard(): void {
    this.api.getTreatmentBoard().subscribe({
      next: (d) => this.board.set(d),
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadTreatmentBoard')),
    });
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = '';
    this.form = { title: '', description: '', owner: '', targetDate: '', linkedRiskId: '', strategy: 'mitigate', status: 'planned' };
    this.dialogVisible = true;
  }

  openEditDialog(t: TreatmentItemDto): void {
    this.editMode = true; this.editingId = t.treatmentId;
    this.form = {
      title: t.title || '', description: '', owner: t.owner || '',
      targetDate: t.targetDate || '', linkedRiskId: t.linkedRiskId || '',
      strategy: t.strategy || 'mitigate', status: t.status || 'planned',
    };
    this.dialogVisible = true;
  }

  saveTreatment(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingId
      ? this.api.updateTreatment(this.editingId, this.form as unknown)
      : this.api.createTreatment(this.form as unknown);
    obs.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.load();
        this.toast(
          'success',
          this.editMode ? this.i18n.translate('common.treatmentUpdated') : this.i18n.translate('common.treatmentCreated'),
        );
      },
      error: () => this.toast('error', this.i18n.translate('common.failedToSaveTreatment')),
    });
  }

  confirmDelete(t: TreatmentItemDto): void {
    const title = t.title || t.treatmentId;
    this.confirm.confirm({
      message: this.i18n.translate('common.confirmDeleteTreatmentMessage', { title }),
      header: this.i18n.translate('common.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.updateTreatment(t.treatmentId, { status: 'closed' } as GrcRecord).subscribe({
          next: () => {
            this.toast('success', this.i18n.translate('common.treatmentDeleted'));
            this.load();
          },
          error: () => this.toast('error', this.i18n.translate('common.failedToDeleteTreatment')),
        });
      },
    });
  }

  loadEffectiveness(): void {
    this.api.getTreatmentEffectiveness().subscribe({
      next: (d) => this.effectiveness.set(d),
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadEffectivenessData')),
    });
  }

  onGanttTaskSelected(task: GanttTask): void {
    const treatment = this.treatments().find(t => t.treatmentId === task.id);
    if (treatment) this.openEditDialog(treatment);
  }



  navigateToRisk(riskId: string | undefined): void {
    if (riskId) this.router.navigate(['/risk/register'], { queryParams: { id: riskId } });
  }

  private toast(severity: string, detail: string): void {
    const summary =
      severity === 'error'
        ? this.i18n.translate('common.error')
        : severity === 'warn'
          ? this.i18n.translate('common.warning')
          : severity === 'info'
            ? this.i18n.translate('common.info')
            : this.i18n.translate('common.success');
    this.msg.add({ severity, summary, detail, life: 3000 });
  }

}

const EN = {
  treatments: 'Treatments', treatmentsSubtitle: 'Treatment plans — list/board views, create, edit, delete, and track progress',
  listView: 'List', boardView: 'Board', createTreatment: 'Create Treatment', editTreatment: 'Edit Treatment',
  export: 'Export',
  linkedRisk: 'Linked Risk', owner: 'Owner', strategy: 'Strategy', targetDate: 'Target Date',
  status: 'Status', overdue: 'Overdue', title: 'Title', description: 'Description',
  save: 'Save', cancel: 'Cancel', actions: 'Actions',
  emptyTreatments: 'No treatment plans created yet.',
  totalLabel: 'Total', overdueLabel: 'Overdue', completedLabel: 'Completed', inProgressLabel: 'In Progress', pendingLabel: 'Pending',
  ganttView: 'Gantt', effectivenessView: 'Effectiveness', timeline: 'Timeline',
  effective: 'Effective', ineffective: 'Ineffective', pendingValidation: 'Pending Validation',
  planned: 'Planned Reduction', actual: 'Actual Reduction',
};

const AR: typeof EN = {
  treatments: 'المعالجات', treatmentsSubtitle: 'خطط المعالجة — عرض القائمة/اللوحة والإنشاء والتعديل والحذف وتتبع التقدم',
  listView: 'قائمة', boardView: 'لوحة', createTreatment: 'إنشاء معالجة', editTreatment: 'تعديل المعالجة',
  export: 'تصدير',
  linkedRisk: 'الخطر المرتبط', owner: 'المسؤول', strategy: 'الاستراتيجية', targetDate: 'التاريخ المستهدف',
  status: 'الحالة', overdue: 'متأخر', title: 'العنوان', description: 'الوصف',
  save: 'حفظ', cancel: 'إلغاء', actions: 'الإجراءات',
  emptyTreatments: 'لم يتم إنشاء خطط معالجة بعد.',
  totalLabel: 'الإجمالي', overdueLabel: 'متأخرة', completedLabel: 'مكتملة', inProgressLabel: 'قيد التنفيذ', pendingLabel: 'معلقة',
  ganttView: 'جانت', effectivenessView: 'الفعالية', timeline: 'الجدول الزمني',
  effective: 'فعّال', ineffective: 'غير فعّال', pendingValidation: 'بانتظار التحقق',
  planned: 'التخفيض المخطط', actual: 'التخفيض الفعلي',
};
