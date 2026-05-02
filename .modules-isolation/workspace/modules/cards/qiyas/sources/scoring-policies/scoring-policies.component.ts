import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '../../shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '../../shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-scoring-policies',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="chart-bar"
      [title]="i18n.translate('scoringPolicies.title')"
      [subtitle]="i18n.translate('scoringPolicies.subtitle')"
      [breadcrumbs]="['Dashboard', 'Scoring Policies']"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('scoringPolicies.addPolicy')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('scoringPolicies.search')" [attr.aria-label]="i18n.translate('scoringPolicies.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('scoringPolicies.export')" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('scoringPolicies.name') }}</th>
            <th>{{ i18n.translate('scoringPolicies.modelType') }}</th>
            <th>{{ i18n.translate('scoringPolicies.weightConfig') }}</th>
            <th>{{ i18n.translate('scoringPolicies.status') }}</th>
            <th style="width:120px">{{ i18n.translate('scoringPolicies.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.title }}</strong></td>
            <td>{{ item.model_type ?? item.scoring_type ?? '—' }}</td>
            <td>{{ summarizeWeights(item.weight_config ?? item.weights) }}</td>
            <td><app-status-badge [status]="item.status ?? 'active'" /></td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-msg">{{ i18n.translate('scoringPolicies.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('scoringPolicies.noPolicies') }}</p>
        <p-button [label]="i18n.translate('scoringPolicies.addPolicy')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode ? i18n.translate('scoringPolicies.editPolicy') : i18n.translate('scoringPolicies.addNewPolicy')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('scoringPolicies.name') }}</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('scoringPolicies.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('scoringPolicies.modelType') }}</label>
              <p-dropdown [(ngModel)]="form.model_type" [options]="modelTypeOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('scoringPolicies.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('scoringPolicies.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('scoringPolicies.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('scoringPolicies.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('scoringPolicies.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('scoringPolicies.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('scoringPolicies.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="scoring-policies" />
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
export class ScoringPoliciesComponent implements OnInit {
  items: Record<string, unknown>[] = [];
  filteredItems: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = { name: '', description: '', model_type: 'weighted_average', status: 'draft' };
  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ];
  modelTypeOptions = [
    { label: 'Weighted Average', value: 'weighted_average' },
    { label: 'Matrix', value: 'matrix' },
    { label: 'Custom', value: 'custom' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private complianceSvc: GrcComplianceService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.complianceSvc.getScoringPolicies().subscribe({
      next: (res: Record<string, unknown>) => {
        const raw = res.policies ?? res.scoring_policies ?? res;
        this.items = Array.isArray(raw) ? raw : (raw.data ?? []);
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
      r = r.filter(i =>
        (i.name ?? i.title ?? '').toLowerCase().includes(t) ||
        (i.model_type ?? i.scoring_type ?? '').toLowerCase().includes(t) ||
        (i.description ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  summarizeWeights(config: Record<string, unknown>): string {
    if (!config) return '—';
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch { return String(config); }
    }
    if (typeof config === 'object') {
      const entries = Object.entries(config);
      if (entries.length === 0) return '—';
      return entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') + (entries.length > 3 ? '...' : '');
    }
    return String(config);
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { name: '', description: '', model_type: 'weighted_average', status: 'draft' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, unknown>): void {
    this.editMode = true; this.editingId = item.scoring_policy_id ?? item.id;
    this.form = {
      name: item.name ?? item.title ?? '',
      description: item.description ?? '',
      model_type: item.model_type ?? item.scoring_type ?? 'weighted_average',
      status: item.status ?? 'draft'
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.complianceSvc.updateScoringPolicy(this.editingId, this.form)
      : this.complianceSvc.createScoringPolicy(this.form as any);
    obs.subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('scoringPolicies.success'), detail: this.editMode ? this.i18n.translate('scoringPolicies.updated') : this.i18n.translate('scoringPolicies.created'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('scoringPolicies.error'), detail: this.i18n.translate('scoringPolicies.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDelete(item: Record<string, unknown>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.scoring_policy_id ?? this.deleteTarget.id;
    this.complianceSvc.deleteScoringPolicy(id).subscribe({
      next: () => {
        this.showDeleteDialog = false; this.deleteTarget = null; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('scoringPolicies.deleted'), detail: this.i18n.translate('scoringPolicies.recordRemoved'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('scoringPolicies.error'), detail: this.i18n.translate('scoringPolicies.deleteFailed'), life: 4000 });
      }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scoring-policies.csv'; a.click();
  }
}
