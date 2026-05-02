// ============================================
// HubConnectionsStripComponent — shows connected hubs + active flows below each hub's tab bar
// ============================================
import { Component, Input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { getConnectedHubs, getHubFlows, getFlowHubChain, HubLink, SharedFlow, HUB_REGISTRY } from './hub-connections.data';

const DEFAULT_MAX_HUBS = 6;

@Component({
    selector: 'app-hub-connections-strip',
    imports: [CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="hub-conn-strip" *ngIf="connectedHubs.length > 0">

      <!-- Connected Hubs row -->
      <div class="conn-row">
        <span class="conn-label">{{ i18n.translate('hubConnections.connectedTo') }}</span>
        <div class="conn-chips">
          <a *ngFor="let hub of visibleHubs"
             [routerLink]="hub.route"
             class="conn-chip"
             [style.--chip-color]="hub.color">
            <i class="pi" [ngClass]="hub.icon"></i>
            <span class="conn-chip-text">{{ i18n.localize(hub.labelEn, hub.labelAr) }}</span>
          </a>

          <!-- Overflow toggle -->
          <button *ngIf="overflowCount > 0 && !hubsExpanded()"
                  class="conn-overflow-btn"
                  (click)="hubsExpanded.set(true)">
            +{{ overflowCount }} {{ i18n.translate('common.more') }}
          </button>
          <button *ngIf="hubsExpanded() && connectedHubs.length > DEFAULT_MAX_HUBS"
                  class="conn-overflow-btn conn-overflow-collapse"
                  (click)="hubsExpanded.set(false); expandedFlow.set(null)">
            {{ i18n.translate('common.less') }} <i class="pi pi-chevron-up"></i>
          </button>
        </div>

        <!-- Flows toggle pill — only when flows exist -->
        <button *ngIf="flows.length > 0"
                class="conn-flows-toggle"
                [class.conn-flows-toggle-open]="flowsExpanded()"
                (click)="toggleFlowsExpanded()">
          <i class="pi pi-share-alt"></i>
          {{ i18n.translate('hubConnections.flows') }} ({{ flows.length }})
          <i class="pi pi-chevron-down flows-chevron" [class.flows-chevron-open]="flowsExpanded()"></i>
        </button>
      </div>

      <!-- Flows row — collapsed by default -->
      <div class="conn-flows-row" *ngIf="flowsExpanded() && flows.length > 0">
        <div class="conn-chips">
          <button *ngFor="let flow of flows"
                  class="conn-chip conn-chip-flow"
                  [style.--chip-color]="flow.color"
                  (click)="toggleFlow(flow.id)">
            <i class="pi" [ngClass]="flow.icon"></i>
            <span class="conn-chip-text">{{ i18n.localize(flow.nameEn, flow.nameAr) }}</span>
            <i class="pi pi-chevron-down flow-chevron" [class.flow-chevron-open]="expandedFlow() === flow.id"></i>
          </button>
        </div>

        <!-- Expanded Flow Chain -->
        <div class="flow-chain" *ngIf="expandedFlow() && expandedFlowChain.length > 0">
          <ng-container *ngFor="let hub of expandedFlowChain; let last = last">
            <a [routerLink]="hub.route" class="flow-chain-node" [class.flow-chain-current]="hub.key === hubKey" [style.--node-color]="hub.color">
              <i class="pi" [ngClass]="hub.icon"></i>
              <span>{{ i18n.localize(hub.labelEn, hub.labelAr) }}</span>
            </a>
            <i class="pi pi-chevron-right flow-chain-arrow" *ngIf="!last"></i>
          </ng-container>
        </div>
      </div>

    </div>
  `,
    styles: [`
    .hub-conn-strip {
      display: flex; flex-direction: column; gap: 0;
      padding: 8px 28px 10px;
      background: var(--surface-50, var(--surface-ice));
      border-bottom: 1px solid var(--surface-border, var(--border-subtle));
    }
    .conn-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .conn-label {
      font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-muted, var(--text-muted));
      white-space: nowrap; flex-shrink: 0;
    }
    .conn-chips { display: flex; gap: 5px; flex-wrap: wrap; flex: 1; align-items: center; }
    .conn-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 500;
      background: color-mix(in srgb, var(--chip-color, var(--primary)) 10%, transparent);
      color: var(--chip-color, var(--primary));
      border: 1px solid color-mix(in srgb, var(--chip-color, var(--primary)) 25%, transparent);
      text-decoration: none;
      transition: background 0.15s, box-shadow 0.15s;
      cursor: pointer;
    }
    .conn-chip:hover {
      background: color-mix(in srgb, var(--chip-color, var(--primary)) 18%, transparent);
      box-shadow: 0 1px 4px color-mix(in srgb, var(--chip-color, var(--primary)) 15%, transparent);
    }
    .conn-chip .pi { font-size: var(--font-size-xs); }
    .conn-chip-flow { border-style: dashed; }
    .flow-chevron { font-size: var(--font-size-xs); transition: transform 0.2s; margin-inline-start: 2px; }
    .flow-chevron-open { transform: rotate(180deg); }

    .conn-overflow-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: var(--radius-lg);
      font-size: var(--font-size-xs); font-weight: 700;
      background: var(--surface-100, var(--surface-ice));
      color: var(--text-secondary, var(--text-muted));
      border: 1px dashed var(--surface-border, var(--border-subtle));
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      &:hover { background: var(--surface-200, var(--border-subtle)); color: var(--text-heading, var(--text-heading)); }
    }
    .conn-overflow-collapse { border-style: solid; }

    .conn-flows-toggle {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: var(--radius-lg);
      font-size: var(--font-size-xs); font-weight: 600;
      background: transparent;
      color: var(--text-secondary, var(--text-muted));
      border: 1px solid var(--surface-border, var(--border-subtle));
      cursor: pointer;
      margin-inline-start: auto;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      flex-shrink: 0;
      .pi { font-size: var(--font-size-xs); }
      &:hover { background: var(--surface-100, var(--surface-ice)); border-color: var(--text-secondary, var(--text-muted)); }
    }
    .conn-flows-toggle-open {
      background: var(--surface-100, var(--surface-ice));
      border-color: var(--primary, #4f46e5);
      color: var(--primary, #4f46e5);
    }
    .flows-chevron { font-size: var(--font-size-xs); transition: transform 0.2s; }
    .flows-chevron-open { transform: rotate(180deg); }

    .conn-flows-row {
      display: flex; flex-direction: column; gap: 6px;
      padding: 8px 0 2px;
      animation: fadeSlide 0.18s ease-out;
    }

    @keyframes fadeSlide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .flow-chain {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      padding-top: 4px;
    }
    .flow-chain-node {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 11px; border-radius: var(--radius);
      font-size: var(--font-size-sm); font-weight: 500;
      background: var(--surface-100, var(--surface-ice));
      color: var(--node-color, #374151);
      text-decoration: none;
      border: 1px solid var(--surface-border, var(--border-subtle));
      transition: background 0.15s, border-color 0.15s;
    }
    .flow-chain-node:hover {
      background: color-mix(in srgb, var(--node-color, var(--primary)) 12%, white);
      border-color: var(--node-color, var(--primary));
    }
    .flow-chain-current {
      background: color-mix(in srgb, var(--node-color, var(--primary)) 15%, white);
      border-color: var(--node-color, var(--primary));
      font-weight: 700;
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--node-color, var(--primary)) 20%, transparent);
    }
    .flow-chain-node .pi { font-size: var(--font-size-sm); }
    .flow-chain-arrow { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); }

    :host-context([dir="rtl"]) .flow-chain-arrow { transform: scaleX(-1); }
  `]
})
export class HubConnectionsStripComponent {
  @Input() hubKey = '';

  readonly DEFAULT_MAX_HUBS = DEFAULT_MAX_HUBS;

  i18n = inject(I18nService);
  expandedFlow = signal<string | null>(null);
  hubsExpanded = signal(false);
  flowsExpanded = signal(false);

  get connectedHubs(): HubLink[] { return getConnectedHubs(this.hubKey); }
  get flows(): SharedFlow[] { return getHubFlows(this.hubKey); }

  get visibleHubs(): HubLink[] {
    const all = this.connectedHubs;
    return this.hubsExpanded() ? all : all.slice(0, DEFAULT_MAX_HUBS);
  }

  get overflowCount(): number {
    return Math.max(0, this.connectedHubs.length - DEFAULT_MAX_HUBS);
  }

  get expandedFlowChain(): HubLink[] {
    const fid = this.expandedFlow();
    if (!fid) return [];
    const flow = this.flows.find(f => f.id === fid);
    return flow ? getFlowHubChain(flow) : [];
  }

  toggleFlowsExpanded(): void {
    this.flowsExpanded.update(v => !v);
    this.expandedFlow.set(null);
  }

  toggleFlow(flowId: string): void {
    this.expandedFlow.update(cur => cur === flowId ? null : flowId);
  }

}
