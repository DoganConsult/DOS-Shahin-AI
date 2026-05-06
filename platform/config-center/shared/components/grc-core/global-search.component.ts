/**
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) This component is deprecated. Use the canonical GlobalSearchComponent from:
 * @app/shared/global-search/global-search.component
 * 
 * This file is kept temporarily for backward compatibility during migration.
 * All consumers have been migrated to use the canonical implementation.
 * This file will be removed in the next major version.
 */
import { Component, signal, computed, ElementRef, HostListener, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TIMING } from '@app/runtime/_legacy/ui-constants';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { StorageService } from '@app/infrastructure';
import { GrcOperationsService } from '@app/api';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  snippet?: string;
  module: string;
  entity_type?: string;
  created_at?: string;
  status?: string;
  name?: string;
  url?: string; // Deep link URL provided by backend (FINDING-001 fix)
}

interface ResultGroup {
  module: string;
  icon: string;
  items: SearchResult[];
}

const MODULE_ICONS: Record<string, string> = {
  risk: 'pi-exclamation-triangle', policy: 'pi-file', control: 'pi-shield',
  framework: 'pi-book', evidence: 'pi-folder-open', audit: 'pi-verified',
  incident: 'pi-bolt', vendor: 'pi-truck', assessment: 'pi-clipboard',
  workflow: 'pi-sitemap', other: 'pi-circle',
};

const MODULE_ROUTES: Record<string, string> = {
  risk: '/risk-hub', policy: '/governance-hub', control: '/compliance-hub',
  framework: '/framework-hub', evidence: '/evidence-hub', audit: '/audit-hub',
  incident: '/incident-hub', vendor: '/vendor-hub', assessment: '/compliance-hub',
  workflow: '/workflow-hub',
};

const RECENT_KEY = 'agrc_recent_searches';
const MAX_RECENT = 6;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-global-search-deprecated',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, InputTextModule, TagModule],
  template: `
    <div class="gs-wrapper" [class.gs-open]="panelOpen()">
      <div class="gs-input-row">
        <i class="pi pi-search gs-icon"></i>
        <input #searchInput pInputText
          [(ngModel)]="query"
          (input)="onType()"
          (focus)="onFocus()"
          (keydown.escape)="close()"
          (keydown.arrowDown)="moveHighlight(1, $event)"
          (keydown.arrowUp)="moveHighlight(-1, $event)"
          (keydown.enter)="onEnter()"
          [placeholder]="i18n.translate('globalSearch.searchAllModules')" [attr.aria-label]="i18n.translate('globalSearch.searchAllModules')"
          class="gs-input"
          autocomplete="off" />
        <span class="gs-shortcut" *ngIf="!query && !panelOpen()">&#8984;K</span>
        <button [attr.aria-label]="i18n.translate('common.close')" class="gs-clear" *ngIf="query" (click)="clearQuery()"><i class="pi pi-times"></i></button>
      </div>

      <div class="gs-panel" *ngIf="panelOpen()" (mousedown)="$event.stopPropagation()">
        <div class="gs-filters" *ngIf="availableModules().length > 1">
          <button class="gs-chip" [class.active]="!activeModule()" (click)="setModule(null)">
            {{ i18n.translate('common.all') }}
          </button>
          <button class="gs-chip" *ngFor="let m of availableModules()" [class.active]="activeModule() === m"
            (click)="setModule(m)">
            <i class="pi" [ngClass]="getModuleIcon(m)"></i> {{ m }}
          </button>
        </div>

        <div class="gs-loading" *ngIf="searching()">
          <i class="pi pi-spin pi-spinner"></i>
          {{ i18n.translate('globalSearch.searching') }}
        </div>

        <div class="gs-results" *ngIf="!searching() && filteredGroups().length > 0">
          <ng-container *ngFor="let group of filteredGroups()">
            <div class="gs-group-header">
              <i class="pi" [ngClass]="group.icon"></i>
              <span>{{ group.module }}</span>
              <span class="gs-group-count">{{ group.items.length }}</span>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigateTo(item)" *ngFor="let item of group.items; let idx = index"
                 class="gs-result-item" [class.gs-highlighted]="isHighlighted(group.module, idx)"
                 (click)="navigateTo(item)" (mouseenter)="setHighlightedItem(group.module, idx)">
              <div class="gs-result-title">{{ item.title || item.name || item.id }}</div>
              <div class="gs-result-desc" *ngIf="item.description || item.snippet">
                {{ item.description || item.snippet }}
              </div>
              <div class="gs-result-meta">
                <p-tag *ngIf="item.status" [value]="item.status"
                  [severity]="getStatusSeverity(item.status)" [rounded]="true" />
                <span *ngIf="item.created_at" class="gs-date">{{ item.created_at | appDate:'short' }}</span>
              </div>
            </div>
          </ng-container>
        </div>

        <div class="gs-empty" *ngIf="!searching() && searched() && filteredGroups().length === 0">
          <i class="pi pi-inbox"></i>
          <span>{{ i18n.translate('globalSearch.noResults') }}</span>
        </div>

        <div class="gs-recents" *ngIf="!query && recentSearches().length > 0">
          <div class="gs-recents-header">
            <span>{{ i18n.translate('globalSearch.recentSearches') }}</span>
            <button class="gs-clear-recents" (click)="clearRecents()">{{ i18n.translate('common.clear') }}</button>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="useRecent(r)" *ngFor="let r of recentSearches()" class="gs-recent-item" (click)="useRecent(r)">
            <i class="pi pi-history"></i>
            <span>{{ r }}</span>
          </div>
        </div>

        <div class="gs-footer">
          <span class="gs-hint"><kbd>&uarr;&darr;</kbd> {{ i18n.translate('globalSearch.navigate') }}</span>
          <span class="gs-hint"><kbd>&crarr;</kbd> {{ i18n.translate('globalSearch.open') }}</span>
          <span class="gs-hint"><kbd>Esc</kbd> {{ i18n.translate('common.close') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gs-wrapper { position: relative; }
    .gs-input-row { display: flex; align-items: center; position: relative; }
    .gs-icon {
      position: absolute; inset-inline-start: 10px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); font-size: var(--font-size-base); z-index: var(--z-base); pointer-events: none;
    }
    .gs-input {
      width: 260px; padding: 8px 32px 8px 34px;
      font-size: var(--font-size-sm); border-radius: var(--radius);
      border: 1px solid var(--border-primary, var(--border-subtle));
      background: var(--surface-ice, var(--surface-ice));
      transition: width 200ms ease, box-shadow 200ms ease;
    }
    .gs-input:focus {
      width: 400px;
      box-shadow: var(--shadow-glow);
      border-color: var(--primary, var(--primary));
      background: var(--surface-card, #fff);
    }
    .gs-shortcut {
      position: absolute; inset-inline-end: 8px; top: 50%; transform: translateY(-50%);
      font-size: var(--font-size-xs); font-weight: 600; color: var(--text-caption, var(--text-muted));
      background: var(--surface-card, #fff); border: 1px solid var(--border-primary, var(--border-subtle));
      padding: 1px 6px; border-radius: var(--radius-xs); pointer-events: none;
      font-family: 'IBM Plex Mono', monospace;
    }
    .gs-clear {
      position: absolute; inset-inline-end: 6px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      padding: 4px; font-size: var(--font-size-sm);
    }
    .gs-clear:hover { color: var(--text-body); }
    .gs-panel {
      position: absolute; top: calc(100% + 6px); inset-inline-start: 0;
      width: 480px; max-height: 520px; overflow-y: auto;
      background: var(--surface-card, #fff); border: 1px solid var(--border-primary, var(--border-subtle));
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
      z-index: var(--z-toast); display: flex; flex-direction: column;
    }
    .gs-filters {
      display: flex; gap: 4px; padding: 10px 12px 6px; flex-wrap: wrap;
      border-bottom: 1px solid var(--border-subtle, var(--surface-ice));
    }
    .gs-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: var(--radius-pill);
      font-size: var(--font-size-xs); font-weight: 600; cursor: pointer;
      background: var(--surface-ice, var(--surface-ice)); border: 1px solid var(--border-primary, var(--border-subtle));
      color: var(--text-body); text-transform: capitalize; transition: all 150ms;
    }
    .gs-chip:hover { border-color: var(--primary, var(--primary)); color: var(--primary, var(--primary)); }
    .gs-chip.active { background: var(--primary, var(--primary)); color: white; border-color: var(--primary, var(--primary)); }
    .gs-chip .pi { font-size: var(--font-size-xs); }
    .gs-loading {
      display: flex; align-items: center; gap: 8px; padding: 20px 16px;
      color: var(--text-muted); font-size: var(--font-size-sm); justify-content: center;
    }
    .gs-results { padding: 4px 0; }
    .gs-group-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px 4px; font-size: var(--font-size-xs); font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px; color: var(--text-caption, var(--text-muted));
    }
    .gs-group-header .pi { font-size: var(--font-size-sm); color: var(--primary, var(--primary)); }
    .gs-group-count {
      margin-inline-start: auto; font-size: var(--font-size-xs);
      background: var(--surface-ice, var(--surface-ice)); padding: 1px 6px; border-radius: var(--radius-md);
      color: var(--text-muted);
    }
    .gs-result-item {
      padding: 8px 14px; cursor: pointer; transition: background 100ms;
      border-inline-start: 2px solid transparent;
    }
    .gs-result-item:hover, .gs-result-item.gs-highlighted {
      background: var(--surface-hover, var(--surface-ice));
      border-color: var(--primary, var(--primary));
    }
    .gs-result-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .gs-result-desc {
      font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 480px;
    }
    .gs-result-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
    .gs-date { font-size: var(--font-size-xs); color: var(--text-caption, var(--text-muted)); }
    .gs-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 16px; color: var(--text-muted);
    }
    .gs-empty .pi { font-size: var(--font-size-3xl); opacity: 0.4; }
    .gs-recents { padding: 8px 0; }
    .gs-recents-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 14px; font-size: var(--font-size-xs); font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px; color: var(--text-caption, var(--text-muted));
    }
    .gs-clear-recents {
      background: none; border: none; color: var(--primary, var(--primary)); cursor: pointer;
      font-size: var(--font-size-xs); font-weight: 600;
    }
    .gs-recent-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px; cursor: pointer; font-size: var(--font-size-sm); color: var(--text-body);
      transition: background 100ms;
    }
    .gs-recent-item:hover { background: var(--surface-hover, var(--surface-ice)); }
    .gs-recent-item .pi { font-size: var(--font-size-sm); color: var(--text-caption, var(--text-muted)); }
    .gs-footer {
      display: flex; gap: 16px; padding: 8px 14px;
      border-top: 1px solid var(--border-subtle, var(--surface-ice));
      font-size: var(--font-size-xs); color: var(--text-caption, var(--text-muted));
    }
    .gs-hint { display: flex; align-items: center; gap: 4px; }
    .gs-hint kbd {
      display: inline-block; padding: 0 4px; min-width: 18px; text-align: center;
      background: var(--surface-ice, var(--surface-ice)); border: 1px solid var(--border-primary, var(--border-subtle));
      border-radius: var(--radius-xs); font-family: 'IBM Plex Mono', monospace;
      font-size: var(--font-size-xs); line-height: 16px;
    }
    @media (max-width: 768px) {
      .gs-input { width: 180px; }
      .gs-input:focus { width: 260px; }
      .gs-panel { width: calc(100vw - 32px); inset-inline-start: -40px; }
    }
  `]
})
export class GlobalSearchComponent implements OnDestroy {
  private _storage = inject(StorageService);
  query = '';

  panelOpen = signal(false);
  searching = signal(false);
  searched = signal(false);
  activeModule = signal<string | null>(null);
  recentSearches = signal<string[]>(this._loadRecents());
  highlightedModule = signal<string>('');
  highlightedIdx = signal<number>(-1);

  private allGroups = signal<ResultGroup[]>([]);
  private debounceTimer: ReturnType<typeof setTimeout> | null;

  availableModules = computed(() => this.allGroups().map(g => g.module));
  filteredGroups = computed(() => {
    const mod = this.activeModule();
    if (!mod) return this.allGroups();
    return this.allGroups().filter(g => g.module === mod);
  });

  constructor(
    public i18n: I18nService,
    private router: Router,
    private elRef: ElementRef, private operationsSvc: GrcOperationsService
  ) {}

  onFocus(): void {
    this.panelOpen.set(true);
    if (this.query.length >= 2 && this.allGroups().length === 0) this._doSearch();
  }

  onType(): void {
    clearTimeout(this.debounceTimer);
    if (this.query.length < 2) {
      this.allGroups.set([]);
      this.searched.set(false);
      this.searching.set(false);
      return;
    }
    this.panelOpen.set(true);
    this.searching.set(true);
    this.debounceTimer = setTimeout(() => this._doSearch(), TIMING.DEBOUNCE_SEARCH);
  }

  close(): void { this.panelOpen.set(false); }

  clearQuery(): void {
    this.query = '';
    this.allGroups.set([]);
    this.searched.set(false);
    this.activeModule.set(null);
  }

  setModule(mod: string | null): void {
    this.activeModule.set(mod);
    this.highlightedModule.set('');
    this.highlightedIdx.set(-1);
  }

  navigateTo(item: SearchResult): void {
    this.close();
    // FINDING-001 Fix: Use backend-provided URL if available, otherwise fallback to module route
    if (item.url) {
      // Backend provides full deep link (e.g., '/risks/123')
      // Parse and navigate to the route segments
      const segments = item.url.split('/').filter(Boolean);
      this.router.navigate(segments);
    } else {
      // DB-driven module routes only. Unknown module → no nav, render
      // empty/no-op (NO FRONTEND INVENTION per AGENTS.md).
      const mod = item.entity_type || item.module || 'other';
      const route = MODULE_ROUTES[mod];
      if (route) this.router.navigate([route]);
    }
  }

  useRecent(q: string): void {
    this.query = q;
    this._doSearch();
  }

  clearRecents(): void {
    this._storage.remove(RECENT_KEY);
    this.recentSearches.set([]);
  }

  moveHighlight(delta: number, e: Event): void {
    e.preventDefault();
    const flat = this._flatItems(this.filteredGroups());
    if (flat.length === 0) return;
    let cur = flat.findIndex(f => f.mod === this.highlightedModule() && f.idx === this.highlightedIdx());
    cur += delta;
    if (cur < 0) cur = flat.length - 1;
    if (cur >= flat.length) cur = 0;
    this.highlightedModule.set(flat[cur].mod);
    this.highlightedIdx.set(flat[cur].idx);
  }

  onEnter(): void {
    if (!this.panelOpen()) { this._doSearch(); this.panelOpen.set(true); return; }
    const flat = this._flatItems(this.filteredGroups());
    const item = flat.find(f => f.mod === this.highlightedModule() && f.idx === this.highlightedIdx());
    if (item) this.navigateTo(item.result);
    else if (this.query.length >= 2) this._doSearch();
  }

  isHighlighted(mod: string, idx: number): boolean {
    return this.highlightedModule() === mod && this.highlightedIdx() === idx;
  }

  setHighlightedItem(mod: string, idx: number): void {
    this.highlightedModule.set(mod);
    this.highlightedIdx.set(idx);
  }

  getModuleIcon(mod: string): string {
    return MODULE_ICONS[mod] || MODULE_ICONS['other'];
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const s = (status || '').toLowerCase();
    if (s === 'active' || s === 'compliant' || s === 'closed') return 'success';
    if (s === 'critical' || s === 'high' || s === 'open') return 'danger';
    if (s === 'medium' || s === 'in_progress') return 'warning';
    return 'info';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!this.elRef.nativeElement.contains(e.target)) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.panelOpen.set(true);
      setTimeout(() => {
        const input = this.elRef.nativeElement.querySelector('.gs-input') as HTMLInputElement;
        input?.focus();
      });
    }
  }

  ngOnDestroy(): void { clearTimeout(this.debounceTimer); }

  private _doSearch(): void {
    const q = this.query.trim();
    if (q.length < 2) return;
    this.searching.set(true);
    this.operationsSvc.globalSearch(q).subscribe({
      next: (data) => {
        const items: SearchResult[] = Array.isArray(data) ? data : (data?.results || []);
        this.allGroups.set(this._groupByModule(items));
        this.searched.set(true);
        this.searching.set(false);
        this.highlightedModule.set('');
        this.highlightedIdx.set(-1);
        this._saveRecent(q);
      },
      error: () => {
        this.allGroups.set([]);
        this.searched.set(true);
        this.searching.set(false);
      },
    });
  }

  private _groupByModule(items: SearchResult[]): ResultGroup[] {
    const map = new Map<string, SearchResult[]>();
    for (const item of items) {
      const mod = item.entity_type || item.module || 'other';
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(item);
    }
    return Array.from(map.entries()).map(([module, its]) => ({
      module,
      icon: MODULE_ICONS[module] || MODULE_ICONS['other'],
      items: its,
    }));
  }

  private _flatItems(groups: ResultGroup[]): { mod: string; idx: number; result: SearchResult }[] {
    const flat: { mod: string; idx: number; result: SearchResult }[] = [];
    for (const g of groups) {
      g.items.forEach((item, idx) => flat.push({ mod: g.module, idx, result: item }));
    }
    return flat;
  }

  private _loadRecents(): string[] {
    try { return JSON.parse(this._storage.get(RECENT_KEY) || '[]'); }
    catch { return []; }
  }

  private _saveRecent(q: string): void {
    const recents = this._loadRecents().filter(r => r !== q);
    recents.unshift(q);
    const trimmed = recents.slice(0, MAX_RECENT);
    this._storage.set(RECENT_KEY, JSON.stringify(trimmed));
    this.recentSearches.set(trimmed);
  }

}
