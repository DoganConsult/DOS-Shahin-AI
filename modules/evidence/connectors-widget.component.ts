import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'evidence-connectors-widget',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, TooltipModule],
  template: `
    <div class="widget">
      <div class="widget-header">
        <h3>Evidence Connectors</h3>
        <p-button icon="pi pi-refresh" [text]="true" size="small" (onClick)="refreshRequested.emit()" pTooltip="Refresh" />
      </div>
      <div class="connector-list" *ngIf="connectors?.length; else noConnectors">
        <div class="connector-row" *ngFor="let c of connectors">
          <div class="connector-info">
            <span class="connector-name">{{ c.name || c.type }}</span>
            <span class="connector-type">{{ c.type }}</span>
          </div>
          <p-tag [value]="c.status || 'any'"
                 [severity]="c.status === 'ok' ? 'success' : c.status === 'pending' ? 'warning' : c.status === 'error' ? 'danger' : 'secondary'" />
          <p-button icon="pi pi-play" size="small" [text]="true" severity="info" (onClick)="collectRequested.emit(c.id)" pTooltip="Collect" />
        </div>
      </div>
      <ng-template #noConnectors>
        <div class="empty">No connectors configured</div>
      </ng-template>
      <div class="widget-footer">
        <span class="count">{{ connectors?.length || 0 }} connectors</span>
      </div>
    </div>
  `,
  styles: [`
    .widget { padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); min-width: 260px; flex: 1; }
    .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .widget-header h3 { font-size: var(--font-size-base); font-weight: 700; margin: 0; color: var(--text-heading, #111); }
    .connector-list { display: flex; flex-direction: column; gap: 6px; }
    .connector-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--surface-ground, #f9fafb); }
    .connector-info { flex: 1; min-width: 0; }
    .connector-name { font-size: var(--font-size-sm); font-weight: 600; display: block; }
    .connector-type { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; }
    .empty { font-size: var(--font-size-sm); color: var(--text-muted, #9ca3af); text-align: center; padding: 12px; }
    .widget-footer { margin-top: 8px; font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .count { font-weight: 600; }
  `]
})
export class EvidenceConnectorsWidgetComponent {
  @Input() connectors: Record<string, unknown>[] = [];
  @Output() collectRequested = new EventEmitter<string>();
  @Output() refreshRequested = new EventEmitter<void>();

}
