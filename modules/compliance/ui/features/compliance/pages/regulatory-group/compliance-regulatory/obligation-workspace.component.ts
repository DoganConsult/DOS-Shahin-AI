/**
 * Obligation Workspace Component
 *
 * Full-page workspace for obligation management with filter bar,
 * obligation table with inline status editing, side panel for detail
 * and control mapping, and coverage statistics bar.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Obligation {
  id: string;
  ref: string;
  titleEn: string;
  titleAr?: string;
  frameworkName: string;
  frameworkId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  mappedControlsCount: number;
  evidenceTypes: string[];
  owner: string;
}

interface CoverageStats {
  total: number;
  mappedPercent: number;
  evidencedPercent: number;
}

interface ObligationDetail {
  id: string;
  ref: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn: string;
  descriptionAr?: string;
  frameworkName: string;
  priority: string;
  status: string;
  owner: string;
  mappedControls: MappedControl[];
}

interface MappedControl {
  controlId: string;
  controlRef: string;
  controlTitle: string;
  status: string;
}

@Component({
    selector: 'app-obligation-workspace',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="obligation-workspace">
      <header class="page-header">
        <div>
          <h1>Obligation Workspace</h1>
          <span class="header-ar">مساحة عمل الالتزامات</span>
        </div>
        <button class="btn-secondary" (click)="loadData()">Refresh / تحديث</button>
      </header>

      <!-- Coverage stats bar -->
      <div class="coverage-bar">
        <div class="stat-chip">
          <span class="stat-value">{{ stats().total }}</span>
          <span class="stat-label">Total / الإجمالي</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value mapped-pct">{{ stats().mappedPercent }}%</span>
          <span class="stat-label">Mapped / مربوطة</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value evidenced-pct">{{ stats().evidencedPercent }}%</span>
          <span class="stat-label">Evidenced / موثقة</span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <select class="filter-select" [(ngModel)]="filterFramework" (ngModelChange)="applyFilters()">
          <option value="">All Frameworks / جميع الأطر</option>
          @for (f of frameworkOptions(); track f) {
            <option [value]="f">{{ f }}</option>
          }
        </select>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
          <option value="">All Statuses / جميع الحالات</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="retired">Retired</option>
          <option value="pending">Pending</option>
        </select>
        <select class="filter-select" [(ngModel)]="filterPriority" (ngModelChange)="applyFilters()">
          <option value="">All Priorities / جميع الأولويات</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input class="filter-input" [(ngModel)]="searchQuery" (input)="applyFilters()"
               placeholder="Search / بحث..." />
      </div>

      <div class="workspace-layout">
        <!-- Main table -->
        <div class="table-panel" [class.has-detail]="!!selectedObligation()">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Title / العنوان</th>
                <th>Framework / الإطار</th>
                <th>Priority / الأولوية</th>
                <th>Status / الحالة</th>
                <th>Controls</th>
                <th>Evidence</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              @for (ob of filtered(); track ob.id) {
                <tr [class.selected]="selectedObligation()?.id === ob.id"
                    (click)="selectObligation(ob.id)">
                  <td class="ref-cell">{{ ob.ref }}</td>
                  <td>
                    <span>{{ ob.titleEn }}</span>
                    @if (ob.titleAr) {
                      <span class="cell-ar">{{ ob.titleAr }}</span>
                    }
                  </td>
                  <td>{{ ob.frameworkName }}</td>
                  <td>
                    <span class="priority-badge" [class]="'priority-' + ob.priority">
                      {{ ob.priority }}
                    </span>
                  </td>
                  <td>
                    <select class="inline-select" [ngModel]="ob.status"
                            (ngModelChange)="updateStatus(ob, $event)"
                            (click)="$event.stopPropagation()">
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="retired">Retired</option>
                    </select>
                  </td>
                  <td class="count-cell">{{ ob.mappedControlsCount }}</td>
                  <td>
                    @for (et of ob.evidenceTypes; track et) {
                      <span class="ev-type-chip">{{ et }}</span>
                    }
                    @if (ob.evidenceTypes.length === 0) {
                      <span class="no-data">--</span>
                    }
                  </td>
                  <td class="owner-cell">{{ ob.owner || '--' }}</td>
                </tr>
              }
            </tbody>
          </table>

          @if (filtered().length === 0 && !loading()) {
            <div class="empty-state">
              <p>No obligations match filters.</p>
              <p class="rtl">لا توجد التزامات مطابقة للفلاتر.</p>
            </div>
          }
        </div>

        <!-- Side detail panel -->
        @if (selectedObligation()) {
          <div class="detail-panel">
            <div class="detail-header">
              <h3>{{ selectedObligation()!.titleEn }}</h3>
              @if (selectedObligation()!.titleAr) {
                <p class="detail-title-ar">{{ selectedObligation()!.titleAr }}</p>
              }
              <button class="close-btn" (click)="selectedObligation.set(null)">X</button>
            </div>
            <div class="detail-meta">
              <div class="meta-row">
                <span class="meta-label">Ref:</span>
                <span>{{ selectedObligation()!.ref }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Framework:</span>
                <span>{{ selectedObligation()!.frameworkName }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Status:</span>
                <span class="status-badge" [class]="'status-' + selectedObligation()!.status">
                  {{ selectedObligation()!.status }}
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Priority:</span>
                <span class="priority-badge" [class]="'priority-' + selectedObligation()!.priority">
                  {{ selectedObligation()!.priority }}
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Owner:</span>
                <span>{{ selectedObligation()!.owner || '--' }}</span>
              </div>
            </div>

            @if (selectedObligation()!.descriptionEn) {
              <div class="detail-description">
                <h4>Description / الوصف</h4>
                <p>{{ selectedObligation()!.descriptionEn }}</p>
                @if (selectedObligation()!.descriptionAr) {
                  <p class="rtl">{{ selectedObligation()!.descriptionAr }}</p>
                }
              </div>
            }

            <!-- Mapped controls -->
            <div class="mapped-controls-section">
              <h4>Mapped Controls / الضوابط المرتبطة ({{ selectedObligation()!.mappedControls?.length ?? 0 }})</h4>
              @if ((selectedObligation()!.mappedControls ?? []).length > 0) {
                <ul class="control-list">
                  @for (ctrl of selectedObligation()!.mappedControls; track ctrl.controlId) {
                    <li>
                      <span class="ctrl-ref">{{ ctrl.controlRef }}</span>
                      <span class="ctrl-title">{{ ctrl.controlTitle }}</span>
                      <span class="ctrl-status" [class]="'status-' + ctrl.status">{{ ctrl.status }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="no-data">No controls mapped yet.</p>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .obligation-workspace { padding: 20px; min-height: 100vh; background: var(--surface-ground, #11111b); color: var(--text-color, #cdd6f4); }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .page-header h1 { font-size: 22px; font-weight: 700; margin: 0; color: var(--primary-color, #89b4fa); }
    .header-ar { font-size: var(--font-size-base); color: var(--text-color-secondary, #a6adc8); direction: rtl; display: block; }
    .btn-secondary { padding: 8px 16px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-sm); background: transparent; color: var(--text-color, #cdd6f4); cursor: pointer; font-size: var(--font-size-sm); }

    /* Coverage bar */
    .coverage-bar { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat-chip { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 12px 20px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 700; display: block; }
    .mapped-pct { color: #89b4fa; }
    .evidenced-pct { color: #a6e3a1; }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-color-secondary, #a6adc8); }

    /* Filter bar */
    .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-select, .filter-input { padding: 6px 10px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-sm); background: var(--surface-card, #1e1e2e); color: var(--text-color, #cdd6f4); font-size: var(--font-size-sm); }
    .filter-input { flex: 1; min-width: 180px; }

    /* Layout */
    .workspace-layout { display: flex; gap: 16px; }
    .table-panel { flex: 1; overflow-x: auto; }
    .table-panel.has-detail { max-width: calc(100% - 360px); }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); background: var(--surface-card, #1e1e2e); border-radius: var(--radius); overflow: hidden; }
    .data-table th { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--surface-border, #45475a); color: var(--text-color-secondary, #a6adc8); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid var(--surface-border, #313244); }
    .data-table tr { cursor: pointer; }
    .data-table tr:hover { background: rgba(var(--color-blue-300-rgb), 0.05); }
    .data-table tr.selected { background: rgba(var(--color-blue-300-rgb), 0.1); }
    .ref-cell { font-family: monospace; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .cell-ar { display: block; font-size: var(--font-size-xs); color: var(--text-color-secondary, #6c7086); direction: rtl; }
    .count-cell { text-align: center; font-weight: 600; }
    .owner-cell { font-size: var(--font-size-sm); }

    /* Inline select */
    .inline-select { padding: 2px 6px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-xs); background: var(--surface-ground, #11111b); color: var(--text-color, #cdd6f4); font-size: var(--font-size-sm); }

    /* Badges */
    .priority-badge { font-size: var(--font-size-nano); padding: 2px 6px; border-radius: 3px; font-weight: 600; text-transform: uppercase; }
    .priority-critical { background: rgba(var(--color-pink-300-rgb), 0.2); color: #f38ba8; }
    .priority-high { background: rgba(var(--color-peach-rgb), 0.2); color: #fab387; }
    .priority-medium { background: rgba(var(--color-catppuccin-peach-light-rgb), 0.2); color: #f9e2af; }
    .priority-low { background: rgba(var(--color-green-300-rgb), 0.2); color: #a6e3a1; }
    .status-badge { font-size: var(--font-size-nano); padding: 2px 6px; border-radius: 3px; font-weight: 600; }
    .status-active { background: rgba(var(--color-green-300-rgb), 0.2); color: #a6e3a1; }
    .status-draft { background: rgba(var(--color-blue-300-rgb), 0.2); color: #89b4fa; }
    .status-pending { background: rgba(var(--color-catppuccin-peach-light-rgb), 0.2); color: #f9e2af; }
    .status-retired { background: rgba(var(--color-gray-500-rgb), 0.2); color: #6c7086; }
    .ev-type-chip { font-size: var(--font-size-nano); padding: 1px 5px; background: rgba(var(--color-blue-300-rgb), 0.1); color: #89b4fa; border-radius: 3px; margin-right: 3px; }
    .no-data { color: var(--text-color-secondary, #6c7086); font-size: var(--font-size-sm); }

    /* Detail panel */
    .detail-panel { width: 340px; flex-shrink: 0; background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; max-height: calc(100vh - 200px); overflow-y: auto; }
    .detail-header { position: relative; margin-bottom: 12px; }
    .detail-header h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0; padding-right: 24px; }
    .detail-title-ar { font-size: var(--font-size-sm); direction: rtl; color: var(--text-color-secondary, #a6adc8); margin: 4px 0 0 0; }
    .close-btn { position: absolute; top: 0; right: 0; background: none; border: none; color: var(--text-color-secondary, #a6adc8); cursor: pointer; font-size: var(--font-size-base); }
    .detail-meta { margin-bottom: 12px; }
    .meta-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: var(--font-size-sm); }
    .meta-label { color: var(--text-color-secondary, #6c7086); min-width: 80px; }
    .detail-description { margin-bottom: 12px; }
    .detail-description h4 { font-size: var(--font-size-sm); margin: 0 0 6px 0; color: var(--text-color-secondary, #a6adc8); }
    .detail-description p { font-size: var(--font-size-sm); margin: 0 0 4px 0; line-height: 1.5; }

    /* Mapped controls */
    .mapped-controls-section h4 { font-size: var(--font-size-sm); margin: 0 0 8px 0; color: var(--text-color-secondary, #a6adc8); }
    .control-list { list-style: none; padding: 0; margin: 0; }
    .control-list li { display: flex; gap: 6px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-border, #313244); font-size: var(--font-size-sm); }
    .ctrl-ref { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary, #a6adc8); flex-shrink: 0; }
    .ctrl-title { flex: 1; }
    .ctrl-status { font-size: var(--font-size-nano); padding: 1px 6px; border-radius: 3px; flex-shrink: 0; }

    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary, #a6adc8); }
    .rtl { direction: rtl; }

    @media (max-width: 900px) {
      .workspace-layout { flex-direction: column; }
      .table-panel.has-detail { max-width: 100%; }
      .detail-panel { width: 100%; max-height: none; }
    }
  `]
})
export class ObligationWorkspaceComponent implements OnInit {
  private http = inject(HttpClient);

  obligations = signal<Obligation[]>([]);
  filtered = signal<Obligation[]>([]);
  selectedObligation = signal<ObligationDetail | null>(null);
  loading = signal(false);
  stats = signal<CoverageStats>({ total: 0, mappedPercent: 0, evidencedPercent: 0 });

  /** Filter state */
  filterFramework = '';
  filterStatus = '';
  filterPriority = '';
  searchQuery = '';

  /** Computed unique framework names for the dropdown */
  frameworkOptions = computed(() => {
    const names = new Set(this.obligations().map(o => o.frameworkName));
    return Array.from(names).sort();
  });

  ngOnInit(): void {
    this.loadData();
  }

  /** Fetch obligations from API */
  loadData(): void {
    this.loading.set(true);
    this.http.get<{ obligations: Obligation[]; stats?: CoverageStats }>('/api/obligations').subscribe({
      next: (res) => {
        this.obligations.set(res.obligations || []);
        if (res.stats) this.stats.set(res.stats);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => { this.obligations.set([]); this.filtered.set([]); this.loading.set(false); },
    });
  }

  /** Apply client-side filters */
  applyFilters(): void {
    let result = this.obligations();
    if (this.filterFramework) {
      result = result.filter(o => o.frameworkName === this.filterFramework);
    }
    if (this.filterStatus) {
      result = result.filter(o => o.status === this.filterStatus);
    }
    if (this.filterPriority) {
      result = result.filter(o => o.priority === this.filterPriority);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(o =>
        o.titleEn.toLowerCase().includes(q) ||
        (o.titleAr ?? '').includes(q) ||
        o.ref.toLowerCase().includes(q)
      );
    }
    this.filtered.set(result);
  }

  /** Inline status update via PUT */
  updateStatus(ob: Obligation, newStatus: string): void {
    this.http.put(`/api/obligations/${ob.id}`, { status: newStatus }).subscribe({
      next: () => {
        this.obligations.update(list =>
          list.map(o => o.id === ob.id ? { ...o, status: newStatus } : o)
        );
        this.applyFilters();
      },
      error: () => { /* will correct on next refresh */ },
    });
  }

  /** Load obligation detail into side panel */
  selectObligation(id: string): void {
    this.http.get<ObligationDetail>(`/api/obligations/${id}`).subscribe({
      next: (detail) => this.selectedObligation.set(detail),
      error: () => this.selectedObligation.set(null),
    });
  }
}
