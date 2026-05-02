import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, AssetDto } from '../../services/asset-api.service';
import { GrcDataTableComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-critical',
    imports: [CommonModule, GrcDataTableComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--red-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--red-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .asset-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .asset-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .asset-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-exclamation-triangle"></i></div>
        <div><h1>Critical Assets</h1><p class="subtitle">Assets with critical or high criticality ratings</p></div>
      </header>

      <grc-data-table
        title="Critical Assets"
        [totalRecords]="total()"
        [loading]="loading()"
        [showExport]="true"
        exportFilename="critical-assets"
        emptyMessage="No critical assets found.">
        <table class="asset-table">
          <thead><tr><th>Name</th><th>Type</th><th>Classification</th><th>Criticality</th><th>Risk Score</th><th>Owner</th></tr></thead>
          <tbody>
            @for (a of assets(); track a.id) {
              <tr>
                <td><strong>{{ a.name }}</strong></td>
                <td>{{ a.type }}</td>
                <td>{{ a.classification }}</td>
                <td><app-status-badge [status]="a.criticality" /></td>
                <td>{{ a.riskScore ?? '—' }}</td>
                <td>{{ a.ownerName || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </grc-data-table>
    </div>
  `
})
export class AssetCriticalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  assets = signal<AssetDto[]>([]);
  total = signal(0);

  ngOnInit(): void {
    this.api.getCriticalAssets().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.assets.set(res.data || []); this.total.set(res.data?.length || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
