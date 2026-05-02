import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-user-picker',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="user-picker"><ng-content></ng-content></div>`,
    styles: [`.user-picker { display: inline-block; }`]
})
export class UserPickerComponent {
    @Input() value: any = null;
    @Output() valueChange = new EventEmitter<any>();
}
