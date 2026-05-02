import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, ServiceMapNode } from '../../services/asset-api.service';
import { SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-service-map',
    imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--teal-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--teal-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .tree-section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; }
    .tree-node { padding: 8px 0 8px 16px; border-left: 2px solid var(--surface-border); margin-left: 8px; }
    .node-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: var(--font-size-base); }
    .node-icon { width: 24px; height: 24px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); }
    .node-name { font-weight: 500; }
    .root-node { padding-left: 0; border-left: none; margin-left: 0; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-sitemap"></i></div>
        <div><h1>Service Map</h1><p class="subtitle">Business service topology and dependency tree</p></div>
      </header>

      @if (loading()) {
        <app-skeleton-loader [rows]="6" />
      } @else if (tree().length > 0) {
        <div class="tree-section">
          @for (node of tree(); track node.id) {
            <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: node, depth: 0 }" />
          }
        </div>
      } @else {
        <app-empty-state title="No Services" message="No business services or dependencies mapped yet." icon="pi-sitemap" />
      }

      <ng-template #treeNodeTpl let-node let-depth="depth">
        <div [class]="depth === 0 ? 'root-node' : 'tree-node'">
          <div class="node-row">
            <div class="node-icon" [style.background]="nodeColor(node.type)"><i class="pi" [ngClass]="nodeIcon(node.type)"></i></div>
            <span class="node-name">{{ node.name }}</span>
            <app-status-badge [status]="node.criticality" />
            <span style="font-size:0.75rem;color:var(--text-color-secondary)">{{ node.type }}</span>
          </div>
          @if (node.children?.length) {
            @for (child of node.children; track child.id) {
              <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: child, depth: depth + 1 }" />
            }
          }
        </div>
      </ng-template>
    </div>
  `
})
export class AssetServiceMapComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  tree = signal<ServiceMapNode[]>([]);

  ngOnInit(): void {
    this.api.getServiceMap().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.tree.set(res.tree || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  nodeIcon(type: string): string {
    const map: Record<string, string> = { service: 'pi-cloud', application: 'pi-code', asset: 'pi-server' };
    return map[type] || 'pi-box';
  }

  nodeColor(type: string): string {
    const map: Record<string, string> = { service: 'var(--teal-50)', application: 'var(--blue-50)', asset: 'var(--cyan-50)' };
    return map[type] || 'var(--surface-100)';
  }
}
