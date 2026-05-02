import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-workspace-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dos-workspace-header" role="banner">
      <div class="dos-stack-h">
        <ng-content select="[headerStart]"></ng-content>
        <strong>{{ title }}</strong>
      </div>
      <div class="dos-stack-h">
        <ng-content select="[headerEnd]"></ng-content>
      </div>
    </header>
  `,
})
export class DosWorkspaceHeaderComponent {
  @Input() title = '';
}
