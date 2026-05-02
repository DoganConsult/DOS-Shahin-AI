import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { SecurityApiService, QuantumKpis, CryptoAsset } from '../services/security-api.service';
import { forkJoin } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .dashboard-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 20px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; margin-bottom: 8px; }
    .kpi-label { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); font-weight: 500; }
    .breakdown-section { margin-bottom: 24px; }
    .breakdown-title { font-size: var(--font-size-lg); font-weight: 700; margin: 0 0 16px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface-border); font-size: var(--font-size-sm); }
    .breakdown-row:last-child { border-bottom: none; }
    .breakdown-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    
    .status-badge { padding: 4px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-2xs); font-weight: 600; text-transform: uppercase; }
    .status-critical { background: var(--red-100); color: var(--red-800); }
    .status-migrated { background: var(--green-100); color: var(--green-800); }
    .status-pending { background: var(--yellow-100); color: var(--yellow-800); }

    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="dashboard-page" [dir]="i18n.direction()">
      <h2 class="page-title">Quantum Cryptography Readiness</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (error()) {
        <p style="color: var(--red-500)">Failed to load security telemetry.</p>
      } @else if (kpis()) {
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">{{ kpis()!.totalCryptoAssets }}</div>
            <div class="kpi-label">Active Crypto Assets</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color:var(--green-600)">{{ kpis()!.pqcMigratedAssets }}</div>
            <div class="kpi-label">PQC Migrated</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color:var(--red-600)">{{ kpis()!.quantumVulnerableAssets }}</div>
            <div class="kpi-label">Quantum Vulnerable</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color:var(--primary-color)">{{ kpis()!.migrationProgress }}%</div>
            <div class="kpi-label">Migration Progress</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" [style.color]="kpis()!.readinessScore > 80 ? 'var(--green-600)' : 'var(--orange-500)'">{{ kpis()!.readinessScore }}</div>
            <div class="kpi-label">Readiness Score</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">Critical Vulnerabilities</h3>
              @if (kpis()!.criticalVulnerabilities === 0) {
                <div class="breakdown-row" style="color: var(--green-600); font-weight: 500;">
                  <span>Zero critical vulnerabilities detected</span>
                  <span><i class="pi pi-check-circle"></i></span>
                </div>
              } @else {
                <div class="breakdown-row" style="color: var(--red-600); font-weight: 500;">
                  <span>Attention Required</span>
                  <span>{{ kpis()!.criticalVulnerabilities }} Critical Findings</span>
                </div>
              }
            </div>
          </div>

          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">Recent Inventory</h3>
              @for (asset of inventory(); track asset.id) {
                <div class="breakdown-row">
                  <span style="font-weight: 500">{{ asset.name }} ({{ asset.algorithm }})</span>
                  <span class="status-badge" [ngClass]="{
                    'status-migrated': asset.pqcStatus === 'migrated',
                    'status-critical': asset.riskLevel === 'critical',
                    'status-pending': asset.pqcStatus !== 'migrated' && asset.riskLevel !== 'critical'
                  }">{{ asset.pqcStatus }}</span>
                </div>
              }
              @if (inventory().length === 0) {
                <div style="padding: 12px 16px; color: var(--text-color-secondary)">No assets found in schema.</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SecurityDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(SecurityApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  error = signal(false);
  
  kpis = signal<QuantumKpis | null>(null);
  inventory = signal<CryptoAsset[]>([]);

  ngOnInit(): void {
    forkJoin({
      kpis: this.api.getKpis(),
      inventory: this.api.getInventory(1, 5)
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        this.kpis.set(res.kpis);
        this.inventory.set(res.inventory.assets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }
}
