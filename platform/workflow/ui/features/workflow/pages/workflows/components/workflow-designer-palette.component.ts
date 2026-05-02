/**
 * Workflow Designer Palette — Node type palette and role drag sources.
 *
 * Presentational child of WorkflowDesignerComponent.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-designer-palette',
    imports: [CommonModule],
    template: `
    <div class="palette">
      <div class="palette-group" *ngFor="let cat of ['flow','action','governance']">
        <span class="palette-group-title">{{ cat | titlecase }}</span>
        <div tabindex="0" role="button" (keyup.enter)="nodeClicked.emit(nt)"
             *ngFor="let nt of nodeTypesByCategory(cat)"
             class="palette-item" draggable="true"
             (dragstart)="paletteDragStart.emit({ event: $event, nodeType: nt })"
             (click)="nodeClicked.emit(nt)">
          <i [class]="nt.piIcon"></i>
          <span>{{ nt.label }}</span>
        </div>
      </div>
      <div class="palette-group palette-roles">
        <span class="palette-group-title"><i class="pi pi-users"></i> Roles</span>
        <div *ngFor="let role of roleOptions"
             class="palette-item palette-role" draggable="true"
             (dragstart)="roleDragStart.emit({ event: $event, role: role })">
          <i class="pi pi-user"></i>
          <span>{{ role.label }}</span>
        </div>
        <div *ngIf="roleOptions.length === 0" class="palette-empty">No roles loaded</div>
      </div>
    </div>
  `,
    styleUrls: ['../workflows.component.scss']
})
export class WorkflowDesignerPaletteComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) nodeTypes: GrcRecord[] = [];
  @Input() roleOptions: { label: string; value: string }[] = [];

  @Output() nodeClicked = new EventEmitter<any>();
  @Output() paletteDragStart = new EventEmitter<{ event: DragEvent; nodeType: GrcRecord }>();
  @Output() roleDragStart = new EventEmitter<{ event: DragEvent; role: GrcRecord }>();

  /** Filter node types by category for grouped display */
  nodeTypesByCategory(cat: string): GrcRecord[] {
    return this.nodeTypes.filter(n => n.category === cat);
  }
}
