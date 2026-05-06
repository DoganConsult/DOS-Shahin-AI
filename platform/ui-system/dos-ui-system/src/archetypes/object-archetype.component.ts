import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosArchetypeBaseComponent } from './archetype-base.component';
import type { ArchetypePageSpec } from './archetype.contract';

/**
 * DosObjectArchetypeComponent — renderer for the "object" page archetype.
 * Wave-3 scaffold. Consumes a normalized PageSpec from UI-OS runtime; renders no DB schema.
 */
@Component({
  selector: 'dos-archetype-object',
  standalone: true,
  imports: [CommonModule, DosArchetypeBaseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-archetype-base archetype="object" [pageSpec]="pageSpec"></dos-archetype-base>`,
})
export class DosObjectArchetypeComponent {
  @Input() pageSpec: ArchetypePageSpec | null = null;
}
