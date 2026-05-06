import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { sanitizeAccessibleText } from './shell-accessible-text';

@Component({
  selector: 'dos-desktop-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sidebarAriaChrome()) {
    <nav class="dos-app-shell__sidebar" [attr.aria-label]="sidebarAriaAttr()">
      <ng-content></ng-content>
    </nav>
    }
  `,
})
export class DosDesktopSidebarComponent {
  @Input() ariaLabel = '';

  sidebarAriaChrome(): boolean {
    return sanitizeAccessibleText(this.ariaLabel).length > 0;
  }

  sidebarAriaAttr(): string | null {
    const s = sanitizeAccessibleText(this.ariaLabel);
    return s.length ? s : null;
  }
}
