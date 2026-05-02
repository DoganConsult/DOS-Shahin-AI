import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-reasoning-trace',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-reasoning-trace"><ng-content></ng-content></div>`,
    styles: [`.ai-reasoning-trace { padding: var(--space-md); }`]
})
export class AiReasoningTraceComponent {
    @Input() data: any = null;
}
