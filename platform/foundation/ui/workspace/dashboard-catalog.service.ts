import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export type DashboardCategory = 'governance' | 'risk' | 'compliance' | 'operations' | 'executive' | string;

export interface DashboardCatalogEntry {
  code: string;
  label: string;
  labelAr?: string;
  description?: string;
  icon?: string;
  category: DashboardCategory;
  roleCode?: string;
  sortOrder: number;
  enabled: boolean;
}

export interface DashboardLayout {
  code: string;
  columns: number;
  placements: { key: string; x: number; y: number; w: number; h: number }[];
  widgets?: any[];
}

export interface DashboardStats {
  total: number;
  byCategory: Record<string, number>;
}

export interface CategoryMeta {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardCatalogService {
  private readonly http = inject(HttpClient);
  private readonly _entries = signal<DashboardCatalogEntry[]>([]);
  private readonly _layouts = signal<Record<string, DashboardLayout>>({});
  private readonly _favorites = signal<string[]>([]);

  readonly entries = this._entries.asReadonly();
  readonly favorites = this._favorites.asReadonly();

  readonly stats = computed<DashboardStats>(() => {
    const entries = this._entries();
    const byCategory: Record<string, number> = {};
    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    }
    return { total: entries.length, byCategory };
  });

  loadCatalog(): Observable<DashboardCatalogEntry[]> {
    return this.http.get<DashboardCatalogEntry[]>('/api/dashboards/catalog').pipe(
      tap(entries => this._entries.set(entries)),
      catchError(() => of([])),
    );
  }

  getLayout(code: string): Observable<DashboardLayout | null> {
    const cached = this._layouts()[code];
    if (cached) return of(cached);
    return this.http.get<DashboardLayout>(`/api/dashboards/${code}/layout`).pipe(
      tap(layout => this._layouts.update(m => ({ ...m, [code]: layout }))),
      catchError(() => of(null)),
    );
  }

  getByRole(roleCode: string): DashboardCatalogEntry | undefined {
    return this._entries().find(e => e.roleCode === roleCode);
  }

  isFavorite(code: string): boolean {
    return this._favorites().includes(code);
  }

  toggleFavorite(code: string): void {
    this._favorites.update(favs =>
      favs.includes(code) ? favs.filter(f => f !== code) : [...favs, code],
    );
  }

  getCatalog(): Observable<DashboardCatalogEntry[]> {
    return this.loadCatalog();
  }

  getRoleDashboard(roleCode: string): DashboardCatalogEntry | undefined {
    return this.getByRole(roleCode);
  }

  getCategoryMetas(): CategoryMeta[] {
    const entries = this._entries();
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.category, (map.get(e.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      labelEn: key,
      labelAr: key,
      icon: 'chart--bar',
      count,
    }));
  }
}
