/**
 * Phase WS-2 + Carbon-Wiring — workspace.context-panel wrapper.
 * Selector: dos-context-panel
 * Carbon primitive: accordion (AccordionModule → cds-accordion) + tabs (cds-tabs CSS)
 * DB: dos.dynamic_ui_component_registry component_key=workspace.context-panel carbon_key=accordion
 *
 * Token stack:
 *   --cds-accordion-*  (Carbon accordion tokens)
 *   --shell-z-sticky   (z-index for fixed panel)
 *   slide-in-left/right (tab entry animation — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'carbon-components-angular';
import { DosCarbonTabsComponent, type DosCarbonTabItem } from '../carbon/dos-carbon-tabs.component';
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';
import type { ContextPanelView, ContextPanelTab } from './workspace-shell.contracts';

const TAB_LABELS: Record<ContextPanelTab, string> = {
  'record':      'Record',
  'help':        'Help',
  'audit':       'Audit',
  'ai-insights': 'AI Insights',
};

@Component({
  selector: 'dos-context-panel',
  standalone: true,
  imports: [CommonModule, AccordionModule, DosCarbonTabsComponent, DosCarbonSkeletonComponent],
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

        <!-- Tab navigation using cds-tabs CSS pattern -->
        <dos-carbon-tabs
          [items]="tabItems"
          [selectedId]="activeTab"
          (selectedIdChange)="onTabChange($event)"
          class="dos-context-panel__tabs">
        </dos-carbon-tabs>

        <!-- Active tab body -->
        @for (v of views; track v.tab) {
          @if (v.tab === activeTab) {
            <section class="dos-context-panel__body"
                     role="tabpanel"
                     [class.dos-context-panel__body--rtl]="dir === 'rtl'"
                     [attr.aria-label]="TAB_LABELS[v.tab]">

              @if (v.loading) {
                <!-- cds-skeleton-text while loading -->
                <div class="dos-context-panel__skeleton">
                  <dos-carbon-skeleton shape="text" [paragraph]="true" [lineCount]="4"></dos-carbon-skeleton>
                  <dos-carbon-skeleton shape="placeholder"></dos-carbon-skeleton>
                </div>
              } @else if (!v.payload) {
                <div class="dos-context-panel__empty">
                  <p>{{ v.emptyMessage?.fallback ?? v.emptyMessage?.i18nKey ?? 'No context available.' }}</p>
                </div>
              } @else {
                <!-- Real payload: use cds-accordion for collapsible sub-sections -->
                <cds-accordion size="md" align="end" class="dos-context-panel__accordion">
                  <!-- AI-Insights tab: special agentic header -->
                  @if (v.tab === 'ai-insights') {
                    <cds-accordion-item title="Agent Insights" [expanded]="true">
                      <ng-content select="[aiInsightsContent]"></ng-content>
                      <p class="dos-context-panel__ai-placeholder">
                        AI insights are loading from the agent context…
                      </p>
                    </cds-accordion-item>
                  }
                  <!-- Audit tab: immutable audit trail emphasis -->
                  @if (v.tab === 'audit') {
                    <cds-accordion-item title="Audit Trail" [expanded]="true">
                      <ng-content select="[auditContent]"></ng-content>
                    </cds-accordion-item>
                  }
                  <!-- Record / Help: generic content projection -->
                  @if (v.tab !== 'ai-insights' && v.tab !== 'audit') {
                    <cds-accordion-item [title]="TAB_LABELS[v.tab]" [expanded]="true">
                      <ng-content></ng-content>
                    </cds-accordion-item>
                  }
                </cds-accordion>
              }
            </section>
          }
        }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Panel frame ────────────────────────────────── */
    .dos-context-panel {
      position: fixed;
      inset-block: 3rem 0; /* below 48px Carbon header */
      inset-inline-end: 0;
      inline-size: min(360px, 100vw);
      background: var(--cds-layer-01);
      border-inline-start: 1px solid var(--cds-border-subtle-01);
      z-index: var(--dos-z-panel);
      display: flex;
      flex-direction: column;
      box-shadow: var(--cds-shadow);
      animation: slide-in-right-panel 0.2s ease-out both;
    }

    [dir='rtl'] .dos-context-panel,
    .dos-context-panel[dir='rtl'] {
      inset-inline-end: auto;
      inset-inline-start: 0;
      border-inline-start: 0;
      border-inline-end: 1px solid var(--cds-border-subtle-01);
      box-shadow: var(--cds-shadow);
      animation-name: slide-in-left-panel;
    }

    .dos-context-panel--mobile {
      inline-size: 100vw;
      inset-block-start: 0;
      border-inline: none;
      border-block-start: 1px solid var(--cds-border-subtle-01);
    }

    /* ── Tabs ────────────────────────────────────────── */
    .dos-context-panel__tabs {
      flex: 0 0 auto;
      border-block-end: 1px solid var(--cds-border-subtle-01);
    }

    /* ── Body ────────────────────────────────────────── */
    .dos-context-panel__body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      animation: slide-in-left 0.15s ease-out both;
    }

    .dos-context-panel__body--rtl {
      animation-name: slide-in-right;
    }

    /* ── Accordion override: flush to panel edges ──── */
    .dos-context-panel__accordion {
      padding: 0;
    }

    :host ::ng-deep .dos-context-panel__accordion .cds--accordion__content {
      padding-inline: var(--cds-spacing-05);
    }

    /* ── Skeleton ─────────────────────────────────────── */
    .dos-context-panel__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-05);
      padding: var(--cds-spacing-05);
    }

    /* ── Empty state ──────────────────────────────────── */
    .dos-context-panel__empty {
      padding: var(--cds-spacing-07) var(--cds-spacing-05);
      text-align: center;
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-short-01-font-size);
    }

    /* ── AI-insights placeholder ─────────────────────── */
    .dos-context-panel__ai-placeholder {
      font-size: var(--cds-caption-01-font-size);
      color: var(--cds-text-secondary);
      font-style: italic;
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes slide-in-right-panel {
      0%   { opacity: 0; transform: translateX(24px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-left-panel {
      0%   { opacity: 0; transform: translateX(-24px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-left {
      0%   { opacity: 0; transform: translateX(-8px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-right {
      0%   { opacity: 0; transform: translateX(8px); }
      100% { opacity: 1; transform: translateX(0); }
    }
  `],
})
export class DosContextPanelComponent {
  /** Expose TAB_LABELS to template */
  protected readonly TAB_LABELS = TAB_LABELS;

  @Input() views: ContextPanelView[] = [];
  @Input() activeTab: ContextPanelTab = 'record';
  @Input() open = false;
  @Input() mobileMode = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Output() tabChange = new EventEmitter<ContextPanelTab>();

  get tabItems(): DosCarbonTabItem[] {
    return this.views.map(v => ({
      id:    v.tab,
      label: TAB_LABELS[v.tab],
    }));
  }

  onTabChange(id: string): void {
    this.tabChange.emit(id as ContextPanelTab);
  }
}
