import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-studio-layout',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="layout-shell"><ng-content></ng-content></div>`,
    styles: [`.layout-shell { display: flex; flex-direction: column; min-height: 100%; }`]
})
export class StudioLayoutComponent {
    @Input() title: string = '';
    @Input() loading: boolean = false;
}
