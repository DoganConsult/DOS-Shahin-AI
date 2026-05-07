import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ArchetypeId, ArchetypePageSpec, ArchetypeZoneSpec } from './archetype.contract';
import { DosSurfaceRendererComponent } from '../shell/surface-renderer.component';

@Component({
  selector: 'dos-archetype-base',
  standalone: true,
  imports: [CommonModule, DosSurfaceRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-archetype" [attr.data-archetype]="archetype" [attr.data-page]="pageSpec?.pageId">
      <header class="dos-archetype__header" *ngIf="pageSpec">
        <dos-surface-renderer
          [surface]="{
            enabled: true,
            position: 0,
            rendererKey: 'ui.page-header',
            props: {
              title: pageSpec.title.label || pageSpec.title.fallback || '',
              description: pageSpec.description || ''
            }
          }"
        ></dos-surface-renderer>
      </header>

      <div class="dos-archetype__content">
        @for (zone of zones; track zone.zone) {
          <section class="dos-archetype__zone" [attr.data-zone]="zone.zone">
            @for (surface of zone.surfaces; track surface.componentKey) {
              <dos-surface-renderer
                [surface]="{
                  enabled: true,
                  position: $index,
                  componentKey: surface.componentKey,
                  rendererKey: surface.rendererKey || surface.componentKey,
                  props: surface.props || {}
                }"
              ></dos-surface-renderer>
            }
          </section>
        }
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; padding: var(--dos-space-5); }
    .dos-archetype { display: flex; flex-direction: column; gap: var(--dos-space-6); }
    .dos-archetype__content { display: grid; gap: var(--dos-space-6); }
    .dos-archetype__zone { 
      display: grid; 
      gap: var(--dos-space-4);
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
    .dos-archetype__zone[data-zone="header"] { grid-template-columns: 1fr; }
  `],
})
export class DosArchetypeBaseComponent {
  @Input() archetype: ArchetypeId | '' = '';
  @Input() pageSpec: (ArchetypePageSpec & { description?: string }) | null = null;
  get zones(): ReadonlyArray<ArchetypeZoneSpec> { return this.pageSpec?.zones ?? []; }
}
