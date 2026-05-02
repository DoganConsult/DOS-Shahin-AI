import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-entity-context-panel',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="ai-context-panel" *ngIf="entityId">
        <ng-content></ng-content>
      </div>
    `,
    styles: [`.ai-context-panel { padding: var(--space-md); border: 1px solid var(--surface-border); border-radius: 8px; }`]
})
export class AiEntityContextPanelComponent {
    @Input() entityId: string = '';
    @Input() entityType: string = '';
    @Input() context: any = null;
}
