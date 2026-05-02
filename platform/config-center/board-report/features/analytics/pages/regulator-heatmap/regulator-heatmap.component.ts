import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { devError } from '@app/runtime/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcAuthService } from '@app/core/services/grc-auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-regulator-heatmap',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TooltipModule, CardModule, ButtonModule, DialogModule, ProgressBarModule, TagModule],
  template: `
    <app-page-shell
      icon="chart-bar"
      [title]="i18n.translate('regulatorHeatmap.pageTitle')"
      [subtitle]="i18n.translate('regulatorHeatmap.pageSubtitle')"
      [breadcrumbs]="['Dashboard', 'Regulator Heatmap']"
      [loading]="loading">

      <!-- Auto-refresh indicator -->
      <div class="refresh-bar" *ngIf="lastUpdated">
        <span class="refresh-dot" [class.live]="!loading"></span>
        <span class="refresh-text">{{ i18n.translate('regulatorHeatmap.lastSynced') }}: {{ lastUpdated | appDate:'medium' }}</span>
        <button aria-label="Refresh" class="refresh-btn" (click)="loadData()" [disabled]="loading"><i class="pi pi-refresh" [class.pi-spin]="loading"></i></button>
      </div>

      <!-- Regulator Cards Row -->
      <div class="reg-cards-row">
        <div tabindex="0" role="button" (keyup.enter)="toggleRegulator(reg.regulatorId)" *ngFor="let reg of regulators" class="reg-card" [style.border-color]="reg.color"
             [class.selected]="selectedRegulator === reg.regulatorId" (click)="toggleRegulator(reg.regulatorId)">
          <div class="reg-acronym" [style.background]="reg.color">{{ reg.acronym }}</div>
          <div class="reg-info">
            <div class="reg-name">{{ i18n.localize(reg.nameEn, reg.nameAr) }}</div>
            <div class="reg-fw-count">{{ reg.frameworks.length }} {{ i18n.translate('regulatorHeatmap.frameworks') }}</div>
          </div>
          <div class="reg-score-ring">
            <svg viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" stroke-width="3"/>
              <circle cx="20" cy="20" r="16" fill="none" [attr.stroke]="reg.color" stroke-width="3"
                      stroke-linecap="round" [attr.stroke-dasharray]="getRingDash(reg.overallScore)" transform="rotate(-90 20 20)"/>
            </svg>
            <span class="ring-text">{{ reg.overallScore }}%</span>
          </div>
        </div>
      </div>

      <!-- Heatmap Grid -->
      <div class="heatmap-section">
        <h3>{{ i18n.translate('regulatorHeatmap.complianceMatrix') }}</h3>
        <div class="heatmap-grid" [style.grid-template-columns]="'100px repeat(' + columns.length + ', 1fr)'">
          <!-- Header row -->
          <div class="hm-cell hm-header hm-corner"></div>
          <div *ngFor="let col of columns" class="hm-cell hm-header">{{ col }}</div>

          <!-- Data rows -->
          <ng-container *ngFor="let reg of getFilteredRegulators()">
            <div class="hm-cell hm-row-header">
              <span class="hm-acronym" [style.background]="reg.color">{{ reg.acronym }}</span>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="openDrillDown(reg, col)" *ngFor="let col of columns" class="hm-cell hm-data"
                 [style.background]="getCellColor(reg, col)"
                 [pTooltip]="getCellTooltip(reg, col)"
                 tooltipPosition="top"
                 (click)="openDrillDown(reg, col)">
              <span *ngIf="getCellScore(reg, col) >= 0" class="hm-score">{{ getCellScore(reg, col) }}%</span>
              <span *ngIf="getCellScore(reg, col) < 0" class="hm-na">—</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-item"><span class="legend-dot" style="background:#dcfce7"></span> {{ i18n.translate('regulatorHeatmap.compliant70') }}</span>
        <span class="legend-item"><span class="legend-dot" style="background:var(--status-warning-bg, #fcf4d6)"></span> {{ i18n.translate('regulatorHeatmap.range3070') }}</span>
        <span class="legend-item"><span class="legend-dot" style="background:var(--status-danger-bg, #fff1f1)"></span> {{ i18n.translate('regulatorHeatmap.below30') }}</span>
        <span class="legend-item"><span class="legend-dot" style="background:var(--surface-ice)"></span> {{ i18n.translate('regulatorHeatmap.notApplicable') }}</span>
      </div>

      <!-- Export -->
      <div class="export-bar">
        <button class="export-btn pdf" (click)="exportReport('pdf')"><i class="pi pi-file-pdf"></i> PDF</button>
        <button class="export-btn excel" (click)="exportReport('excel')"><i class="pi pi-file-excel"></i> Excel</button>
        <button class="export-btn html" (click)="exportReport('html')"><i class="pi pi-globe"></i> Interactive HTML</button>
      </div>

      <!-- Drill-down Dialog -->
      <p-dialog [(visible)]="drillVisible" [header]="drillTitle" [style]="{width: '600px'}" [modal]="true">
        <div *ngIf="drillData">
          <p>{{ i18n.translate('regulatorHeatmap.complianceDetails') }}</p>
          <div class="drill-stat">
            <span class="drill-label">{{ i18n.translate('regulatorHeatmap.scoreLabel') }}</span>
            <span class="drill-value">{{ drillData.score }}%</span>
          </div>
          <p-progressBar [value]="drillData.score" [showValue]="false" />
          <p class="drill-hint">{{ i18n.translate('regulatorHeatmap.navigateToAssessment') }}</p>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .reg-cards-row { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 24px; }
    .reg-card {
      min-width: 200px; padding: 14px; background: #fff; border: 2px solid var(--border-subtle); border-radius: var(--radius-lg);
      display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 200ms; flex-shrink: 0;
    }
    .reg-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .reg-card.selected { border-width: 2.5px; box-shadow: var(--shadow-md); }
    .reg-acronym { width: 40px; height: 40px; border-radius: var(--radius-md); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: var(--font-size-sm); flex-shrink: 0; }
    .reg-info { flex: 1; min-width: 0; }
    .reg-name { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .reg-fw-count { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .reg-score-ring { position: relative; width: 40px; height: 40px; flex-shrink: 0; }
    .reg-score-ring svg { width: 100%; height: 100%; }
    .ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: var(--font-size-xs); font-weight: 700; }

    .heatmap-section { margin-bottom: 24px; }
    .heatmap-section h3 { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 12px; }
    .refresh-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 8px 14px; background: var(--status-success-bg, #defbe6); border-radius: var(--radius-md); border: 1px solid #bbf7d0; }
    .refresh-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--text-muted); flex-shrink: 0; }
    .refresh-dot.live { background: var(--success); animation: pulse-dot 2s infinite; }
    @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .refresh-text { font-size: var(--font-size-sm); color: var(--text-muted); flex: 1; }
    .refresh-btn { background: none; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 4px 8px; cursor: pointer; color: var(--text-muted); }
    .refresh-btn:hover { background: var(--surface-ice); }

    .heatmap-grid {
      display: grid; gap: 2px;
      background: #fff; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border, var(--border-subtle));
    }
    .hm-cell { padding: 10px 8px; text-align: center; font-size: var(--font-size-sm); }
    .hm-header { background: var(--surface-ice); font-weight: 700; color: var(--text-muted); font-size: var(--font-size-xs); }
    .hm-corner { background: var(--surface-ice); }
    .hm-row-header { background: var(--surface-ice); display: flex; align-items: center; justify-content: center; }
    .hm-acronym { padding: 2px 8px; border-radius: var(--radius-sm); color: #fff; font-size: var(--font-size-xs); font-weight: 700; }
    .hm-data { cursor: pointer; transition: all 200ms; border-radius: var(--radius-xs); }
    .hm-data:hover { opacity: 0.8; transform: scale(1.05); }
    .hm-score { font-weight: 700; font-size: var(--font-size-sm); }
    .hm-na { color: var(--text-muted); }

    .legend { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--text-muted); }
    .legend-dot { width: 16px; height: 16px; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); }

    .export-bar { display: flex; gap: 8px; flex-wrap: wrap; }
    .export-btn { padding: 10px 20px; border-radius: var(--radius-md); border: 1.5px solid; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 200ms; }
    .export-btn.pdf { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .export-btn.pdf:hover { background: var(--error); color: #fff; }
    .export-btn.excel { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .export-btn.excel:hover { background: var(--success); color: #fff; }
    .export-btn.html { background: #eff6ff; border-color: var(--primary); color: var(--primary); }
    .export-btn.html:hover { background: var(--primary); color: #fff; }

    .drill-stat { display: flex; justify-content: space-between; margin: 12px 0; }
    .drill-label { font-weight: 600; }
    .drill-value { font-weight: 800; font-size: var(--font-size-2xl); }
    .drill-hint { margin-top: 12px; font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class RegulatorHeatmapComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  regulators: Record<string, any>[] = [];
  columns: string[] = [];
  selectedRegulator: string | null = null;
  drillVisible = false;
  drillTitle = '';
  drillData: Record<string, any> | null = null;
  loading = true;
  lastUpdated: string | null = null;
  private refreshSub?: Subscription;
  private AUTO_REFRESH_MS = 30000;
  private keycloakAuth = inject(GrcAuthService);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 30s
    this.refreshSub = interval(this.AUTO_REFRESH_MS).pipe(
      switchMap(() => this.complianceSvc.getKSAHeatmap())
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
    this.complianceSvc.getKSAHeatmap().subscribe({
      next: (data: any) => { this.applyData(data); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  private applyData(data: any): void {
    this.regulators = data.regulators || [];
    this.columns = data.columns || [];
    this.lastUpdated = data.lastUpdated;
  }

  toggleRegulator(id: string): void {
    this.selectedRegulator = this.selectedRegulator === id ? null : id;
  }

  getRegTotalControls(): number {
    return this.regulators.reduce((s, r) => s + (r.controlsTotal || 0), 0);
  }

  getRegAssessedControls(): number {
    return this.regulators.reduce((s, r) => s + (r.controlsAssessed || 0), 0);
  }

  getFilteredRegulators(): Record<string, any>[] {
    if (!this.selectedRegulator) return this.regulators;
    return this.regulators.filter(r => r.regulatorId === this.selectedRegulator);
  }

  getCellScore(reg: Record<string, any>, col: string): number {
    return reg.domainScores?.[col] ?? -1;
  }

  getCellColor(reg: Record<string, any>, col: string): string {
    const score = this.getCellScore(reg, col);
    if (score < 0) return '#f8fafc';
    if (score >= 70) return '#dcfce7';
    if (score >= 30) return 'var(--status-warning-bg, #fcf4d6)';
    return 'var(--status-danger-bg, #fff1f1)';
  }

  getCellTooltip(reg: Record<string, any>, col: string): string {
    const score = this.getCellScore(reg, col);
    if (score < 0) return 'Not applicable';
    return `${reg.acronym} — ${col}: ${score}%`;
  }

  getRingDash(pct: number): string {
    const c = 2 * Math.PI * 16;
    return `${(pct / 100) * c} ${c}`;
  }

  openDrillDown(reg: Record<string, any>, col: string): void {
    const score = this.getCellScore(reg, col);
    if (score < 0) return;
    this.drillTitle = `${reg.acronym} — ${col}`;
    // Find framework details for this regulator + domain
    const relatedFws = (reg.frameworks || []).filter((f: Record<string, any>) => (f.domains || []).includes(col));
    this.drillData = {
      score,
      frameworks: relatedFws,
      controlsTotal: reg.controlsTotal,
      controlsAssessed: reg.controlsAssessed,
    };
    this.drillVisible = true;
  }

  exportReport(format: string): void {
    const data = this.regulators.map(r => ({
      acronym: r.acronym, nameEn: r.nameEn, nameAr: r.nameAr,
      overallScore: r.overallScore, domainScores: r.domainScores,
    }));
    if (format === 'html') {
      const html = this.buildHeatmapHTML(data);
      this.downloadFile(html, 'regulator-heatmap.html', 'text/html');
    } else {
      const lang = this.i18n.currentLang();
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const url = `/api/reports/generate/regulator-heatmap/${format}?lang=${lang}`;
      this.apiclientSvc.getBlob(`/reports/generate/regulator-heatmap/${format}?lang=${lang}`).subscribe({
        next: (blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `regulator-heatmap.${ext}`;
            a.click();
            URL.revokeObjectURL(a.href);
        },
        error: (err) => this.toast.error('Download failed: ' + (err.message || 'Unknown error')),
      });
    }
  }

  private buildHeatmapHTML(data: Record<string, any>[]): string {
    const cols = this.columns;
    const json = JSON.stringify({ regulators: data, columns: cols }).replace(/<\//g, '<\\/');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KSA Regulator Compliance Heatmap</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
.header{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:32px;border-radius:var(--radius-xl);text-align:center;margin-bottom:24px}
.header h1{font-size: var(--font-size-2xl);margin-bottom:4px}.header p{opacity:.85;font-size: var(--font-size-sm)}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border-subtle)}
th{background:var(--surface-ice);padding:10px 8px;font-size: var(--font-size-xs);font-weight:700;color:var(--text-muted);text-align:center}
td{padding:10px 8px;text-align:center;font-size: var(--font-size-sm);font-weight:700;border-bottom:1px solid var(--surface-ice)}
.cell-high{background:#dcfce7;color:var(--success)}.cell-mid{background:var(--status-warning-bg, #fcf4d6);color:#92400e}.cell-low{background:var(--status-danger-bg, #fff1f1);color:#991b1b}.cell-na{background:var(--surface-ice);color:var(--text-muted)}
.acronym{display:inline-block;padding:2px 8px;border-radius:var(--radius-sm);color:#fff;font-size: var(--font-size-xs);font-weight:700}
@media print{body{padding:0}}
</style></head><body>
<div class="header"><h1>KSA Regulator Compliance Heatmap</h1><p>Generated ${new Date().toLocaleDateString()}</p></div>
<table><thead><tr><th>Regulator</th>${cols.map(c => '<th>' + c + '</th>').join('')}<th>Overall</th></tr></thead>
<tbody id="body"></tbody></table>
<script>
const D=${json};
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
document.getElementById('body').innerHTML=D.regulators.map(r=>{
const cells=D.columns.map(c=>{const s=r.domainScores[c]??-1;const cls=s<0?'cell-na':s>=70?'cell-high':s>=30?'cell-mid':'cell-low';return '<td class="'+cls+'">'+(s>=0?s+'%':'—')+'</td>'}).join('');
return '<tr><td><strong>'+esc(r.acronym)+'</strong></td>'+cells+'<td><strong>'+r.overallScore+'%</strong></td></tr>'}).join('');
<\/script></body></html>`;
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

}
