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
import { DropdownModule } from 'primeng/select';
import { InputTextarea } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AgentToolBinding {
  id: string;
  agent_asset_id: string;
  tool_asset_id: string;
  is_enabled: boolean;
  notes?: string;
  created_at: string;
}

export interface BindingForm {
  agent_asset_id: string;
  tool_asset_id: string;
  notes: string;
  is_enabled: boolean;
}

export interface DropdownOption {
  label: string;
  value: string;
}

/**
 * Presentational component for the Agent-Tool Bindings tab.
 * Renders filters, a paginated table, and a create-binding dialog.
 * All data loading and mutations are handled by the parent orchestrator.
 */
@Component({
    selector: 'app-ai-binding-tools-tab',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        InputTextarea,
        InputSwitchModule,
        TooltipModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Filters -->
    <div class="filter-bar">
      <p-dropdown
        [options]="agentOptions"
        [(ngModel)]="filterAgent"
        [placeholder]="i18n.translate('ai.bindings.filterAgent')"
        [showClear]="true"
        optionLabel="label"
        optionValue="value"
        styleClass="filter-dropdown"
        (onChange)="filterChange.emit()">
      </p-dropdown>
      <p-dropdown
        [options]="toolOptions"
        [(ngModel)]="filterTool"
        [placeholder]="i18n.translate('ai.bindings.filterTool')"
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
          [label]="i18n.translate('ai.bindings.createBinding')"
          class="p-button-sm"
          (click)="openDialog()">
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
      [value]="bindings"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50]"
      styleClass="p-datatable-sm p-datatable-striped"
      responsiveLayout="scroll">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('ai.bindings.colAgent') }}</th>
          <th>{{ i18n.translate('ai.bindings.colTool') }}</th>
          <th>{{ i18n.translate('ai.bindings.colEnabled') }}</th>
          <th>{{ i18n.translate('ai.bindings.colNotes') }}</th>
          <th>{{ i18n.translate('ai.bindings.colCreatedAt') }}</th>
          <th>{{ i18n.translate('ai.bindings.colActions') }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ getAssetName(row.agent_asset_id) }}</td>
          <td>{{ getAssetName(row.tool_asset_id) }}</td>
          <td>
            <p-tag
              [value]="row.is_enabled ? i18n.translate('ai.bindings.enabled') : i18n.translate('ai.bindings.disabled')"
              [severity]="row.is_enabled ? 'success' : 'danger'" />
          </td>
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
                (click)="toggleBinding.emit(row)">
              </button>
              <button
                *ngIf="canWrite"
                pButton
                icon="pi pi-trash"
                class="p-button-sm p-button-text p-button-danger"
                [pTooltip]="i18n.translate('common.delete')"
                (click)="deleteBinding.emit(row)">
              </button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="empty-state">
            <i class="pi pi-link"></i>
            <span>{{ i18n.translate('ai.bindings.noBindings') }}</span>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- ═══════ Create Binding Dialog ═══════ -->
    <p-dialog
      [header]="i18n.translate('ai.bindings.createBinding')"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{width: '480px'}"
      [closable]="true">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.agent') }}</label>
          <p-dropdown
            [options]="agentOptions"
            [(ngModel)]="form.agent_asset_id"
            [placeholder]="i18n.translate('ai.bindings.selectAgent')"
            optionLabel="label"
            optionValue="value">
          </p-dropdown>
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.bindings.tool') }}</label>
          <p-dropdown
            [options]="toolOptions"
            [(ngModel)]="form.tool_asset_id"
            [placeholder]="i18n.translate('ai.bindings.selectTool')"
            optionLabel="label"
            optionValue="value">
          </p-dropdown>
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
export class AiBindingToolsTabComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ───────────────────────────────────────────────────────────────────

  @Input() bindings: AgentToolBinding[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() canManage = false;
  @Input() canWrite = false;
  @Input() agentOptions: DropdownOption[] = [];
  @Input() toolOptions: DropdownOption[] = [];
  @Input() enabledFilterOptions: DropdownOption[] = [];
  /** Asset name resolver function provided by the parent. */
  @Input() getAssetName: (id: string) => string = (id) => id;
  /** Date formatter function provided by the parent. */
  @Input() formatDate: (iso: string) => string = (iso) => iso;

  // ── Outputs ──────────────────────────────────────────────────────────────────

  @Output() filterChange = new EventEmitter<void>();
  @Output() toggleBinding = new EventEmitter<AgentToolBinding>();
  @Output() deleteBinding = new EventEmitter<AgentToolBinding>();
  @Output() saveBinding = new EventEmitter<BindingForm>();

  // ── Local state ──────────────────────────────────────────────────────────────

  filterAgent = '';
  filterTool = '';
  filterEnabled = '';
  dialogVisible = false;
  form: BindingForm = this.emptyForm();

  // ── Methods ──────────────────────────────────────────────────────────────────

  /** Get the current filter values for the parent to read. */
  getFilters(): { agent: string; tool: string; enabled: string } {
    return { agent: this.filterAgent, tool: this.filterTool, enabled: this.filterEnabled };
  }

  openDialog(): void {
    this.form = this.emptyForm();
    this.dialogVisible = true;
  }

  isFormValid(): boolean {
    return !!(this.form.agent_asset_id && this.form.tool_asset_id);
  }

  onSave(): void {
    if (!this.isFormValid()) return;
    this.saveBinding.emit({ ...this.form });
  }

  /** Close the dialog (called by parent after successful save). */
  closeDialog(): void {
    this.dialogVisible = false;
  }

  private emptyForm(): BindingForm {
    return { agent_asset_id: '', tool_asset_id: '', notes: '', is_enabled: true };
  }
}
