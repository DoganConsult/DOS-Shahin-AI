import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-field-rbac-page',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="page-container"><h2>Field RBAC</h2><ng-content></ng-content></div>`,
    styles: [`.page-container { padding: var(--space-lg); }`]
})
export class FieldRbacPageComponent {}
