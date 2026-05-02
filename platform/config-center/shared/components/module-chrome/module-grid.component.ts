import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular';

@Component({
  selector: 'app-module-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule],
  template: `<div class="module-grid"><cds-tile><ng-content /></cds-tile></div>`,
  styles: [`:host{display:block;}.module-grid{display:grid;gap:var(--cds-spacing-05);}`],
})
export class ModuleGridComponent {}
