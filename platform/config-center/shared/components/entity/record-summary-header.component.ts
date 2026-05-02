import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-record-summary-header',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="record-header">
        <div class="record-title">{{ title }}</div>
        <div class="record-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
      </div>
    `,
    styles: [`
      .record-header { padding: var(--space-md) 0; }
      .record-title { font-size: 1.25rem; font-weight: 700; }
      .record-subtitle { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    `]
})
export class RecordSummaryHeaderComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
    @Input() status: string = '';
    @Input() icon: string = '';
}
