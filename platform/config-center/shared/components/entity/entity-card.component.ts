import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-entity-card',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="entity-card">
        <div class="entity-card-title">{{ title }}</div>
        <ng-content></ng-content>
      </div>
    `,
    styles: [`
      .entity-card { padding: var(--space-md); border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-card); }
      .entity-card-title { font-weight: 600; margin-bottom: var(--space-sm); }
    `]
})
export class EntityCardComponent {
    @Input() title: string = '';
    @Input() entityType: string = '';
    @Input() entityId: string = '';
}
