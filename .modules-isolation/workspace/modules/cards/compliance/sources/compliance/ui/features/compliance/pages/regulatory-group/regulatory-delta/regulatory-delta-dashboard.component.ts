import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ButtonModule, PlaceholderModule } from 'carbon-components-angular';

import { RegulatoryDeltaKpiStripComponent } from './components/regulatory-delta-kpi-strip.component';
import { RegulatoryDeltaListComponent, RegulatoryDelta } from './components/regulatory-delta-list.component';
import { RegulatoryDeltaImpactTableComponent, DeltaImpact, ImpactGroup } from './components/regulatory-delta-impact-table.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-regulatory-delta-dashboard',
    imports: [
        CommonModule, FormsModule, AppDatePipe,
        ButtonModule, PlaceholderModule,
        RegulatoryDeltaKpiStripComponent, RegulatoryDeltaListComponent, RegulatoryDeltaImpactTableComponent,
    ],
    template: `
    <!-- Page Header -->
    <div class="rd-page-header">
      <div class="rd-header-left">
        <h1 class="rd-title">{{ i18n.translate('regulatoryDelta.title') || 'Regulatory Delta Dashboard' }}</h1>
        <p class="rd-subtitle">{{ i18n.translate('regulatoryDelta.subtitle') || 'Track regulatory changes and assess their impact on your compliance posture' }}</p>
      </div>
      <div class="rd-header-actions">
        <button cdsButton
          [label]="scanning() ? (i18n.translate('regulatoryDelta.scanning') || 'Scanning...') : (i18n.translate('regulatoryDelta.scanNow') || 'Scan Now')"
          icon=""
          [loading]="scanning()"
          class=""
          [disabled]="scanning()"
          (click)="triggerScan()">
        </button>
      </div>
    </div>

    <!-- KPI Strip (sub-component) -->
    <app-regulatory-delta-kpi-strip
      [loading]="loading()"
      [totalDeltas]="totalDeltas()"
      [criticalImpacts]="criticalImpacts()"
      [pendingResolution]="pendingResolution()"
      [lastScanDisplay]="lastScanDisplay()" />

    <!-- Filters -->
    <div class="rd-filters">
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterInstrument') || 'Instrument' }}</label>
        <select class="rd-filter-select" [ngModel]="selectedInstrument()" (ngModelChange)="selectedInstrument.set($event)">
          <option value="">{{ i18n.translate('regulatoryDelta.allInstruments') || 'All Instruments' }}</option>
          @for (inst of instrumentOptions(); track inst) {
            <option [value]="inst">{{ inst }}</option>
          }
        </select>
      </div>
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterDateFrom') || 'From' }}</label>
        <input type="date" class="rd-filter-input" [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" />
      </div>
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterDateTo') || 'To' }}</label>
        <input type="date" class="rd-filter-input" [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" />
      </div>
    </div>

    <!-- Delta History Table (sub-component) -->
    <app-regulatory-delta-list
      [loading]="loading()"
      [deltas]="filteredDeltas()" />

    <!-- Impact Assessment (sub-component) -->
    <app-regulatory-delta-impact-table
      [loading]="loading()"
      [impactGroups]="impactGroups()"
      [resolvingId]="resolvingId()"
      (resolve)="resolveImpact($event)" />

    <!-- Timeline Visualization -->
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class=""></i>
        {{ i18n.translate('regulatoryDelta.timeline') || 'Detection Timeline' }}
      </h2>

      @if (loading()) {
        <cds-placeholder></cds-placeholder>
      } @else if (timelineEntries().length === 0) {
        <div class="rd-empty-state">
          <i class=""></i>
          <p>{{ i18n.translate('regulatoryDelta.noTimeline') || 'No timeline entries yet.' }}</p>
        </div>
      } @else {
        <div class="rd-timeline">
          @for (entry of timelineEntries(); track entry.deltaId) {
            <div class="rd-timeline-item">
              <div class="rd-timeline-marker" [class]="'rd-marker-' + entry.changeLevel"></div>
              <div class="rd-timeline-connector"></div>
              <div class="rd-timeline-content">
                <div class="rd-timeline-date">{{ entry.detectedAt | appDate:'medium' }}</div>
                <div class="rd-timeline-title">{{ entry.instrumentName }}</div>
                <div class="rd-timeline-detail">
                  {{ entry.previousVersion }} <i class=""></i> {{ entry.newVersion }}
                </div>
                <div class="rd-timeline-changes">
                  @if (entry.addedCount) {
                    <span class="rd-badge rd-badge-added">+{{ entry.addedCount }}</span>
                  }
                  @if (entry.modifiedCount) {
                    <span class="rd-badge rd-badge-modified">~{{ entry.modifiedCount }}</span>
                  }
                  @if (entry.removedCount) {
                    <span class="rd-badge rd-badge-removed">-{{ entry.removedCount }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Error State -->
    @if (error()) {
      <div class="rd-error-state">
        <i class=""></i>
        <p>{{ error() }}</p>
        <button cdsButton
          [label]="i18n.translate('common.retry') || 'Retry'"
          icon=""
          class="  "
          (click)="retry()">
        </button>
      </div>
    }
  `,
    styles: [`
    /* Page Header */
    .rd-page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .rd-title {
      font-size: var(--font-size-3xl); font-weight: 800;
      color: var(--text-heading, #1e293b); margin: 0 0 4px 0;
    }
    .rd-subtitle {
      font-size: var(--font-size-body-sm); color: var(--text-color-secondary, #64748b); margin: 0;
    }

    /* Filters */
    .rd-filters {
      display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
      padding: 16px 20px; background: var(--surface-ground, var(--surface-ice, #f8fafc));
      border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, #e2e8f0);
      margin-bottom: 24px;
    }
    .rd-filter-group { display: flex; flex-direction: column; gap: 4px; }
    .rd-filter-label {
      font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-color-secondary, #64748b);
    }
    .rd-filter-select, .rd-filter-input {
      padding: 8px 12px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-subtle, #e2e8f0); font-size: var(--font-size-base);
      background: var(--surface-card, #fff); color: var(--text-heading, #1e293b);
      min-width: 180px;
    }
    .rd-filter-select:focus, .rd-filter-input:focus {
      outline: none; border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 2px rgba(var(--module-accent-blue-rgb), 0.15);
    }

    /* Section */
    .rd-section { margin-bottom: 32px; }
    .rd-section-title {
      display: flex; align-items: center; gap: 10px;
      font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, #1e293b);
      margin: 0 0 16px 0; padding-bottom: 12px;
      border-bottom: 2px solid var(--border-subtle, #e2e8f0);
    }
    .rd-section-title i { font-size: var(--font-size-body-md); color: var(--primary, #3b82f6); }

    /* Change badges */
    .rd-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 2px 10px; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 700; min-width: 32px;
    }
    .rd-badge-added { background: #dcfce7; color: #15803d; }
    .rd-badge-modified { background: #fef9c3; color: #a16207; }
    .rd-badge-removed { background: #fee2e2; color: #b91c1c; }

    /* Timeline */
    .rd-timeline { position: relative; padding: 0 0 0 32px; }
    .rd-timeline::before {
      content: ''; position: absolute; left: 11px; top: 0; bottom: 0;
      width: 2px; background: var(--border-subtle, #e2e8f0);
    }
    .rd-timeline-item { position: relative; padding: 0 0 28px 24px; }
    .rd-timeline-item:last-child { padding-bottom: 0; }
    .rd-timeline-item:last-child .rd-timeline-connector { display: none; }
    .rd-timeline-marker {
      position: absolute; left: -26px; top: 4px;
      width: 14px; height: 14px; border-radius: 50%;
      border: 3px solid var(--primary, #3b82f6);
      background: var(--surface-card, #fff); z-index: 1;
    }
    .rd-marker-high { border-color: #f97316; }
    .rd-marker-critical { border-color: #dc2626; }
    .rd-marker-medium { border-color: #f59e0b; }
    .rd-marker-low { border-color: #22c55e; }
    .rd-timeline-connector {
      position: absolute; left: -20px; top: 18px; bottom: -10px;
      width: 2px; background: transparent;
    }
    .rd-timeline-content {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 14px 18px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s;
    }
    .rd-timeline-content:hover { box-shadow: 0 2px 12px rgba(var(--color-black-rgb), 0.05); }
    .rd-timeline-date {
      font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--primary, #3b82f6); margin-bottom: 4px;
    }
    .rd-timeline-title {
      font-size: var(--font-size-body-sm); font-weight: 700; color: var(--text-heading, #1e293b); margin-bottom: 4px;
    }
    .rd-timeline-detail {
      font-size: var(--font-size-caption); color: var(--text-color-secondary, #64748b);
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
    }
    .rd-timeline-detail i { font-size: var(--font-size-xs); }
    .rd-timeline-changes { display: flex; gap: 6px; }

    /* Empty / Error */
    .rd-empty-state {
      text-align: center; padding: 48px 24px;
      color: var(--text-color-secondary, #94a3b8);
    }
    .rd-empty-state i { font-size: var(--font-size-6xl); opacity: 0.2; display: block; margin-bottom: 12px; }
    .rd-empty-state p { font-size: var(--font-size-body-sm); margin: 0; }
    .rd-error-state {
      text-align: center; padding: 32px;
      color: #dc2626; background: #fff1f1;
      border-radius: var(--radius-md, 8px); margin-top: 16px;
      border: 1px solid #fecaca;
    }
    .rd-error-state i { font-size: 36px; display: block; margin-bottom: 12px; }
    .rd-error-state p { margin: 0 0 16px 0; }

    @media (max-width: 768px) {
      .rd-page-header { flex-direction: column; }
      .rd-filters { flex-direction: column; }
      .rd-filter-select, .rd-filter-input { width: 100%; }
    }
  `]
})
export class RegulatoryDeltaDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  private readonly apiBase = `${environment.apiUrl}/regulatory-delta`;

  /* State */
  loading = signal(false);
  scanning = signal(false);
  error = signal('');
  resolvingId = signal<string | null>(null);

  /* Data */
  deltas = signal<RegulatoryDelta[]>([]);
  impacts = signal<DeltaImpact[]>([]);

  /* Filters */
  selectedInstrument = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  /* Computed: Instrument dropdown options */
  instrumentOptions = computed(() => {
    const names = new Set(this.deltas().map(d => d.instrumentName));
    return Array.from(names).sort();
  });

  /* Computed: Filtered deltas */
  filteredDeltas = computed(() => {
    let result = this.deltas();
    const instrument = this.selectedInstrument();
    const from = this.dateFrom();
    const to = this.dateTo();
    if (instrument) result = result.filter(d => d.instrumentName === instrument);
    if (from) {
      const fromTs = new Date(from).getTime();
      result = result.filter(d => new Date(d.detectedAt).getTime() >= fromTs);
    }
    if (to) {
      const toTs = new Date(to).getTime() + 86400000;
      result = result.filter(d => new Date(d.detectedAt).getTime() <= toTs);
    }
    return result;
  });

  /* Computed: KPI values */
  totalDeltas = computed(() => this.deltas().length);
  criticalImpacts = computed(() => this.impacts().filter(i => i.impactLevel === 'critical').length);
  pendingResolution = computed(() => this.impacts().filter(i => i.status !== 'resolved').length);

  lastScanDisplay = computed(() => {
    const sorted = [...this.deltas()].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
    if (sorted.length === 0) return '--';
    const d = new Date(sorted[0].detectedAt);
    return this.i18n.formatDate(d);
  });

  /* Computed: Impact groups by severity */
  impactGroups = computed<ImpactGroup[]>(() => {
    const allImpacts = this.impacts();
    const order: Array<{ level: DeltaImpact['impactLevel']; label: string; severity: 'danger' | 'warning' | 'info' | 'success' }> = [
      { level: 'critical', label: 'Critical',  severity: 'danger'  },
      { level: 'high',     label: 'High',      severity: 'warning' },
      { level: 'medium',   label: 'Medium',    severity: 'info'    },
      { level: 'low',      label: 'Low',       severity: 'success' },
    ];
    return order
      .map(o => ({ ...o, impacts: allImpacts.filter(i => i.impactLevel === o.level) }))
      .filter(g => g.impacts.length > 0);
  });

  /* Computed: Timeline entries */
  timelineEntries = computed(() => {
    const sorted = [...this.deltas()].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
    return sorted.map(d => {
      const totalChanges = (d.addedNodes?.length || 0) + (d.modifiedNodes?.length || 0) + (d.removedNodes?.length || 0);
      let changeLevel: string;
      if (totalChanges >= 10) changeLevel = 'critical';
      else if (totalChanges >= 5) changeLevel = 'high';
      else if (totalChanges >= 2) changeLevel = 'medium';
      else changeLevel = 'low';
      return {
        deltaId: d.deltaId, instrumentName: d.instrumentName,
        previousVersion: d.previousVersion, newVersion: d.newVersion,
        detectedAt: d.detectedAt,
        addedCount: d.addedNodes?.length || 0,
        modifiedCount: d.modifiedNodes?.length || 0,
        removedCount: d.removedNodes?.length || 0,
        changeLevel,
      };
    });
  });

  /* Lifecycle */
  ngOnInit(): void { this.loadData(); }

  /* Actions */
  triggerScan(): void {
    this.scanning.set(true);
    this.error.set('');
    this.http.post<{ scanned: number; deltas: RegulatoryDelta[] }>(`${this.apiBase}/scan`, {}).subscribe({
      next: (res) => {
        this.scanning.set(false);
        const existing = new Set(this.deltas().map(d => d.deltaId));
        const merged = [...this.deltas()];
        for (const delta of (res.deltas || [])) {
          if (!existing.has(delta.deltaId)) merged.unshift(delta);
        }
        this.deltas.set(merged);
        this.loadImpacts();
      },
      error: (err) => {
        this.scanning.set(false);
        this.error.set(err?.error?.message || 'Failed to trigger regulatory scan.');
      },
    });
  }

  resolveImpact(impact: DeltaImpact): void {
    this.resolvingId.set(impact.impactId);
    this.http.patch<DeltaImpact>(`${this.apiBase}/impacts/${impact.impactId}/resolve`, {}).subscribe({
      next: (updated) => {
        this.resolvingId.set(null);
        const current = this.impacts();
        this.impacts.set(
          current.map(i => i.impactId === impact.impactId
            ? { ...i, status: 'resolved', resolvedAt: updated?.resolvedAt || new Date().toISOString() }
            : i
          )
        );
      },
      error: (err) => {
        this.resolvingId.set(null);
        this.error.set(err?.error?.message || 'Failed to resolve impact.');
      },
    });
  }

  onFilterChange(): void { }

  retry(): void {
    this.error.set('');
    this.loadData();
  }

  /* Data Loading */
  private loadData(): void {
    this.loading.set(true);
    this.error.set('');
    let completedCount = 0;
    const checkComplete = () => { completedCount++; if (completedCount >= 2) this.loading.set(false); };
    this.http.get<{ deltas: RegulatoryDelta[]; count: number }>(`${this.apiBase}/history`, {
      params: { limit: '50' },
    }).subscribe({
      next: (res) => { this.deltas.set(res.deltas || []); checkComplete(); },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to load delta history.'); checkComplete(); },
    });
    this.loadImpacts(checkComplete);
  }

  private loadImpacts(onComplete?: () => void): void {
    this.http.get<{ impacts: DeltaImpact[]; count: number }>(`${this.apiBase}/impacts`).subscribe({
      next: (res) => { this.impacts.set(res.impacts || []); onComplete?.(); },
      error: (err) => {
        if (!this.error()) this.error.set(err?.error?.message || 'Failed to load impact assessments.');
        onComplete?.();
      },
    });
  }
}
