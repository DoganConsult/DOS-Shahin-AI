import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-subscription-warning-banner',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="warning-banner" *ngIf="message">{{ message }}</div>`,
    styles: [`.warning-banner { padding: var(--space-sm) var(--space-md); background: var(--clr-warning-subtle, #fff8e1); color: var(--clr-warning, #f57f17); border-radius: 4px; }`]
})
export class SubscriptionWarningBannerComponent {
    @Input() message: string = '';
}
