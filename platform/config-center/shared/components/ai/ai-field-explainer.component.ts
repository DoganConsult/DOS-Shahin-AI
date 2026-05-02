import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-field-explainer',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-field-explainer"><ng-content></ng-content></div>`,
    styles: [`.ai-field-explainer { padding: var(--space-md); }`]
})
export class AiFieldExplainerComponent {
    @Input() data: any = null;
}
