import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pain-points-section',
  standalone: true,
  imports: [CommonModule],
  template: `<section class="pain-points-section" aria-label="Pain points"></section>`,
  styles: [`:host{display:block;}`],
})
export class PainPointsSectionComponent {}
