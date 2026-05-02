import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-role-profiles',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="page-container"><h2>Role Profiles</h2><ng-content></ng-content></div>`,
    styles: [`.page-container { padding: var(--space-lg); }`]
})
export class RoleProfilesComponent {}
