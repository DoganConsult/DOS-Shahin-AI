import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-feedback-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="ai-feedback-dialog"><ng-content></ng-content></div>`,
    styles: [`.ai-feedback-dialog { padding: var(--space-md); }`]
})
export class AiFeedbackDialogComponent {
    @Input() data: any = null;
}
