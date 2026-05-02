import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, AssetDto } from '../../services/asset-api.service';
import { SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-detail',
    imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .back-link { font-size: var(--font-size-xs-plus); color: var(--primary-500); cursor: pointer; margin-bottom: 16px; display: inline-block; }
    .detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .icon-wrap { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: var(--cyan-50); }
    .icon-wrap i { font-size: var(--font-size-3xl); color: var(--cyan-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .meta { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: var(--font-size-base); font-weight: 500; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      @if (loading()) {
        <app-skeleton-loader [rows]="6" />
      } @else if (asset()) {
        <a class="back-link" (click)="goBack()"><i class="pi pi-arrow-left"></i> Back to Register</a>
        <div class="detail-header">
          <div class="icon-wrap"><i class="pi pi-server"></i></div>
          <div>
            <h1>{{ asset()!.name }}</h1>
            <div class="meta">
              <app-status-badge [status]="asset()!.status" />
              <app-status-badge [status]="asset()!.criticality" />
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">Overview</h3>
          <div class="detail-grid">
            <div class="field"><span class="field-label">Type</span><span class="field-value">{{ asset()!.type }}</span></div>
            <div class="field"><span class="field-label">Classification</span><span class="field-value">{{ asset()!.classification }}</span></div>
            <div class="field"><span class="field-label">Category</span><span class="field-value">{{ asset()!.assetCategory || '—' }}</span></div>
            <div class="field"><span class="field-label">Lifecycle Stage</span><span class="field-value">{{ asset()!.lifecycleStage || '—' }}</span></div>
            <div class="field"><span class="field-label">Owner</span><span class="field-value">{{ asset()!.ownerName || '—' }}</span></div>
            <div class="field"><span class="field-label">Department</span><span class="field-value">{{ asset()!.departmentName || '—' }}</span></div>
            <div class="field"><span class="field-label">Location</span><span class="field-value">{{ asset()!.location || '—' }}</span></div>
            <div class="field"><span class="field-label">IP Address</span><span class="field-value">{{ asset()!.ipAddress || '—' }}</span></div>
            <div class="field"><span class="field-label">Vendor</span><span class="field-value">{{ asset()!.vendor || '—' }}</span></div>
            <div class="field"><span class="field-label">External Exposure</span><span class="field-value">{{ asset()!.externalExposure ? 'Yes' : 'No' }}</span></div>
            <div class="field"><span class="field-label">Compliance Score</span><span class="field-value">{{ asset()!.complianceScore ?? '—' }}</span></div>
            <div class="field"><span class="field-label">Risk Score</span><span class="field-value">{{ asset()!.riskScore ?? '—' }}</span></div>
            <div class="field"><span class="field-label">Valuation</span><span class="field-value">{{ asset()!.valuationAmount ? (asset()!.valuationAmount + ' ' + (asset()!.valuationCurrency || 'SAR')) : '—' }}</span></div>
            <div class="field"><span class="field-label">CMDB ID</span><span class="field-value">{{ asset()!.cmdbId || '—' }}</span></div>
            <div class="field"><span class="field-label">Acquisition Date</span><span class="field-value">{{ asset()!.acquisitionDate || '—' }}</span></div>
            <div class="field"><span class="field-label">Created</span><span class="field-value">{{ asset()!.createdAt | date:'medium' }}</span></div>
          </div>
        </div>
      } @else {
        <app-empty-state title="Not Found" message="Asset not found." icon="pi-server" />
      }
    </div>
  `
})
export class AssetDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  asset = signal<AssetDto | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.api.get(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.asset.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  goBack(): void { history.back(); }
}
