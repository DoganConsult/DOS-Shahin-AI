import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridWidget } from './layout-grid.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-layout-grid',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="layout-grid"><ng-content /></div>',
  styles: ['.layout-grid { display: grid; gap: 1rem; }']
})
export class LayoutGridComponent {
  @Input() widgets: GridWidget[] = [];
}
