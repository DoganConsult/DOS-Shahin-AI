import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService } from '../../services/asset-api.service';
import { SkeletonLoaderComponent, EmptyStateComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-admin',
    imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--surface-100); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--text-color); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .config-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-base); }
    .config-row:last-child { border-bottom: none; }
    .config-key { font-weight: 500; }
    .config-value { color: var(--text-color-secondary); max-width: 60%; text-align: end; word-break: break-all; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-cog"></i></div>
        <div><h1>Asset Module Admin</h1><p class="subtitle">Module configuration and settings</p></div>
      </header>

      @if (loading()) {
        <app-skeleton-loader [rows]="5" />
      } @else if (configEntries().length > 0) {
        <div class="section">
          <h3 class="section-title">Module Configuration</h3>
          @for (entry of configEntries(); track entry[0]) {
            <div class="config-row">
              <span class="config-key">{{ entry[0] }}</span>
              <span class="config-value">{{ asString(entry[1]) }}</span>
            </div>
          }
        </div>
      } @else {
        <app-empty-state title="No Configuration" message="No module configuration found." icon="pi-cog" />
      }
    </div>
  `
})
export class AssetAdminComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  configEntries = signal<[string, unknown][]>([]);

  ngOnInit(): void {
    this.api.getModuleConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.configEntries.set(Object.entries(data || {})); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  asString(val: unknown): string { return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—'); }
}
