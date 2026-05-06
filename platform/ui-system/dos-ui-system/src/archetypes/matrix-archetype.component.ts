import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosArchetypeBaseComponent } from './archetype-base.component';
import type { ArchetypePageSpec } from './archetype.contract';

/**
 * DosMatrixArchetypeComponent — renderer for the "matrix" page archetype.
 * Wave-3 scaffold. Consumes a normalized PageSpec from UI-OS runtime; renders no DB schema.
 */
@Component({
  selector: 'dos-archetype-matrix',
  standalone: true,
  imports: [CommonModule, DosArchetypeBaseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-archetype-base archetype="matrix" [pageSpec]="pageSpec"></dos-archetype-base>`,
})
export class DosMatrixArchetypeComponent {
  @Input() pageSpec: ArchetypePageSpec | null = null;
}
