import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workflow-designer-redirect',
  standalone: true,
  template: `<p style="padding: 40px; text-align: center; color: var(--text-color-secondary)">Redirecting to workflow designer...</p>`,
})
export class WorkflowDesignerRedirectComponent {
  private router = inject(Router);
  constructor() { this.router.navigate(['/workflow-hub']); }
}
