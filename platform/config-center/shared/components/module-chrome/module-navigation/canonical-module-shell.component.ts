import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleMastheadComponent, type MastheadConfig } from '../module-display/module-masthead.component';
import { ModuleActionBarComponent, type ActionBarItem, type ViewMode } from './module-action-bar.component';
import { ModuleWorkflowRibbonComponent, type WorkflowRibbonConfig } from './module-workflow-ribbon.component';
import { ModuleContextRailComponent, type RelatedRecord, type AuditEntry, type NoteEntry } from './module-context-rail.component';
import { ModuleStickyFooterComponent, type StickyFooterConfig } from './module-sticky-footer.component';
import { ModuleStatePresetComponent, type StatePreset } from '../module-display/module-state-preset.component';
import type { ActivityRowVM } from '../../../models/module-overview.vm';

export interface CanonicalShellConfig {
  masthead: MastheadConfig;
  actionBar: {
    items: ActionBarItem[];
    showSearch: boolean;
    viewModes: ViewMode[];
    activeView: ViewMode;
  };
  workflow: WorkflowRibbonConfig;
  contextRail: {
    moduleCode: string;
    activity: ActivityRowVM[];
    relatedRecords: RelatedRecord[];
    auditTrail: AuditEntry[];
    notes: NoteEntry[];
  };
  footer: StickyFooterConfig;
  statePreset?: StatePreset;
}

@Component({
    selector: 'app-canonical-module-shell',
    imports: [
        CommonModule,
        ModuleMastheadComponent, ModuleActionBarComponent,
        ModuleWorkflowRibbonComponent, ModuleContextRailComponent,
        ModuleStickyFooterComponent, ModuleStatePresetComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="cms" [attr.dir]="config.masthead.lang === 'ar' ? 'rtl' : 'ltr'">
      <!-- Layer 2: Masthead -->
      <app-module-masthead [config]="config.masthead" (aiAction)="aiAction.emit($event)">
        <ng-content select="[mastheadActions]" mastheadActions></ng-content>
      </app-module-masthead>

      <!-- Layer 4: Action Bar -->
      <app-module-action-bar
        [items]="config.actionBar.items"
        [lang]="config.masthead.lang"
        [showSearch]="config.actionBar.showSearch"
        [viewModes]="config.actionBar.viewModes"
        [activeView]="config.actionBar.activeView"
        (slotClick)="slotClick.emit($event)"
        (searchChange)="searchChange.emit($event)"
        (viewChange)="viewChange.emit($event)">
        <ng-content select="[actionBarStart]" actionBarStart></ng-content>
        <ng-content select="[actionBarEnd]" actionBarEnd></ng-content>
      </app-module-action-bar>

      <!-- Layer 7: Workflow Ribbon -->
      <app-module-workflow-ribbon
        [config]="config.workflow"
        (transition)="transition.emit($event)" />

      <!-- Layer 5+8: Content + Context Rail -->
      <div class="cms-body" *ngIf="!config.statePreset; else stateBlock">
        <main class="cms-main">
          <ng-content></ng-content>
        </main>

        <app-module-context-rail
          [moduleCode]="config.contextRail.moduleCode"
          [lang]="config.masthead.lang"
          [activity]="config.contextRail.activity"
          [relatedRecords]="config.contextRail.relatedRecords"
          [auditTrail]="config.contextRail.auditTrail"
          [notes]="config.contextRail.notes"
          (recordClick)="recordClick.emit($event)"
          (addNote)="addNote.emit($event)" />
      </div>

      <ng-template #stateBlock>
        <app-module-state-preset
          [preset]="config.statePreset!"
          (action)="stateAction.emit(config.statePreset!)" />
      </ng-template>

      <!-- Layer 9: Sticky Footer -->
      <app-module-sticky-footer
        [config]="config.footer"
        (clearSelection)="clearSelection.emit()">
        <ng-content select="[footerBulkActions]" footerBulkActions></ng-content>
      </app-module-sticky-footer>
    </div>
  `,
    styles: [`
    .cms { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface-ground, #f5f5f5); }
    .cms-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .cms-main { flex: 1; overflow-y: auto; padding: 16px 24px; min-width: 0; }
    @media (max-width: 1024px) {
      .cms-body { flex-direction: column; }
      .cms-main { padding: 12px; }
    }
  `]
})
export class CanonicalModuleShellComponent {
  @Input() config!: CanonicalShellConfig;

  @Output() aiAction = new EventEmitter<string>();
  @Output() slotClick = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() viewChange = new EventEmitter<ViewMode>();
  @Output() transition = new EventEmitter<string>();
  @Output() recordClick = new EventEmitter<RelatedRecord>();
  @Output() addNote = new EventEmitter<string>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() stateAction = new EventEmitter<StatePreset>();
}
