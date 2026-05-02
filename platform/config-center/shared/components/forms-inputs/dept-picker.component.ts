import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dept-picker',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="dept-picker"><ng-content></ng-content></div>`,
    styles: [`.dept-picker { display: inline-block; }`]
})
export class DeptPickerComponent {
    @Input() value: any = null;
    @Output() valueChange = new EventEmitter<any>();
}
