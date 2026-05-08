// DosSurfaceRenderer — renders one FcWorkspaceSurface by componentKey.
// Doctrine: no fallback component. If the key is not registered in FC_COMPONENT_MAP,
// emit a visible "Missing component" diagnostic — never invent a substitute.
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import type { Type } from '@angular/core';
import type { FcWorkspaceSurface } from '@fc/ui-contracts';
import { FC_COMPONENT_MAP, type FcComponentMap } from './component-map.token.js';

@Component({
  selector: 'fc-surface-renderer',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolved(); as cmp) {
      <section class="fc-surface" [attr.data-surface-id]="surface().surfaceId"
                                  [attr.data-component-key]="surface().componentKey">
        <ng-container *ngComponentOutlet="cmp; inputs: outletInputs()" />
      </section>
    } @else {
      <section class="fc-surface fc-surface--missing"
               [attr.data-surface-id]="surface().surfaceId"
               [attr.data-component-key]="surface().componentKey">
        <strong>Missing component:</strong> {{ surface().componentKey }}
        <small>(no fallback by design — register the component in FC_COMPONENT_MAP)</small>
      </section>
    }
  `,
  styles: [
    `
      .fc-surface { display: block; padding: 0.5rem; }
      .fc-surface--missing { border: 1px dashed currentColor; opacity: 0.85; }
    `,
  ],
})
export class DosSurfaceRendererComponent {
  private readonly map = inject<FcComponentMap>(FC_COMPONENT_MAP, { optional: true });

  readonly surface = input.required<FcWorkspaceSurface>();

  readonly resolved = computed<Type<unknown> | null>(() => {
    if (!this.map) return null;
    const key = this.surface().componentKey;
    return this.map.get(key) ?? null;
  });

  readonly outletInputs = computed<Record<string, unknown>>(() => ({ surface: this.surface() }));
}
