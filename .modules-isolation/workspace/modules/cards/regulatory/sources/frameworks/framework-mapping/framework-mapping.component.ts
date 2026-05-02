import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { SessionService } from '@app/dauth/session/session.service';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface MappingRow {
  controlId: string; code: string; titleEn: string; titleAr: string;
  sourceFramework: string; priority: string; status: string;
  mappedTo: string[]; mappedFrameworks: string[];
  coverageCount: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-framework-mapping',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TableModule, TagModule, ButtonModule, CardModule, TooltipModule, DropdownModule, InputTextModule, DialogModule],
  template: `
    <app-page-shell
      icon="sitemap"
      [title]="i18n.translate('frameworkMapping.title')"
      [subtitle]="i18n.translate('frameworkMapping.subtitle')"
      [breadcrumbs]="['Dashboard', 'Framework Mapping']"
      [loading]="loading">

      <!-- Auto-refresh indicator -->
      <div class="refresh-bar" *ngIf="lastUpdated">
        <span class="refresh-dot" [class.live]="!loading"></span>
        <span class="refresh-text">{{ i18n.translate('frameworkMapping.lastSynced') }}: {{ lastUpdated | appDate:'medium' }}</span>
        <button aria-label="Refresh" class="refresh-btn" (click)="loadData()" [disabled]="loading"><i class="pi pi-refresh" [class.pi-spin]="loading"></i></button>
      </div>

      <!-- Efficiency Banner -->
      <div class="efficiency-banner">
        <div class="eff-stat">
          <div class="eff-value">{{ uniqueControls }}</div>
          <div class="eff-label">{{ i18n.translate('frameworkMapping.uniqueControls') }}</div>
        </div>
        <div class="eff-arrow"><i class="pi pi-arrow-right"></i></div>
        <div class="eff-stat">
          <div class="eff-value">{{ totalSatisfied }}</div>
          <div class="eff-label">{{ i18n.translate('frameworkMapping.requirementsSatisfied') }}</div>
        </div>
        <div class="eff-ratio">
          <div class="eff-ratio-val">{{ efficiencyRatio }}x</div>
          <div class="eff-label">{{ i18n.translate('frameworkMapping.efficiencyRatio') }}</div>
        </div>
      </div>

      <!-- View Toggle -->
      <div class="view-toggle">
        <button class="toggle-btn" [class.active]="viewMode === 'matrix'" (click)="viewMode = 'matrix'">
          <i class="pi pi-table"></i> {{ i18n.translate('frameworkMapping.matrixView') }}
        </button>
        <button class="toggle-btn" [class.active]="viewMode === 'visual'" (click)="viewMode = 'visual'">
          <i class="pi pi-share-alt"></i> {{ i18n.translate('frameworkMapping.visualMap') }}
        </button>
      </div>

      <!-- Matrix View -->
      <div *ngIf="viewMode === 'matrix'">
        <div class="filter-bar">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm" placeholder="Search controls..." aria-label="Search controls..." (input)="filterMappings()" />
          </span>
          <p-dropdown [options]="frameworkOptions" [(ngModel)]="selectedFramework"
                      placeholder="All Frameworks" [showClear]="true" (onChange)="filterMappings()" />
        </div>

        <p-table aria-label="Filtered Mappings table" [value]="filteredMappings" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,25]"
                 styleClass="p-datatable-striped p-datatable-sm" [sortField]="'coverageCount'" [sortOrder]="-1">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="code">{{ i18n.translate('frameworkMapping.code') }}</th>
              <th>{{ i18n.translate('frameworkMapping.control') }}</th>
              <th pSortableColumn="status">{{ i18n.translate('common.status') }}</th>
              <th>{{ i18n.translate('frameworkMapping.priority') }}</th>
              <th *ngFor="let fw of frameworkColumns" style="text-align: center">{{ fw }}</th>
              <th pSortableColumn="coverageCount" style="text-align: center">{{ i18n.translate('frameworkMapping.coverage') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td><strong>{{ row.code }}</strong></td>
              <td>{{ i18n.localize(row.titleEn, row.titleAr) }}</td>
              <td><span class="status-chip" [class]="'status-' + row.status">{{ row.status | titlecase }}</span></td>
              <td><span class="priority-badge" [class]="'priority-' + row.priority">{{ row.priority }}</span></td>
              <td *ngFor="let fw of frameworkColumns" style="text-align: center">
                <i *ngIf="row.mappedFrameworks.includes(fw)" class="pi pi-check-circle" style="color: var(--success); font-size: var(--font-size-md);"></i>
                <span *ngIf="!row.mappedFrameworks.includes(fw)" style="color: #e2e8f0;">—</span>
              </td>
              <td style="text-align: center">
                <span class="coverage-badge" [class.high]="row.coverageCount >= 3" [class.medium]="row.coverageCount === 2">
                  {{ row.coverageCount }}
                </span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Visual Map View -->
      <div *ngIf="viewMode === 'visual'" class="visual-map">
        <div class="visual-notice">
          <i class="pi pi-info-circle"></i>
          {{ i18n.translate('frameworkMapping.visualNotice') }}
        </div>

        <div class="visual-columns">
          <div class="vis-col">
            <h4>NCA ECC</h4>
            <div *ngFor="let m of mappingsWithConnections" class="vis-node"
                 [class.highlighted]="highlightedControl === m.controlId"
                 (mouseenter)="highlightedControl = m.controlId"
                 (mouseleave)="highlightedControl = null"
                 [style.border-inline-start-color]="highlightedControl === m.controlId ? '#1e40af' : 'var(--border-subtle)'">
              <span class="vis-code">{{ m.code }}</span>
              <span class="vis-title">{{ i18n.localize(m.titleEn, m.titleAr) }}</span>
            </div>
          </div>
          <div class="vis-col">
            <h4>{{ i18n.translate('frameworkMapping.mappedFrameworks') }}</h4>
            <div *ngFor="let m of mappingsWithConnections">
              <div *ngIf="highlightedControl === m.controlId || !highlightedControl" class="vis-targets">
                <p-tag *ngFor="let fw of m.mappedFrameworks" [value]="fw" [severity]="fw === 'ECC' ? 'info' : 'success'" styleClass="vis-tag" />
                <span class="vis-arrow" *ngIf="m.mappedTo.length > 0">→ {{ m.mappedTo.join(', ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Coverage Recommendations -->
      <div class="recommendations">
        <h3><i class="pi pi-star"></i> {{ i18n.translate('frameworkMapping.top10Coverage') }}</h3>
        <div class="rec-grid">
          <div *ngFor="let m of topCoverage" class="rec-card">
            <div class="rec-code">{{ m.code }}</div>
            <div class="rec-title">{{ i18n.localize(m.titleEn, m.titleAr) }}</div>
            <div class="rec-fws">
              <p-tag *ngFor="let fw of m.mappedFrameworks" [value]="fw" severity="info" />
            </div>
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="export-bar">
        <button class="export-btn pdf" (click)="exportMapping('pdf')"><i class="pi pi-file-pdf"></i> PDF</button>
        <button class="export-btn excel" (click)="exportMapping('excel')"><i class="pi pi-file-excel"></i> Excel</button>
        <button class="export-btn html" (click)="exportMapping('html')"><i class="pi pi-globe"></i> Interactive HTML</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .efficiency-banner {
      display: flex; align-items: center; justify-content: center; gap: 32px;
      background: linear-gradient(135deg, #eff6ff, #e0f2fe); border-radius: var(--radius-xl);
      padding: 24px; margin-bottom: 24px;
    }
    .eff-stat { text-align: center; }
    .eff-value { font-size: 36px; font-weight: 800; color: var(--primary, #1e40af); }
    .eff-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .eff-arrow { font-size: var(--font-size-2xl); color: var(--primary, #1e40af); }
    .eff-ratio { text-align: center; background: var(--success); color: #fff; padding: 12px 24px; border-radius: var(--radius-lg); }
    .eff-ratio-val { font-size: var(--font-size-3xl); font-weight: 800; }

    .view-toggle { display: flex; gap: 4px; margin-bottom: 16px; }
    .toggle-btn { padding: 8px 16px; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius); background: #fff; cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; gap: 6px; transition: all 200ms; }
    .toggle-btn.active { background: var(--primary, #1e40af); color: #fff; border-color: var(--primary); }

    .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
    .filter-bar .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .filter-bar .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .filter-bar .p-input-icon-left > input { padding-inline-start: 36px; min-width: 250px; }

    .priority-badge { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-pill); }
    .priority-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-high { background: #fed7aa; color: #9a3412; }
    .priority-medium { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }

    .coverage-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-pill); background: var(--surface-ice); font-weight: 700; font-size: var(--font-size-sm); }
    .coverage-badge.high { background: #dcfce7; color: var(--success); }
    .coverage-badge.medium { background: #e0f2fe; color: #0369a1; }

    .visual-map { }
    .visual-notice { padding: 12px 16px; background: #eff6ff; border-radius: var(--radius); font-size: var(--font-size-sm); color: #1e40af; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .visual-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .vis-col h4 { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 12px; }
    .vis-node { padding: 8px 12px; border-inline-start: 3px solid var(--border-subtle); margin-bottom: 4px; cursor: pointer; transition: all 200ms; border-radius: 0 6px 6px 0; }
    .vis-node:hover, .vis-node.highlighted { background: #eff6ff; border-inline-start-color: #1e40af; }
    .vis-code { font-weight: 700; font-size: var(--font-size-sm); color: var(--primary); margin-inline-end: 8px; }
    .vis-title { font-size: var(--font-size-sm); }
    .vis-targets { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 4px 0; }
    .vis-arrow { font-size: var(--font-size-xs); color: var(--text-muted); }

    .recommendations { margin: 24px 0; }
    .recommendations h3 { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .rec-card { background: #fff; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-md); padding: 14px; transition: all 200ms; }
    .rec-card:hover { border-color: var(--primary); box-shadow: var(--shadow-sm); }
    .rec-code { font-weight: 700; font-size: var(--font-size-sm); color: var(--primary); margin-bottom: 4px; }
    .rec-title { font-size: var(--font-size-sm); margin-bottom: 8px; }
    .rec-fws { display: flex; gap: 4px; flex-wrap: wrap; }

    .refresh-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 8px 14px; background: var(--status-success-bg, #defbe6); border-radius: var(--radius-md); border: 1px solid #bbf7d0; }
    .refresh-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--text-muted); flex-shrink: 0; }
    .refresh-dot.live { background: var(--success); animation: pulse-dot 2s infinite; }
    @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .refresh-text { font-size: var(--font-size-sm); color: var(--text-muted); flex: 1; }
    .refresh-btn { background: none; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 4px 8px; cursor: pointer; color: var(--text-muted); }
    .refresh-btn:hover { background: var(--surface-ice); }

    .status-chip { padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 700; }
    .status-implemented { background: #dcfce7; color: var(--success); }
    .status-partially { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .status-not_implemented { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .status-not_applicable { background: var(--surface-ice); color: var(--text-muted); }
    .status-not_assessed { background: var(--surface-ice); color: var(--text-muted); }

    .export-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; }
    .export-btn { padding: 10px 20px; border-radius: var(--radius-md); border: 1.5px solid; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 200ms; }
    .export-btn.pdf { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .export-btn.excel { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .export-btn.html { background: #eff6ff; border-color: var(--primary); color: var(--primary); }
  `],
})
export class FrameworkMappingComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  frameworkColumns: string[] = [];
  allMappings: MappingRow[] = [];
  filteredMappings: MappingRow[] = [];
  topCoverage: MappingRow[] = [];
  mappingsWithConnections: MappingRow[] = [];
  viewMode: 'matrix' | 'visual' = 'matrix';
  searchTerm = '';
  selectedFramework: string | null = null;
  highlightedControl: string | null = null;
  loading = true;
  lastUpdated: string | null = null;

  uniqueControls = 0;
  totalSatisfied = 0;
  efficiencyRatio = '1.0';

  frameworkOptions: { label: string; value: string }[] = [];
  private refreshSub?: Subscription;
  private AUTO_REFRESH_MS = 30000;
  private cdr = inject(ChangeDetectorRef);
  private keycloakAuth = inject(GrcAuthService);
  private activatedRoute = inject(ActivatedRoute);
  private toast = inject(ToastService);

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    const qp = this.activatedRoute.snapshot.queryParams;
    if (qp['frameworkId']) this.selectedFramework = qp['frameworkId'];
    this.loadData();
    this.refreshSub = interval(this.AUTO_REFRESH_MS).pipe(
      switchMap(() => this.complianceSvc.getKSAFrameworkMapping())
    , takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: any) => this.applyData(data),
      error: (e: any) => devError("[API]", e),
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.complianceSvc.getKSAFrameworkMapping().subscribe({
      next: (data: any) => { this.applyData(data); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  private applyData(data: any): void {
    this.allMappings = data.mappings || [];
    this.frameworkColumns = data.frameworkColumns || [];
    this.uniqueControls = data.uniqueControls || 0;
    this.totalSatisfied = data.totalSatisfied || 0;
    this.efficiencyRatio = String(data.efficiencyRatio || '1.0');
    this.lastUpdated = data.lastUpdated;
    this.mappingsWithConnections = this.allMappings;
    this.topCoverage = [...this.allMappings].sort((a, b) => b.coverageCount - a.coverageCount).slice(0, 10);
    this.frameworkOptions = this.frameworkColumns.map(f => ({ label: f, value: f }));
    this.filterMappings();
  }

  filterMappings(): void {
    let result = this.allMappings;
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(m => m.titleEn.toLowerCase().includes(q) || m.titleAr.includes(q) || m.code.includes(q));
    }
    if (this.selectedFramework) {
      result = result.filter(m => m.mappedFrameworks.includes(this.selectedFramework!));
    }
    this.filteredMappings = result;
  }

  exportMapping(format: string): void {
    if (format === 'html') {
      const json = JSON.stringify({
        mappings: this.allMappings, frameworkColumns: this.frameworkColumns,
        uniqueControls: this.uniqueControls, totalSatisfied: this.totalSatisfied, efficiencyRatio: this.efficiencyRatio,
      }).replace(/<\//g, '<\\/');
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cross-Framework Control Mapping</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
.header{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:32px;border-radius:var(--radius-xl);text-align:center;margin-bottom:24px}
.header h1{font-size: var(--font-size-2xl);margin-bottom:4px}.header p{opacity:.85;font-size: var(--font-size-sm)}
.eff{display:flex;justify-content:center;gap:32px;padding:20px;background:#eff6ff;border-radius:var(--radius-lg);margin-bottom:20px;text-align:center}
.eff-v{font-size: var(--font-size-3xl);font-weight:800;color:#1e40af}.eff-l{font-size: var(--font-size-sm);color:var(--text-muted)}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border-subtle)}
th{background:var(--surface-ice);padding:8px;font-size: var(--font-size-xs);font-weight:700;color:var(--text-muted);text-align:center}
td{padding:8px;text-align:center;font-size: var(--font-size-sm);border-bottom:1px solid var(--surface-ice)}
.chk{color:var(--success);font-weight:700}.miss{color:var(--border-subtle)}
.badge{display:inline-block;padding:2px 8px;border-radius:var(--radius-pill);font-size: var(--font-size-xs);font-weight:700}
.badge-critical{background:var(--status-danger-bg, #fff1f1);color:#991b1b}.badge-high{background:#fed7aa;color:#9a3412}
input{padding:8px 12px;border:1px solid var(--border-subtle);border-radius:var(--radius);font-size: var(--font-size-sm);margin-bottom:12px;width:300px}
@media print{body{padding:0}input{display:none}}
</style></head><body>
<div class="header"><h1>Cross-Framework Control Mapping</h1><p>Generated ${new Date().toLocaleDateString()}</p></div>
<div class="eff"><div><div class="eff-v" id="uc"></div><div class="eff-l">Unique Controls</div></div>
<div><div class="eff-v" id="ts"></div><div class="eff-l">Requirements Satisfied</div></div>
<div><div class="eff-v" id="er" style="color:var(--success)"></div><div class="eff-l">Efficiency Ratio</div></div></div>
<input type="text" placeholder="Search controls..." aria-label="Search controls..." oninput="filter(this.value)">
<table><thead><tr><th>Code</th><th>Control</th><th>Priority</th><th id="fwh"></th><th>Coverage</th></tr></thead><tbody id="body"></tbody></table>
<script>
const D=${json};
document.getElementById('uc').textContent=D.uniqueControls;
document.getElementById('ts').textContent=D.totalSatisfied;
document.getElementById('er').textContent=D.efficiencyRatio+'x';
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
document.getElementById('fwh').outerHTML=D.frameworkColumns.map(f=>'<th>'+esc(f)+'</th>').join('');
function render(items){document.getElementById('body').innerHTML=items.map(m=>{
const fws=D.frameworkColumns.map(f=>m.mappedFrameworks.includes(f)?'<td class="chk">\\u2713</td>':'<td class="miss">—</td>').join('');
return '<tr><td><strong>'+esc(m.code)+'</strong></td><td style="text-align:start">'+esc(m.titleEn)+'</td><td><span class="badge badge-'+esc(m.priority)+'">'+esc(m.priority)+'</span></td>'+fws+'<td><strong>'+m.coverageCount+'</strong></td></tr>'}).join('')}
render(D.mappings);
function filter(q){q=q.toLowerCase();render(D.mappings.filter(m=>m.titleEn.toLowerCase().includes(q)||m.code.includes(q)))}
<\\/script></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cross-framework-mapping.html'; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const lang = this.i18n.currentLang();
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const url = `/api/reports/generate/cross-mapping/${format}?lang=${lang}`;
      this.apiclientSvc.getBlob(`/reports/generate/cross-mapping/${format}?lang=${lang}`).subscribe({
        next: (blob) => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = `cross-framework-mapping.${ext}`; a.click(); URL.revokeObjectURL(a.href);
        },
        error: (err) => this.toast.error('Download failed: ' + (err.message || 'Unknown error')),
      });
    }
  }

}
