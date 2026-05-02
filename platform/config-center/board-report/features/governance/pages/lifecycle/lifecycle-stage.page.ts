import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lifecycle-stage',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="page-container"><h2>Lifecycle Stage</h2><ng-content></ng-content></div>`,
    styles: [`.page-container { padding: var(--space-lg); }`]
})
export class LifecycleStagePage {}
