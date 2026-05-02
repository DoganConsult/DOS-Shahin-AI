import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { WorkflowNode } from '../workflow-builder.types';

/**
 * Presentational component: node configuration dialog.
 * Shows a dialog with label, type, and description fields for the selected node.
 */
@Component({
  selector: 'app-workflow-node-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, ButtonModule],
  template: `
    <p-dialog [header]="i18n.translate('Configure Node')"
      [(visible)]="visible" [modal]="true" [style]="{width:'420px'}"
      (onHide)="visibleChange.emit(false)">
      <div class="form-grid" *ngIf="node">
        <div class="form-field">
          <label>{{ i18n.translate('Label') }}</label>
          <input pInputText [(ngModel)]="node.label" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ i18n.translate('Type') }}</label>
          <p-dropdown [options]="nodeTypes" [(ngModel)]="node.type" [style]="{width:'100%'}" />
        </div>
        <div class="form-field">
          <label>{{ i18n.translate('Description') }}</label>
          <textarea pInputTextarea [(ngModel)]="node.config['description']" [rows]="2" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('Done')" icon="pi pi-check" (onClick)="done.emit(node)" />
      </ng-template>
    </p-dialog>

    <!-- Simulation Result -->
    <p-dialog [header]="i18n.translate('Simulation Result')"
      [(visible)]="simVisible" [modal]="true" [style]="{width:'500px'}"
      (onHide)="simVisibleChange.emit(false)">
      <pre class="sim-output">{{ simResult | json }}</pre>
    </p-dialog>
  `,
  styles: [`
    .form-grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .form-field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; color: var(--text-heading); }
    .w-full { width: 100%; }
    .sim-output { background: var(--surface-sunken); padding: 16px; border-radius: var(--radius); font-size: var(--font-size-sm); max-height: 300px; overflow: auto; }
  `],
})
export class WorkflowNodeInspectorComponent {
  @Input() visible = false;
  @Input() node: WorkflowNode | null = null;
  @Input() nodeTypes: { label: string; value: string }[] = [];
  @Input() simVisible = false;
  @Input() simResult: Record<string, unknown> | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() simVisibleChange = new EventEmitter<boolean>();
  @Output() done = new EventEmitter<WorkflowNode | null>();

  constructor(public i18n: I18nService) {}
}
