import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { forkJoin } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { ButtonModule, ComboBoxModule, DropdownModule, InputModule, PlaceholderModule, TableModule, TagModule } from 'carbon-components-angular';

/* ── Interfaces ─────────────────────────────────────────────────────────── */

export interface RegulatoryUpdate {
  deltaId: string;
  instrumentId: string;
  instrumentName: string;
  previousVersion: string;
  newVersion: string;
  addedNodes: string[];
  modifiedNodes: string[];
  removedNodes: string[];
  detectedAt: string;
  /** Joined from impacts */
  impactLevel?: 'low' | 'medium' | 'high' | 'critical';
  affectedControls?: string[];
  regulator?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-regulatory-feeds',
    imports: [
        CommonModule, FormsModule, TableModule, TagModule,
        ComboBoxModule, PlaceholderModule, InputModule,
        DropdownModule, ButtonModule, AppDatePipe,
    ],
    template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Regulatory Feeds') }}</h2>
        <p class="text-muted">{{ i18n.translate('Monitor regulatory updates and assess their impact on your organization') }}</p>
      </header>

      <!-- Detail view -->
      <ng-container *ngIf="selectedUpdate">
        <div class="detail-panel">
          <button aria-label="Back" class=" " icon=""
            [label]="i18n.translate('Back to feed')" (click)="closeDetail()"></button>

          <div class="detail-header">
            <h3>{{ selectedUpdate.instrumentName }}</h3>
            <cds-tag [value]="selectedUpdate.impactLevel || 'low'"
              [severity]="severityColor(selectedUpdate.impactLevel)" />
          </div>

          <div class="detail-meta">
            <span><strong>{{ i18n.translate('Instrument') }}:</strong> {{ selectedUpdate.instrumentId }}</span>
            <span><strong>{{ i18n.translate('Version Change') }}:</strong> v{{ selectedUpdate.previousVersion }} → v{{ selectedUpdate.newVersion }}</span>
            <span><strong>{{ i18n.translate('Detected') }}:</strong> {{ selectedUpdate.detectedAt | appDate:'medium' }}</span>
            <span *ngIf="selectedUpdate.regulator"><strong>{{ i18n.translate('Regulator') }}:</strong> {{ selectedUpdate.regulator }}</span>
          </div>

          <div class="detail-section" *ngIf="selectedUpdate.affectedControls?.length">
            <h4>{{ i18n.translate('Affected Controls') }} ({{ selectedUpdate.affectedControls!.length }})</h4>
            <ul class="affected-list">
              <li *ngFor="let ctrl of selectedUpdate.affectedControls">{{ ctrl }}</li>
            </ul>
          </div>

          <div class="detail-section" *ngIf="selectedUpdate.addedNodes?.length">
            <h4>{{ i18n.translate('Added Requirements') }} ({{ selectedUpdate.addedNodes.length }})</h4>
            <ul class="change-list added">
              <li *ngFor="let n of selectedUpdate.addedNodes">+ {{ n }}</li>
            </ul>
          </div>

          <div class="detail-section" *ngIf="selectedUpdate.modifiedNodes?.length">
            <h4>{{ i18n.translate('Modified Requirements') }} ({{ selectedUpdate.modifiedNodes.length }})</h4>
            <ul class="change-list modified">
              <li *ngFor="let n of selectedUpdate.modifiedNodes">~ {{ n }}</li>
            </ul>
          </div>

          <div class="detail-section" *ngIf="selectedUpdate.removedNodes?.length">
            <h4>{{ i18n.translate('Removed Requirements') }} ({{ selectedUpdate.removedNodes.length }})</h4>
            <ul class="change-list removed">
              <li *ngFor="let n of selectedUpdate.removedNodes">- {{ n }}</li>
            </ul>
          </div>

          <div class="detail-section">
            <h4>{{ i18n.translate('Recommended Actions') }}</h4>
            <ul class="actions-list">
              <li *ngIf="selectedUpdate.addedNodes?.length">{{ i18n.translate('Review and map new requirements to controls') }}</li>
              <li *ngIf="selectedUpdate.modifiedNodes?.length">{{ i18n.translate('Reassess affected controls for compliance gaps') }}</li>
              <li *ngIf="selectedUpdate.removedNodes?.length">{{ i18n.translate('Archive or retire controls mapped to removed requirements') }}</li>
              <li *ngIf="selectedUpdate.impactLevel === 'critical' || selectedUpdate.impactLevel === 'high'">{{ i18n.translate('Schedule urgent compliance review with stakeholders') }}</li>
              <li>{{ i18n.translate('Update risk assessments for affected domains') }}</li>
            </ul>
          </div>
        </div>
      </ng-container>

      <!-- Feed list view -->
      <ng-container *ngIf="!selectedUpdate">
        <div class="toolbar">
          <cds-combo-box [options]="regulatorOptions" [(ngModel)]="selectedRegulators"
            [placeholder]="i18n.translate('Filter by regulator')" [maxSelectedLabels]="2"
            (onChange)="applyFilter()" [style]="{width:'260px'}" />
          <cds-dropdown [options]="severityOptions" [(ngModel)]="selectedSeverity"
            [placeholder]="i18n.translate('Filter by severity')" [showClear]="true"
            (onChange)="applyFilter()" [style]="{width:'200px'}" />
          <input pInputText [(ngModel)]="searchText" [placeholder]="i18n.translate('Search updates...')" [attr.aria-label]="i18n.translate('Search updates...')"
            (input)="applyFilter()" class="search-input" />
          <span class="result-count">{{ filtered.length }} {{ i18n.translate('updates') }}</span>
        </div>

        <cds-placeholder></cds-placeholder>

        <div *ngIf="!loading && errorMsg" class="error-state">
          <i class=""></i>
          <p>{{ errorMsg }}</p>
          <button cdsButton class=" " [label]="i18n.translate('Retry')" (click)="loadData()"></button>
        </div>

        <div *ngIf="!loading && !errorMsg && filtered.length === 0" class="empty-state">
          <i class=""></i>
          <p>{{ i18n.translate('No regulatory updates match your filters') }}</p>
        </div>

        <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" *ngIf="!loading && !errorMsg && filtered.length > 0"
          [value]="filtered" [paginator]="filtered.length > 15" [rows]="15"
          styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true"
          [sortField]="'detectedAt'" [sortOrder]="-1" selectionMode="single"
          (onRowSelect)="openDetail($event.data)">
          <ng-template pTemplate="header">
            <tr>
              <th >{{ i18n.translate('Title') }} </th>
              <th>{{ i18n.translate('Regulator') }}</th>
              <th >{{ i18n.translate('Publication Date') }} </th>
              <th >{{ i18n.translate('Impact Severity') }} </th>
              <th>{{ i18n.translate('Changes') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-u>
            <tr [pSelectableRow]="u" class="feed-row">
              <td>
                <div class="update-title">{{ u.instrumentName }}</div>
                <div class="update-version">v{{ u.previousVersion }} → v{{ u.newVersion }}</div>
              </td>
              <td>{{ u.regulator || '-' }}</td>
              <td>{{ u.detectedAt | appDate:'medium' }}</td>
              <td><cds-tag [value]="u.impactLevel || 'low'" [severity]="severityColor(u.impactLevel)" size="small" /></td>
              <td>
                <span class="change-badge added" *ngIf="u.addedNodes?.length">+{{ u.addedNodes.length }}</span>
                <span class="change-badge modified" *ngIf="u.modifiedNodes?.length">~{{ u.modifiedNodes.length }}</span>
                <span class="change-badge removed" *ngIf="u.removedNodes?.length">-{{ u.removedNodes.length }}</span>
              </td>
            </tr>
          </ng-template>
        </table>
      </ng-container>
    </section>
  `,
    styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); }
    .text-muted { color: var(--text-muted); margin-top: 4px; }
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
    .search-input { width: 260px; }
    .result-count { font-size: var(--font-size-sm); color: var(--text-muted); margin-inline-start: auto; }
    .feed-row { cursor: pointer; }
    .feed-row:hover { background: var(--surface-hover, rgba(var(--color-black-rgb), .04)); }
    .update-title { font-weight: 600; font-size: var(--font-size-sm); color: var(--text-heading); }
    .update-version { font-size: var(--font-size-xs); color: var(--text-caption); font-family: monospace; }
    .change-badge { display: inline-block; padding: 2px 6px; border-radius: var(--radius-xs); font-size: var(--font-size-xs); font-weight: 600; margin-inline-end: 4px; }
    .change-badge.added { background: #dcfce7; color: #166534; }
    .change-badge.modified { background: #fef9c3; color: #854d0e; }
    .change-badge.removed { background: #fee2e2; color: #991b1b; }
    .error-state, .empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); }
    .error-state i, .empty-state i { font-size: var(--font-size-4xl); margin-bottom: 12px; display: block; }
    .detail-panel { animation: fadeIn .2s ease; }
    .detail-header { display: flex; align-items: center; gap: 12px; margin: 16px 0 12px; }
    .detail-header h3 { font-size: var(--font-size-2xl); font-weight: 400; color: var(--text-heading); margin: 0; }
    .detail-meta { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; font-size: var(--font-size-sm); color: var(--text-secondary); }
    .detail-section { margin-bottom: 24px; }
    .detail-section h4 { font-size: var(--font-size-base); font-weight: 600; margin-bottom: 8px; color: var(--text-heading); }
    .affected-list, .change-list, .actions-list { margin: 0; padding-inline-start: 20px; font-size: var(--font-size-sm); line-height: 1.8; }
    .change-list.added li { color: #166534; }
    .change-list.modified li { color: #854d0e; }
    .change-list.removed li { color: #991b1b; text-decoration: line-through; }
    .actions-list li { color: var(--text-secondary); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class RegulatoryFeedsComponent implements OnInit {
  allUpdates: RegulatoryUpdate[] = [];
  filtered: RegulatoryUpdate[] = [];
  selectedUpdate: RegulatoryUpdate | null = null;

  regulatorOptions: { label: string; value: string }[] = [];
  selectedRegulators: string[] = [];
  severityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];
  selectedSeverity: string | null = null;
  searchText = '';
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  errorMsg = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      deltas: this.apiclientSvc.get('/agrc-os/regulatory-delta'),
      impacts: this.apiclientSvc.get('/agrc-os/regulatory-delta/impacts'),
      instruments: this.apiclientSvc.get('/registry/instruments'),
    }).subscribe({
      next: (res) => {
        const deltas: Record<string, any>[] = res.deltas || [];
        const impacts: Record<string, any>[] = res.impacts || [];
        const instruments: Record<string, any>[] = (res.instruments as GrcRecord)?.instruments || res.instruments || [];

        // Build instrument lookup for regulator info
        const instMap = new Map<string, any>();
        for (const inst of instruments) {
          instMap.set(inst.instrument_id, inst);
        }

        // Build impact lookup by delta_id
        const impactMap = new Map<string, any>();
        for (const imp of impacts) {
          impactMap.set(imp.delta_id, imp);
        }

        // Merge deltas with impacts and instrument metadata
        this.allUpdates = deltas.map((d: Record<string, any>) => {
          const impact = impactMap.get(d.delta_id);
          const inst = instMap.get(d.instrument_id);
          return {
            deltaId: d.delta_id,
            instrumentId: d.instrument_id,
            instrumentName: d.instrument_name || d.instrumentName || this.i18n.translate('common.unknown'),
            previousVersion: d.previous_version || d.previousVersion || '0',
            newVersion: d.new_version || d.newVersion || '1.0',
            addedNodes: d.added_nodes || d.addedNodes || [],
            modifiedNodes: d.modified_nodes || d.modifiedNodes || [],
            removedNodes: d.removed_nodes || d.removedNodes || [],
            detectedAt: d.detected_at || d.detectedAt || new Date().toISOString(),
            impactLevel: impact?.impact_level || impact?.impactLevel || this.inferSeverity(d),
            affectedControls: impact?.affected_controls || impact?.affectedControls || [],
            regulator: inst?.regulator_name || inst?.regulator || d.regulator || null,
          } as RegulatoryUpdate;
        });

        // Sort chronologically (newest first)
        this.allUpdates.sort((a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
        );

        // Extract unique regulators for filter
        const regulators = new Set<string>();
        for (const u of this.allUpdates) {
          if (u.regulator) regulators.add(u.regulator);
        }
        this.regulatorOptions = Array.from(regulators).sort().map(r => ({ label: r, value: r }));

        this.filtered = [...this.allUpdates];
        this.loading = false; this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = err?.message || 'Failed to load regulatory updates';
        this.loading = false; this.cdr.markForCheck();
      },
    });
  }

  applyFilter(): void {
    const search = this.searchText.toLowerCase();
    this.filtered = this.allUpdates.filter(u => {
      const matchRegulator = this.selectedRegulators.length === 0 ||
        (u.regulator && this.selectedRegulators.includes(u.regulator));
      const matchSeverity = !this.selectedSeverity || u.impactLevel === this.selectedSeverity;
      const matchSearch = !search ||
        u.instrumentName.toLowerCase().includes(search) ||
        (u.regulator || '').toLowerCase().includes(search) ||
        u.instrumentId.toLowerCase().includes(search);
      return matchRegulator && matchSeverity && matchSearch;
    });
  }

  openDetail(update: RegulatoryUpdate): void {
    this.selectedUpdate = update;
  }

  closeDetail(): void {
    this.selectedUpdate = null;
  }

  severityColor(level?: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  }

  private inferSeverity(delta: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    const added = (delta.added_nodes || delta.addedNodes || []).length;
    const modified = (delta.modified_nodes || delta.modifiedNodes || []).length;
    const removed = (delta.removed_nodes || delta.removedNodes || []).length;
    const total = added + modified + removed;
    if (removed > 5 || total > 20) return 'critical';
    if (total > 10) return 'high';
    if (total > 3) return 'medium';
    return 'low';
  }

}
