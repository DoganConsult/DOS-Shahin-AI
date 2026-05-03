import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-desktop-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-app-shell__sidebar" aria-label="Primary">
      <ng-content></ng-content>
    </nav>
  `,
})
export class DosDesktopSidebarComponent {}
