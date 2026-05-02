/**
 * Phase 4: Fetches tenant-scoped products/modules config from GET /api/config/products-modules.
 * Used for nav visibility filtering and business labels (AGRC-OS = platform, Shahin-AI = product).
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ProductsModulesConfig } from './products-modules-config.models';
import { isActiveModule } from '../../core/platform/navigation/active-modules';

@Injectable({ providedIn: 'root' })
export class ProductsModulesConfigService {
  private http = inject(HttpClient);

  private readonly _config = signal<ProductsModulesConfig | null>(null);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly config = computed(() => this._config());
  readonly visibleModules = computed(() => this._config()?.visibleModules ?? []);
  readonly internalKeyToBusinessLabel = computed(() => this._config()?.internalKeyToBusinessLabel ?? {});

  /** Whether a module code is visible for the current tenant (from DB/entitlements). */
  isModuleVisible(moduleCode: string | null | undefined): boolean {
    if (moduleCode == null || moduleCode === '') return true;
    if (!isActiveModule(moduleCode)) return false;
    const cfg = this._config();
    // Fail-closed: when tenant config is unavailable or empty we MUST NOT
    // leak module visibility. Foundation Horizontal Closure removed the
    // previous "config not loaded → return true" backward-compat fallback.
    if (!cfg) return false;
    const vis = cfg.visibleModules ?? [];
    if (vis.length === 0) return false;
    return vis.includes(moduleCode);
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<ProductsModulesConfig>(`${environment.apiUrl}/config/products-modules`)
      );
      this._config.set(data);
      this.loaded.set(true);
    } catch (err: unknown) {
      this.error.set((err instanceof Error ? err.message : null) ?? 'Failed to load products-modules config');
      this.loaded.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  clear(): void {
    this._config.set(null);
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
  }
}
