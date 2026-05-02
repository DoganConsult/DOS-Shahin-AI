import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { AiEntityContextPanelComponent } from '@app/shared/components/ai/ai-entity-context-panel.component';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-findings',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, UIShellModule, ButtonModule, DialogModule,
        InputModule, InputModule, DropdownModule, TooltipModule, NotificationModule,
        AiEntityContextPanelComponent,
    ],
    providers: [],
    template: `
    <app-page-shell
      icon="search-plus"
      [title]="i18n.translate('findings.title')"
      [subtitle]="i18n.translate('findings.subtitle')"
      [breadcrumbs]="['Dashboard', 'Findings']"
      [loading]="!loaded">

      <cds-notification></cds-notification>

      <section cdsToolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <button cdsButton
            [label]="i18n.translate('findings.add')"
            icon="" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class=""></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('findings.search')" [attr.aria-label]="i18n.translate('findings.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <button cdsButton label="Export" icon="" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </section>

      <table cdsTable aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('findings.headerTitle') }}</th>
            <th>{{ i18n.translate('findings.severity') }}</th>
            <th>{{ i18n.translate('findings.source') }}</th>
            <th>{{ i18n.translate('findings.status') }}</th>
            <th>{{ i18n.translate('findings.dueDate') }}</th>
            <th style="width:120px">{{ i18n.translate('findings.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.title ?? item.name }}</strong></td>
            <td>{{ item.severity }}</td>
            <td>{{ item.source ?? item.audit_plan_id }}</td>
            <td><app-status-badge [status]="item.status ?? 'open'" /></td>
            <td>{{ item.due_date | date }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" [cdsTooltip]="Edit"><i class=""></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" [cdsTooltip]="Delete"><i class=""></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('findings.noData') }}</td></tr>
        </ng-template>
      </table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class=" empty-icon"></i>
        <p>{{ i18n.translate('findings.noData') }}</p>
        <button cdsButton [label]="i18n.translate('findings.add')" icon=""
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <cds-modal
        [header]="editMode ? i18n.translate('findings.editFinding') : i18n.translate('findings.addNewFinding')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          @if (editMode && editingId) {
            <app-ai-entity-context [entityType]="'finding'" [entityId]="editingId" />
          }
          <div class="field">
            <label>{{ i18n.translate('findings.headerTitle') }}</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('findings.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('findings.severity') }}</label>
              <cds-dropdown [(ngModel)]="form.severity" [options]="severityOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('findings.source') }}</label>
              <input pInputText [(ngModel)]="form.source" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('findings.remediationPlan') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.remediation_plan" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('findings.dueDate') }}</label>
              <input type="date" pInputText [(ngModel)]="form.due_date" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('findings.status') }}</label>
              <cds-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('findings.cancel')" icon=""
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <button cdsButton [label]="i18n.translate('findings.save')" icon=""
                    (onClick)="saveItem()" [disabled]="!form.title" />
        </ng-template>
      </cds-modal>

      <cds-modal [header]="i18n.translate('findings.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('findings.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('findings.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <button cdsButton [label]="i18n.translate('findings.delete')" icon=""
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </cds-modal>

    </app-page-shell>
    <app-ai-panel module="findings" />
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
  `]
})
export class FindingsComponent implements OnInit {
  private msg = inject(MessageService);

    private complianceSvc = inject(GrcComplianceService);
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, any> | null = null;
  form: Record<string, any> = { title: '', description: '', severity: 'medium', source: '', remediation_plan: '', due_date: '', status: 'open' };

  statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Remediated', value: 'remediated' },
    { label: 'Closed', value: 'closed' },
  ];

  severityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get('/findings').subscribe({
      next: (res: Record<string, any>) => {
        this.items = Array.isArray(res) ? res : (res.data?.findings ?? res.findings ?? (Array.isArray(res.data) ? res.data : []));
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i => (i.title ?? i.name ?? '').toLowerCase().includes(t) || (i.description ?? '').toLowerCase().includes(t));
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { title: '', description: '', severity: 'medium', source: '', remediation_plan: '', due_date: '', status: 'open' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, any>): void {
    this.editMode = true; this.editingId = item.finding_id ?? item.id;
    this.form = {
      title: item.title ?? item.name,
      description: item.description ?? '',
      severity: item.severity ?? 'medium',
      source: item.source ?? item.audit_plan_id ?? '',
      remediation_plan: item.remediation_plan ?? '',
      due_date: item.due_date ?? '',
      status: item.status ?? 'open',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingId
      ? this.complianceSvc.updateFinding(this.editingId, this.form)
      : this.complianceSvc.createFinding(this.form as any);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('common.updated') : this.i18n.translate('common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, any>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.finding_id ?? this.deleteTarget.id;
    this.complianceSvc.deleteFinding(id).subscribe({
      next: () => { this.showDeleteDialog = false; this.deleteTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.recordRemoved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'findings.csv'; a.click();
  }
}
