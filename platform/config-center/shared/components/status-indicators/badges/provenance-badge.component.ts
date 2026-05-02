import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-provenance-badge',
    standalone: true,
    imports: [CommonModule],
    template: `<span class="provenance-badge">{{ source || 'manual' }}</span>`,
    styles: [`
      .provenance-badge { display: inline-flex; padding: 2px 8px; border-radius: 10px; font-size: var(--font-size-xs); font-weight: 500; background: var(--surface-hover); color: var(--text-muted); }
    `]
})
export class ProvenanceBadgeComponent {
    @Input() source: string = 'manual';
    @Input() tooltip: string = '';
}
