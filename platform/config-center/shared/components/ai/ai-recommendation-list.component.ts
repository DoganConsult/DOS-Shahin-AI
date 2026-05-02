import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-recommendation-list',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-recommendation-list"><ng-content></ng-content></div>`,
    styles: [`.ai-recommendation-list { padding: var(--space-md); }`]
})
export class AiRecommendationListComponent {
    @Input() data: any = null;
}
