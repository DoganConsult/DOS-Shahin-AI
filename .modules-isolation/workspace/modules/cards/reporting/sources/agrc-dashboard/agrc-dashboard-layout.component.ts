// ============================================
// AGRC-OS Dynamic Dashboard — Catalog-driven, role-aware, bilingual
// 38+ dashboards · 100+ widgets · 5 categories · org-tailored
// ============================================

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, Subscription, forkJoin, of, catchError } from 'rxjs';
import {
  DashboardCatalogService,
  type DashboardLayout,
  type DashboardCatalogEntry,
  type DashboardStats,
  type CategoryMeta,
  type DashboardCategory,
} from '@app/workspace/dashboard-catalog.service';
import { SessionService } from '@app/dauth/session/session.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WidgetRegistryService } from '@app/shared/widgets/widget-core/widget-infra/widget-registry.service';
import type { WidgetManifest } from '@app/shared/widgets/widget-core/core/models/widget-manifest.model';
import { agrcOsWidgetKeyToId } from '@app/shared/widgets/agrc-os-widget-map';
import { registerAllWidgets } from '@app/shared/widgets/register-widgets';
import { WidgetContainerComponent } from '@app/shared/widgets/widget-container.component';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-agrc-dashboard-layout',
    imports: [CommonModule, RouterLink, FormsModule, PageShellComponent, WidgetContainerComponent],
    template: `
    <app-page-shell
      icon="chart-bar"
      [title]="dashboardTitle()"
      [subtitle]="dashboardSubtitle()"
      [breadcrumbs]="['Dashboard', dashboardTitle()]"
      [loading]="loading()">

      <!-- ─── CATALOG HEADER ─────────────────────────────────── -->
      <ng-container *ngIf="!loading()">

        <!-- Recommended role-based banner -->
        <div class="role-banner" *ngIf="roleDashboard() && currentCode() !== roleDashboard()!.code">
          <i class="pi pi-sparkles"></i>
          <span>{{ i18n.translate('agrcDashboard.recommendedForRole') }}</span>
          <a [routerLink]="['/agrc-dashboard', roleDashboard()!.code]" class="role-link">
            {{ dashboardLabel(roleDashboard()!) }}
          </a>
        </div>

        <!-- Category pills -->
        <div class="category-bar">
          <button class="cat-pill" [class.active]="activeCategory() === 'all'"
                  (click)="setCategory('all')">
            {{ i18n.translate('common.all') }}
            <span class="cat-count">{{ stats()?.total ?? 0 }}</span>
          </button>
          <button class="cat-pill" [class.active]="activeCategory() === 'favorites'"
                  (click)="setCategory('favorites')">
            <i class="pi pi-star-fill" style="font-size: var(--font-size-xs)"></i>
            {{ i18n.translate('agrcDashboard.favorites') }}
            <span class="cat-count">{{ catalog.favorites().length }}</span>
          </button>
          <button *ngFor="let cat of categories()" class="cat-pill"
                  [class.active]="activeCategory() === cat.key"
                  (click)="setCategory(cat.key)">
            <i class="pi" [ngClass]="cat.icon"></i>
            {{ i18n.localize(cat.labelEn, cat.labelAr) }}
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </div>

        <!-- Search bar -->
        <div class="search-row">
          <div class="search-box">
            <i class="pi pi-search"></i>
            <input type="text" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                   [placeholder]="i18n.translate('agrcDashboard.searchDashboards')" [attr.aria-label]="i18n.translate('agrcDashboard.searchDashboards')" />
          </div>
          <div class="stats-bar">
            <span class="stat-pill"><strong>{{ filteredDashboards().length }}</strong> {{ i18n.translate('agrcDashboard.dashboards') }}</span>
            <span class="stat-pill"><strong>{{ placements().length }}</strong> {{ i18n.translate('agrcDashboard.widgetsInView') }}</span>
            <span class="stat-pill tech">ECharts</span>
            <span class="stat-pill tech">D3.js</span>
            <span class="stat-pill tech">Plotly 3D</span>
          </div>
        </div>

        <!-- Dashboard selector tabs (filtered) -->
        <div class="dashboard-tabs">
          <a *ngFor="let d of filteredDashboards()"
             [routerLink]="['/agrc-dashboard', d.code]"
             class="tab"
             [class.active]="currentCode() === d.code"
             [class.fav]="catalog.isFavorite(d.code)"
             [title]="d.label">
            <i class="pi" [ngClass]="d.icon || 'pi-chart-bar'" style="font-size: var(--font-size-sm)"></i>
            {{ dashboardLabel(d) }}
            <button class="fav-btn" (click)="toggleFav($event, d.code)" [title]="catalog.isFavorite(d.code) ? 'Remove' : 'Favorite'">
              <i class="pi" [ngClass]="catalog.isFavorite(d.code) ? 'pi-star-fill' : 'pi-star'"></i>
            </button>
          </a>
        </div>

        <!-- ─── WIDGET GRID ───────────────────────────────────── -->
        <div class="widget-grid"
             *ngIf="activeLayout()"
             [style.gridTemplateColumns]="'repeat(' + (activeLayout()?.columns ?? 12) + ', 1fr)'">
          <ng-container *ngFor="let placement of placements(); let i = index">
            <app-widget-container
              *ngIf="placement.def"
              [widgetComponent]="placement.def.component"
              [widgetId]="placement.key"
              [icon]="placement.def.icon"
              [nameEn]="placement.def.nameEn"
              [nameAr]="placement.def.nameAr"
              [width]="placement.w"
              [height]="placement.h"
              [style.--stagger-delay]="(i * 50) + 'ms'"
              displayMode="expanded" />
            <div *ngIf="!placement.def" class="widget-placeholder"
                 [style.gridColumn]="'span ' + placement.w"
                 [style.gridRow]="'span ' + placement.h"
                 [style.--stagger-delay]="(i * 50) + 'ms'">
              <span class="placeholder-icon">📦</span>
              <span class="placeholder-label">{{ placement.key }}</span>
            </div>
          </ng-container>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="!activeLayout() && !loading()">
          <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); opacity: 0.3"></i>
          <p>{{ i18n.translate('agrcDashboard.noDashboardFound') }}</p>
          <a [routerLink]="['/agrc-dashboard', 'big_picture']" class="back-link">
            {{ i18n.translate('agrcDashboard.backToBigPicture') }}
          </a>
        </div>
      </ng-container>
    </app-page-shell>
  `,
    styles: [`
    /* ── Role banner ───────────────────────────────────── */
    .role-banner { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; margin-bottom: 0.75rem; background: linear-gradient(90deg, var(--carbon-blue-10, #edf5ff), var(--surface-ice)); border-radius: var(--radius, 8px); border: 1px solid var(--carbon-blue-20, #d0e2ff); font-size: var(--font-size-sm); color: var(--text-body); animation: premium-fade-up 300ms both; }
    .role-banner .pi-sparkles { color: var(--primary); }
    .role-link { color: var(--primary); font-weight: 600; text-decoration: none; }
    .role-link:hover { text-decoration: underline; }

    /* ── Category bar ──────────────────────────────────── */
    .category-bar { display: flex; gap: 0.375rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .cat-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0.375rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); color: var(--text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; transition: all 180ms; }
    .cat-pill:hover { background: var(--surface-ice); color: var(--text-heading); border-color: var(--border-primary); }
    .cat-pill.active { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: var(--shadow-sm); }
    .cat-count { font-size: var(--font-size-xs); font-weight: 700; padding: 1px 5px; border-radius: var(--radius-md); background: rgba(var(--color-white-rgb), 0.15); }
    .cat-pill.active .cat-count { background: rgba(var(--color-white-rgb), 0.25); }

    /* ── Search ─────────────────────────────────────────── */
    .search-row { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; align-items: center; }
    .search-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius); flex: 1; min-width: 200px; }
    .search-box .pi-search { color: var(--text-disabled); font-size: var(--font-size-sm); }
    .search-box input { border: none; outline: none; background: transparent; color: var(--text-body); font-size: var(--font-size-sm); flex: 1; font-family: inherit; }
    .stats-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .stat-pill { padding: 4px 12px; border-radius: var(--radius-pill); background: var(--surface-ice); color: var(--text-muted); font-size: var(--font-size-xs); font-weight: 500; border: 1px solid var(--border-subtle); }
    .stat-pill strong { color: var(--primary); font-weight: 700; }
    .stat-pill.tech { background: var(--carbon-blue-10, #edf5ff); color: var(--carbon-blue-70, #0043ce); border-color: var(--carbon-blue-20, #d0e2ff); font-weight: 600; }

    /* ── Dashboard tabs ────────────────────────────────── */
    .dashboard-tabs { display: flex; gap: 0.375rem; margin-bottom: 1rem; flex-wrap: wrap; max-height: 200px; overflow-y: auto; }
    .tab { display: inline-flex; align-items: center; gap: 5px; padding: 0.375rem 0.75rem; border-radius: var(--radius, 8px); text-decoration: none; color: var(--text-muted); font-weight: 500; font-size: var(--font-size-sm); transition: all 200ms; position: relative; white-space: nowrap; }
    .tab:hover { background: var(--surface-ice); color: var(--text-heading); }
    .tab.active { background: var(--primary); color: #fff; box-shadow: var(--shadow-sm); animation: scale-pop 250ms both; }
    .tab.fav:not(.active) { border-inline-start: 2px solid var(--carbon-gold-40, #d2a106); }
    .fav-btn { all: unset; cursor: pointer; font-size: var(--font-size-xs); opacity: 0.4; transition: opacity 150ms, color 150ms; line-height: 1; }
    .fav-btn:hover { opacity: 1; color: var(--carbon-gold-40, #d2a106); }
    .tab.active .fav-btn { opacity: 0.7; color: #fff; }

    /* ── Widget grid ───────────────────────────────────── */
    .widget-grid { display: grid; gap: 1rem; grid-auto-rows: 140px; }
    .widget-placeholder { background: var(--surface-ice); border: 1px dashed var(--border-primary); border-radius: var(--radius-lg, 12px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); font-size: var(--font-size-caption); animation: premium-fade-up 400ms both; animation-delay: var(--stagger-delay, 0ms); transition: border-color 200ms, background 200ms; }
    .widget-placeholder:hover { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
    .placeholder-icon { font-size: var(--font-size-2xl); opacity: 0.5; }
    .placeholder-label { font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: var(--font-size-xs); }

    /* ── Empty state ───────────────────────────────────── */
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: var(--text-muted); text-align: center; }
    .back-link { color: var(--primary); text-decoration: none; font-weight: 600; font-size: var(--font-size-sm); }
    .back-link:hover { text-decoration: underline; }

    /* rd-tabs PrimeNG override — migrated from primeng-component-rules.css (Law 2) */
    .rd-tabs .p-tabview-panels { padding: 16px 0; }
  `]
})
export class AgrcDashboardLayoutComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  // ── Injected services ───────────────────────────────────────────────────
  catalog   = inject(DashboardCatalogService);
  private auth     = inject(SessionService);
  i18n      = inject(I18nService);
  private registry = inject(WidgetRegistryService);
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private sub?: Subscription;

  // ── State signals ───────────────────────────────────────────────────────
  loading       = signal(true);
  currentCode   = signal('big_picture');
  activeLayout  = signal<DashboardLayout | null>(null);
  allDashboards = signal<DashboardCatalogEntry[]>([]);
  stats         = signal<DashboardStats | null>(null);
  categories    = signal<CategoryMeta[]>([]);
  roleDashboard = signal<DashboardLayout | null>(null);
  activeCategory = signal<string>('all');
  searchTerm    = signal('');
  totalWidgets  = 0;

  // ── Derived signals ─────────────────────────────────────────────────────
  filteredDashboards = computed(() => {
    let list = this.allDashboards();
    const cat = this.activeCategory();
    const term = this.searchTerm().toLowerCase().trim();

    if (cat === 'favorites') {
      const favs = this.catalog.favorites();
      list = list.filter((d) => favs.includes(d.code));
    } else if (cat !== 'all') {
      list = list.filter((d) => d.category === cat);
    }
    if (term) {
      list = list.filter(
        (d) =>
          d.code.toLowerCase().includes(term) ||
          d.label.toLowerCase().includes(term) ||
          d.labelAr.includes(term),
      );
    }
    return list;
  });

  placements = computed(() => {
    const layout = this.activeLayout();
    if (!layout) return [];
    return (layout.widgets ?? [])
      .sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x))
      .map((p) => {
        const frontendId = agrcOsWidgetKeyToId(p.id);
        const manifest = this.registry.get(frontendId);
        // Adapt manifest to shape expected by template (nameEn, nameAr, component)
        const def = manifest ? {
          component: manifest.component,
          nameEn: manifest.title,
          nameAr: manifest.titleAr ?? manifest.title,
          icon: manifest.icon ?? '',
        } : null;
        return { key: p.id, w: p.w || 1, h: p.h || 1, def };
      });
  });

  dashboardTitle = computed(() => {
    const layout = this.activeLayout();
    if (!layout) return this.i18n.translate('agrcDashboard.dashboard');
    return this.dashboardLabel(layout);
  });

  dashboardSubtitle = computed(() => {
    const s = this.stats();
    if (!s) return '';
    return this.i18n.localize(
      `AGRC-OS — ${s.total} dashboards · ${this.totalWidgets} widgets registered`,
      `AGRC-OS — ${s.total} لوحة · ${this.totalWidgets} عنصر مسجل`
    );
  });

  constructor() {
    // Widget registration now happens via APP_INITIALIZER (provideWidgetRegistry)
    registerAllWidgets(this.registry); // no-op compatibility call
    this.totalWidgets = this.registry.list().length;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load catalog + role dashboard in parallel
    this.catalog.getCatalog().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entries) => {
        this.allDashboards.set(entries as any);
        this.stats.set(this.catalog.stats() as any);
        this.categories.set(this.catalog.getCategoryMetas() as any);
      },
    });

    // React to route param changes → load layout
    this.sub = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const code = params.get('code') || 'big_picture';
          this.currentCode.set(code);
          this.loading.set(true);
          this.activeLayout.set(null);
          return this.catalog.getLayout(code).pipe(
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (layout) => {
          this.activeLayout.set(layout);
          this.loading.set(false);
        },
        error: () => {
          this.activeLayout.set(null);
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  toggleFav(event: Event, code: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.catalog.toggleFavorite(code);
  }

  /** Bilingual label resolver for catalog entries and loaded layouts. */
  dashboardLabel(d: DashboardLayout | { code?: string; label?: string; labelAr?: string; title?: string; titleAr?: string }): string {
    const label = ('label' in d ? d.label : undefined) ?? ('title' in d ? d.title : undefined) ?? d.code ?? '';
    const labelAr = ('labelAr' in d ? d.labelAr : undefined) ?? ('titleAr' in d ? d.titleAr : undefined) ?? label;
    return this.i18n.localize(label, labelAr);
  }

}
