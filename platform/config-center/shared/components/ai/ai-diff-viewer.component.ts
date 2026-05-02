import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-diff-viewer',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-diff-viewer"><ng-content></ng-content></div>`,
    styles: [`.ai-diff-viewer { padding: var(--space-md); }`]
})
export class AiDiffViewerComponent {
    @Input() data: any = null;
}
