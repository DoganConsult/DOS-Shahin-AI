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
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';
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
    PageShellComponent, StatusBadgeComponent, GrcFormFieldComponent,
    CardModule, ToolbarModule, InputTextModule, InputTextarea,
    DropdownModule, ButtonModule, TagModule, DialogModule,
    SliderModule, ConfirmDialogModule, TooltipModule,
    EntityDetailDrawerComponent,
    AiPanelComponent, RaciPanelComponent, ToastModule,
    AiEntityContextPanelComponent,
  ],
  providers: [MessageService],
  templateUrl: './risks.component.html',
  styleUrls: ['./risks.component.scss'],
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
