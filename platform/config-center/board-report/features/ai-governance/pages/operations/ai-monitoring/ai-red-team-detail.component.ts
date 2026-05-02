import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AiGovernanceApiService } from '../../../services/ai-governance-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface RedTeamRun {
  id: string;
  model?: string;
  model_id?: string;
  canary_prompt?: string;
  prompt_template?: string;
  status: string;
  results?: Record<string, unknown>;
  findings?: GrcRecord[];
  created_at?: string;
  updated_at?: string;
}

interface RedTeamSchedule {
  id: string;
  name: string;
  model_id?: string;
  frequency?: string;
  prompt_template?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ai-red-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    CardModule,
    ToolbarModule,
    TooltipModule,
    ProgressSpinnerModule,
    InputTextModule,
    InputTextarea,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gov-page" [attr.dir]="i18n.direction()">

      <!-- ═══════ KPI Strip ═══════ -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <span class="kpi-val">{{ totalRuns() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('ai.redTeam.totalRuns') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ passRate() | number:'1.0-1' }}%</span>
          <span class="kpi-lbl">{{ i18n.translate('ai.redTeam.passRate') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ vulnerabilitiesFound() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('ai.redTeam.vulnerabilities') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ activeSchedules() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('ai.redTeam.activeSchedules') }}</span>
        </div>
      </div>

      <!-- ═══════ Tab Bar ═══════ -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'runs'"
          (click)="activeTab.set('runs')">
          {{ i18n.translate('ai.redTeam.runsTab') }}
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'schedules'"
          (click)="activeTab.set('schedules')">
          {{ i18n.translate('ai.redTeam.schedulesTab') }}
        </button>
      </div>

      <!-- ═══════ Tab 1: Runs & Findings ═══════ -->
      @if (activeTab() === 'runs') {

        @if (runsLoading()) {
          <div class="loading-center">
            <p-progressSpinner strokeWidth="3" [style]="{width: '40px', height: '40px'}" />
          </div>
        }

        @if (!runsLoading()) {
          <p-table
            [value]="runs()"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[10, 25, 50]"
            selectionMode="single"
            [(selection)]="selectedRun"
            (onRowSelect)="onRunSelected()"
            dataKey="id"
            styleClass="p-datatable-sm p-datatable-striped"
            responsiveLayout="scroll">

            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="model">{{ i18n.translate('ai.redTeam.model') }} <p-sortIcon field="model" /></th>
                <th>{{ i18n.translate('ai.redTeam.canaryPrompt') }}</th>
                <th pSortableColumn="status">{{ i18n.translate('ai.redTeam.status') }} <p-sortIcon field="status" /></th>
                <th pSortableColumn="created_at">{{ i18n.translate('ai.redTeam.createdAt') }} <p-sortIcon field="created_at" /></th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-r let-rowIndex="rowIndex">
              <tr [pSelectableRow]="r" [pSelectableRowIndex]="rowIndex">
                <td>{{ r.model ?? r.model_id ?? '--' }}</td>
                <td>
                  <span class="truncate" [pTooltip]="r.canary_prompt ?? r.prompt_template ?? ''" tooltipPosition="top">
                    {{ (r.canary_prompt ?? r.prompt_template ?? '--') | slice:0:60 }}
                  </span>
                </td>
                <td>
                  <p-tag
                    [value]="r.status"
                    [severity]="runStatusSeverity(r.status)" />
                </td>
                <td>{{ r.created_at | date:'short' }}</td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="4" class="empty-state-cell">
                  <i class="pi pi-shield"></i>
                  {{ i18n.translate('ai.redTeam.noRuns') }}
                </td>
              </tr>
            </ng-template>
          </p-table>

          <!-- Selected Run Detail Panel -->
          @if (selectedRun) {
            <div class="detail-panel">
              <h3 class="section-title">{{ i18n.translate('ai.redTeam.runDetail') }}</h3>
              <div class="detail-grid">
                <div class="detail-field">
                  <span class="detail-label">{{ i18n.translate('ai.redTeam.model') }}</span>
                  <span class="detail-value">{{ selectedRun.model ?? selectedRun.model_id ?? '--' }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-label">{{ i18n.translate('ai.redTeam.status') }}</span>
                  <span class="detail-value">
                    <p-tag [value]="selectedRun.status" [severity]="runStatusSeverity(selectedRun.status)" />
                  </span>
                </div>
                <div class="detail-field" style="grid-column:1/-1;">
                  <span class="detail-label">{{ i18n.translate('ai.redTeam.canaryPrompt') }}</span>
                  <span class="detail-value">{{ selectedRun.canary_prompt ?? selectedRun.prompt_template ?? '--' }}</span>
                </div>
              </div>

              <!-- Results Summary -->
              @if (selectedRun.results) {
                <h4 class="section-title">{{ i18n.translate('ai.redTeam.resultsSummary') }}</h4>
                <div class="results-block">
                  <pre class="results-json">{{ selectedRun.results | json }}</pre>
                </div>
              }

              <!-- Findings List -->
              @if (runFindings().length > 0) {
                <h4 class="section-title">{{ i18n.translate('ai.redTeam.findings') }}</h4>
                <p-table
                  [value]="runFindings()"
                  styleClass="p-datatable-sm p-datatable-striped"
                  responsiveLayout="scroll">

                  <ng-template pTemplate="header">
                    <tr>
                      <th>{{ i18n.translate('ai.redTeam.findingType') }}</th>
                      <th>{{ i18n.translate('ai.redTeam.severity') }}</th>
                      <th>{{ i18n.translate('ai.redTeam.description') }}</th>
                    </tr>
                  </ng-template>

                  <ng-template pTemplate="body" let-f>
                    <tr>
                      <td>{{ f.type ?? f.finding_type ?? f.category ?? '--' }}</td>
                      <td>
                        <p-tag
                          [value]="f.severity ?? f.risk_level ?? 'info'"
                          [severity]="findingSeverity(f.severity ?? f.risk_level)" />
                      </td>
                      <td>{{ f.description ?? f.detail ?? f.message ?? '--' }}</td>
                    </tr>
                  </ng-template>
                </p-table>
              }

              @if (!selectedRun.results && runFindings().length === 0) {
                <div class="empty-state-inline">
                  <i class="pi pi-info-circle"></i>
                  {{ i18n.translate('ai.redTeam.noFindings') }}
                </div>
              }
            </div>
          }
        }
      }

      <!-- ═══════ Tab 2: Schedules ═══════ -->
      @if (activeTab() === 'schedules') {

        <p-toolbar styleClass="mb-3">
          <div class="p-toolbar-group-start"></div>
          <div class="p-toolbar-group-end">
            <button
              pButton
              [label]="i18n.translate('ai.redTeam.createSchedule')"
              icon="pi pi-plus"
              class="p-button-sm"
              (click)="openScheduleDialog()">
            </button>
          </div>
        </p-toolbar>

        @if (schedulesLoading()) {
          <div class="loading-center">
            <p-progressSpinner strokeWidth="3" [style]="{width: '40px', height: '40px'}" />
          </div>
        }

        @if (!schedulesLoading()) {
          <p-table
            [value]="schedules()"
            [paginator]="true"
            [rows]="10"
            styleClass="p-datatable-sm p-datatable-striped"
            responsiveLayout="scroll">

            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('ai.redTeam.scheduleName') }}</th>
                <th>{{ i18n.translate('ai.redTeam.model') }}</th>
                <th>{{ i18n.translate('ai.redTeam.frequency') }}</th>
                <th>{{ i18n.translate('ai.redTeam.enabled') }}</th>
                <th>{{ i18n.translate('ai.redTeam.promptTemplate') }}</th>
                <th>{{ i18n.translate('common.actions') }}</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-s>
              <tr>
                <td>{{ s.name }}</td>
                <td>{{ s.model_id ?? '--' }}</td>
                <td>{{ s.frequency ?? '--' }}</td>
                <td>
                  <p-tag
                    [value]="s.enabled ? i18n.translate('common.yes') : i18n.translate('common.no')"
                    [severity]="s.enabled ? 'success' : 'secondary'" />
                </td>
                <td>
                  <span class="truncate" [pTooltip]="s.prompt_template ?? ''" tooltipPosition="top">
                    {{ (s.prompt_template ?? '--') | slice:0:40 }}
                  </span>
                </td>
                <td>
                  <button
                    pButton
                    icon="pi pi-pencil"
                    class="p-button-sm p-button-text p-button-secondary"
                    [pTooltip]="i18n.translate('common.edit')"
                    (click)="openScheduleDialog(s)">
                  </button>
                  <button
                    pButton
                    icon="pi pi-trash"
                    class="p-button-sm p-button-text p-button-danger"
                    [pTooltip]="i18n.translate('common.delete')"
                    (click)="confirmDeleteSchedule(s)">
                  </button>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6" class="empty-state-cell">
                  <i class="pi pi-calendar"></i>
                  {{ i18n.translate('ai.redTeam.noSchedules') }}
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      }

      <!-- ═══════ Schedule Create/Edit Dialog ═══════ -->
      <p-dialog
        [header]="scheduleForm.id
          ? i18n.translate('ai.redTeam.editSchedule')
          : i18n.translate('ai.redTeam.createSchedule')"
        [(visible)]="scheduleDialogVisible"
        [modal]="true"
        [style]="{width: '540px'}"
        [closable]="true">

        <div class="detail-grid" style="margin-top:12px;">
          <div class="detail-field">
            <label class="detail-label">{{ i18n.translate('ai.redTeam.scheduleName') }}</label>
            <input pInputText [(ngModel)]="scheduleForm.name" class="w-full" />
          </div>
          <div class="detail-field">
            <label class="detail-label">{{ i18n.translate('ai.redTeam.model') }}</label>
            <input pInputText [(ngModel)]="scheduleForm.model_id" class="w-full" />
          </div>
          <div class="detail-field">
            <label class="detail-label">{{ i18n.translate('ai.redTeam.frequency') }}</label>
            <p-dropdown
              [options]="frequencyOptions"
              [(ngModel)]="scheduleForm.frequency"
              optionLabel="label"
              optionValue="value"
              [placeholder]="i18n.translate('ai.redTeam.selectFrequency')"
              styleClass="w-full">
            </p-dropdown>
          </div>
          <div class="detail-field">
            <label class="detail-label">{{ i18n.translate('ai.redTeam.enabled') }}</label>
            <p-dropdown
              [options]="enabledOptions"
              [(ngModel)]="scheduleForm.enabled"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full">
            </p-dropdown>
          </div>
          <div class="detail-field" style="grid-column:1/-1;">
            <label class="detail-label">{{ i18n.translate('ai.redTeam.promptTemplate') }}</label>
            <textarea
              pInputTextarea
              [(ngModel)]="scheduleForm.prompt_template"
              [rows]="4"
              class="w-full"
              [placeholder]="i18n.translate('ai.redTeam.promptTemplatePlaceholder')">
            </textarea>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button
            pButton
            [label]="i18n.translate('common.cancel')"
            icon="pi pi-times"
            class="p-button-text"
            (click)="scheduleDialogVisible = false">
          </button>
          <button
            pButton
            [label]="i18n.translate('common.save')"
            icon="pi pi-check"
            [loading]="scheduleSaving()"
            [disabled]="!scheduleForm.name"
            (click)="saveSchedule()">
          </button>
        </ng-template>
      </p-dialog>

      <!-- Confirm Dialog for delete -->
      <p-confirmDialog />

    </div>
  `,
  styles: [`
    .gov-page { display:flex; flex-direction:column; min-height:100%; padding:20px 28px 40px; gap:16px; }
    .kpi-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; margin-bottom:8px; }
    .kpi-card { background:var(--surface-card); border:1px solid var(--surface-border); border-radius:var(--radius-md); padding:14px 18px; display:flex; flex-direction:column; gap:2px; }
    .kpi-val { font-size:var(--font-size-2xl); font-weight:800; color:var(--text-heading); }
    .kpi-lbl { font-size:var(--font-size-xs); font-weight:600; color:var(--text-muted); }
    .section-title { font-size:var(--font-size-lg); font-weight:700; color:var(--text-heading); margin:16px 0 8px; }
    .detail-panel { margin-top:16px; background:var(--surface-card); border:1px solid var(--surface-border); border-radius:var(--radius-lg); padding:20px 24px; }
    .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; margin-bottom:16px; }
    .detail-field { display:flex; flex-direction:column; gap:2px; }
    .detail-label { font-size:var(--font-size-xs); font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted); }
    .detail-value { font-size:var(--font-size-sm); font-weight:500; color:var(--text-heading); }
    .me-2 { margin-inline-end:8px; }
    .mb-3 { margin-bottom:16px; }
    .tab-bar { display:flex; gap:0; border-bottom:2px solid var(--surface-border); margin-bottom:16px; }
    .tab-btn { padding:10px 20px; border:none; background:transparent; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; color:var(--text-muted); }
    .tab-btn.active { color:var(--primary-color,var(--primary)); border-bottom-color:var(--primary-color,var(--primary)); }

    .truncate { max-width:300px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .results-block { background:var(--surface-ground); border:1px solid var(--surface-border); border-radius:var(--radius-md); padding:12px; overflow-x:auto; }
    .results-json { font-family:monospace; font-size:0.85rem; white-space:pre-wrap; word-break:break-all; margin:0; }
    .empty-state-cell { text-align:center; padding:2rem !important; color:var(--text-muted); }
    .empty-state-cell i { margin-right:0.5rem; }
    .empty-state-inline { display:flex; align-items:center; gap:8px; padding:16px; color:var(--text-muted); font-style:italic; }
    .loading-center { display:flex; justify-content:center; padding:3rem; }

    @media(max-width:768px) {
      .kpi-strip { grid-template-columns:repeat(2,1fr); }
      .detail-grid { grid-template-columns:1fr; }
      .truncate { max-width:150px; }
    }
  `],
})
export class AiRedTeamDetailComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  // ── Injected services ───────────────────────────────────────────────────────
  readonly i18n = inject(I18nService);
  private readonly aiApi = inject(AiGovernanceApiService);
  private readonly live = inject(GrcLiveService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Tab state ───────────────────────────────────────────────────────────────
  readonly activeTab = signal<'runs' | 'schedules'>('runs');

  // ── Runs state ──────────────────────────────────────────────────────────────
  readonly runs = signal<RedTeamRun[]>([]);
  readonly runsLoading = signal(false);
  selectedRun: RedTeamRun | null = null;

  /** Findings for the selected run, extracted from results or findings array. */
  readonly runFindings = computed<any[]>(() => {
    if (!this.selectedRun) return [];
    // Prefer explicit findings array, fall back to extracting from results
    if (Array.isArray(this.selectedRun.findings) && this.selectedRun.findings.length > 0) {
      return this.selectedRun.findings;
    }
    const results = this.selectedRun.results;
    if (results && Array.isArray(results.findings)) return results.findings;
    if (results && Array.isArray(results.vulnerabilities)) return results.vulnerabilities;
    return [];
  });

  // ── Schedules state ─────────────────────────────────────────────────────────
  readonly schedules = signal<RedTeamSchedule[]>([]);
  readonly schedulesLoading = signal(false);
  readonly scheduleSaving = signal(false);
  scheduleDialogVisible = false;
  scheduleForm: {
    id: string;
    name: string;
    model_id: string;
    frequency: string;
    prompt_template: string;
    enabled: boolean;
  } = { id: '', name: '', model_id: '', frequency: 'weekly', prompt_template: '', enabled: true };

  // ── Dropdown options ────────────────────────────────────────────────────────
  readonly frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
  ];
  readonly enabledOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  // ── Summary KPI computations ────────────────────────────────────────────────

  readonly totalRuns = computed(() => this.runs().length);

  readonly passRate = computed(() => {
    const all = this.runs();
    if (all.length === 0) return 0;
    const passed = all.filter(r =>
      r.status === 'passed' || r.status === 'pass' || r.status === 'completed'
    ).length;
    return (passed / all.length) * 100;
  });

  readonly vulnerabilitiesFound = computed(() => {
    let count = 0;
    for (const r of this.runs()) {
      const run = r as any;
      if (Array.isArray(run.findings)) count += run.findings.length;
      else if (run.results?.findings) count += run.results.findings.length;
      else if (run.results?.vulnerabilities) count += run.results.vulnerabilities.length;
      else if (run.results?.vulnerability_count) count += run.results.vulnerability_count;
    }
    return count;
  });

  readonly activeSchedules = computed(() =>
    this.schedules().filter(s => s.enabled).length
  );

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadRuns();
    this.loadSchedules();

    this.live.change$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadRuns();
        this.loadSchedules();
      });
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  /** Load red team runs from the GRC endpoint. */
  loadRuns(): void {
    this.runsLoading.set(true);
    this.apiclientSvc.get('/red-team')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const items: RedTeamRun[] = res?.runs ?? res?.data ?? res ?? [];
          this.runs.set(Array.isArray(items) ? items : []);
          this.runsLoading.set(false);
        },
        error: (err) => {
          this.runsLoading.set(false);
          this.showError('ai.redTeam.errorLoadRuns', err);
        },
      });
  }

  /** Load red team schedules from the AI Governance API. */
  loadSchedules(): void {
    this.schedulesLoading.set(true);
    this.aiApi.listRedTeamSchedules()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const items: RedTeamSchedule[] = res?.schedules ?? res?.data ?? res ?? [];
          this.schedules.set(Array.isArray(items) ? items : []);
          this.schedulesLoading.set(false);
        },
        error: (err) => {
          this.schedulesLoading.set(false);
          this.showError('ai.redTeam.errorLoadSchedules', err);
        },
      });
  }

  // ── Run selection ───────────────────────────────────────────────────────────

  onRunSelected(): void {
    // Selection is handled via [(selection)] binding; computed updates automatically
  }

  // ── Schedule CRUD ───────────────────────────────────────────────────────────

  /** Open the schedule create/edit dialog. */
  openScheduleDialog(schedule?: RedTeamSchedule): void {
    if (schedule) {
      this.scheduleForm = {
        id: schedule.id,
        name: schedule.name,
        model_id: schedule.model_id ?? '',
        frequency: schedule.frequency ?? 'weekly',
        prompt_template: schedule.prompt_template ?? '',
        enabled: schedule.enabled,
      };
    } else {
      this.scheduleForm = {
        id: '',
        name: '',
        model_id: '',
        frequency: 'weekly',
        prompt_template: '',
        enabled: true,
      };
    }
    this.scheduleDialogVisible = true;
  }

  /** Save (create or update) a schedule. */
  saveSchedule(): void {
    if (!this.scheduleForm.name) return;

    this.scheduleSaving.set(true);
    const payload = {
      name: this.scheduleForm.name,
      model_id: this.scheduleForm.model_id || undefined,
      frequency: this.scheduleForm.frequency || undefined,
      prompt_template: this.scheduleForm.prompt_template || undefined,
      enabled: this.scheduleForm.enabled,
    };

    const obs = this.scheduleForm.id
      ? this.aiApi.updateRedTeamSchedule(this.scheduleForm.id, payload)
      : this.aiApi.createRedTeamSchedule(payload);

    obs.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.scheduleSaving.set(false);
          this.scheduleDialogVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: this.i18n.translate(
              this.scheduleForm.id ? 'ai.redTeam.scheduleUpdated' : 'ai.redTeam.scheduleCreated'
            ),
          });
          this.loadSchedules();
        },
        error: (err) => {
          this.scheduleSaving.set(false);
          this.showError('ai.redTeam.errorSaveSchedule', err);
        },
      });
  }

  /** Delete a schedule with confirmation. */
  confirmDeleteSchedule(schedule: RedTeamSchedule): void {
    this.confirmService.confirm({
      message: this.i18n.translate('ai.redTeam.confirmDelete'),
      header: this.i18n.translate('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.aiApi.deleteRedTeamSchedule(schedule.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.i18n.translate('ai.redTeam.scheduleDeleted'),
              });
              this.loadSchedules();
            },
            error: (err) => this.showError('ai.redTeam.errorDeleteSchedule', err),
          });
      },
    });
  }

  // ── Status/severity helpers ────────────────────────────────────────────────

  runStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'passed': case 'pass': case 'completed': return 'success';
      case 'failed': case 'fail': return 'danger';
      case 'running': case 'in_progress': return 'warning';
      default: return 'info';
    }
  }

  findingSeverity(severity: string | undefined): 'success' | 'warning' | 'danger' | 'info' {
    switch (severity) {
      case 'critical': case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  }

  // ── Error helper ────────────────────────────────────────────────────────────

  private showError(key: string, err: any): void {
    console.error(`[AiRedTeamDetail] ${key}`, err);
    this.messageService.add({
      severity: 'error',
      summary: this.i18n.translate(key),
      detail: err?.error?.message ?? err?.message ?? '',
    });
  }
}
