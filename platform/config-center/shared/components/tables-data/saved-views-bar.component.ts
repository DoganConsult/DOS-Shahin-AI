import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-saved-views-bar',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="saved-views-bar"><ng-content></ng-content></div>`,
    styles: [`.saved-views-bar { padding: var(--space-sm); }`]
})
export class SavedViewsBarComponent {
    @Input() data: any = null;
    @Output() action = new EventEmitter<any>();
}
