import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-command-center-layout',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="layout-shell"><ng-content></ng-content></div>`,
    styles: [`.layout-shell { display: flex; flex-direction: column; min-height: 100%; }`]
})
export class CommandCenterLayoutComponent {
    @Input() title: string = '';
    @Input() loading: boolean = false;
}
