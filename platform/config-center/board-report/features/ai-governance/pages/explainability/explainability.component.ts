import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-explainability',
    imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, CardModule, TagModule, ButtonModule, DialogModule, TableModule, ToolbarModule, DropdownModule, ProgressBarModule, TooltipModule],
    template: `
    <app-page-shell icon="info-circle" [title]="'AI Explainability'"
      [subtitle]="'Transparency packs, decision audit trails, and confidence analysis for AI-driven decisions'"
      [breadcrumbs]="['Dashboard', 'Explainability']" [loading]="loading">

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ packs.length }}</div>
          <div class="kpi-label">Transparency Packs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-green">{{ highConfidenceCount() }}</div>
          <div class="kpi-label">High Confidence</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-orange">{{ medConfidenceCount() }}</div>
          <div class="kpi-label">Medium Confidence</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-red">{{ lowConfidenceCount() }}</div>
          <div class="kpi-label">Low Confidence</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-blue">{{ avgConfidence() | appNumber:'decimal':'1.0-0' }}%</div>
          <div class="kpi-label">Avg Confidence</div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="Generate Pack" icon="pi pi-plus" (onClick)="generate()" [loading]="generating" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="typeOptions" [(ngModel)]="filterType" placeholder="All Types" [showClear]="true" />
        </ng-template>
      </p-toolbar>

      <!-- Pack Cards -->
      <div class="pack-grid">
        @for (p of filteredPacks(); track p.pack_id || $index) {
          <div class="pack-card">
            <div class="pack-header">
              <h3>{{ p.title || p.pack_id }}</h3>
              <p-tag [value]="p.decision_type || 'ai'" severity="info" />
            </div>
            <p class="pack-desc">{{ p.explanation || 'AI decision explanation' }}</p>

            <!-- Confidence Bar -->
            <div class="confidence-section">
              <div class="confidence-label">
                <span>Confidence</span>
                <span class="confidence-pct" [class.high]="(p.confidence||0) >= 0.8" [class.low]="(p.confidence||0) < 0.5">
                  {{ (p.confidence || 0) * 100 | appNumber:'decimal':'1.0-0' }}%
                </span>
              </div>
              <p-progressBar [value]="(p.confidence || 0) * 100" [showValue]="false" [style]="{ height: '8px' }" />
            </div>

            <!-- Feature Importance -->
            @if (p.features && p.features.length) {
              <div class="features-section">
                <div class="feature-title">Top Factors</div>
                @for (f of p.features.slice(0, 3); track f.name) {
                  <div class="feature-row">
                    <span class="feature-name">{{ f.name }}</span>
                    <div class="feature-bar-bg">
                      <div class="feature-bar" [style.width.%]="(f.importance || f.weight || 0) * 100"></div>
                    </div>
                    <span class="feature-pct">{{ ((f.importance || f.weight || 0) * 100) | appNumber:'decimal':'1.0-0' }}%</span>
                  </div>
                }
              </div>
            }

            <div class="pack-meta">
              <span *ngIf="p.agent_name"><i class="pi pi-android"></i> {{ p.agent_name }}</span>
              <span *ngIf="p.entity_type"><i class="pi pi-tag"></i> {{ p.entity_type }}</span>
              <span><i class="pi pi-calendar"></i> {{ p.created_at | appDate:'medium' }}</span>
            </div>

            <div class="pack-actions">
              <p-button label="View Details" icon="pi pi-eye" size="small" [outlined]="true" (onClick)="viewPack(p)" />
              <p-button icon="pi pi-download" [text]="true" size="small" (onClick)="exportPack(p)" pTooltip="Export" />
            </div>
          </div>
        }
      </div>

      @if (packs.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-info-circle empty-icon"></i>
          <p>No explainability packs generated yet</p>
          <p class="empty-sub">Generate a transparency pack to audit AI decisions</p>
          <p-button label="Generate Pack" icon="pi pi-plus" (onClick)="generate()" class="mt-2" />
        </div>
      }

      <!-- Detail Dialog -->
      <p-dialog header="Transparency Pack Detail" [(visible)]="showDetail" [modal]="true" [style]="{ width: '640px' }">
        @if (selectedPack) {
          <div class="detail-content">
            <div class="detail-header">
              <h3>{{ selectedPack.title }}</h3>
              <p-tag [value]="selectedPack.decision_type" severity="info" />
            </div>
            <div class="detail-section">
              <h4>Explanation</h4>
              <p>{{ selectedPack.explanation }}</p>
            </div>
            <div class="detail-section">
              <h4>Decision Context</h4>
              <div class="context-grid">
                <div><strong>Agent:</strong> {{ selectedPack.agent_name || '—' }}</div>
                <div><strong>Entity:</strong> {{ selectedPack.entity_type }} {{ selectedPack.entity_id }}</div>
                <div><strong>Confidence:</strong> {{ (selectedPack.confidence || 0) * 100 | appNumber:'decimal':'1.0-0' }}%</div>
                <div><strong>Model:</strong> {{ selectedPack.model_version || '—' }}</div>
              </div>
            </div>
            @if (selectedPack.features?.length) {
              <div class="detail-section">
                <h4>Feature Importance</h4>
                <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="selectedPack.features" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr><th>Factor</th><th>Weight</th><th>Value</th><th>Impact</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-f>
                    <tr>
                      <td class="font-semibold">{{ f.name }}</td>
                      <td>
                        <p-progressBar [value]="(f.importance || f.weight || 0) * 100" [showValue]="false" [style]="{ height: '6px', width: '80px' }" />
                      </td>
                      <td>{{ f.value || '—' }}</td>
                      <td><p-tag [value]="f.impact || 'neutral'" [severity]="f.impact === 'positive' ? 'success' : f.impact === 'negative' ? 'danger' : 'info'" /></td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            }
            @if (selectedPack.audit_trail?.length) {
              <div class="detail-section">
                <h4>Audit Trail</h4>
                @for (entry of selectedPack.audit_trail; track $index) {
                  <div class="trail-entry">
                    <span class="trail-time">{{ entry.timestamp | appDate:'short' }}</span>
                    <span>{{ entry.action }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </p-dialog>

      <div *ngIf="error" class="error-state">
        <p>{{ error }}</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="danger" [outlined]="true" (onClick)="error=''; ngOnInit()" />
      </div>
    </app-page-shell>
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { padding: 18px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); text-align: center; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .text-green { color: var(--success); } .text-orange { color: var(--warning); } .text-red { color: var(--error); } .text-blue { color: var(--primary); }
    .mb-3 { margin-bottom: 16px; } .mt-2 { margin-top: 8px; }
    .pack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .pack-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-0, #fff); border: 1px solid var(--border, var(--border-subtle)); transition: all 200ms; }
    .pack-card:hover { border-color: var(--primary); box-shadow: var(--shadow-card); }
    .pack-header { display: flex; justify-content: space-between; align-items: center; }
    .pack-header h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .pack-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 8px 0; line-height: 1.5; }
    .confidence-section { margin: 12px 0; }
    .confidence-label { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px; }
    .confidence-pct { font-weight: 700; } .confidence-pct.high { color: var(--success); } .confidence-pct.low { color: var(--error); }
    .features-section { margin: 12px 0; padding: 10px; background: var(--bg-1, var(--surface-ice)); border-radius: var(--radius); }
    .feature-title { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
    .feature-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .feature-name { font-size: var(--font-size-sm); width: 100px; flex-shrink: 0; }
    .feature-bar-bg { flex: 1; height: 6px; background: var(--surface-ground, var(--border-subtle)); border-radius: var(--radius-xs); overflow: hidden; }
    .feature-bar { height: 100%; background: var(--primary, #2563eb); border-radius: var(--radius-xs); }
    .feature-pct { font-size: var(--font-size-xs); font-weight: 600; width: 35px; text-align: end; }
    .pack-meta { display: flex; gap: 12px; margin: 10px 0; font-size: var(--font-size-sm); color: var(--text-muted); flex-wrap: wrap; }
    .pack-meta i { margin-inline-end: 4px; font-size: var(--font-size-xs); }
    .pack-actions { display: flex; gap: 6px; align-items: center; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); display: block; margin-bottom: 12px; }
    .empty-sub { font-size: var(--font-size-sm); margin-top: 4px; }
    .detail-content { display: flex; flex-direction: column; gap: 20px; }
    .detail-header { display: flex; justify-content: space-between; align-items: center; }
    .detail-header h3 { margin: 0; font-size: var(--font-size-lg); }
    .detail-section h4 { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; color: var(--text-1); }
    .context-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: var(--font-size-sm); }
    .font-semibold { font-weight: 600; }
    .trail-entry { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border, var(--border-subtle)); font-size: var(--font-size-sm); }
    .trail-time { font-size: var(--font-size-sm); color: var(--text-muted); width: 120px; flex-shrink: 0; }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
  `]
})
export class ExplainabilityComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; packs: Record<string, any>[] = []; generating = false;
  showDetail = false; selectedPack: Record<string, any> | null = null; filterType = '';
  typeOptions = [
    { label: 'Risk', value: 'risk' }, { label: 'Compliance', value: 'compliance' },
    { label: 'Classification', value: 'classification' }, { label: 'Recommendation', value: 'recommendation' },
  ];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  highConfidenceCount(): number { return this.packs.filter(p => (p.confidence || 0) >= 0.8).length; }
  medConfidenceCount(): number { return this.packs.filter(p => (p.confidence || 0) >= 0.5 && (p.confidence || 0) < 0.8).length; }
  lowConfidenceCount(): number { return this.packs.filter(p => (p.confidence || 0) < 0.5).length; }

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getExplainabilityPacks().subscribe({
      next: (d: Record<string, any>) => { this.packs = Array.isArray(d) ? d : d.packs || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  filteredPacks(): Record<string, any>[] {
    if (!this.filterType) return this.packs;
    return this.packs.filter(p => p.decision_type === this.filterType);
  }

  avgConfidence(): number {
    if (!this.packs.length) return 0;
    return (this.packs.reduce((s, p) => s + (p.confidence || 0), 0) / this.packs.length) * 100;
  }

  viewPack(p: Record<string, any>) { this.selectedPack = p; this.showDetail = true; }

  exportPack(p: Record<string, any>) {
    this.apiclientSvc.post(`/explainability/${p.pack_id || p.id}/export`, {}).subscribe({
      next: (r: Record<string, any>) => { if (r.url) window.open(r.url); }
    });
  }

  generate() {
    this.generating = true;
    this.operationsSvc.generateExplainabilityPack({ scope: 'all' }).subscribe({
      next: () => { this.generating = false; this.cdr.markForCheck(); this.ngOnInit(); },
      error: () => { this.generating = false; this.cdr.markForCheck(); }
    });
  }
}
