import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Risk } from '@app/core/models/grc.models';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SliderModule } from 'primeng/slider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AiEntityContextPanelComponent } from '@app/shared/components/ai/ai-entity-context-panel.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

interface SeverityOption {
  label: string;
  value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risks',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent,
    CardModule, ToolbarModule, InputTextModule, InputTextarea,
    DropdownModule, ButtonModule, TagModule, DialogModule,
    SliderModule, ConfirmDialogModule, TooltipModule,
    EntityDetailDrawerComponent,
    AiPanelComponent, RaciPanelComponent, ToastModule,
    AiEntityContextPanelComponent,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="exclamation-triangle"
      [title]="i18n.translate('risk.register')"
      [subtitle]="i18n.translate('risk.subtitle')"
      [breadcrumbs]="['Dashboard', 'Risks']"
      [loading]="loading">

      <p-toast />

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('risk.addRisk')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('risk.searchRisks')" [attr.aria-label]="i18n.translate('risk.searchRisks')" (input)="filterRisks()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('common.exportCsv')" icon="pi pi-download" severity="secondary" [outlined]="true" (onClick)="exportCSV()" styleClass="me-2" />
          <p-dropdown [options]="severityOptions" [(ngModel)]="selectedSeverity" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('risk.severity')" (onChange)="filterRisks()" [style]="{minWidth:'180px'}" />
        </ng-template>
      </p-toolbar>

      <app-raci-panel entityType="risk" [entityId]="drawerRisk?.riskId || ''" [canEdit]="true" />

      <!-- Risk cards grid -->
      <div class="risk-grid">
        <p-card *ngFor="let risk of filteredRisks"
                [styleClass]="'risk-card risk-card--' + getSeverityClass(risk.riskScore)">
          <div class="risk-top">
            <h3 class="risk-title">{{ risk.title }}</h3>
            <div class="risk-top-actions">
              <p-tag [value]="risk.riskScore + ''" [severity]="getScoreSeverity(risk.riskScore)" [rounded]="true" />
              <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(risk)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
              <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(risk)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
            </div>
          </div>
          <p class="risk-desc">{{ risk.description }}</p>
          <div class="risk-metrics">
            <div class="metric">
              <span class="metric-label">{{ i18n.translate('risk.likelihood') }}</span>
              <span class="metric-value">{{ risk.likelihood }}<span class="metric-max">/5</span></span>
            </div>
            <div class="metric">
              <span class="metric-label">{{ i18n.translate('risk.impact') }}</span>
              <span class="metric-value">{{ risk.impact }}<span class="metric-max">/5</span></span>
            </div>
          </div>
          <div class="risk-badges">
            <app-status-badge [status]="risk.category" [label]="risk.category" />
            <app-status-badge [status]="risk.status" />
            <p-tag *ngIf="risk.controlCount" [value]="risk.controlCount + ' Controls'" severity="info" icon="pi pi-lock" />
            <p-tag *ngIf="!risk.controlCount" value="No Controls" severity="warning" icon="pi pi-lock" />
          </div>
          <div class="risk-owner" *ngIf="risk.owner">
            <i class="pi pi-user"></i> {{ risk.owner }}
          </div>
        </p-card>
      </div>

      <div *ngIf="!loading && filteredRisks.length === 0" class="empty-state">
        <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
        <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
      </div>

      <!-- Create / Edit Dialog -->
      <p-dialog [header]="editMode ? i18n.translate('risk.editRisk') : i18n.translate('risk.addRisk')"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('common.name') }}</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('common.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('risk.category') }}</label>
              <p-dropdown [(ngModel)]="form.category" [options]="categoryOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('risk.owner') }}</label>
              <input pInputText [(ngModel)]="form.owner" class="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('risk.likelihood') }}: {{ form.likelihood }}</label>
              <p-slider [(ngModel)]="form.likelihood" [min]="1" [max]="5" [step]="1" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('risk.impact') }}: {{ form.impact }}</label>
              <p-slider [(ngModel)]="form.impact" [min]="1" [max]="5" [step]="1" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('common.status') }}</label>
            <p-dropdown [(ngModel)]="form.status" [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showDialog=false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="saveRisk()" [disabled]="!form.title" />
        </ng-template>
      </p-dialog>

      <!-- Delete Confirmation -->
      <p-dialog [header]="i18n.translate('common.confirmDelete')" [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('risk.confirmDelete') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDeleteDialog=false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash" severity="danger" (onClick)="deleteRisk()" />
        </ng-template>
      </p-dialog>

      <!-- Risk Detail Drawer -->
      <app-entity-detail-drawer [(visible)]="showDrawer" [title]="drawerRisk?.title || ''"
        entityType="risk" [entityId]="drawerRisk?.riskId || ''">
        <div *ngIf="drawerRisk" class="drawer-details">
          <app-ai-entity-context [entityType]="'risk'" [entityId]="drawerRisk.riskId || ''" />
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('risk.category') }}</span><span>{{ drawerRisk.category }}</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('risk.likelihood') }}</span><span>{{ drawerRisk.likelihood }}/5</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('risk.impact') }}</span><span>{{ drawerRisk.impact }}/5</span></div>
          <div class="detail-row"><span class="detail-label">Score</span><span>{{ drawerRisk.riskScore }}</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('common.status') }}</span><span>{{ drawerRisk.status }}</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('risk.owner') }}</span><span>{{ drawerRisk.owner }}</span></div>
          <div class="detail-row"><span class="detail-label">Linked Controls</span><span><p-tag [value]="(drawerRisk.controlCount || 0) + ''" [severity]="drawerRisk.controlCount ? 'info' : 'warning'" /></span></div>
        </div>
      </app-entity-detail-drawer>

      <!-- 5x5 Risk Heatmap -->
      <p-card [header]="i18n.translate('risk.heatmap') || 'Risk Heatmap'" styleClass="mt-3">
        <div class="heatmap-grid">
          <div *ngFor="let row of [5,4,3,2,1]" class="heatmap-row">
            <div class="heatmap-label">{{ row }}</div>
            <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-cell"
              [style.background]="getHeatmapColor(row, col)"
              [pTooltip]="'L:' + col + ' × I:' + row + ' = ' + (row*col)">
              <span *ngIf="getHeatmapCount(col, row) > 0" class="heatmap-count">{{ getHeatmapCount(col, row) }}</span>
            </div>
          </div>
          <div class="heatmap-row">
            <div class="heatmap-label"></div>
            <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-axis">{{ col }}</div>
          </div>
        </div>
      </p-card>
    </app-page-shell>
    <app-ai-panel module="risks" />
  `,
  styles: [`
    .risk-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: var(--space-md);
    }

    /* Colored left border based on severity */

    .risk-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
    }
    .risk-title {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0;
      color: var(--text);
    }
    .risk-desc {
      font-size: var(--font-size-base);
      color: var(--text-muted);
      margin-bottom: var(--space-md);
      line-height: 1.5;
    }

    /* Styled metric indicators */
    .risk-metrics {
      display: flex;
      gap: var(--space-lg);
      margin-bottom: var(--space-md);
    }
    .metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .metric-label {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .metric-value {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--text);
    }
    .metric-max {
      font-size: var(--font-size-sm);
      font-weight: 400;
      color: var(--text-muted);
    }

    .risk-badges {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .search-input {
      min-width: 250px;
    }

    .empty-state {
      text-align: center;
      padding: var(--space-2xl);
    }
    .text-muted {
      color: var(--text-muted);
    }
    .mt-2 {
      margin-top: var(--space-sm);
    }
    .mb-3 {
      margin-bottom: var(--space-md);
    }

    .p-input-icon-left {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .p-input-icon-left > i {
      position: absolute;
      inset-inline-start: 12px;
      color: var(--text-muted);
      z-index: var(--z-base);
    }
    .p-input-icon-left > input {
      padding-inline-start: 36px;
    }
    .ms-3 { margin-inline-start: 12px; }
    .risk-top-actions { display: flex; align-items: center; gap: var(--space-xs); }
    .icon-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      padding: 4px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base);
    }
    .icon-btn:hover { background: var(--surface-ice); color: var(--primary-dark); }
    .icon-btn.danger:hover { background: rgba(var(--module-accent-red-rgb), 0.08); color: var(--error); }
    .risk-owner { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--space-sm); display: flex; align-items: center; gap: var(--space-xs); }
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs); }
    .field label { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
    .w-full { width: 100%; }
    .me-2 { margin-inline-end: var(--space-sm); }
    .mt-3 { margin-top: var(--space-md); }
    .heatmap-grid { display: flex; flex-direction: column; gap: 2px; max-width: 400px; }
    .heatmap-row { display: flex; gap: 2px; align-items: center; }
    .heatmap-label { width: 24px; text-align: center; font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); }
    .heatmap-cell { width: 60px; height: 48px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 150ms; }
    .heatmap-cell:hover { transform: scale(1.05); }
    .heatmap-count { font-weight: var(--font-bold); font-size: var(--font-size-md); }
    .heatmap-axis { width: 60px; text-align: center; font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); }
    .drawer-details { display: flex; flex-direction: column; gap: var(--space-sm); }
    .detail-row { display: flex; justify-content: space-between; padding: var(--space-xs) 0; border-bottom: 1px solid var(--border-subtle); }
    .detail-label { font-weight: var(--font-medium); font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class RisksComponent implements OnInit {
  risks: Risk[] = [];
  filteredRisks: Risk[] = [];
  loading = true;
  searchTerm = '';
  selectedSeverity = '';
  severityOptions: SeverityOption[] = [];

  showDialog = false;
  showDeleteDialog = false;
  showDrawer = false;
  drawerRisk: Risk | null = null;
  editMode = false;
  editingRiskId: string | null = null;
  deleteTarget: Risk | null = null;

  form = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', status: 'identified' };

  get categoryOptions() {
    return [
      { label: this.i18n.translate('risk.catOperational'), value: 'operational' },
      { label: this.i18n.translate('risk.catStrategic'), value: 'strategic' },
      { label: this.i18n.translate('risk.catCompliance'), value: 'compliance' },
      { label: this.i18n.translate('risk.catFinancial'), value: 'financial' },
      { label: this.i18n.translate('risk.catCyber'), value: 'cyber' },
      { label: this.i18n.translate('risk.catReputational'), value: 'reputational' },
      { label: this.i18n.translate('risk.catThirdParty'), value: 'third_party' },
    ];
  }

  get statusOptions() {
    return [
      { label: this.i18n.translate('risk.statusIdentified'), value: 'identified' },
      { label: this.i18n.translate('risk.statusAssessed'), value: 'assessed' },
      { label: this.i18n.translate('risk.statusMitigated'), value: 'mitigated' },
      { label: this.i18n.translate('risk.statusAccepted'), value: 'accepted' },
      { label: this.i18n.translate('risk.statusClosed'), value: 'closed' },
    ];
  }

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  constructor(public i18n: I18nService, private messageService: MessageService, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadRisks());
    this.severityOptions = [
      { label: this.i18n.translate('risk.allSeverities'), value: '' },
      { label: this.i18n.translate('risk.critical'), value: 'critical' },
      { label: this.i18n.translate('risk.high'), value: 'high' },
      { label: this.i18n.translate('risk.low'), value: 'low' },
    ];
    this.loadRisks();
  }

  loadRisks(): void {
    this.loading = true;
    this.riskSvc.getRisks().subscribe({
      next: r => { this.risks = r; this.filteredRisks = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => {
        this.loading = false; this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadRisks'), life: 4000 });
      }
    });
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editingRiskId = null;
    this.form = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', status: 'identified' };
    this.showDialog = true;
  }

  openEditDialog(risk: Risk): void {
    this.editMode = true;
    this.editingRiskId = risk.riskId;
    this.form = { title: risk.title, description: risk.description, category: risk.category, likelihood: risk.likelihood, impact: risk.impact, owner: risk.owner, status: risk.status };
    this.showDialog = true;
  }

  saveRisk(): void {
    if (!this.form.title) return;
    if (this.editMode && this.editingRiskId) {
      this.riskSvc.updateRisk(this.editingRiskId, this.form).subscribe({
        next: () => { this.showDialog = false; this.loadRisks(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.riskUpdated'), life: 3000 }); },
        error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToUpdateRisk'), life: 4000 })
      });
    } else {
      this.riskSvc.createRisk(this.form).subscribe({
        next: () => { this.showDialog = false; this.loadRisks(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.riskCreated'), life: 3000 }); },
        error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateRisk'), life: 4000 })
      });
    }
  }

  confirmDelete(risk: Risk): void {
    this.deleteTarget = risk;
    this.showDeleteDialog = true;
  }

  deleteRisk(): void {
    if (!this.deleteTarget) return;
    this.riskSvc.deleteRisk(this.deleteTarget.riskId).subscribe({
      next: () => { this.showDeleteDialog = false; this.deleteTarget = null; this.loadRisks(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.riskDeleted'), life: 3000 }); },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToDeleteRisk'), life: 4000 })
    });
  }

  filterRisks(): void {
    let result = this.risks;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term) || r.category.toLowerCase().includes(term));
    }
    if (this.selectedSeverity) {
      result = result.filter(r => this.getSeverityLevel(r.riskScore) === this.selectedSeverity);
    }
    this.filteredRisks = result;
  }

  getSeverityClass(score: number): string {
    if (score >= 20) return 'danger';
    if (score >= 12) return 'warning';
    return 'success';
  }

  getScoreSeverity(score: number): 'danger' | 'warning' | 'success' {
    if (score >= 20) return 'danger';
    if (score >= 12) return 'warning';
    return 'success';
  }

  private getSeverityLevel(score: number): string {
    if (score >= 20) return 'critical';
    if (score >= 12) return 'high';
    return 'low';
  }

  exportCSV(): void {
    const rows = this.filteredRisks.map(r => ({
      Title: r.title, Description: r.description, Category: r.category,
      Likelihood: r.likelihood, Impact: r.impact, Score: r.riskScore,
      Status: r.status, Owner: r.owner,
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'risks-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  openDrawer(risk: Risk): void {
    this.drawerRisk = risk;
    this.showDrawer = true;
  }

  getHeatmapColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 20) return 'rgba(var(--module-accent-red-rgb), 0.25)';
    if (score >= 15) return 'rgba(var(--module-accent-amber-rgb), 0.25)';
    if (score >= 10) return 'rgba(var(--module-accent-yellow-rgb), 0.25)';
    if (score >= 5) return 'rgba(var(--module-accent-green-rgb), 0.19)';
    return 'rgba(var(--module-accent-green-rgb), 0.08)';
  }

  getHeatmapCount(likelihood: number, impact: number): number {
    return this.risks.filter(r => r.likelihood === likelihood && r.impact === impact).length;
  }

}
