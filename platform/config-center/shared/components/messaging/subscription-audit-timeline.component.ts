import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-subscription-audit-timeline',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="audit-timeline"><ng-content></ng-content></div>`,
    styles: [`.audit-timeline { padding: var(--space-md); }`]
})
export class SubscriptionAuditTimelineComponent {
    @Input() entries: any[] = [];
}
