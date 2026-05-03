import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosMissionBar — module-level mission statement strip.
 * Consumes ModuleMission from @dos/module-templates types via plain @Input.
 * Pure presentational; no business logic.
 */
export interface DosMissionBarInput {
  headline: string;
  headlineAr?: string;
  context?: string;
  successMetric?: string;
  owner?: string;
  reviewCadenceDays?: number;
}

@Component({
  selector: 'dos-mission-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mission) {
      <section class="dos-mission" role="region" [attr.aria-label]="mission.headline">
        <header class="dos-mission__head">
          <span class="dos-mission__eyebrow">Mission</span>
          @if (mission.reviewCadenceDays) {
            <span class="dos-mission__cadence">Review every {{ mission.reviewCadenceDays }}d</span>
          }
        </header>
        <h2 class="dos-mission__headline">{{ mission.headline }}</h2>
        @if (mission.context) { <p class="dos-mission__context">{{ mission.context }}</p> }
        <dl class="dos-mission__meta">
          @if (mission.successMetric) {
            <div><dt>Success metric</dt><dd>{{ mission.successMetric }}</dd></div>
          }
          @if (mission.owner) {
            <div><dt>Owner</dt><dd>{{ mission.owner }}</dd></div>
          }
        </dl>
      </section>
    }
  `,
  styles: [`
    .dos-mission { padding: 1rem 1.25rem; border-radius: var(--dos-radius-md, 8px);
      background: var(--dos-color-surface-muted, #f4f4f4); border-left: 4px solid var(--dos-color-accent, #0f62fe); }
    .dos-mission__head { display: flex; justify-content: space-between; align-items: center; }
    .dos-mission__eyebrow { font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--dos-color-text-subtle, #525252); }
    .dos-mission__cadence { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); }
    .dos-mission__headline { margin: 0.25rem 0 0.5rem; font-size: 1.125rem; font-weight: 500; }
    .dos-mission__context { margin: 0 0 0.75rem; color: var(--dos-color-text, #161616); }
    .dos-mission__meta { display: flex; gap: 1.5rem; margin: 0; }
    .dos-mission__meta div { display: flex; flex-direction: column; }
    .dos-mission__meta dt { font-size: 0.625rem; text-transform: uppercase; color: var(--dos-color-text-subtle, #525252); }
    .dos-mission__meta dd { margin: 0; font-size: 0.875rem; }
  `],
})
export class DosMissionBarComponent {
  @Input() mission: DosMissionBarInput | null = null;
}
