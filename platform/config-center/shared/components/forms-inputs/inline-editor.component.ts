import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-inline-editor',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="inline-editor"><ng-content></ng-content></div>`,
    styles: [`.inline-editor { display: inline-block; }`]
})
export class InlineEditorComponent {
    @Input() value: any = null;
    @Output() valueChange = new EventEmitter<any>();
}
