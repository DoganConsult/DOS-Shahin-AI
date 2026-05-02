/**
 * Decision Traceability Graph Component
 *
 * Visual traceability graph for a board decision showing the decision
 * at center with connected entity nodes grouped by type:
 * - Risks (red), Controls (blue), Policies (green), Exceptions (orange)
 * CSS-based layout using flexbox/grid, no external graph library required.
 */
import { Component, Input, OnInit, OnChanges, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface DecisionGraphData {
  decisionId: string;
  titleEn: string;
  titleAr?: string;
  status: string;
  linkedEntities: GraphEntity[];
}

interface GraphEntity {
  entityId: string;
  entityType: 'risk' | 'control' | 'policy' | 'exception' | 'obligation';
  titleEn: string;
  titleAr?: string;
  status: string;
}

/** Group structure for rendering entity quadrants */
interface EntityGroup {
  type: string;
  label: string;
  labelAr: string;
  cssClass: string;
  entities: GraphEntity[];
}

const GROUP_CONFIG: Record<string, { label: string; labelAr: string; cssClass: string }> = {
  risk:      { label: 'Risks',      labelAr: 'المخاطر',      cssClass: 'group-risk' },
  control:   { label: 'Controls',   labelAr: 'الضوابط',      cssClass: 'group-control' },
  policy:    { label: 'Policies',   labelAr: 'السياسات',     cssClass: 'group-policy' },
  exception: { label: 'Exceptions', labelAr: 'الاستثناءات',  cssClass: 'group-exception' },
  obligation:{ label: 'Obligations',labelAr: 'الالتزامات',   cssClass: 'group-obligation' },
};

@Component({
  selector: 'app-decision-traceability-graph',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="traceability-graph">
      <h3 class="graph-title">Decision Traceability / تتبع القرار</h3>

      @if (loading()) {
        <div class="loading-text">Loading graph... / جاري تحميل الرسم البياني...</div>
      }

      @if (!loading() && graphData()) {
        <div class="graph-layout">
          <!-- Top row: risks and controls -->
          <div class="graph-row">
            @for (group of topGroups(); track group.type) {
              <div class="entity-quadrant" [class]="group.cssClass">
                <div class="quadrant-header">
                  <span class="quadrant-label">{{ group.label }}</span>
                  <span class="quadrant-label-ar">{{ group.labelAr }}</span>
                </div>
                @for (ent of group.entities; track ent.entityId) {
                  <div class="graph-node" (click)="onNodeClick(ent)">
                    <span class="node-name">{{ ent.titleEn }}</span>
                    <span class="node-status" [class]="'status-' + ent.status">{{ ent.status }}</span>
                  </div>
                }
                @if (group.entities.length === 0) {
                  <div class="no-entities">--</div>
                }
                <!-- Connector line to center -->
                <div class="connector-down"></div>
              </div>
            }
          </div>

          <!-- Center: Decision node -->
          <div class="center-row">
            <div class="decision-node">
              <span class="decision-label">Decision / قرار</span>
              <h4>{{ graphData()!.titleEn }}</h4>
              @if (graphData()!.titleAr) {
                <p class="decision-node-ar">{{ graphData()!.titleAr }}</p>
              }
              <span class="decision-node-status" [class]="'status-' + graphData()!.status">
                {{ graphData()!.status }}
              </span>
            </div>
          </div>

          <!-- Bottom row: policies and exceptions -->
          <div class="graph-row">
            @for (group of bottomGroups(); track group.type) {
              <div class="entity-quadrant" [class]="group.cssClass">
                <div class="connector-up"></div>
                <div class="quadrant-header">
                  <span class="quadrant-label">{{ group.label }}</span>
                  <span class="quadrant-label-ar">{{ group.labelAr }}</span>
                </div>
                @for (ent of group.entities; track ent.entityId) {
                  <div class="graph-node" (click)="onNodeClick(ent)">
                    <span class="node-name">{{ ent.titleEn }}</span>
                    <span class="node-status" [class]="'status-' + ent.status">{{ ent.status }}</span>
                  </div>
                }
                @if (group.entities.length === 0) {
                  <div class="no-entities">--</div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (!loading() && !graphData()) {
        <div class="empty-text">
          <p>No decision data available.</p>
          <p class="rtl">لا توجد بيانات للقرار.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .traceability-graph { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 20px; }
    .graph-title { font-size: 15px; font-weight: 600; margin: 0 0 20px 0; color: var(--primary-color, #89b4fa); }
    .loading-text, .empty-text { font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); text-align: center; padding: 20px; }
    .rtl { direction: rtl; }

    /* Graph layout */
    .graph-layout { display: flex; flex-direction: column; align-items: center; gap: 0; }

    .graph-row { display: flex; gap: 20px; justify-content: center; width: 100%; }

    /* Entity quadrant */
    .entity-quadrant { flex: 1; max-width: 280px; display: flex; flex-direction: column; align-items: center; position: relative; }
    .quadrant-header { text-align: center; margin-bottom: 8px; }
    .quadrant-label { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
    .quadrant-label-ar { font-size: var(--font-size-nano); direction: rtl; color: var(--text-color-secondary, #a6adc8); display: block; }

    /* Color by group */
    .group-risk .quadrant-label { color: #f38ba8; }
    .group-risk .graph-node { border-color: rgba(var(--color-pink-300-rgb), 0.3); }
    .group-risk .graph-node:hover { border-color: #f38ba8; }
    .group-control .quadrant-label { color: #89b4fa; }
    .group-control .graph-node { border-color: rgba(var(--color-blue-300-rgb), 0.3); }
    .group-control .graph-node:hover { border-color: #89b4fa; }
    .group-policy .quadrant-label { color: #a6e3a1; }
    .group-policy .graph-node { border-color: rgba(var(--color-green-300-rgb), 0.3); }
    .group-policy .graph-node:hover { border-color: #a6e3a1; }
    .group-exception .quadrant-label { color: #fab387; }
    .group-exception .graph-node { border-color: rgba(var(--color-peach-rgb), 0.3); }
    .group-exception .graph-node:hover { border-color: #fab387; }
    .group-obligation .quadrant-label { color: #cba6f7; }
    .group-obligation .graph-node { border-color: rgba(var(--color-catppuccin-mauve-light-rgb), 0.3); }
    .group-obligation .graph-node:hover { border-color: #cba6f7; }

    /* Graph node */
    .graph-node { background: var(--surface-ground, #11111b); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 4px; width: 100%; cursor: pointer; transition: border-color 0.15s; }
    .node-name { font-size: var(--font-size-sm); display: block; margin-bottom: 2px; }
    .node-status { font-size: var(--font-size-nano); padding: 1px 5px; border-radius: 3px; }
    .no-entities { font-size: var(--font-size-xs); color: var(--text-color-secondary, #6c7086); }

    /* Connector lines */
    .connector-down { width: 2px; height: 20px; background: var(--surface-border, #45475a); margin-top: 8px; }
    .connector-up { width: 2px; height: 20px; background: var(--surface-border, #45475a); margin-bottom: 8px; }

    /* Center decision node */
    .center-row { display: flex; justify-content: center; padding: 8px 0; }
    .decision-node { background: var(--primary-color, #89b4fa); color: var(--primary-color-text, #1e1e2e); border-radius: var(--radius-lg); padding: 16px 24px; text-align: center; min-width: 240px; }
    .decision-label { font-size: var(--font-size-nano); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; opacity: 0.8; }
    .decision-node h4 { font-size: var(--font-size-md); margin: 4px 0; font-weight: 700; }
    .decision-node-ar { font-size: var(--font-size-sm); direction: rtl; opacity: 0.8; margin: 0 0 4px 0; }
    .decision-node-status { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); background: rgba(var(--color-black-rgb), 0.2); }

    /* Status colors */
    .status-active, .status-approved, .status-compliant { background: rgba(var(--color-green-300-rgb), 0.2); color: #a6e3a1; }
    .status-draft { background: rgba(var(--color-blue-300-rgb), 0.2); color: #89b4fa; }
    .status-pending, .status-pending_vote { background: rgba(var(--color-catppuccin-peach-light-rgb), 0.2); color: #f9e2af; }
    .status-rejected, .status-non_compliant { background: rgba(var(--color-pink-300-rgb), 0.2); color: #f38ba8; }
    .status-open { background: rgba(var(--color-catppuccin-blue-rgb), 0.2); color: #74c7ec; }

    @media (max-width: 700px) {
      .graph-row { flex-direction: column; align-items: center; }
      .entity-quadrant { max-width: 100%; }
    }
  `],
})
export class DecisionTraceabilityGraphComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

  /** Decision ID to visualize */
  @Input() decisionId = '';

  graphData = signal<DecisionGraphData | null>(null);
  loading = signal(false);

  /** Groups for top row (risks, controls) */
  topGroups = computed<EntityGroup[]>(() => {
    return this.buildGroups(['risk', 'control']);
  });

  /** Groups for bottom row (policies, exceptions, obligations) */
  bottomGroups = computed<EntityGroup[]>(() => {
    return this.buildGroups(['policy', 'exception', 'obligation']);
  });

  ngOnInit(): void {
    if (this.decisionId) this.loadGraph();
  }

  ngOnChanges(): void {
    if (this.decisionId) {
      this.graphData.set(null);
      this.loadGraph();
    }
  }

  /** Fetch decision with linked entities */
  loadGraph(): void {
    if (!this.decisionId) return;
    this.loading.set(true);
    this.http.get<DecisionGraphData>(`/api/board-decisions/${this.decisionId}`).subscribe({
      next: (res) => { this.graphData.set(res); this.loading.set(false); },
      error: () => { this.graphData.set(null); this.loading.set(false); },
    });
  }

  /** Build entity groups for given types */
  private buildGroups(types: string[]): EntityGroup[] {
    const data = this.graphData();
    if (!data) return [];
    return types
      .map(type => {
        const config = GROUP_CONFIG[type] ?? { label: type, labelAr: type, cssClass: 'group-' + type };
        return {
          type,
          label: config.label,
          labelAr: config.labelAr,
          cssClass: config.cssClass,
          entities: data.linkedEntities.filter(e => e.entityType === type),
        };
      })
      .filter(g => g.entities.length > 0 || types.length <= 2);
  }

  /** Handle click on an entity node (navigation placeholder) */
  onNodeClick(entity: GraphEntity): void {
    // Navigation to entity detail can be implemented here
    // e.g., this.router.navigate(['/governance', entity.entityType, entity.entityId]);
  }
}
