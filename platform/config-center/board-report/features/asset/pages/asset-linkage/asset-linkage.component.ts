import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, AssetDto, VendorLinkDto } from '../../services/asset-api.service';
import {  EmptyStateComponent} from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-linkage',
    imports: [CommonModule, FormsModule, EmptyStateComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--indigo-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--indigo-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .search-row { margin-bottom: 16px; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 300px; }
    .link-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-base); }
    .link-row:last-child { border-bottom: none; }
    .link-type { background: var(--surface-100); padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .asset-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .asset-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .asset-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-link"></i></div>
        <div><h1>Asset Linkage</h1><p class="subtitle">Risk, control, vendor, and evidence mappings</p></div>
      </header>

      <div class="section">
        <h3 class="section-title">Select Asset</h3>
        <div class="search-row">
          <input class="search-input" placeholder="Search assets to view links..." [ngModel]="search()" (ngModelChange)="search.set($event); searchAssets()">
        </div>
        @if (searchResults().length > 0) {
          <table class="asset-table">
            <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody>
              @for (a of searchResults(); track a.id) {
                <tr>
                  <td>{{ a.name }}</td>
                  <td>{{ a.type }}</td>
                  <td><button class="link-type" (click)="selectAsset(a.id)">View Links</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (selectedAssetId()) {
        <div class="section">
          <h3 class="section-title">Vendor Links</h3>
          @if (vendorLinks().length > 0) {
            @for (vl of vendorLinks(); track vl.linkId) {
              <div class="link-row">
                <span>Vendor: {{ vl.vendorId | slice:0:8 }}</span>
                <span class="link-type">{{ vl.linkType }}</span>
              </div>
            }
          } @else {
            <app-empty-state title="No Vendor Links" message="No vendor links for this asset." icon="pi-link" />
          }
        </div>
      }
    </div>
  `
})
export class AssetLinkageComponent {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  search = signal('');
  searchResults = signal<AssetDto[]>([]);
  selectedAssetId = signal('');
  vendorLinks = signal<VendorLinkDto[]>([]);

  searchAssets(): void {
    const term = this.search();
    if (!term || term.length < 2) { this.searchResults.set([]); return; }
    this.api.list({ search: term, limit: 10 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.searchResults.set(res.data || []),
      error: () => {},
    });
  }

  selectAsset(id: string): void {
    this.selectedAssetId.set(id);
    this.api.getVendorLinks(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.vendorLinks.set(res.data || []),
      error: () => {},
    });
  }
}
