/**
 * Platform Registry Explorer — operator view of the DOS orchestrator.
 *
 * Renders:
 *   - products table (code, version, enabled)
 *   - modules table (filterable by layer)
 *   - a tenant-lookup form that fetches a single TenantRef on submit
 *
 * Reads through the four DOS frontend DI tokens. Standalone, OnPush,
 * signal-driven.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  DOS_MODULE_REGISTRY_PORT,
  DOS_PRODUCT_REGISTRY_PORT,
  DOS_TENANT_LOOKUP_PORT,
  type DOSModuleRegistryPort,
  type DOSProductRegistryPort,
  type DOSTenantLookupPort,
} from '../../ports';
import type { ModuleDescriptor, ProductDescriptor, TenantRef } from '@dos/ports/dos';

@Component({
  selector: 'dos-registry-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-explorer">
      <header class="dos-explorer__header">
        <h2>Platform Registry</h2>
        <button type="button" (click)="refreshAll()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Refresh' }}
        </button>
      </header>

      <div *ngIf="error() as err" class="dos-explorer__error" role="alert">{{ err }}</div>

      <!-- Products -->
      <section class="dos-explorer__products">
        <h3>Products ({{ products().length }})</h3>
        <table>
          <thead><tr><th>Code</th><th>Version</th><th>Enabled</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of products(); trackBy: trackProductCode">
              <td>{{ p.productCode }}</td>
              <td>{{ p.version }}</td>
              <td [class.yes]="p.enabled" [class.no]="!p.enabled">
                {{ p.enabled ? 'yes' : 'no' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Modules -->
      <section class="dos-explorer__modules">
        <h3>Modules ({{ modules().length }})</h3>
        <div class="dos-explorer__filters">
          <label><input type="radio" name="layer" [(ngModel)]="layerFilter" value="" (change)="applyFilter()"> All</label>
          <label><input type="radio" name="layer" [(ngModel)]="layerFilter" value="platform" (change)="applyFilter()"> Platform</label>
          <label><input type="radio" name="layer" [(ngModel)]="layerFilter" value="product" (change)="applyFilter()"> Product</label>
        </div>
        <table>
          <thead><tr><th>Code</th><th>Version</th><th>Layer</th><th>Owner team</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of modules(); trackBy: trackModuleCode">
              <td>{{ m.moduleCode }}</td>
              <td>{{ m.version }}</td>
              <td><span class="layer-pill" [class]="'layer-' + m.layer">{{ m.layer }}</span></td>
              <td>{{ m.ownerTeam }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tenant lookup -->
      <section class="dos-explorer__tenant-lookup">
        <h3>Tenant Lookup</h3>
        <form (ngSubmit)="lookupTenant()">
          <input [(ngModel)]="lookupId" name="lookupId" placeholder="tenant id" required>
          <button type="submit" [disabled]="!lookupId || busy()">Look up</button>
        </form>
        <p *ngIf="lookedUpTenant() as t" class="dos-explorer__tenant-result">
          <strong>{{ t.tenantId }}</strong> · product {{ t.productCode ?? '—' }}
          · status <span [class]="'status-' + t.status">{{ t.status }}</span>
        </p>
        <p *ngIf="lookupMissed()" class="dos-explorer__tenant-miss">Tenant not found.</p>
      </section>
    </section>
  `,
  styles: [`
    .dos-explorer { font-family: system-ui, sans-serif; display:grid; gap:1rem; }
    .dos-explorer__header { display:flex; justify-content:space-between; align-items:center; }
    .dos-explorer__error { color:#a00; padding:0.5rem; border:1px solid #f00; }
    .dos-explorer table { width:100%; border-collapse:collapse; }
    .dos-explorer th, .dos-explorer td { text-align:left; padding:0.25rem 0.5rem; border-bottom:1px solid #eee; }
    .yes { color:#060; } .no { color:#a00; }
    .layer-pill { font-size:0.8rem; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .layer-platform { background:#def; color:#036; }
    .layer-product  { background:#fde; color:#603; }
    .dos-explorer__filters { display:flex; gap:1rem; padding:0.25rem 0; }
    .dos-explorer__tenant-lookup form { display:flex; gap:0.5rem; }
    .dos-explorer__tenant-lookup input { flex:1; padding:0.25rem 0.5rem; }
    .status-active { color:#060; } .status-suspended { color:#a60; }
    .status-provisioning { color:#069; } .status-decommissioned { color:#666; }
    .dos-explorer__tenant-miss { color:#a00; }
  `],
})
export class DosRegistryExplorerComponent implements OnInit {
  private modulesPort = inject<DOSModuleRegistryPort>(DOS_MODULE_REGISTRY_PORT);
  private productsPort = inject<DOSProductRegistryPort>(DOS_PRODUCT_REGISTRY_PORT);
  private tenantsPort = inject<DOSTenantLookupPort>(DOS_TENANT_LOOKUP_PORT);

  layerFilter: 'platform' | 'product' | '' = '';
  lookupId = '';

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private readonly _modules = signal<readonly ModuleDescriptor[]>([]);
  private readonly _products = signal<readonly ProductDescriptor[]>([]);
  private readonly _tenant = signal<TenantRef | null>(null);
  private readonly _tenantMissed = signal(false);

  readonly modules = computed(() => this._modules());
  readonly products = computed(() => this._products());
  readonly lookedUpTenant = computed(() => this._tenant());
  readonly lookupMissed = computed(() => this._tenantMissed());

  trackProductCode(_i: number, p: ProductDescriptor): string { return p.productCode; }
  trackModuleCode(_i: number, m: ModuleDescriptor): string { return m.moduleCode; }

  ngOnInit(): void {
    void this.refreshAll();
  }

  async refreshAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [mods, prods] = await Promise.all([
        firstValueFrom(this.modulesPort.list(this.layerFilter || undefined)),
        firstValueFrom(this.productsPort.list()),
      ]);
      this._modules.set([...mods]);
      this._products.set([...prods]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load registry.');
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilter(): Promise<void> {
    try {
      const mods = await firstValueFrom(this.modulesPort.list(this.layerFilter || undefined));
      this._modules.set([...mods]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Filter failed.');
    }
  }

  async lookupTenant(): Promise<void> {
    this.busy.set(true);
    this._tenant.set(null);
    this._tenantMissed.set(false);
    try {
      const t = await firstValueFrom(this.tenantsPort.get(this.lookupId));
      if (t) this._tenant.set(t);
      else this._tenantMissed.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Tenant lookup failed.');
    } finally {
      this.busy.set(false);
    }
  }
}
