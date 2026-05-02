import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-entity-preview',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="entity-preview"><ng-content></ng-content></div>`,
    styles: [`.entity-preview { padding: var(--space-sm); }`]
})
export class EntityPreviewComponent {
    @Input() entityId: string = '';
    @Input() entityType: string = '';
}
