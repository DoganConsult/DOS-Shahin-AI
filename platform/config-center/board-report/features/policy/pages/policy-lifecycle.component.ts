import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-lifecycle',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="page-container"><h2>Policy Lifecycle</h2><ng-content></ng-content></div>`,
    styles: [`.page-container { padding: var(--space-lg); }`]
})
export class PolicyLifecycleComponent {}
