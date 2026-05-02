import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * GenericModuleLifecycleComponent — the platform-shared "module-not-yet-fully-
 * enrolled" placeholder. Used by the compliance dynamic-ui registry as the
 * fallback for `GenericModuleLifecycle` componentKey before a per-route
 * implementation lands.
 *
 * Renders a concise, localized "this surface is provisioning / not yet
 * enrolled" message. Real lifecycle handling (provisioning, enrolment status,
 * tenant-level activation) is platform-side; this component only renders the
 * resolver-supplied state (§3.4 hard law).
 *
 * Inputs:
 *   moduleCode    — the module being lifecycled
 *   stageKey      — i18n key describing the current lifecycle stage (e.g. 'provisioning'|'pending-enrolment'|'archived')
 *   stageLabel    — pre-resolved label for the stage (i18n done upstream)
 *   helpKey       — optional link/help reference
 *
 * No emit / no host bindings — this is a leaf placeholder.
 */
@Component({
  selector: 'compliance-generic-module-lifecycle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="gml" role="region" aria-label="Module lifecycle">
      <header class="gml__head">
        <h2 class="gml__title">{{ titleKey }}</h2>
      </header>
      <div class="gml__body">
        <p class="gml__module"><strong>{{ moduleLabelKey }}:</strong> {{ moduleCode }}</p>
        <p *ngIf="stageLabel" class="gml__stage" [attr.data-stage]="stageKey">
          {{ stageLabelKey }}: <strong>{{ stageLabel }}</strong>
        </p>
        <p *ngIf="messageKey" class="gml__msg">{{ messageKey }}</p>
        <p *ngIf="helpKey" class="gml__help">{{ helpKey }}</p>
      </div>
    </section>
  `,
  styles: [`
    .gml { padding: 2rem; max-width: 720px; margin: 0 auto; text-align: center; }
    .gml__title { margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 500; }
    .gml__body { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
    .gml__module { font-family: monospace; }
    .gml__stage[data-stage="archived"] strong { color: #6f6f6f; }
    .gml__stage[data-stage="provisioning"] strong { color: #0f62fe; }
    .gml__stage[data-stage="pending-enrolment"] strong { color: #f1c21b; }
    .gml__msg { color: #525252; font-size: 0.875rem; max-width: 480px; }
    .gml__help { font-size: 0.75rem; color: #525252; }
  `],
})
export class GenericModuleLifecycleComponent {
  @Input() moduleCode = '';
  @Input() stageKey: 'provisioning' | 'pending-enrolment' | 'archived' | 'unknown' = 'unknown';
  @Input() stageLabel?: string;
  @Input() titleKey = 'Module lifecycle';
  @Input() moduleLabelKey = 'Module';
  @Input() stageLabelKey = 'Stage';
  @Input() messageKey?: string;
  @Input() helpKey?: string;
}
