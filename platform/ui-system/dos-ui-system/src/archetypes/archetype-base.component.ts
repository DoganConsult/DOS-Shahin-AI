import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ArchetypeId, ArchetypePageSpec, ArchetypeZoneSpec } from './archetype.contract';

@Component({
  selector: 'dos-archetype-base',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-archetype" [attr.data-archetype]="archetype" [attr.data-page]="pageSpec?.pageId">
      <header class="dos-archetype__head" *ngIf="pageSpec?.title as t">
        <h2 class="dos-archetype__title">{{ t.label || t.fallback || '' }}</h2>
      </header>
      <div class="dos-archetype__zones">
        <div *ngFor="let z of zones" class="dos-archetype__zone" [attr.data-zone]="z.zone">
          <div *ngFor="let s of z.surfaces" class="dos-archetype__surface" [attr.data-component]="s.componentKey"></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-archetype { display: grid; gap: var(--dos-space-3); }
    .dos-archetype__zones { display: grid; gap: var(--dos-space-3); }
  `],
})
export class DosArchetypeBaseComponent {
  @Input() archetype: ArchetypeId | '' = '';
  @Input() pageSpec: ArchetypePageSpec | null = null;
  get zones(): ReadonlyArray<ArchetypeZoneSpec> { return this.pageSpec?.zones ?? []; }
}
