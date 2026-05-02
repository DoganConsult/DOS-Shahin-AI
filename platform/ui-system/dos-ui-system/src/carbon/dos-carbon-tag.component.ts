import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';

export type DosCarbonTagType =
  | 'red' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal'
  | 'green' | 'gray' | 'cool-gray' | 'warm-gray' | 'high-contrast' | 'outline';
export type DosCarbonTagSize = 'sm' | 'md';

@Component({
  selector: 'dos-carbon-tag',
  standalone: true,
  imports: [CommonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-tag [type]="type" [size]="size">
      <ng-content></ng-content>
    </cds-tag>
  `,
})
export class DosCarbonTagComponent {
  @Input() type: DosCarbonTagType = 'gray';
  @Input() size: DosCarbonTagSize = 'sm';
}
