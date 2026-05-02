import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-entity-workflow-panel',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="workflow-panel" *ngIf="entityId">
        <h4>Workflow</h4>
        <div class="workflow-stage">{{ currentStage || 'No active workflow' }}</div>
      </div>
    `,
    styles: [`
      .workflow-panel { padding: var(--space-md); border: 1px solid var(--surface-border); border-radius: 8px; }
      .workflow-stage { font-weight: 600; margin-top: var(--space-sm); }
    `]
})
export class EntityWorkflowPanelComponent {
    @Input() entityId: string = '';
    @Input() entityType: string = '';
    @Input() currentStage: string = '';
}
