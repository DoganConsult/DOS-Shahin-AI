// ============================================
// HubFlowMapComponent — overlay showing all hub connections as interactive graph
// ============================================
import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HUB_REGISTRY, SHARED_FLOWS, getFlowHubChain, HubMeta, SharedFlow, HubLink } from './hub-connections.data';

@Component({
  selector: 'app-hub-flow-map',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div tabindex="0" role="button" (keyup.enter)="onBackdrop($event)" class="flow-map-overlay" *ngIf="visible" (click)="onBackdrop($event)">
      <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="flow-map-panel" (click)="$event.stopPropagation()">
        <header class="flow-map-header">
          <div class="flow-map-title-row">
            <i class="pi pi-share-alt"></i>
            <h2>{{ i18n.translate('hubFlowMap.title') }}</h2>
          </div>
          <button aria-label="Close" class="flow-map-close" (click)="close()"><i class="pi pi-times"></i></button>
        </header>

        <div class="flow-map-body">
          <!-- Flow selector tabs -->
          <div class="flow-tabs">
            <button class="flow-tab" [class.active]="!selectedFlow()"
                    (click)="selectedFlow.set(null)">
              {{ i18n.translate('hubFlowMap.allHubs') }}
            </button>
            <button *ngFor="let flow of flows" class="flow-tab"
                    [class.active]="selectedFlow()?.id === flow.id"
                    [style.--tab-color]="flow.color"
                    (click)="selectedFlow.set(flow)">
              <i class="pi" [ngClass]="flow.icon"></i>
              {{ i18n.localize(flow.nameEn, flow.nameAr) }}
            </button>
          </div>

          <!-- All Hubs Grid -->
          <div class="hub-grid" *ngIf="!selectedFlow()">
            <a *ngFor="let hub of allHubs" [routerLink]="hub.route" class="hub-grid-card"
               [class.hub-grid-current]="hub.key === currentHub"
               [style.--hub-color]="hub.color"
               (click)="close()">
              <div class="hub-grid-icon"><i class="pi" [ngClass]="hub.icon"></i></div>
              <div class="hub-grid-info">
                <div class="hub-grid-name">{{ i18n.localize(hub.labelEn, hub.labelAr) }}</div>
                <div class="hub-grid-phase">{{ i18n.localize(hub.phaseEn, hub.phaseAr) }}</div>
              </div>
              <div class="hub-grid-connections">
                <span class="hub-grid-conn-count">{{ hub.connectedHubs.length }}</span>
                <span class="hub-grid-conn-label">{{ i18n.translate('hubFlowMap.connections') }}</span>
              </div>
            </a>
          </div>

          <!-- Selected Flow Chain -->
          <div class="flow-detail" *ngIf="selectedFlow() as flow">
            <div class="flow-detail-header">
              <i class="pi" [ngClass]="flow.icon" [style.color]="flow.color"></i>
              <h3>{{ i18n.localize(flow.nameEn, flow.nameAr) }}</h3>
            </div>
            <div class="flow-chain-visual">
              <ng-container *ngFor="let hub of getChain(flow); let last = last; let i = index">
                <a [routerLink]="hub.route" class="flow-chain-card"
                   [class.flow-chain-current]="hub.key === currentHub"
                   [style.--node-color]="hub.color"
                   (click)="close()">
                  <div class="flow-chain-step">{{ i + 1 }}</div>
                  <div class="flow-chain-icon"><i class="pi" [ngClass]="hub.icon"></i></div>
                  <div class="flow-chain-name">{{ i18n.localize(hub.labelEn, hub.labelAr) }}</div>
                </a>
                <div class="flow-chain-connector" *ngIf="!last">
                  <div class="flow-connector-line"></div>
                  <i class="pi pi-arrow-right flow-connector-arrow"></i>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flow-map-overlay {
      position: fixed; inset: 0; z-index: var(--z-modal);
      background: rgba(var(--color-black-rgb), 0.4); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .flow-map-panel {
      background: var(--surface, #fff); border-radius: var(--radius-xl);
      box-shadow: 0 20px 60px rgba(var(--color-black-rgb), 0.2);
      width: min(90vw, 960px); max-height: 85vh;
      display: flex; flex-direction: column;
      animation: slideUp 0.2s ease-out;
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .flow-map-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px; border-bottom: 1px solid var(--surface-border, var(--border-subtle));
    }
    .flow-map-title-row { display: flex; align-items: center; gap: 10px; }
    .flow-map-title-row .pi { font-size: var(--font-size-xl); color: var(--primary, var(--primary)); }
    .flow-map-title-row h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; color: var(--text-heading, #111); }
    .flow-map-close {
      background: none; border: none; cursor: pointer;
      width: 32px; height: 32px; border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted, var(--text-muted));
      transition: background 0.15s;
    }
    .flow-map-close:hover { background: var(--surface-100, var(--surface-ice)); }

    .flow-map-body { padding: 20px 24px; overflow-y: auto; }

    .flow-tabs {
      display: flex; gap: 6px; flex-wrap: wrap;
      margin-bottom: 20px; padding-bottom: 16px;
      border-bottom: 1px solid var(--surface-border, var(--border-subtle));
    }
    .flow-tab {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 14px; border-radius: var(--radius-xl);
      font-size: var(--font-size-sm); font-weight: 500;
      background: var(--surface-100, var(--surface-ice));
      color: var(--text-color-secondary, var(--text-muted));
      border: 1px solid transparent; cursor: pointer;
      transition: all 0.15s;
    }
    .flow-tab:hover { background: var(--surface-200, var(--border-subtle)); }
    .flow-tab.active {
      background: color-mix(in srgb, var(--tab-color, var(--primary, var(--primary))) 12%, white);
      color: var(--tab-color, var(--primary, var(--primary)));
      border-color: color-mix(in srgb, var(--tab-color, var(--primary, var(--primary))) 30%, transparent);
      font-weight: 600;
    }
    .flow-tab .pi { font-size: var(--font-size-sm); }

    /* All Hubs Grid */
    .hub-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .hub-grid-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: var(--radius-lg);
      background: var(--surface-50, var(--surface-ice));
      border: 1px solid var(--surface-border, var(--border-subtle));
      text-decoration: none; color: inherit;
      transition: all 0.15s;
    }
    .hub-grid-card:hover {
      border-color: var(--hub-color, var(--primary));
      box-shadow: 0 2px 8px color-mix(in srgb, var(--hub-color, var(--primary)) 15%, transparent);
      transform: translateY(-1px);
    }
    .hub-grid-current {
      border-color: var(--hub-color, var(--primary));
      background: color-mix(in srgb, var(--hub-color, var(--primary)) 8%, white);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--hub-color, var(--primary)) 15%, transparent);
    }
    .hub-grid-icon {
      width: 36px; height: 36px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--hub-color, var(--primary)) 12%, white);
      color: var(--hub-color, var(--primary)); font-size: var(--font-size-md); flex-shrink: 0;
    }
    .hub-grid-info { flex: 1; min-width: 0; }
    .hub-grid-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, #111); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hub-grid-phase { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .hub-grid-connections { text-align: center; }
    .hub-grid-conn-count { display: block; font-size: var(--font-size-md); font-weight: 700; color: var(--hub-color, var(--primary)); }
    .hub-grid-conn-label { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); text-transform: uppercase; }

    /* Flow Detail */
    .flow-detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .flow-detail-header .pi { font-size: var(--font-size-2xl); }
    .flow-detail-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }

    .flow-chain-visual {
      display: flex; align-items: center; gap: 0;
      flex-wrap: wrap; justify-content: center;
    }
    .flow-chain-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 16px 20px; border-radius: var(--radius-lg);
      background: var(--surface-50, var(--surface-ice));
      border: 1px solid var(--surface-border, var(--border-subtle));
      text-decoration: none; color: inherit;
      min-width: 90px; text-align: center;
      transition: all 0.15s;
    }
    .flow-chain-card:hover {
      border-color: var(--node-color, var(--primary));
      background: color-mix(in srgb, var(--node-color, var(--primary)) 8%, white);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--node-color, var(--primary)) 15%, transparent);
    }
    .flow-chain-current {
      border-color: var(--node-color, var(--primary));
      background: color-mix(in srgb, var(--node-color, var(--primary)) 12%, white);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--node-color, var(--primary)) 20%, transparent);
    }
    .flow-chain-step {
      width: 22px; height: 22px; border-radius: var(--radius-pill);
      background: var(--node-color, var(--primary)); color: #fff;
      font-size: var(--font-size-xs); font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .flow-chain-icon { font-size: var(--font-size-xl); color: var(--node-color, var(--primary)); }
    .flow-chain-name { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading, #111); }

    .flow-chain-connector {
      display: flex; align-items: center; gap: 0;
      padding: 0 4px;
    }
    .flow-connector-line { width: 20px; height: 2px; background: var(--surface-border, var(--border-subtle)); }
    .flow-connector-arrow { font-size: var(--font-size-sm); color: var(--text-muted, #9ca3af); }

    :host-context([dir="rtl"]) .flow-connector-arrow { transform: scaleX(-1); }

    @media (max-width: 600px) {
      .flow-map-panel { width: 95vw; max-height: 90vh; }
      .hub-grid { grid-template-columns: 1fr; }
      .flow-chain-visual { flex-direction: column; }
      .flow-chain-connector { transform: rotate(90deg); padding: 4px 0; }
    }
  `],
})
export class HubFlowMapComponent {
  @Input() visible = false;
  @Input() currentHub = '';
  @Output() visibleChange = new EventEmitter<boolean>();

  i18n = inject(I18nService);
  private router = inject(Router);

  selectedFlow = signal<SharedFlow | null>(null);

  get flows(): SharedFlow[] { return SHARED_FLOWS; }
  get allHubs(): HubMeta[] { return Object.values(HUB_REGISTRY); }

  getChain(flow: SharedFlow): HubLink[] { return getFlowHubChain(flow); }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('flow-map-overlay')) {
      this.close();
    }
  }

}
