import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-entity-link-panel',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="link-panel"><ng-content></ng-content></div>`,
    styles: [`.link-panel { padding: var(--space-md); }`]
})
export class EntityLinkPanelComponent {
    @Input() entityId: string = '';
    @Input() entityType: string = '';
}
