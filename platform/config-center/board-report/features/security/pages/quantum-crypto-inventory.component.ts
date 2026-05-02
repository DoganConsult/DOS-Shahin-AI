import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface CryptoAsset {
  id: string;
  name: string;
  algorithm: string;
  keySize: number;
  usage: 'encryption' | 'signing' | 'hashing' | 'key_exchange' | 'tls';
  system: string;
  quantumSafe: boolean;
  expiresAt: string;
  status: 'active' | 'expiring' | 'expired' | 'deprecated';
}

@Component({
  selector: 'app-quantum-crypto-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('quantum.cryptoInventory') || 'Cryptographic Asset Inventory' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('quantum.cryptoInventoryDesc') || 'Catalog cryptographic algorithms, keys, and certificates across all systems for quantum readiness assessment.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ assets().length }}</span><span class="kpi-label">Total Assets</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ quantumSafeCount() }}</span><span class="kpi-label">Quantum-Safe</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ vulnerableCount() }}</span><span class="kpi-label">Vulnerable</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ expiringCount() }}</span><span class="kpi-label">Expiring</span></div>
      </div>

      <div class="section-card">
        <div class="table-header">
          <h3>Asset Register</h3>
          <input type="text" class="search-input" placeholder="Search assets..." (input)="onSearch($event)" />
        </div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Algorithm</th><th>Key Size</th><th>Usage</th><th>System</th><th>Quantum-Safe</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            @for (a of filteredAssets(); track a.id) {
              <tr>
                <td class="cell-title">{{ a.name }}</td>
                <td><code class="algo-code">{{ a.algorithm }}</code></td>
                <td>{{ a.keySize }} bit</td>
                <td>{{ a.usage }}</td>
                <td>{{ a.system }}</td>
                <td><span class="qs-badge" [class.qs-yes]="a.quantumSafe" [class.qs-no]="!a.quantumSafe">{{ a.quantumSafe ? 'Yes' : 'No' }}</span></td>
                <td>{{ a.expiresAt | date:'mediumDate' }}</td>
                <td><span class="status-badge" [class]="'st-' + a.status">{{ a.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-cell">No cryptographic assets inventoried</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-danger .kpi-value { color: var(--red-500); } .kpi-warning .kpi-value { color: var(--yellow-600); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); background: var(--surface-ground); color: var(--text-color); width: 220px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .algo-code { font-family: monospace; font-size: var(--font-size-caption); background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); }
    .qs-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; }
    .qs-yes { background: var(--green-50); color: var(--green-700); } .qs-no { background: var(--red-50); color: var(--red-700); }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-active { background: var(--green-50); color: var(--green-700); } .st-expiring { background: var(--yellow-50); color: var(--yellow-700); }
    .st-expired { background: var(--red-50); color: var(--red-700); } .st-deprecated { background: var(--surface-ground); color: var(--text-color-secondary); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `],
})
export class QuantumCryptoInventoryComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly assets = signal<CryptoAsset[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredAssets = () => { const t = this.searchTerm().toLowerCase(); return t ? this.assets().filter(a => a.name.toLowerCase().includes(t) || a.algorithm.toLowerCase().includes(t) || a.system.toLowerCase().includes(t)) : this.assets(); };
  protected readonly quantumSafeCount = () => this.assets().filter(a => a.quantumSafe).length;
  protected readonly vulnerableCount = () => this.assets().filter(a => !a.quantumSafe).length;
  protected readonly expiringCount = () => this.assets().filter(a => a.status === 'expiring').length;

  ngOnInit(): void { this.http.get<CryptoAsset[]>('/api/security/quantum/crypto-inventory').subscribe({ next: (d) => this.assets.set(d), error: () => {} }); }
  onSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
}
