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
let DosAuditTimelineComponent = class DosAuditTimelineComponent {
    title;
    entries = [];
    ariaLabel = 'Audit timeline';
    // Pre-resolved labels.
    eyebrowLabel = 'audit';
    emptyLabel = 'No audit events yet.';
    reasonLabel = 'Reason';
    diffFieldLabel = 'Field';
    diffBeforeLabel = 'Before';
    diffAfterLabel = 'After';
    diffAriaLabel = 'Field-level diff';
    correlationLabel = 'Correlation ID';
    ipLabel = 'IP';
    deviceLabel = 'Device';
    evidenceLabel = 'Open evidence';
    aiExplanationLabel = 'AI explanation';
    replayLabel = 'Replay state →';
    /** Format an ISO timestamp into a short, locale-friendly string. */
    timeFormatter = (iso) => {
        const t = Date.parse(iso);
        if (!t)
            return iso;
        return new Date(t).toLocaleString();
    };
    replay = new EventEmitter();
    expanded = new Set();
    isExpanded(id) {
        return this.expanded.has(id);
    }
    toggle(id) {
        if (this.expanded.has(id))
            this.expanded.delete(id);
        else
            this.expanded.add(id);
    }
    formatTime(iso) {
        return this.timeFormatter(iso);
    }
    formatVal(v) {
        if (v == null)
            return '—';
        if (typeof v === 'object')
            return JSON.stringify(v);
        return String(v);
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosAuditTimelineComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosAuditTimelineComponent.prototype, "entries", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "eyebrowLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "emptyLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "reasonLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "diffFieldLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "diffBeforeLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "diffAfterLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "diffAriaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "correlationLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "ipLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "deviceLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "evidenceLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "aiExplanationLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "replayLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], DosAuditTimelineComponent.prototype, "timeFormatter", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAuditTimelineComponent.prototype, "replay", void 0);
DosAuditTimelineComponent = __decorate([
    Component({
        selector: 'dos-audit-timeline',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <section
      class="dos-at"
      role="region"
      [attr.aria-label]="ariaLabel"
    >
      @if (title) {
        <header class="dos-at__head">
          <p class="dos-eyebrow">{{ eyebrowLabel }}</p>
          <h3 class="dos-at__title">{{ title }}</h3>
          @if (entries && entries.length) {
            <span class="dos-at__count">{{ entries.length }}</span>
          }
        </header>
      }

      @if (!entries || entries.length === 0) {
        <p class="dos-at__empty">{{ emptyLabel }}</p>
      } @else {
        <ol class="dos-at__list" role="list">
          @for (entry of entries; track entry.id) {
            <li
              class="dos-at__entry"
              [attr.data-risk]="entry.riskLevel || 'low'"
              [class.dos-at__entry--expanded]="isExpanded(entry.id)"
            >
              <button
                type="button"
                class="dos-at__row"
                (click)="toggle(entry.id)"
                [attr.aria-expanded]="isExpanded(entry.id)"
                [attr.aria-controls]="'at-detail-' + entry.id"
              >
                <span class="dos-at__rail" aria-hidden="true"></span>
                <time class="dos-at__time dos-numeric" [attr.datetime]="entry.timestamp">
                  {{ formatTime(entry.timestamp) }}
                </time>
                <span class="dos-at__actor">
                  <strong>{{ entry.actor }}</strong>
                  @if (entry.actorRole) {
                    <span class="dos-at__role">· {{ entry.actorRole }}</span>
                  }
                </span>
                <span class="dos-at__action">{{ entry.action }}</span>
                @if (entry.target) {
                  <span class="dos-at__target">
                    @if (entry.targetKind) {
                      <span class="dos-at__target-kind">{{ entry.targetKind }}</span>
                    }
                    {{ entry.target }}
                  </span>
                }
                <span class="dos-at__expand" aria-hidden="true">{{ isExpanded(entry.id) ? '−' : '+' }}</span>
              </button>

              @if (isExpanded(entry.id)) {
                <div [id]="'at-detail-' + entry.id" class="dos-at__detail" role="region">
                  @if (entry.reason) {
                    <p class="dos-at__reason">
                      <strong>{{ reasonLabel }}:</strong>
                      <em>"{{ entry.reason }}"</em>
                    </p>
                  }

                  @if (entry.diff?.length) {
                    <table class="dos-at__diff" [attr.aria-label]="diffAriaLabel">
                      <thead>
                        <tr>
                          <th>{{ diffFieldLabel }}</th>
                          <th>{{ diffBeforeLabel }}</th>
                          <th>{{ diffAfterLabel }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of entry.diff; track row.field) {
                          <tr>
                            <td>{{ row.field }}</td>
                            <td><code>{{ formatVal(row.before) }}</code></td>
                            <td><code>{{ formatVal(row.after) }}</code></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }

                  @if (entry.aiExplanation) {
                    <div class="dos-at__ai">
                      <strong>{{ aiExplanationLabel }}:</strong>
                      <p>{{ entry.aiExplanation }}</p>
                    </div>
                  }

                  <ul class="dos-at__meta" role="list">
                    @if (entry.correlationId) {
                      <li><strong>{{ correlationLabel }}:</strong> <code>{{ entry.correlationId }}</code></li>
                    }
                    @if (entry.ipAddress) {
                      <li><strong>{{ ipLabel }}:</strong> <code>{{ entry.ipAddress }}</code></li>
                    }
                    @if (entry.device) {
                      <li><strong>{{ deviceLabel }}:</strong> {{ entry.device }}</li>
                    }
                    @if (entry.evidenceLink) {
                      <li>
                        <a class="dos-at__evidence-link" [attr.href]="entry.evidenceLink">
                          {{ evidenceLabel }} →
                        </a>
                      </li>
                    }
                  </ul>

                  <button
                    type="button"
                    class="dos-at__replay-btn"
                    (click)="replay.emit(entry.id); $event.stopPropagation()"
                  >{{ replayLabel }}</button>
                </div>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
        styles: [`
    .dos-at {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-4);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      box-shadow: var(--dos-shadow-xs);
    }
    .dos-at__head {
      display: flex; gap: var(--dos-space-2); align-items: baseline; flex-wrap: wrap;
    }
    .dos-at__title { margin: 0; font-size: var(--dos-font-size-md); font-weight: 500; color: var(--dos-color-text-strong); }
    .dos-at__count {
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text-muted);
      font: 600 var(--dos-caption-size)/1 inherit;
    }
    .dos-at__empty {
      margin: 0;
      padding: var(--dos-space-4);
      text-align: center;
      color: var(--dos-color-text-muted);
      font-size: var(--dos-caption-size);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
    }

    .dos-at__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }

    .dos-at__entry { position: relative; }
    .dos-at__row {
      appearance: none;
      cursor: pointer;
      width: 100%;
      display: grid;
      grid-template-columns: auto auto 1fr auto auto;
      gap: var(--dos-space-2);
      align-items: center;
      padding: 8px 12px 8px 16px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--dos-radius-md);
      font: 500 var(--dos-font-size-sm)/1.4 inherit;
      color: var(--dos-color-text);
      text-align: start;
      transition: background var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-at__row:hover { background: var(--dos-color-surface-muted); }
    .dos-at__row:focus-visible { outline: none; box-shadow: var(--dos-shadow-focus); border-color: var(--dos-color-focus); }

    .dos-at__rail {
      position: absolute;
      inset-inline-start: 0;
      inset-block: 0;
      inline-size: 3px;
      background: var(--dos-color-border);
      border-radius: 2px;
    }
    .dos-at__entry[data-risk='medium']   .dos-at__rail { background: var(--dos-color-warning); }
    .dos-at__entry[data-risk='high']     .dos-at__rail { background: var(--dos-color-danger); }
    .dos-at__entry[data-risk='critical'] .dos-at__rail { background: var(--dos-color-danger-strong); }

    .dos-at__time {
      color: var(--dos-color-text-muted);
      font-size: var(--dos-caption-size);
      white-space: nowrap;
    }
    .dos-at__actor strong { color: var(--dos-color-text-strong); }
    .dos-at__role { color: var(--dos-color-text-muted); margin-inline-start: 4px; }
    .dos-at__action {
      color: var(--dos-color-text-link);
      font-weight: 600;
    }
    .dos-at__target {
      color: var(--dos-color-text-muted);
      min-width: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .dos-at__target-kind {
      display: inline-block;
      margin-inline-end: 4px;
      padding: 0 6px;
      border-radius: var(--dos-radius-sm);
      background: var(--dos-color-surface-muted);
      font: 600 0.625rem/1.4 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dos-color-text-subtle);
    }
    [dir='rtl'] .dos-at__target-kind { letter-spacing: 0; text-transform: none; }
    .dos-at__expand {
      width: 1.5rem; height: 1.5rem;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text-muted);
      font: 700 var(--dos-font-size-sm)/1 inherit;
    }

    /* Expanded detail. */
    .dos-at__detail {
      padding: var(--dos-space-3) var(--dos-space-4);
      margin-block-start: 4px;
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-2);
      animation: dos-at-expand var(--dos-duration-normal) var(--dos-ease-emphasized);
    }
    @keyframes dos-at-expand {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .dos-at__detail { animation: none; }
    }

    .dos-at__reason em { font-style: italic; color: var(--dos-color-text-muted); }
    .dos-at__diff {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--dos-caption-size);
    }
    .dos-at__diff th {
      text-align: start;
      padding: 4px 8px;
      font: 600 var(--dos-eyebrow-size)/1 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dos-color-text-muted);
      border-bottom: 1px solid var(--dos-color-border-subtle);
    }
    [dir='rtl'] .dos-at__diff th { letter-spacing: 0; text-transform: none; }
    .dos-at__diff td {
      padding: 4px 8px;
      border-bottom: 1px solid var(--dos-color-border-subtle);
    }
    .dos-at__diff code {
      font: 500 0.6875rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .dos-at__ai {
      padding: var(--dos-space-2) var(--dos-space-3);
      background: var(--dos-color-info-soft);
      border-radius: var(--dos-radius-md);
      color: var(--dos-color-info-text);
    }
    .dos-at__ai p { margin: 4px 0 0 0; font-size: var(--dos-caption-size); }
    .dos-at__meta {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--dos-space-2);
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
    }
    .dos-at__meta code {
      font: 500 var(--dos-caption-size)/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 1px 4px;
      background: var(--dos-color-surface);
      border-radius: var(--dos-radius-sm);
    }
    .dos-at__evidence-link { color: var(--dos-color-text-link); }
    .dos-at__replay-btn {
      align-self: flex-start;
      appearance: none;
      cursor: pointer;
      padding: 4px 12px;
      border-radius: var(--dos-radius-pill);
      border: 1px solid var(--dos-color-primary);
      background: transparent;
      color: var(--dos-color-primary);
      font: 600 var(--dos-caption-size)/1 inherit;
    }
    .dos-at__replay-btn:hover { background: var(--dos-color-primary-soft); }
  `],
    })
], DosAuditTimelineComponent);
export { DosAuditTimelineComponent };
//# sourceMappingURL=audit-timeline.component.js.map