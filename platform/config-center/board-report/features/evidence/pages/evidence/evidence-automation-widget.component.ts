import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'evidence-automation-widget',
    imports: [CommonModule, ButtonModule],
    template: `
    <div class="widget">
      <h3>Evidence Automation & AI</h3>
      <div class="metrics">
        <div class="metric" *ngIf="lastRun">
          <span class="metric-label">Last Run</span>
          <span class="metric-value">{{ lastRun }}</span>
        </div>
        <div class="metric" *ngIf="aiScore">
          <span class="metric-label">Connector Health</span>
          <span class="metric-value" [class.healthy]="aiScore >= 80" [class.warn]="aiScore < 80">{{ aiScore }}%</span>
        </div>
        <div class="metric error" *ngIf="error">
          <span class="metric-label">Error</span>
          <span class="metric-value">{{ error }}</span>
        </div>
      </div>
      <p-button label="Auto-Collect All" icon="pi pi-bolt" size="small" [outlined]="true" (onClick)="autoCollectRequested.emit()" styleClass="mt-2" />
    </div>
  `,
    styles: [`
    .widget { padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); min-width: 220px; flex: 1; }
    h3 { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 10px; color: var(--text-heading, #111); }
    .metrics { display: flex; flex-direction: column; gap: 6px; }
    .metric { display: flex; justify-content: space-between; font-size: var(--font-size-sm); }
    .metric-label { color: var(--text-muted, var(--text-muted)); }
    .metric-value { font-weight: 600; }
    .metric-value.healthy { color: var(--success); }
    .metric-value.warn { color: var(--warning); }
    .metric.error .metric-value { color: var(--error); }
    .mt-2 { margin-top: 8px; }
  `]
})
export class EvidenceAutomationWidgetComponent {
  @Input() lastRun: string = '';
  @Input() error: string = '';
  @Input() aiScore: number = 0;
  @Output() autoCollectRequested = new EventEmitter<void>();
}
