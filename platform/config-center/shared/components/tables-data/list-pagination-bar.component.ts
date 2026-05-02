import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-list-pagination-bar',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="list-pagination-bar"><ng-content></ng-content></div>`,
    styles: [`.list-pagination-bar { padding: var(--space-sm); }`]
})
export class ListPaginationBarComponent {
    @Input() data: any = null;
    @Output() action = new EventEmitter<any>();
}
