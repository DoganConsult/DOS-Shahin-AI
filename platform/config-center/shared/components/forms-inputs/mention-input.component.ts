import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-mention-input',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="mention-input"><ng-content></ng-content></div>`,
    styles: [`.mention-input { display: inline-block; }`]
})
export class MentionInputComponent {
    @Input() value: any = null;
    @Output() valueChange = new EventEmitter<any>();
}
