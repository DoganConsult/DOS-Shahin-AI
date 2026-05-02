import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-observation-list',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-observation-list"><ng-content></ng-content></div>`,
    styles: [`.ai-observation-list { padding: var(--space-md); }`]
})
export class AiObservationListComponent {
    @Input() data: any = null;
}
