import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-desktop-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-app-shell dos-app-shell--desktop">
      <aside class="dos-app-shell__sidebar"><ng-content select="[shellSidebar]"></ng-content></aside>
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
    </div>
  `,
})
export class DosDesktopShellComponent {}
