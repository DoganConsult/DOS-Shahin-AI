import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '../../../../../shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '../../../../../shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../../../../shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-data-explorer',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule,
        InputTextModule, DropdownModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="search"
      [title]="i18n.translate('dataExplorer.title')"
      [subtitle]="i18n.translate('dataExplorer.subtitle')"
      [breadcrumbs]="['Dashboard', 'Data Explorer']"
      [loading]="!loaded">

      <p-toast />

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">{{ risks.length }}</span>
          <span class="kpi-label">{{ i18n.translate('dataExplorer.risks') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ controls.length }}</span>
          <span class="kpi-label">{{ i18n.translate('dataExplorer.controls') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ evidence.length }}</span>
          <span class="kpi-label">{{ i18n.translate('dataExplorer.evidence') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ complianceScore }}%</span>
          <span class="kpi-label">{{ i18n.translate('dataExplorer.complianceScore') }}</span>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('dataExplorer.search')" [attr.aria-label]="i18n.translate('dataExplorer.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
          <p-dropdown [options]="domainOptions" [(ngModel)]="selectedDomain"
                      optionLabel="label" optionValue="value"
                      (onChange)="switchDomain($event.value)"
                      styleClass="ms-3" [style]="{'min-width':'160px'}" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('dataExplorer.export')" icon="pi pi-download"
                    severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <!-- Domain Tab Buttons -->
      <div class="tab-btns mb-3">
        <button class="tab-btn" [class.active]="activeDomain === 'risks'" (click)="switchDomain('risks')">
          <i class="pi pi-exclamation-triangle"></i>
          {{ i18n.translate('dataExplorer.risks') }} ({{ risks.length }})
        </button>
        <button class="tab-btn" [class.active]="activeDomain === 'controls'" (click)="switchDomain('controls')">
          <i class="pi pi-shield"></i>
          {{ i18n.translate('dataExplorer.controls') }} ({{ controls.length }})
        </button>
        <button class="tab-btn" [class.active]="activeDomain === 'evidence'" (click)="switchDomain('evidence')">
          <i class="pi pi-file"></i>
          {{ i18n.translate('dataExplorer.evidence') }} ({{ evidence.length }})
        </button>
      </div>

      <!-- Risks Table -->
      <p-table aria-label="Filtered Risks table" *ngIf="activeDomain === 'risks'" [value]="filteredRisks" [paginator]="filteredRisks.length > 15"
               [rows]="15" styleClass="p-datatable-striped p-datatable-gridlines"
               [globalFilterFields]="['title','name','category','status']">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('dataExplorer.headerTitle') }}</th>
            <th>{{ i18n.translate('dataExplorer.category') }}</th>
            <th>{{ i18n.translate('dataExplorer.likelihood') }}</th>
            <th>{{ i18n.translate('dataExplorer.impact') }}</th>
            <th>{{ i18n.translate('dataExplorer.status') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td><strong>{{ r.title ?? r.name ?? '-' }}</strong></td>
            <td>{{ r.category ?? '-' }}</td>
            <td>{{ r.likelihood ?? '-' }}</td>
            <td>{{ r.impact ?? '-' }}</td>
            <td><app-status-badge [status]="r.status ?? 'open'" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-msg">{{ i18n.translate('dataExplorer.noRisks') }}</td></tr>
        </ng-template>
      </p-table>

      <!-- Controls Table -->
      <p-table aria-label="Filtered Controls table" *ngIf="activeDomain === 'controls'" [value]="filteredControls" [paginator]="filteredControls.length > 15"
               [rows]="15" styleClass="p-datatable-striped p-datatable-gridlines">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('dataExplorer.headerTitle') }}</th>
            <th>{{ i18n.translate('dataExplorer.code') }}</th>
            <th>{{ i18n.translate('dataExplorer.status') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><strong>{{ c.title ?? c.control_name ?? c.name ?? '-' }}</strong></td>
            <td><code>{{ c.control_code ?? c.code ?? '-' }}</code></td>
            <td><app-status-badge [status]="c.status ?? c.effectiveness ?? 'active'" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3" class="empty-msg">{{ i18n.translate('dataExplorer.noControls') }}</td></tr>
        </ng-template>
      </p-table>

      <!-- Evidence Table -->
      <p-table aria-label="Filtered Evidence table" *ngIf="activeDomain === 'evidence'" [value]="filteredEvidence" [paginator]="filteredEvidence.length > 15"
               [rows]="15" styleClass="p-datatable-striped p-datatable-gridlines">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('dataExplorer.headerTitle') }}</th>
            <th>{{ i18n.translate('dataExplorer.type') }}</th>
            <th>{{ i18n.translate('dataExplorer.status') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td><strong>{{ e.title ?? e.name ?? e.description ?? '-' }}</strong></td>
            <td>{{ e.evidence_type_code ?? e.type ?? '-' }}</td>
            <td><app-status-badge [status]="e.status ?? 'pending'" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3" class="empty-msg">{{ i18n.translate('dataExplorer.noEvidence') }}</td></tr>
        </ng-template>
      </p-table>

      <!-- Empty state when loaded but no data at all -->
      <div *ngIf="loaded && risks.length === 0 && controls.length === 0 && evidence.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('dataExplorer.noDataToExplore') }}</p>
      </div>

    </app-page-shell>
    <app-ai-panel module="data-explorer" />
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: var(--space-md); }
    .kpi-card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
    .kpi-value { display: block; font-size: var(--font-size-3xl); font-weight: 600; color: var(--primary-color, var(--primary)); }
    .kpi-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .tab-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); background: var(--surface-card, #fff); cursor: pointer; font-size: var(--font-size-base); color: var(--text-muted); transition: all 150ms; }
    .tab-btn:hover { background: var(--surface-hover, var(--surface-ice)); }
    .tab-btn.active { background: var(--primary-color, var(--primary)); color: #fff; border-color: var(--primary-color, var(--primary)); }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    code { background: var(--surface-hover, var(--surface-ice)); padding: 2px 6px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); }
  `]
})
export class DataExplorerComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
    private complianceSvc = inject(GrcComplianceService);
  risks: Record<string, any>[] = [];
  controls: Record<string, any>[] = [];
  evidence: Record<string, any>[] = [];
  complianceScore = 0;
  loaded = false;

  filteredRisks: Record<string, any>[] = [];
  filteredControls: Record<string, any>[] = [];
  filteredEvidence: Record<string, any>[] = [];

  searchTerm = '';
  activeDomain: 'risks' | 'controls' | 'evidence' = 'risks';
  selectedDomain = 'all';
  domainOptions = [
    { label: 'All', value: 'all' },
    { label: 'Risks', value: 'risks' },
    { label: 'Controls', value: 'controls' },
    { label: 'Evidence', value: 'evidence' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private riskSvc: GrcRiskService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    forkJoin({
      risks: this.riskSvc.getRiskList().pipe(catchError(() => of([]))),
      controls: this.complianceSvc.getControls().pipe(catchError(() => of({ controls: [] }))),
      evidence: this.complianceSvc.getEvidence().pipe(catchError(() => of([]))),
      kpis: this.operationsSvc.getAnalyticsKPIs().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ risks: r, controls: c, evidence: ev, kpis: k }) => {
        this.risks = (r as GrcRecord)?.risks ?? (Array.isArray(r) ? r : []);
        this.controls = (c as GrcRecord)?.controls ?? (Array.isArray(c) ? c : []);
        this.evidence = (ev as GrcRecord)?.evidence ?? (Array.isArray(ev) ? ev : []);
        this.complianceScore = Math.round((k as GrcRecord)?.complianceScore ?? 0);
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  switchDomain(domain: string): void {
    if (domain === 'all') {
      this.activeDomain = 'risks';
    } else if (domain === 'controls' || domain === 'evidence' || domain === 'risks') {
      this.activeDomain = domain;
    } else {
      this.activeDomain = 'risks';
    }
    this.selectedDomain = domain;
    this.filterItems();
  }

  filterItems(): void {
    const t = this.searchTerm.toLowerCase();
    this.filteredRisks = this.risks.filter(r =>
      !t || (r.title ?? r.name ?? '').toLowerCase().includes(t) ||
      (r.category ?? '').toLowerCase().includes(t) ||
      (r.status ?? '').toLowerCase().includes(t)
    );
    this.filteredControls = this.controls.filter(c =>
      !t || (c.title ?? c.control_name ?? c.name ?? '').toLowerCase().includes(t) ||
      (c.control_code ?? c.code ?? '').toLowerCase().includes(t) ||
      (c.status ?? '').toLowerCase().includes(t)
    );
    this.filteredEvidence = this.evidence.filter(e =>
      !t || (e.title ?? e.name ?? e.description ?? '').toLowerCase().includes(t) ||
      (e.evidence_type_code ?? e.type ?? '').toLowerCase().includes(t) ||
      (e.status ?? '').toLowerCase().includes(t)
    );
  }

  exportCSV(): void {
    let data: Record<string, any>[] = [];
    let filename = 'data-explorer';
    if (this.activeDomain === 'risks') {
      data = this.filteredRisks;
      filename = 'risks-export';
    } else if (this.activeDomain === 'controls') {
      data = this.filteredControls;
      filename = 'controls-export';
    } else {
      data = this.filteredEvidence;
      filename = 'evidence-export';
    }
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
  }
}
