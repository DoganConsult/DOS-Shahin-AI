import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-grc-canvas-board',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="canvas-board"><ng-content></ng-content></div>`,
    styles: [`.canvas-board { display: grid; gap: var(--space-md); padding: var(--space-md); }`]
})
export class GrcCanvasBoardComponent {
    @Input() columns: number = 3;
    @Input() data: any[] = [];
}
