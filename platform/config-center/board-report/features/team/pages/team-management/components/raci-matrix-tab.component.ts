import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-raci-matrix-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="raci-matrix-tab"><h3>RACI Matrix</h3></div>`,
})
export class RaciMatrixTabComponent {}
