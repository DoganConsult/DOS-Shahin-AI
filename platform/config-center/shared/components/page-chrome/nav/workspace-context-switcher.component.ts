import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WorkspaceContext {
    id: string;
    name: string;
    type?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workspace-context-switcher',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="ws-switcher">
        <span>{{ current?.name || 'Select workspace' }}</span>
      </div>
    `,
    styles: [`.ws-switcher { padding: var(--space-sm); cursor: pointer; }`]
})
export class WorkspaceContextSwitcherComponent {
    @Input() current: WorkspaceContext | null = null;
    @Input() workspaces: WorkspaceContext[] = [];
    @Output() switched = new EventEmitter<WorkspaceContext>();
}
