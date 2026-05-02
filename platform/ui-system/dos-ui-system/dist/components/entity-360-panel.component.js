var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosWhyChipComponent } from './why-chip.component';
/**
 * DosEntity360Panel — §26.4 universal Entity 360 Panel.
 *
 * Object-page primary container. Renders:
 *   - Object header (title, status badge, primary actions, why-chip)
 *   - Tab strip (consumer projects tab content via slots)
 *   - Main / aside split (aside hosts evidence/audit/AI summary)
 *
 * Spec slot map (§26.4):
 *   • Profile summary
 *   • Relationships
 *   • Permissions/ownership
 *   • Workflow state
 *   • Audit timeline
 *   • Evidence
 *   • AI summary
 *   • Recommended actions
 *
 * The component is shell-only — content is projected. Status badge tone
 * comes from the resolver (not derived from the status code in markup).
 *
 * Slots:
 *   [slot=actions]      — primary + secondary actions (resolver-driven)
 *   [slot=tabs]         — `<button role="tab">` strip
 *   [slot=aside]        — right rail: evidence / audit / AI Workbench
 *   default             — main panel body
 */
let DosEntity360PanelComponent = class DosEntity360PanelComponent {
    entityKind = '';
    title = '';
    subtitle;
    statusLabel;
    statusTone = 'neutral';
    showSidePanel = true;
    readonly = false;
    whyVisible;
    whyLabel = 'why?';
    ariaLabel;
    tabsAriaLabel = 'Object views';
    asideAriaLabel = 'Evidence and audit';
    actionClick = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "entityKind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEntity360PanelComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEntity360PanelComponent.prototype, "statusLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEntity360PanelComponent.prototype, "statusTone", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "showSidePanel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEntity360PanelComponent.prototype, "whyVisible", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "whyLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEntity360PanelComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "tabsAriaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "asideAriaLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosEntity360PanelComponent.prototype, "actionClick", void 0);
DosEntity360PanelComponent = __decorate([
    Component({
        selector: 'dos-entity-360-panel',
        standalone: true,
        imports: [CommonModule, DosWhyChipComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <article
      class="dos-e360"
      [attr.data-entity-kind]="entityKind"
      [attr.data-readonly]="readonly"
      role="region"
      [attr.aria-label]="ariaLabel || entityKind"
    >
      <header class="dos-e360__head">
        <div class="dos-e360__title">
          <h2 class="dos-e360__h dos-display-md">{{ title }}</h2>
          @if (statusLabel) {
            <span class="dos-e360__status" [attr.data-tone]="statusTone">
              <span class="dos-e360__status-dot" aria-hidden="true"></span>
              {{ statusLabel }}
            </span>
          }
          @if (whyVisible) {
            <dos-why-chip
              [reason]="whyVisible"
              [label]="whyLabel"
              [size]="'sm'"
            ></dos-why-chip>
          }
        </div>

        <div class="dos-e360__actions">
          <ng-content select="[slot=actions]"></ng-content>
        </div>
      </header>

      @if (subtitle) {
        <p class="dos-e360__subtitle" [attr.dir]="'auto'">{{ subtitle }}</p>
      }

      <nav
        class="dos-e360__tabs"
        role="tablist"
        [attr.aria-label]="tabsAriaLabel"
      >
        <ng-content select="[slot=tabs]"></ng-content>
      </nav>

      <div class="dos-e360__body">
        <main class="dos-e360__main" role="tabpanel">
          <ng-content></ng-content>
        </main>
        @if (showSidePanel) {
          <aside
            class="dos-e360__aside"
            [attr.aria-label]="asideAriaLabel"
          >
            <ng-content select="[slot=aside]"></ng-content>
          </aside>
        }
      </div>
    </article>
  `,
        styles: [`
    .dos-e360 {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      padding: var(--dos-space-5);
      box-shadow: var(--dos-shadow-xs);
    }

    .dos-e360__head {
      display: flex;
      gap: var(--dos-space-3);
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .dos-e360__title {
      display: flex;
      gap: var(--dos-space-2);
      align-items: center;
      flex-wrap: wrap;
      min-width: 0;
    }
    .dos-e360__h { margin: 0; }
    .dos-e360__subtitle {
      margin: 0;
      color: var(--dos-color-text-muted);
      font-size: var(--dos-font-size-md);
      max-width: 70ch;
    }
    .dos-e360__actions {
      display: flex;
      gap: var(--dos-space-2);
      align-items: center;
      flex-wrap: wrap;
    }

    /* Status pill. Tone is provided by the resolver. */
    .dos-e360__status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-caption-size)/1 inherit;
      color: var(--dos-color-success-text);
      background: var(--dos-color-success-soft);
    }
    .dos-e360__status[data-tone='success'] { color: var(--dos-color-success-text); background: var(--dos-color-success-soft); }
    .dos-e360__status[data-tone='info']    { color: var(--dos-color-info-text);    background: var(--dos-color-info-soft); }
    .dos-e360__status[data-tone='warning'] { color: var(--dos-color-warning-text); background: var(--dos-color-warning-soft); }
    .dos-e360__status[data-tone='danger']  { color: var(--dos-color-danger-text);  background: var(--dos-color-danger-soft); }
    .dos-e360__status[data-tone='neutral'] { color: var(--dos-color-text-muted);   background: var(--dos-color-surface-muted); }
    .dos-e360__status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Tabs — consumer renders the tab buttons inside, we just provide rhythm. */
    .dos-e360__tabs {
      display: flex;
      gap: var(--dos-space-2);
      border-bottom: 1px solid var(--dos-color-border-subtle);
      padding-bottom: 2px;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .dos-e360__tabs:empty { display: none; }

    /* Main / aside split. CSS Grid with logical track sizing — RTL-safe. */
    .dos-e360__body {
      display: grid;
      gap: var(--dos-space-4);
      grid-template-columns: minmax(0, 1fr);
    }
    .dos-e360__body:has(.dos-e360__aside) {
      grid-template-columns: minmax(0, 1fr) clamp(320px, 28%, 480px);
    }
    @media (max-width: 980px) {
      .dos-e360__body:has(.dos-e360__aside) { grid-template-columns: minmax(0, 1fr); }
    }
    .dos-e360__main  { min-width: 0; display: flex; flex-direction: column; gap: var(--dos-space-3); }
    .dos-e360__aside {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-4);
      background: var(--dos-color-surface-muted);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
    }

    /* §3.5 #4 — Auditor / read-only treatment. */
    .dos-e360[data-readonly='true'] .dos-e360__actions { opacity: .6; pointer-events: none; }
  `],
    })
], DosEntity360PanelComponent);
export { DosEntity360PanelComponent };
//# sourceMappingURL=entity-360-panel.component.js.map