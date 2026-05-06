import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosArchetypeBaseComponent } from './archetype-base.component';
import type { ArchetypePageSpec } from './archetype.contract';

/**
 * DosHierarchyArchetypeComponent — renderer for the "hierarchy" page archetype.
 * Wave-3 scaffold. Consumes a normalized PageSpec from UI-OS runtime; renders no DB schema.
 */
@Component({
  selector: 'dos-archetype-hierarchy',
  standalone: true,
  imports: [CommonModule, DosArchetypeBaseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-archetype-base archetype="hierarchy" [pageSpec]="pageSpec"></dos-archetype-base>`,
})
export class DosHierarchyArchetypeComponent {
  @Input() pageSpec: ArchetypePageSpec | null = null;
}
