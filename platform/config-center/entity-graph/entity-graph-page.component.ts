import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { EntityGraphComponent } from '@app/shared/entity-graph/entity-graph.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entity-graph-page',
  standalone: true,
  imports: [CommonModule, EntityGraphComponent],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate(graphTitle()) }}</h2>
        <p class="text-muted">{{ i18n.translate(graphDescription()) }}</p>
      </header>
      <div class="page-body">
        @if (loading()) { 
          <div class="card">
            <p>{{ i18n.translate('Loading...') }}</p>
          </div> 
        }
        @else if (entityType() === 'control' && entityId()) {
          <!-- Control Dependency Graph (Priority 11) -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">{{ i18n.translate('Control Dependency Graph') }}</h3>
              <div class="graph-stats">
                <span>{{ i18n.translate('Nodes') }}: {{ graphStats().nodeCount }}</span>
                <span>{{ i18n.translate('Dependencies') }}: {{ graphStats().edgeCount }}</span>
              </div>
            </div>
            <div class="graph-wrapper">
              <app-entity-graph 
                [entityType]="entityType()" 
                [entityId]="entityId()" 
                [depth]="maxDepth()">
              </app-entity-graph>
            </div>
            @if (downstreamControls().length > 0) {
              <div class="downstream-section">
                <h4>{{ i18n.translate('Downstream Controls') }} ({{ downstreamControls().length }})</h4>
                <ul class="control-list">
                  @for (ctrl of downstreamControls(); track ctrl.controlId) {
                    <li>
                      <span class="control-id">{{ ctrl.controlId }}</span>
                      <span class="control-title">{{ ctrl.title || ctrl.controlId }}</span>
                      @if (ctrl.effectivenessRating) {
                        <span class="badge" [class]="'badge-' + ctrl.effectivenessRating">
                          {{ ctrl.effectivenessRating }}
                        </span>
                      }
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        }
        @else {
          <!-- Generic Entity Links View -->
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('Entity links') }}</h3>
            @if (links().length === 0) { 
              <p class="text-muted">{{ i18n.translate('No entity links') }}</p> 
            }
            @else {
              <ul class="list">
                @for (l of links(); track l.id) {
                  <li>{{ l.sourceType }} {{ l.sourceId }} → {{ l.targetType }} {{ l.targetId }} ({{ l.relationshipType }})</li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; } 
    .page-header { margin-bottom: 24px; } 
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); } 
    .text-muted { color: var(--text-muted); margin-top: 4px; } 
    .page-body { display: grid; gap: 16px; } 
    .card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius, 8px); padding: 24px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { margin: 0; font-size: var(--font-size-lg); } 
    .graph-stats { display: flex; gap: 16px; font-size: var(--font-size-sm); color: var(--text-muted); }
    .graph-wrapper { min-height: 500px; margin-bottom: 24px; }
    .downstream-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--surface-border, #e0e0e0); }
    .downstream-section h4 { margin: 0 0 12px 0; font-size: var(--font-size-base); }
    .control-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .control-list li { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--surface-ground, #f5f5f5); border-radius: var(--radius-sm, 4px); }
    .control-id { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-muted); }
    .control-title { flex: 1; }
    .badge { padding: 2px 8px; border-radius: var(--radius-sm, 4px); font-size: var(--font-size-xs); text-transform: uppercase; }
    .badge-low { background: var(--warning-background, #fef3c7); color: var(--warning-text, #92400e); }
    .badge-adequate { background: var(--success-background, #d1fae5); color: var(--success-text, #065f46); }
    .badge-high { background: var(--success-background, #d1fae5); color: var(--success-text, #065f46); }
    .badge-ineffective { background: var(--error-background, #fee2e2); color: var(--error-text, #991b1b); }
    .list { list-style: none; padding: 0; margin: 0; } 
    .list li { padding: 8px 0; border-bottom: 1px solid var(--surface-border); font-size: var(--font-size-sm); }
  `]
})
export class EntityGraphPageComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
    private complianceSvc = inject(GrcComplianceService);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  loading = signal(true);
  links = signal<GrcRecord[]>([]);
  entityType = signal<string>('');
  entityId = signal<string>('');
  maxDepth = signal<number>(5);
  graphStats = signal<{ nodeCount: number; edgeCount: number }>({ nodeCount: 0, edgeCount: 0 });
  downstreamControls = signal<Array<{ controlId: string; title?: string; effectivenessRating?: string }>>([]);

  ngOnInit(): void {
    // Read query parameters for entityType and entityId
    this.route.queryParams.subscribe(params => {
      const type = params['entityType'] || '';
      const id = params['entityId'] || '';
      const depth = parseInt(params['maxDepth'] || '5', 10);
      
      this.entityType.set(type);
      this.entityId.set(id);
      this.maxDepth.set(depth);
      
      if (type === 'control' && id) {
        this.loadControlDependencyGraph(id, depth);
      } else {
        // Fallback to generic entity links
        this.loadEntityLinks(type || 'risk', id || 'all');
      }
    });
  }

  graphTitle(): string {
    if (this.entityType() === 'control' && this.entityId()) {
      return 'Control Dependency Graph';
    }
    return 'Entity Graph';
  }

  graphDescription(): string {
    if (this.entityType() === 'control' && this.entityId()) {
      return 'Visualize control dependencies and downstream impact';
    }
    return 'Manage entity graph for your organization';
  }

  loadControlDependencyGraph(controlId: string, maxDepth: number): void {
    this.loading.set(true);
    
    // Load dependency graph for visualization
    this.complianceSvc.getControlDependencyGraph(controlId, maxDepth).subscribe({
      next: (response) => {
        const graph = (response as any)?.graph || response;
        this.graphStats.set({
          nodeCount: graph?.nodes?.length || 0,
          edgeCount: graph?.edges?.length || 0
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load control dependency graph:', err);
        this.loading.set(false);
      }
    });

    // Load downstream controls list
    this.complianceSvc.getControlDownstream(controlId, 10).subscribe({
      next: (response) => {
        const downstream = (response as any)?.downstreamControls || [];
        // Fetch control details for display
        if (downstream.length > 0) {
          // For now, just store IDs - could enhance to fetch full control details
          this.downstreamControls.set(
            downstream.map((id: string) => ({ controlId: id }))
          );
        }
      },
      error: (err) => {
        console.error('Failed to load downstream controls:', err);
      }
    });
  }

  loadEntityLinks(entityType: string, entityId: string): void {
    this.loading.set(true);
    this.operationsSvc.getEntityLinks(entityType, entityId).subscribe({
      next: (d) => {
        this.links.set(d?.links ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
