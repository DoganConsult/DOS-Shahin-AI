/**
 * Phase WS-2 — workspace.context-panel wrapper.
 * Selector: dos-context-panel
 * Carbon primitive: accordion.
 * Mobile_mode: full-screen-sheet at ≤480px.
 * Tabs: record, help, audit, ai-insights.
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ContextPanelView, ContextPanelTab } from './workspace-shell.contracts';

@Component({
  selector: 'dos-context-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <aside class="dos-context-panel"
             [class.dos-context-panel--mobile]="mobileMode"
             [attr.dir]="dir"
             role="complementary"
             aria-label="Context panel"
             data-testid="dos-context-panel"
             data-cds-component="accordion">
        <nav class="dos-context-panel__tabs" role="tablist">
          @for (v of views; track v.tab) {
            <button type="button"
                    role="tab"
                    class="dos-context-panel__tab"
                    [class.dos-context-panel__tab--active]="v.tab === activeTab"
                    [attr.data-tab]="v.tab"
                    [attr.aria-selected]="v.tab === activeTab"
                    (click)="tabChange.emit(v.tab)">
              {{ v.title.fallback ?? v.title.i18nKey }}
            </button>
          }
        </nav>
        @for (v of views; track v.tab) {
          @if (v.tab === activeTab) {
            <section class="dos-context-panel__body" role="tabpanel">
              @if (v.loading) { <p>Loading…</p> }
              @else if (!v.payload) { <p class="dos-context-panel__empty">{{ v.emptyMessage?.fallback ?? 'No context yet.' }}</p> }
              @else { <ng-content></ng-content> }
            </section>
          }
        }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }
    .dos-context-panel { position: fixed; inset-block-start: 0; bottom: 0; inset-inline-end: 0; width: min(360px, 100vw); background: var(--cds-layer, #fff); border-inline-start: 1px solid var(--cds-border-subtle, #e0e0e0); z-index: 70; display: flex; flex-direction: column; }
    .dos-context-panel--mobile { width: 100vw; inset: 0; }
    .dos-context-panel__tabs { display: flex; border-block-end: 1px solid var(--cds-border-subtle, #e0e0e0); }
    .dos-context-panel__tab { flex: 1; padding: .5rem; background: transparent; border: 0; cursor: pointer; }
    .dos-context-panel__tab--active { border-block-end: 2px solid var(--cds-border-interactive, #0f62fe); font-weight: 600; }
    .dos-context-panel__body { padding: .75rem; overflow: auto; flex: 1; }
    .dos-context-panel__empty { color: var(--cds-text-secondary, #6f6f6f); }
  `],
})
export class DosContextPanelComponent {
  @Input() views: ContextPanelView[] = [];
  @Input() activeTab: ContextPanelTab = 'record';
  @Input() open = false;
  @Input() mobileMode = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Output() tabChange = new EventEmitter<ContextPanelTab>();
}
