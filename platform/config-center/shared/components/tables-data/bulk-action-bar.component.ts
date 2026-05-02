import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bulk-action-bar',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="bulk-action-bar"><ng-content></ng-content></div>`,
    styles: [`.bulk-action-bar { padding: var(--space-sm); }`]
})
export class BulkActionBarComponent {
    @Input() data: any = null;
    @Output() action = new EventEmitter<any>();
}
