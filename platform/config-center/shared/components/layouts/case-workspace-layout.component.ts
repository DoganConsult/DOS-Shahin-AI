import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-case-workspace-layout',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="layout-shell"><ng-content></ng-content></div>`,
    styles: [`.layout-shell { display: flex; flex-direction: column; min-height: 100%; }`]
})
export class CaseWorkspaceLayoutComponent {
    @Input() title: string = '';
    @Input() loading: boolean = false;
}
