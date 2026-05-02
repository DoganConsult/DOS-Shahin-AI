import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AllowlistEntry {
  id: string;
  asset_id: string;
  asset_type: string;
  is_enabled: boolean;
  max_tokens_limit?: number;
  temperature_limit?: number;
  notes?: string;
  created_at: string;
}

export interface AllowlistForm {
  asset_type: string;
  asset_id: string;
  max_tokens_limit: number | null;
  temperature_limit: number | null;
  notes: string;
  is_enabled: boolean;
}

export interface DropdownOption {
  label: string;
  value: string;
}

/**
 * Presentational component for the Tenant Allowlist tab.
 * Renders filters, a paginated table, backfill button, and a create-entry dialog.
 * All data loading and mutations are handled by the parent orchestrator.
 */
@Component({
    selector: 'app-ai-binding-allowlist-tab',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        InputTextarea,
        DropdownModule,
        InputSwitchModule,
        TooltipModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Filters -->
    <div class="filter-bar">
      <p-dropdown
        [options]="allowlistTypeOptions"
        [(ngModel)]="filterType"
        [placeholder]="i18n.translate('ai.bindings.filterAssetType')"
        [showClear]="true"
        optionLabel="label"
        optionValue="value"
        styleClass="filter-dropdown"
        (onChange)="filterChange.emit()">
      </p-dropdown>
      <p-dropdown
        [options]="enabledFilterOptions"
        [(ngModel)]="filterEnabled"
        [placeholder]="i18n.translate('ai.bindings.filterEnabled')"
        [showClear]="true"
        optionLabel="label"
        optionValue="value"
        styleClass="filter-dropdown"
        (onChange)="filterChange.emit()">
      </p-dropdown>
      <div class="filter-actions">
        <button
          *ngIf="canManage"
          pButton
          icon="pi pi-plus"
          [label]="i18n.translate('ai.bindings.createEntry')"
          class="p-button-sm"
          (click)="openDialog()">
        </button>
        <button
          *ngIf="canManage"
          pButton
          icon="pi pi-sync"
          [label]="i18n.translate('ai.bindings.backfill')"
          class="p-button-sm p-button-outlined"
          [loading]="backfillLoading"
          (click)="backfill.emit()">
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="loading-center">
      <p-progressSpinner strokeWidth="3" [style]="{width: '32px', height: '32px'}" />
    </div>

    <!-- Table -->
    <p-table
      *ngIf="!loading"
      [value]="allowlist"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50]"
      styleClass="p-datatable-sm p-datatable-striped"
      responsiveLayout="scroll">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('ai.bindings.colAssetType') }}</th>
          <th>{{ i18n.translate('ai.bindings.colAssetName') }}</th>
          <th>{{ i18n.translate('ai.bindings.colEnabled') }}</th>
          <th>{{ i18n.translate('ai.bindings.colMaxTokens') }}</th>
          <th>{{ i18n.translate('ai.bindings.colTemperature') }}</th>
          <th>{{ i18n.translate('ai.bindings.colNotes') }}</th>
          <th>{{ i18n.translate('ai.bindings.colCreatedAt') }}</th>
          <th>{{ i18n.translate('ai.bindings.colActions') }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>
            <p-tag
              [value]="row.asset_type"
              [severity]="row.asset_type === 'provider' ? 'info' : 'warning'" />
          </td>
          <td>{{ getAssetName(row.asset_id) }}</td>
          <td>
            <p-tag
              [value]="row.is_enabled ? i18n.translate('ai.bindings.enabled') : i18n.translate('ai.bindings.disabled')"
              [severity]="row.is_enabled ? 'success' : 'danger'" />
          </td>
          <td>{{ row.max_tokens_limit ?? '-' }}</td>
          <td>{{ row.temperature_limit != null ? row.temperature_limit : '-' }}</td>
          <td class="notes-cell">{{ row.notes || '-' }}</td>
          <td>{{ formatDate(row.created_at) }}</td>
          <td>
            <div class="action-buttons">
              <button
                *ngIf="canManage"
                pButton
                [icon]="row.is_enabled ? 'pi pi-ban' : 'pi pi-check'"
                class="p-button-sm p-button-text"
                [pTooltip]="row.is_enabled ? i18n.translate('ai.bindings.disable') : i18n.translate('ai.bindings.enable')"
                (click)="toggleEntry.emit(row)">
              </button>
              <button
                *ngIf="canWrite"
                pButton
                icon="pi pi-trash"
                class="p-button-sm p-button-text p-button-danger"
                [pTooltip]="i18n.translate('common.delete')"
                (click)="deleteEntry.emit(row)">
              </button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="8" class="empty-state">
            <i class="pi pi-list"></i>
            <span>{{ i18n.translate('ai.bindings.noAllowlist') }}</span>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- ═══════ Create Allowlist Entry Dialog ═══════ -->
    <p-dialog
      [header]="i18n.translate('ai.bindings.createEntry')"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{width: '480px'}"
      [closable]="true">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.colAssetType') }}</label>
          <p-dropdown
            [options]="allowlistTypeOptions"
            [(ngModel)]="form.asset_type"
            [placeholder]="i18n.translate('ai.bindings.selectType')"
            optionLabel="label"
            optionValue="value"
            (onChange)="onTypeChange()">
          </p-dropdown>
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.colAssetName') }}</label>
          <p-dropdown
            [options]="filteredAssetsByType"
            [(ngModel)]="form.asset_id"
            [placeholder]="i18n.translate('ai.bindings.selectAsset')"
            optionLabel="label"
            optionValue="value">
          </p-dropdown>
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.colMaxTokens') }}</label>
          <input pInputText type="number" [(ngModel)]="form.max_tokens_limit" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.colTemperature') }}</label>
          <input pInputText type="number" step="0.1" [(ngModel)]="form.temperature_limit" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.colNotes') }}</label>
          <textarea pInputTextarea [(ngModel)]="form.notes" rows="3"></textarea>
        </div>
        <div class="field field-row">
          <label>{{ i18n.translate('ai.bindings.colEnabled') }}</label>
          <p-inputSwitch [(ngModel)]="form.is_enabled"></p-inputSwitch>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button
          pButton
          [label]="i18n.translate('common.cancel')"
          class="p-button-text"
          (click)="dialogVisible = false">
        </button>
        <button
          pButton
          [label]="i18n.translate('common.save')"
          [loading]="saving"
          [disabled]="!isFormValid()"
          (click)="onSave()">
        </button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0;
      flex-wrap: wrap;
    }
    .filter-dropdown { min-width: 180px; }
    .filter-actions {
      margin-inline-start: auto;
      display: flex;
      gap: 0.5rem;
    }
    .notes-cell {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .action-buttons {
      display: flex;
      gap: 0.125rem;
      align-items: center;
    }
    .loading-center {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      color: var(--text-color-secondary);
      font-size: var(--font-size-body-sm);
    }
    .empty-state i { font-size: var(--font-size-2xl); opacity: 0.5; }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .dialog-form .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .dialog-form .field label {
      font-size: var(--font-size-tag);
      font-weight: 500;
      color: var(--text-color);
    }
    .field-row {
      flex-direction: row !important;
      align-items: center;
      gap: 0.75rem !important;
    }
    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .filter-actions { margin-inline-start: 0; }
    }
  `]
})
export class AiBindingAllowlistTabComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ───────────────────────────────────────────────────────────────────

  @Input() allowlist: AllowlistEntry[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() backfillLoading = false;
  @Input() canManage = false;
  @Input() canWrite = false;
  @Input() allowlistTypeOptions: DropdownOption[] = [];
  @Input() enabledFilterOptions: DropdownOption[] = [];
  @Input() filteredAssetsByType: DropdownOption[] = [];
  /** Asset name resolver function provided by the parent. */
  @Input() getAssetName: (id: string) => string = (id) => id;
  /** Date formatter function provided by the parent. */
  @Input() formatDate: (iso: string) => string = (iso) => iso;

  // ── Outputs ──────────────────────────────────────────────────────────────────

  @Output() filterChange = new EventEmitter<void>();
  @Output() toggleEntry = new EventEmitter<AllowlistEntry>();
  @Output() deleteEntry = new EventEmitter<AllowlistEntry>();
  @Output() saveEntry = new EventEmitter<AllowlistForm>();
  @Output() backfill = new EventEmitter<void>();
  /** Emitted when the asset_type changes in the form so the parent can update filteredAssetsByType. */
  @Output() formTypeChange = new EventEmitter<string>();

  // ── Local state ──────────────────────────────────────────────────────────────

  filterType = '';
  filterEnabled = '';
  dialogVisible = false;
  form: AllowlistForm = this.emptyForm();

  // ── Methods ──────────────────────────────────────────────────────────────────

  /** Get the current filter values for the parent to read. */
  getFilters(): { type: string; enabled: string } {
    return { type: this.filterType, enabled: this.filterEnabled };
  }

  openDialog(): void {
    this.form = this.emptyForm();
    this.dialogVisible = true;
  }

  onTypeChange(): void {
    this.form.asset_id = '';
    this.formTypeChange.emit(this.form.asset_type);
  }

  isFormValid(): boolean {
    return !!(this.form.asset_type && this.form.asset_id);
  }

  onSave(): void {
    if (!this.isFormValid()) return;
    this.saveEntry.emit({ ...this.form });
  }

  /** Close the dialog (called by parent after successful save). */
  closeDialog(): void {
    this.dialogVisible = false;
  }

  private emptyForm(): AllowlistForm {
    return {
      asset_type: '',
      asset_id: '',
      max_tokens_limit: null,
      temperature_limit: null,
      notes: '',
      is_enabled: true,
    };
  }
}
