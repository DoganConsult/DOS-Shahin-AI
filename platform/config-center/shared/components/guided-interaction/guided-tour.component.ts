import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-guided-tour',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="guided-tour" *ngIf="active"><ng-content></ng-content></div>`,
    styles: [`.guided-tour { position: fixed; z-index: 2000; }`]
})
export class GuidedTourComponent {
    @Input() active: boolean = false;
    @Input() steps: any[] = [];
}
