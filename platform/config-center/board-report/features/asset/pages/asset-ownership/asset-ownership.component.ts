import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService } from '../../services/asset-api.service';
import {  EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-ownership',
    imports: [CommonModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--yellow-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--yellow-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-base); }
    .item-row:last-child { border-bottom: none; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-users"></i></div>
        <div><h1>Ownership & Lifecycle</h1><p class="subtitle">Asset ownership assignments and lifecycle management</p></div>
      </header>

      @if (loading()) {
        <app-skeleton-loader [rows]="5" />
      } @else {
        <div class="section">
          <h3 class="section-title">Unowned Entities</h3>
          @if (unowned().length > 0) {
            @for (item of unowned(); track $index) {
              <div class="item-row">
                <span>{{ asString(item['name'] || item['entity_id']) }}</span>
                <app-status-badge status="unowned" />
              </div>
            }
          } @else {
            <app-empty-state title="All Assigned" message="All entities have owners." icon="pi-check-circle" />
          }
        </div>

        <div class="section">
          <h3 class="section-title">Lifecycle Distribution</h3>
          @for (entry of lifecycleEntries(); track entry[0]) {
            <div class="item-row">
              <span style="text-transform:capitalize">{{ entry[0] }}</span>
              <strong>{{ entry[1] }}</strong>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AssetOwnershipComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  unowned = signal<Record<string, unknown>[]>([]);
  lifecycleDist = signal<Record<string, number>>({});

  lifecycleEntries = signal<[string, number][]>([]);

  ngOnInit(): void {
    this.api.getUnownedEntities().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.unowned.set(res.data || []),
      error: () => {},
    });
    this.api.getLifecycleDistribution().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: dist => { this.lifecycleDist.set(dist); this.lifecycleEntries.set(Object.entries(dist || {})); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  asString(val: unknown): string { return String(val || '—'); }
}
