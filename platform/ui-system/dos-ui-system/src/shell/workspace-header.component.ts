import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Phase WS-2 — workspace.header wrapper.
 * Selector: dos-workspace-header
 * Carbon primitive: Header (composes ui-shell carbon_key).
 */
@Component({
  selector: 'dos-workspace-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dos-workspace-header" role="banner" data-testid="dos-workspace-header">
      <div class="dos-workspace-header__start">
        <ng-content select="[headerStart]"></ng-content>
        @if (title) { <strong class="dos-workspace-header__title">{{ title }}</strong> }
      </div>
      <div class="dos-workspace-header__end">
        <ng-content select="[headerEnd]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
    .dos-workspace-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--cds-spacing-05, 1rem);
      min-height: 48px; padding: 0 var(--cds-spacing-05, 1rem);
      background: var(--cds-background-inverse, #161616);
      color: var(--cds-text-on-color, #fff);
      border-block-end: 1px solid var(--cds-border-subtle-01, rgba(255,255,255,0.1));
    }
    .dos-workspace-header__start,
    .dos-workspace-header__end {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-03, .5rem);
    }
    .dos-workspace-header__title { font-weight: 600; font-size: .875rem; }
  `],
})
export class DosWorkspaceHeaderComponent {
  @Input() title = '';
}
