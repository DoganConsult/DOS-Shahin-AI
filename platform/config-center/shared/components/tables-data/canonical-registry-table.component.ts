import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-canonical-registry-table',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="canonical-registry-table"><ng-content></ng-content></div>`,
    styles: [`.canonical-registry-table { padding: var(--space-sm); }`]
})
export class CanonicalRegistryTableComponent {
    @Input() data: any = null;
    @Output() action = new EventEmitter<any>();
}
