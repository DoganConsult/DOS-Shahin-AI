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
import { FormsModule } from '@angular/forms';
let DosDecisionPreviewPanelComponent = class DosDecisionPreviewPanelComponent {
    preview;
    // Pre-resolved labels (i18n done upstream).
    eyebrowLabel = 'decision preview';
    riskLabel = 'risk';
    blockedTitle = 'Action blocked';
    diffFieldLabel = 'Field';
    diffBeforeLabel = 'Before';
    diffAfterLabel = 'After';
    diffAriaLabel = 'Field-level diff';
    permissionImpactLabel = 'Permission impact';
    sodImpactLabel = 'SoD impact';
    workflowImpactLabel = 'Workflow impact';
    auditEventLabel = 'Audit event';
    affectedLabel = 'Affected';
    rollbackLabel = 'Rollback';
    rollbackNoneLabel = 'No rollback available';
    rollbackManualLabel = 'Manual rollback';
    rollbackAutoLabel = 'Automatic rollback supported';
    approversLabel = 'Approvers';
    reasonLabel = 'Reason';
    reasonPlaceholder = 'Why are you making this change?';
    cancelLabel = 'Cancel';
    requestChangeLabel = 'Request change';
    confirmLabel = 'Confirm';
    approveLabel = 'Approve';
    reason = '';
    rollbackOptionLabel(opt) {
        if (opt === 'manual')
            return this.rollbackManualLabel;
        if (opt === 'automatic')
            return this.rollbackAutoLabel;
        return this.rollbackNoneLabel;
    }
    confirm = new EventEmitter();
    requestChange = new EventEmitter();
    cancel = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "preview", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "eyebrowLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "riskLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "blockedTitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "diffFieldLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "diffBeforeLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "diffAfterLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "diffAriaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "permissionImpactLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "sodImpactLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "workflowImpactLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "auditEventLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "affectedLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "rollbackLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "rollbackNoneLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "rollbackManualLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "rollbackAutoLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "approversLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "reasonLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "reasonPlaceholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "cancelLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "requestChangeLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "confirmLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "approveLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "confirm", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "requestChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosDecisionPreviewPanelComponent.prototype, "cancel", void 0);
DosDecisionPreviewPanelComponent = __decorate([
    Component({
        selector: 'dos-decision-preview-panel',
        standalone: true,
        imports: [CommonModule, FormsModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <section
      class="dos-dp"
      [attr.data-risk]="preview?.riskLevel || 'low'"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="preview?.title"
    >
      <header class="dos-dp__head">
        <div class="dos-dp__title-block">
          <p class="dos-eyebrow">{{ eyebrowLabel }}</p>
          <h3 class="dos-dp__title">{{ preview?.title }}</h3>
        </div>
        <span class="dos-dp__risk" [attr.data-risk]="preview?.riskLevel || 'low'">
          {{ riskLabel }} · {{ preview?.riskLevel }}
        </span>
      </header>

      @if (preview?.riskLevel === 'blocked') {
        <div class="dos-dp__blocked" role="alert">
          <strong>{{ blockedTitle }}</strong>
          <p>{{ preview?.whyBlocked }}</p>
        </div>
      } @else {
        <!-- Diff table — preferred view when structured diff fields exist. -->
        @if (preview?.diff?.length) {
          <table class="dos-dp__diff" role="grid" [attr.aria-label]="diffAriaLabel">
            <thead>
              <tr>
                <th>{{ diffFieldLabel }}</th>
                <th>{{ diffBeforeLabel }}</th>
                <th>{{ diffAfterLabel }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of preview!.diff; track row.field) {
                <tr [class.dos-dp__diff-row--changed]="row.changed">
                  <td>{{ row.field }}</td>
                  <td class="dos-dp__before"><code>{{ row.before ?? '—' }}</code></td>
                  <td class="dos-dp__after"><code>{{ row.after ?? '—' }}</code></td>
                </tr>
              }
            </tbody>
          </table>
        } @else if (preview?.beforeRaw || preview?.afterRaw) {
          <!-- Fallback: raw JSON diff for free-form payloads. -->
          <div class="dos-dp__raw">
            <div class="dos-dp__col">
              <h4>{{ diffBeforeLabel }}</h4>
              <pre>{{ preview?.beforeRaw | json }}</pre>
            </div>
            <div class="dos-dp__col">
              <h4>{{ diffAfterLabel }}</h4>
              <pre>{{ preview?.afterRaw | json }}</pre>
            </div>
          </div>
        }

        <!-- Impact grid: permission / SoD / workflow / audit. -->
        <div class="dos-dp__impact">
          @if (preview?.permissionImpact) {
            <div class="dos-dp__impact-card" data-kind="permission">
              <h4>{{ permissionImpactLabel }}</h4>
              <p>{{ preview!.permissionImpact }}</p>
            </div>
          }
          @if (preview?.sodImpact) {
            <div class="dos-dp__impact-card" data-kind="sod">
              <h4>{{ sodImpactLabel }}</h4>
              <p>{{ preview!.sodImpact }}</p>
            </div>
          }
          @if (preview?.workflowImpact) {
            <div class="dos-dp__impact-card" data-kind="workflow">
              <h4>{{ workflowImpactLabel }}</h4>
              <p>{{ preview!.workflowImpact }}</p>
            </div>
          }
          @if (preview?.auditEventPreview) {
            <div class="dos-dp__impact-card" data-kind="audit">
              <h4>{{ auditEventLabel }}</h4>
              <p>{{ preview!.auditEventPreview }}</p>
            </div>
          }
        </div>

        @if (preview?.affected?.length) {
          <div class="dos-dp__affected">
            <h4>{{ affectedLabel }} ({{ preview!.affected!.length }})</h4>
            <ul class="dos-dp__affected-list" role="list">
              @for (entity of preview!.affected; track entity.id) {
                <li>
                  <span class="dos-dp__affected-kind">{{ entity.kind }}</span>
                  <span class="dos-dp__affected-name">{{ entity.name || entity.id }}</span>
                </li>
              }
            </ul>
          </div>
        }

        <div class="dos-dp__rollback" [attr.data-option]="preview?.rollbackOption">
          <strong>{{ rollbackLabel }}:</strong>
          <span>{{ rollbackOptionLabel(preview?.rollbackOption || 'none') }}</span>
          @if (preview?.rollbackNote) {
            <p>{{ preview!.rollbackNote }}</p>
          }
        </div>

        @if (preview?.approvalRequired && preview?.approvers?.length) {
          <div class="dos-dp__approvers">
            <strong>{{ approversLabel }}:</strong>
            <ul role="list">
              @for (a of preview!.approvers; track a) { <li>{{ a }}</li> }
            </ul>
          </div>
        }

        @if (preview?.reasonRequired) {
          <label class="dos-dp__reason-block">
            <span>{{ reasonLabel }} <em>*</em></span>
            <textarea
              class="dos-dp__reason"
              [(ngModel)]="reason"
              name="dosDpReason"
              [attr.placeholder]="reasonPlaceholder"
              rows="3"
            ></textarea>
          </label>
        }
      }

      <footer class="dos-dp__foot">
        <button type="button" class="dos-dp__btn dos-dp__btn--ghost" (click)="cancel.emit()">
          {{ cancelLabel }}
        </button>
        @if (preview?.riskLevel !== 'blocked') {
          <button
            type="button"
            class="dos-dp__btn dos-dp__btn--ghost"
            (click)="requestChange.emit(reason)"
          >{{ requestChangeLabel }}</button>
          <button
            type="button"
            class="dos-dp__btn dos-dp__btn--primary"
            [disabled]="preview?.reasonRequired && !reason.trim()"
            (click)="confirm.emit(reason)"
          >{{ preview?.approvalRequired ? approveLabel : confirmLabel }}</button>
        }
      </footer>
    </section>
  `,
        styles: [`
    .dos-dp {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-5);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      box-shadow: var(--dos-shadow-md);
      border-inline-start: 4px solid var(--dos-color-info);
    }
    .dos-dp[data-risk='medium']   { border-inline-start-color: var(--dos-color-warning); }
    .dos-dp[data-risk='high']     { border-inline-start-color: var(--dos-color-danger); }
    .dos-dp[data-risk='critical'] { border-inline-start-color: var(--dos-color-danger-strong); }
    .dos-dp[data-risk='blocked']  { border-inline-start-color: var(--dos-color-text-subtle); }

    .dos-dp__head {
      display: flex; gap: var(--dos-space-3);
      justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap;
    }
    .dos-dp__title-block { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .dos-dp__title {
      margin: 0;
      font-size: var(--dos-font-size-xl);
      font-weight: 500;
      color: var(--dos-color-text-strong);
    }
    .dos-dp__risk {
      padding: 4px 10px;
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-eyebrow-size)/1 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: var(--dos-color-info-soft);
      color: var(--dos-color-info-text);
    }
    [dir='rtl'] .dos-dp__risk { letter-spacing: 0; text-transform: none; }
    .dos-dp__risk[data-risk='medium']   { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-text); }
    .dos-dp__risk[data-risk='high']     { background: var(--dos-color-danger-soft);  color: var(--dos-color-danger-text); }
    .dos-dp__risk[data-risk='critical'] { background: var(--dos-color-danger);       color: var(--dos-color-text-inverse); }
    .dos-dp__risk[data-risk='blocked']  { background: var(--dos-color-surface-muted); color: var(--dos-color-text-muted); }

    /* Blocked state — no actions, just the why-blocked copy. */
    .dos-dp__blocked {
      padding: var(--dos-space-3) var(--dos-space-4);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
      color: var(--dos-color-text);
    }
    .dos-dp__blocked strong { display: block; margin-bottom: 4px; }
    .dos-dp__blocked p { margin: 0; color: var(--dos-color-text-muted); }

    /* Diff table. */
    .dos-dp__diff {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--dos-font-size-sm);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-md);
      overflow: hidden;
    }
    .dos-dp__diff th {
      text-align: start;
      padding: 8px 12px;
      font: 600 var(--dos-eyebrow-size)/1 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dos-color-text-muted);
      background: var(--dos-color-surface-muted);
    }
    [dir='rtl'] .dos-dp__diff th { letter-spacing: 0; text-transform: none; }
    .dos-dp__diff td {
      padding: 8px 12px;
      border-block-start: 1px solid var(--dos-color-border-subtle);
      vertical-align: top;
    }
    .dos-dp__diff-row--changed .dos-dp__after { background: var(--dos-color-success-soft); }
    .dos-dp__diff-row--changed .dos-dp__before { background: var(--dos-color-danger-soft); }
    .dos-dp__diff code {
      font: 500 var(--dos-caption-size)/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    /* Raw JSON fallback. */
    .dos-dp__raw {
      display: grid;
      gap: var(--dos-space-3);
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 720px) { .dos-dp__raw { grid-template-columns: 1fr; } }
    .dos-dp__col h4 {
      margin: 0 0 4px 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    [dir='rtl'] .dos-dp__col h4 { letter-spacing: 0; text-transform: none; }
    .dos-dp__col pre {
      margin: 0;
      padding: var(--dos-space-2);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-sm);
      max-height: 200px;
      overflow: auto;
      font: 500 var(--dos-caption-size)/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    /* Impact grid. */
    .dos-dp__impact {
      display: grid;
      gap: var(--dos-space-2);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .dos-dp__impact-card {
      padding: var(--dos-space-2) var(--dos-space-3);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
      border-inline-start: 3px solid var(--dos-color-border);
    }
    .dos-dp__impact-card[data-kind='sod']      { border-inline-start-color: var(--dos-color-warning); }
    .dos-dp__impact-card[data-kind='workflow'] { border-inline-start-color: var(--dos-color-info); }
    .dos-dp__impact-card[data-kind='audit']    { border-inline-start-color: var(--dos-color-text-subtle); }
    .dos-dp__impact-card h4 {
      margin: 0 0 2px 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    [dir='rtl'] .dos-dp__impact-card h4 { letter-spacing: 0; text-transform: none; }
    .dos-dp__impact-card p { margin: 0; color: var(--dos-color-text-strong); font-size: var(--dos-font-size-sm); }

    /* Affected list. */
    .dos-dp__affected h4 {
      margin: 0 0 var(--dos-space-2) 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    [dir='rtl'] .dos-dp__affected h4 { letter-spacing: 0; text-transform: none; }
    .dos-dp__affected-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-wrap: wrap; gap: var(--dos-space-2);
      max-height: 12rem; overflow-y: auto;
    }
    .dos-dp__affected-list li {
      display: inline-flex; gap: 6px; align-items: center;
      padding: 4px 10px;
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-pill);
      font-size: var(--dos-caption-size);
    }
    .dos-dp__affected-kind {
      font-weight: 600;
      color: var(--dos-color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.625rem;
    }
    [dir='rtl'] .dos-dp__affected-kind { letter-spacing: 0; text-transform: none; }
    .dos-dp__affected-name { color: var(--dos-color-text-strong); }

    /* Rollback row. */
    .dos-dp__rollback {
      display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
      padding: var(--dos-space-2) var(--dos-space-3);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
      font-size: var(--dos-font-size-sm);
    }
    .dos-dp__rollback p { margin: 0; flex: 1 1 100%; color: var(--dos-color-text-muted); font-size: var(--dos-caption-size); }

    /* Approvers. */
    .dos-dp__approvers ul {
      list-style: none; padding: 0; margin: 4px 0 0 0;
      display: flex; flex-wrap: wrap; gap: 4px;
    }
    .dos-dp__approvers li {
      padding: 2px 8px;
      background: var(--dos-color-info-soft);
      color: var(--dos-color-info-text);
      border-radius: var(--dos-radius-pill);
      font-size: var(--dos-caption-size);
    }

    /* Reason. */
    .dos-dp__reason-block { display: flex; flex-direction: column; gap: 4px; }
    .dos-dp__reason-block span { font-size: var(--dos-font-size-sm); }
    .dos-dp__reason-block em { color: var(--dos-color-danger); }
    .dos-dp__reason {
      width: 100%;
      min-height: 80px;
      padding: var(--dos-space-2);
      border: 1px solid var(--dos-color-border);
      border-radius: var(--dos-radius-md);
      font: inherit;
      color: var(--dos-color-text-strong);
      background: var(--dos-color-surface);
      resize: vertical;
    }
    .dos-dp__reason:focus { outline: none; box-shadow: var(--dos-shadow-focus); border-color: var(--dos-color-focus); }

    /* Footer actions. */
    .dos-dp__foot {
      display: flex; gap: var(--dos-space-2); justify-content: flex-end;
      padding-top: var(--dos-space-2);
      border-top: 1px solid var(--dos-color-border-subtle);
    }
    .dos-dp__btn {
      appearance: none;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-font-size-sm)/1 inherit;
      transition: background var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-dp__btn--primary {
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
      border: 1px solid var(--dos-color-primary);
    }
    .dos-dp__btn--primary:hover:not(:disabled) { background: var(--dos-color-primary-hover); }
    .dos-dp__btn--primary:disabled { opacity: .5; cursor: not-allowed; }
    .dos-dp__btn--ghost {
      background: transparent;
      color: var(--dos-color-text-muted);
      border: 1px solid var(--dos-color-border-strong);
    }
    .dos-dp__btn--ghost:hover { background: var(--dos-color-surface-muted); }
  `],
    })
], DosDecisionPreviewPanelComponent);
export { DosDecisionPreviewPanelComponent };
//# sourceMappingURL=decision-preview-panel.component.js.map