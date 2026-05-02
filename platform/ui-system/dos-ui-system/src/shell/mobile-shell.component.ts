import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-mobile-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-app-shell dos-app-shell--mobile">
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
      <ng-content select="[shellBottomNav]"></ng-content>
    </div>
  `,
})
export class DosMobileShellComponent {}
