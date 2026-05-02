import { Component, OnInit, inject, DestroyRef, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Control } from '@app/core/models/grc.models';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';
import { ButtonModule, CheckboxModule, DialogModule, DropdownModule, InputModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-controls',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    TableModule, TagModule, UIShellModule, ButtonModule, DialogModule,
    InputModule, InputModule, DropdownModule, CheckboxModule, TooltipModule,
    AiPanelComponent, RaciPanelComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-shell
      icon="lock"
      [title]="i18n.translate('control.title')"
      [subtitle]="i18n.translate('controls.subtitle')"
      [breadcrumbs]="['Dashboard', 'Controls']"
      [loading]="!loaded">

      <section cdsToolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <button cdsButton [label]="i18n.translate('common.create')" icon="" (onClick)="openCreate()" />
          <button cdsButton *ngIf="showUnassignedBanner()"
            [label]="filterUnassigned() ? i18n.translate('controls.showAll') : i18n.translate('controls.unassignedOnly') + ' (' + unassignedCount() + ')'"
            [severity]="filterUnassigned() ? 'secondary' : 'warning'"
            icon="" styleClass="ms-2" [outlined]="true"
            (onClick)="filterUnassigned.set(!filterUnassigned())" />
        </ng-template>
        <ng-template pTemplate="end">
          <div *ngIf="selected.length > 0" class="flex align-items-center gap-2 me-3">
            <span class="text-sm font-semibold">{{ selected.length }} {{ i18n.translate('controls.selected') }}</span>
            <cds-dropdown [options]="teamOptions()" optionLabel="label" optionValue="value"
              [(ngModel)]="bulkTeamId"
              [placeholder]="i18n.translate('controls.assignToTeam')"
              styleClass="bulk-team-dd" [filter]="true" />
            <button cdsButton [label]="i18n.translate('controls.assign')"
              icon="" severity="success" size="small"
              [disabled]="!bulkTeamId" (onClick)="bulkAssign()" />
          </div>
          <button cdsButton label="Export CSV" icon="" severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </section>

      <div *ngIf="showUnassignedBanner() && !filterUnassigned()" class="unassigned-banner mb-3">
        <i class=""></i>
        {{ unassignedCount() }} {{ i18n.translate('controls.unassignedBanner') }}
      </div>

      <app-raci-panel entityType="control" [entityId]="editId || ''" [canEdit]="true" />

      <table cdsTable aria-label="Data table" [value]="displayedControls()" [paginator]="true" [rows]="20"
               [lazy]="true" [totalRecords]="totalRecords()" (onLazyLoad)="onLazyLoad($event)"
               [(selection)]="selected" dataKey="controlId"
               styleClass="p-datatable-striped" [globalFilterFields]="['title','description']">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem"><table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"HeaderCheckbox /></th>
            <th >{{ i18n.translate('nav.controls') }}</th>
            <th>{{ i18n.translate('common.status') }}</th>
            <th>{{ i18n.translate('controls.ownerTeam') }}</th>
            <th>{{ i18n.translate('nav.frameworks') }}</th>
            <th >{{ i18n.translate('controls.evidence') }}</th>
            <th >{{ i18n.translate('controls.risks') }}</th>
            <th style="width:100px">{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="C table"Checkbox [value]="c" /></td>
            <td>
              <strong>{{ c.title }}</strong>
              <cds-tag *ngIf="c.automatable" [value]="i18n.translate('controls.auto')" severity="success" icon="" styleClass="ms-2" />
            </td>
            <td><app-status-badge [status]="c.status" /></td>
            <td>
              <div class="owner-cell">
                <span *ngIf="c.ownerTeamName" class="team-badge">
                  <i class=""></i> {{ c.ownerTeamName }}
                </span>
                <span *ngIf="!c.ownerTeamName && c.owner" class="text-sm text-color-secondary">{{ c.owner }}</span>
                <span *ngIf="!c.ownerTeamName && !c.owner" class="unassigned-label">
                  <i class=" text-orange-400"></i>
                  {{ i18n.translate('controls.unassigned') }}
                </span>
                <cds-dropdown *ngIf="quickAssignId === c.control_id || quickAssignId === c.controlId"
                  [options]="teamOptions()" optionLabel="label" optionValue="value"
                  [(ngModel)]="quickTeamId" [placeholder]="i18n.translate('controls.selectTeam')"
                  styleClass="quick-dd" [filter]="true" appendTo="body"
                  (onChange)="applyQuickAssign(c)" />
              </div>
            </td>
            <td><cds-tag *ngFor="let fw of c.frameworks?.slice(0,2)" [value]="fw" severity="info" styleClass="me-1" /></td>
            <td>
              <cds-tag [value]="(c.evidenceCount || 0) + ''" [severity]="c.evidenceCount > 0 ? 'success' : 'warning'" icon="" />
            </td>
            <td>
              <cds-tag [value]="(c.riskCount || 0) + ''" [severity]="c.riskCount > 0 ? 'danger' : 'secondary'" icon="" />
            </td>
            <td>
              <button aria-label="User" class="icon-btn" (click)="toggleQuickAssign(c)"
                [cdsTooltip]="i18n.translate('controls.assignTeam')">
                <i class=""></i>
              </button>
              <button aria-label="Edit" class="icon-btn" (click)="openEdit(c)" [cdsTooltip]="Edit"><i class=""></i></button>
              <button aria-label="Delete" class="icon-btn danger" (click)="confirmDel(c)" [cdsTooltip]="Delete"><i class=""></i></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="empty-msg">{{ i18n.translate('common.noData') }}</td></tr>
        </ng-template>
      </table>

      <app-empty-state
        *ngIf="loaded && allControls().length === 0"
        variant="default"
        [title]="i18n.translate('common.noData')"
        [description]="i18n.translate('gettingStarted.createFirstControl')"
        [actionLabel]="i18n.translate('common.create')"
        (action)="openCreate()" />

      <!-- Team Distribution Widget -->
      <div *ngIf="teamDistribution.length > 0" class="team-dist-card mt-4">
        <div class="team-dist-header">
          <i class="" style="color:var(--primary)"></i>
          <span>{{ i18n.translate('controls.distributionByTeam') }}</span>
        </div>
        <div class="team-dist-grid">
          <div *ngFor="let row of teamDistribution" class="team-dist-row">
            <div class="team-name">{{ row.team_name }}</div>
            <div class="team-bar-wrap">
              <div class="team-bar" [style.width]="row.completion_pct + '%'"></div>
            </div>
            <div class="team-stats">
              <span>{{ row.implemented }}/{{ row.total_controls }}</span>
              <span class="completion-pct">{{ row.completion_pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Dialog -->
      <cds-modal [header]="editMode ? 'Edit Control' : 'New Control'" [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('common.name') }}</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('common.description') }}</label><textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ i18n.translate('common.status') }}</label>
              <cds-dropdown [(ngModel)]="form.status" [options]="statusOpts" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('controls.ownerText') }}</label><input pInputText [(ngModel)]="form.owner" class="w-full" /></div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('controls.ownerTeamLabel') }}</label>
            <cds-dropdown [(ngModel)]="form.owner_team_id" [options]="teamOptions()" optionLabel="label" optionValue="value"
              styleClass="w-full" [filter]="true" [showClear]="true"
              [placeholder]="i18n.translate('controls.selectTeamOptional')" />
          </div>
          <div class="field"><label>{{ i18n.translate('controls.frameworksCommaSeparated') }}</label><input pInputText [(ngModel)]="form.frameworksStr" class="w-full" /></div>
          <div class="field"><cds-checkbox [(ngModel)]="form.automatable" [binary]="true" inputId="automatable" /><label for="automatable" class="ml-2">Automatable</label></div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDialog=false" />
          <button cdsButton [label]="i18n.translate('common.save')" icon="" (onClick)="save()" [disabled]="!form.title" />
        </ng-template>
      </cds-modal>

      <!-- Delete Dialog -->
      <cds-modal header="Confirm Delete" [(visible)]="showDelDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('controls.deleteConfirm') }}</p>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDelDialog=false" />
          <button cdsButton label="Delete" icon="" severity="danger" (onClick)="doDelete()" />
        </ng-template>
      </cds-modal>
    </app-page-shell>
    <app-ai-panel module="controls" />
  `,
  styles: [`
    .ms-2 { margin-inline-start: 8px; }
    .me-1 { margin-inline-end: 4px; }
    .me-3 { margin-inline-end: 12px; }
    .mb-3 { margin-bottom: 16px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: 32px; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 16px; display: block; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: var(--radius-sm); transition: all 150ms; }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .team-badge { display: inline-flex; align-items: center; gap: 4px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 500; }
    .unassigned-label { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--risk-high); }
    .owner-cell { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .quick-dd { width: 180px; }
    .bulk-team-dd { width: 200px; }
    .unassigned-banner { background: var(--status-warning-bg, #fcf4d6); border: 1px solid #fdba74; border-radius: var(--radius); padding: 10px 16px; color: #92400e; display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); }
    .mt-4 { margin-top: 1.5rem; }
    .team-dist-card { background: var(--surface-card); border-radius: var(--radius-md); padding: 1rem 1.25rem; box-shadow: var(--shadow-sm); }
    .team-dist-header { display: flex; align-items: center; gap: .5rem; font-weight: 600; margin-bottom: .75rem; font-size: .95rem; }
    .team-dist-grid { display: flex; flex-direction: column; gap: .5rem; }
    .team-dist-row { display: grid; grid-template-columns: 140px 1fr 80px; gap: .75rem; align-items: center; }
    .team-name { font-size: .82rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .team-bar-wrap { height: 8px; background: var(--surface-border); border-radius: var(--radius-xs); overflow: hidden; }
    .team-bar { height: 100%; background: var(--primary); border-radius: var(--radius-xs); transition: width .4s; }
    .team-stats { display: flex; gap: .5rem; font-size: .78rem; justify-content: flex-end; }
    .completion-pct { color: var(--primary); font-weight: 600; }
  `],
})
export class ControlsComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
    private complianceSvc = inject(GrcComplianceService);
  private route = inject(ActivatedRoute);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  allControls = signal<GrcRecord[]>([]);
  totalRecords = signal(0);
  teams = signal<GrcRecord[]>([]);
  loaded = false;
  private currentOffset = 0;
  private _initialLoadDone = false;
  private _loadInFlight = false;
  showDialog = false;
  showDelDialog = false;
  editMode = false;
  editId: string | null = null;
  delTarget: Record<string, any> | null = null;
  selected: Record<string, any>[] = [];
  bulkTeamId: string | null = null;
  quickAssignId: string | null = null;
  quickTeamId: string | null = null;
  filterUnassigned = signal(false);

  form: Record<string, any> = { title: '', description: '', status: 'not_started', owner: '', owner_team_id: null, frameworksStr: '', automatable: false };

  statusOpts = [
    { label: 'Not Started', value: 'not_started' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Implemented', value: 'implemented' },
    { label: 'Testing', value: 'testing' },
    { label: 'Effective', value: 'effective' },
  ];

  teamOptions = computed(() =>
    this.teams().map((t: Record<string, any>) => ({ label: t.name || t.team_name, value: t.team_id || t.teamId }))
  );

  unassignedCount = computed(() =>
    this.allControls().filter(c => !c.owner_team_id && !c.ownerTeamId).length
  );

  showUnassignedBanner = computed(() => this.unassignedCount() > 0);

  displayedControls = computed(() => {
    const all = this.allControls();
    if (this.filterUnassigned()) return all.filter(c => !c.owner_team_id && !c.ownerTeamId);
    return all;
  });

  teamDistribution: Record<string, any>[] = [];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('filter') === 'unassigned') this.filterUnassigned.set(true);
    });
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
    this.loadTeams();
    this.loadTeamDistribution();
  }

  load(): void {
    if (this._loadInFlight) return;
    this._loadInFlight = true;
    this.apiclientSvc.get(`/controls?offset=${this.currentOffset}&limit=20`).subscribe({
      next: (res: Record<string, any>) => {
        const list = res?.controls ?? (Array.isArray(res) ? res : []);
        this.allControls.set(list.map((c: Record<string, any>) => ({
          ...c,
          controlId: c.control_id || c.controlId,
          ownerTeamId: c.owner_team_id || c.ownerTeamId,
          ownerTeamName: c.owner_team_name || c.ownerTeamName,
          ownerTeamCode: c.owner_team_code || c.ownerTeamCode,
          frameworks: c.frameworks || [],
          evidenceCount: c.evidence_count ?? c.evidenceCount ?? 0,
          riskCount: c.risk_count ?? c.riskCount ?? 0,
        })));
        this.totalRecords.set(res.totalCount ?? res.total ?? res.count ?? list.length);
        this.loaded = true;
        this._loadInFlight = false;
        this._initialLoadDone = true;
      },
      error: () => {
        this.complianceSvc.getControls().subscribe(c => { this.allControls.set(c as any[]); this.loaded = true; });
        this._loadInFlight = false;
        this._initialLoadDone = true;
      }
    });
  }

  onLazyLoad(event: any): void {
    const newOffset = event.first || 0;
    if (!this._initialLoadDone) return;
    if (newOffset === this.currentOffset && this.allControls().length > 0) return;
    this.currentOffset = newOffset;
    this.load();
  }

  loadTeams(): void {
    this.operationsSvc.getTeams().subscribe({
      next: (res: Record<string, any>) => {
        const list = res?.teams ?? (Array.isArray(res) ? res : []);
        this.teams.set(list);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadTeamDistribution(): void {
    this.apiclientSvc.get('/controls/team-distribution').subscribe({
      next: (r: Record<string, any>) => { this.teamDistribution = r.distribution || []; },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  openCreate(): void {
    this.editMode = false; this.editId = null;
    this.form = { title: '', description: '', status: 'not_started', owner: '', owner_team_id: null, frameworksStr: '', automatable: false };
    this.showDialog = true;
  }

  openEdit(c: Record<string, any>): void {
    this.editMode = true; this.editId = c.control_id || c.controlId;
    this.form = {
      title: c.title, description: c.description, status: c.status,
      owner: c.owner, owner_team_id: c.owner_team_id || c.ownerTeamId || null,
      frameworksStr: (c.frameworks || []).join(', '), automatable: c.automatable
    };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.title) return;
    const data: Record<string, any> = { ...this.form, frameworks: this.form.frameworksStr.split(',').map((s: string) => s.trim()).filter(Boolean) };
    delete data.frameworksStr;
    if (this.editMode && this.editId) {
      this.complianceSvc.updateControl(this.editId, data).subscribe(() => { this.showDialog = false; this.load(); });
    } else {
      this.complianceSvc.createControl(data as any).subscribe(() => { this.showDialog = false; this.load(); });
    }
  }

  confirmDel(c: Record<string, any>): void { this.delTarget = c; this.showDelDialog = true; }

  doDelete(): void {
    if (!this.delTarget) return;
    const id = this.delTarget.control_id || this.delTarget.controlId;
    this.complianceSvc.deleteControl(id).subscribe(() => { this.showDelDialog = false; this.delTarget = null; this.load(); });
  }

  toggleQuickAssign(c: Record<string, any>): void {
    const id = c.control_id || c.controlId;
    this.quickAssignId = this.quickAssignId === id ? null : id;
    this.quickTeamId = c.owner_team_id || c.ownerTeamId || null;
  }

  applyQuickAssign(c: Record<string, any>): void {
    const id = c.control_id || c.controlId;
    this.complianceSvc.updateControl(id, { owner_team_id: this.quickTeamId } as any).subscribe({
      next: () => { this.quickAssignId = null; this.load(); },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  bulkAssign(): void {
    if (!this.bulkTeamId || !this.selected.length) return;
    const ids = this.selected.map(c => c.control_id || c.controlId);
    this.complianceSvc.bulkAssignControlTeam(ids, this.bulkTeamId).subscribe({
      next: () => { this.selected = []; this.bulkTeamId = null; this.load(); },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  exportCSV(): void {
    const rows = this.displayedControls().map(c => ({
      Title: c.title, Description: c.description, Status: c.status,
      Owner: c.owner || '', OwnerTeam: c.ownerTeamName || '',
      Frameworks: (c.frameworks || []).join('; '), Automatable: c.automatable ? 'Yes' : 'No',
      Evidence: c.evidenceCount || 0, Risks: c.riskCount || 0,
    }));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'controls-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

}
