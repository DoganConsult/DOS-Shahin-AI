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
import { DosTrustLayerComponent } from './trust-layer.component';
import { DosWhyChipComponent } from './why-chip.component';
let DosAgentWorkbenchPanelComponent = class DosAgentWorkbenchPanelComponent {
    title = 'AI Workbench';
    subtitle;
    agentTone;
    mode = 'side-panel';
    commands = [];
    approvalLabel = 'approval';
    ariaLabel = 'AI Workbench';
    // §19.1 Trust Layer pass-throughs (for panel-level AI output).
    trustSource;
    trustConfidence;
    trustReasoning;
    trustDataUsed = [];
    trustLastUpdated;
    trustPermissionScope;
    trustRiskLevel = 'low';
    trustHumanApprovalRequired = false;
    trustLabels = { source: 'source', confidence: 'confidence', risk: 'risk', scope: 'scope', updated: 'updated', approval: 'approval required' };
    commandRun = new EventEmitter();
    /** Tooltip text for the level chip — describes what L0-L6 means. */
    levelTooltip(level) {
        const names = [
            'L0 — Read UI only',
            'L1 — Read backend data',
            'L2 — Analyze',
            'L3 — Draft',
            'L4 — Propose write (approval required)',
            'L5 — Execute approved write',
            'L6 — Scheduled automation',
        ];
        return names[level] || `L${level}`;
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "agentTone", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "mode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosAgentWorkbenchPanelComponent.prototype, "commands", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "approvalLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "trustSource", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosAgentWorkbenchPanelComponent.prototype, "trustConfidence", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "trustReasoning", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosAgentWorkbenchPanelComponent.prototype, "trustDataUsed", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "trustLastUpdated", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "trustPermissionScope", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAgentWorkbenchPanelComponent.prototype, "trustRiskLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "trustHumanApprovalRequired", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "trustLabels", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAgentWorkbenchPanelComponent.prototype, "commandRun", void 0);
DosAgentWorkbenchPanelComponent = __decorate([
    Component({
        selector: 'dos-agent-workbench-panel',
        standalone: true,
        imports: [CommonModule, DosTrustLayerComponent, DosWhyChipComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <aside
      class="dos-aw"
      [attr.data-mode]="mode"
      [attr.data-tone]="agentTone"
      role="complementary"
      [attr.aria-label]="ariaLabel"
    >
      <header class="dos-aw__head">
        <div class="dos-aw__title-block">
          <h3 class="dos-aw__title">{{ title }}</h3>
          @if (subtitle) {
            <p class="dos-aw__subtitle">{{ subtitle }}</p>
          }
        </div>
        @if (agentTone) {
          <span class="dos-aw__tone-chip" [attr.data-tone]="agentTone">{{ agentTone }}</span>
        }
      </header>

      <ul class="dos-aw__commands" role="menu">
        @for (cmd of commands; track cmd.id) {
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="dos-aw__cmd"
              [attr.data-level]="cmd.level"
              [attr.data-risk]="cmd.riskLevel || 'low'"
              [disabled]="cmd.disabled"
              [title]="cmd.description || cmd.label"
              (click)="commandRun.emit(cmd.id)"
            >
              <span class="dos-aw__cmd-label">{{ cmd.label }}</span>
              <span class="dos-aw__cmd-meta">
                <span
                  class="dos-aw__level"
                  [attr.data-level]="cmd.level"
                  [title]="levelTooltip(cmd.level)"
                >L{{ cmd.level }}</span>
                @if (cmd.requiresApproval) {
                  <span class="dos-aw__approval">{{ approvalLabel }}</span>
                }
              </span>
            </button>
            @if (cmd.disabled && cmd.whyHidden) {
              <dos-why-chip
                [reason]="cmd.whyHidden"
                [size]="'sm'"
              ></dos-why-chip>
            }
          </li>
        }
      </ul>

      <div class="dos-aw__output">
        <ng-content select="[slot=output]"></ng-content>
      </div>

      <div class="dos-aw__history">
        <ng-content select="[slot=history]"></ng-content>
      </div>

      <!-- §19.1 Trust Layer (rendered when the panel itself was AI-driven). -->
      @if (trustSource || trustConfidence != null) {
        <dos-trust-layer
          [source]="trustSource"
          [confidence]="trustConfidence"
          [reasoningSummary]="trustReasoning"
          [dataUsed]="trustDataUsed"
          [lastUpdated]="trustLastUpdated"
          [permissionScope]="trustPermissionScope"
          [riskLevel]="trustRiskLevel"
          [humanApprovalRequired]="trustHumanApprovalRequired"
          [sourceLabel]="trustLabels.source"
          [confidenceLabel]="trustLabels.confidence"
          [riskLabel]="trustLabels.risk"
          [scopeLabel]="trustLabels.scope"
          [updatedLabel]="trustLabels.updated"
          [approvalLabel]="trustLabels.approval"
        ></dos-trust-layer>
      }
    </aside>
  `,
        styles: [`
    .dos-aw {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-4);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      box-shadow: var(--dos-shadow-xs);
    }
    /* Side panel mode docks the panel to the inline-end of the page. */
    .dos-aw[data-mode='side-panel'] {
      position: sticky;
      top: var(--dos-space-3);
      max-height: calc(100dvh - var(--dos-space-6));
      overflow-y: auto;
    }

    .dos-aw__head {
      display: flex;
      gap: var(--dos-space-3);
      justify-content: space-between;
      align-items: flex-start;
    }
    .dos-aw__title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .dos-aw__title {
      margin: 0;
      font-size: var(--dos-font-size-md);
      font-weight: 500;
      color: var(--dos-color-text-strong);
    }
    .dos-aw__subtitle {
      margin: 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
      line-height: var(--dos-caption-line);
    }
    .dos-aw__tone-chip {
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-eyebrow-size)/1 inherit;
      letter-spacing: 0.04em;
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text-muted);
    }
    [dir='rtl'] .dos-aw__tone-chip { letter-spacing: 0; }
    .dos-aw__tone-chip[data-tone='governance'] { background: var(--dos-color-info-soft);    color: var(--dos-color-info-text); }
    .dos-aw__tone-chip[data-tone='risk']       { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-text); }
    .dos-aw__tone-chip[data-tone='assurance']  { background: var(--dos-color-success-soft); color: var(--dos-color-success-text); }
    .dos-aw__tone-chip[data-tone='security']   { background: var(--dos-color-danger-soft);  color: var(--dos-color-danger-text); }

    /* Commands list. */
    .dos-aw__commands {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .dos-aw__cmd {
      appearance: none;
      cursor: pointer;
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--dos-space-2);
      padding: 8px 12px;
      background: var(--dos-color-surface-muted);
      border: 1px solid transparent;
      border-radius: var(--dos-radius-md);
      font: 500 var(--dos-font-size-sm)/1.2 inherit;
      color: var(--dos-color-text-strong);
      text-align: start;
      transition:
        background var(--dos-duration-fast) var(--dos-ease-out),
        border-color var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-aw__cmd:hover:not(:disabled) {
      background: var(--dos-color-surface);
      border-color: var(--dos-color-border);
    }
    .dos-aw__cmd:disabled { opacity: .55; cursor: not-allowed; }
    .dos-aw__cmd:focus-visible {
      outline: none;
      box-shadow: var(--dos-shadow-focus);
    }

    .dos-aw__cmd-label  { min-width: 0; }
    .dos-aw__cmd-meta   { display: inline-flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .dos-aw__level {
      font: 700 0.625rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 2px 6px;
      border-radius: var(--dos-radius-sm);
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text-muted);
    }
    /* §20.8 — write-capable levels (L4/L5/L6) get a stronger tone. */
    .dos-aw__level[data-level='4'],
    .dos-aw__level[data-level='5'],
    .dos-aw__level[data-level='6'] {
      background: var(--dos-color-warning-soft);
      color: var(--dos-color-warning-text);
    }
    .dos-aw__cmd[data-risk='high']     .dos-aw__level,
    .dos-aw__cmd[data-risk='critical'] .dos-aw__level {
      background: var(--dos-color-danger-soft);
      color: var(--dos-color-danger-text);
    }
    .dos-aw__approval {
      font: 600 0.625rem/1 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dos-color-warning-text);
    }
    [dir='rtl'] .dos-aw__approval { letter-spacing: 0; text-transform: none; }

    .dos-aw__output:empty,
    .dos-aw__history:empty { display: none; }
  `],
    })
], DosAgentWorkbenchPanelComponent);
export { DosAgentWorkbenchPanelComponent };
//# sourceMappingURL=agent-workbench-panel.component.js.map