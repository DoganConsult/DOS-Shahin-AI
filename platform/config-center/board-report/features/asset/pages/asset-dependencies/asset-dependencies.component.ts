import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, DependencyDto } from '../../services/asset-api.service';
import { GrcDataTableComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-dependencies',
    imports: [CommonModule, GrcDataTableComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--purple-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--purple-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .dep-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .dep-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .dep-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .dep-table tr:hover td { background: var(--surface-50); }
    .arrow { color: var(--primary-500); font-weight: 600; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-share-alt"></i></div>
        <div><h1>Dependency Graph</h1><p class="subtitle">Asset, application, and service dependency edges</p></div>
      </header>

      <grc-data-table
        title="Dependencies"
        [totalRecords]="total()"
        [loading]="loading()"
        [showExport]="true"
        exportFilename="dependencies"
        emptyMessage="No dependencies mapped.">
        <table class="dep-table">
          <thead><tr><th>Source</th><th></th><th>Target</th><th>Type</th><th>Criticality</th><th>Direction</th></tr></thead>
          <tbody>
            @for (d of deps(); track d.dependencyId) {
              <tr>
                <td>{{ d.sourceType }}:{{ d.sourceId | slice:0:8 }}</td>
                <td class="arrow">→</td>
                <td>{{ d.targetType }}:{{ d.targetId | slice:0:8 }}</td>
                <td>{{ d.dependencyType }}</td>
                <td><app-status-badge [status]="d.criticality" /></td>
                <td>{{ d.direction }}</td>
              </tr>
            }
          </tbody>
        </table>
      </grc-data-table>
    </div>
  `
})
export class AssetDependenciesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  deps = signal<DependencyDto[]>([]);
  total = signal(0);

  ngOnInit(): void {
    this.api.listDependencies().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.deps.set(res.data || []); this.total.set(res.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
