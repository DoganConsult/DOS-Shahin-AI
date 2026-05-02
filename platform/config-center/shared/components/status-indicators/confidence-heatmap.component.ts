import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeatmapDimension {
    label: string;
    value: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-confidence-heatmap',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="heatmap-grid">
        <div *ngFor="let cell of rows" class="heatmap-cell" [style.opacity]="cell.value / 100">
          {{ cell.label }}
        </div>
      </div>
    `,
    styles: [`
      .heatmap-grid { display: grid; gap: 2px; }
      .heatmap-cell { padding: 4px 8px; text-align: center; border-radius: 4px; background: var(--clr-info, #1565c0); color: #fff; font-size: var(--font-size-xs); }
    `]
})
export class ConfidenceHeatmapComponent {
    @Input() rows: HeatmapDimension[] = [];
    @Input() columns: HeatmapDimension[] = [];
    @Input() title: string = '';
}
