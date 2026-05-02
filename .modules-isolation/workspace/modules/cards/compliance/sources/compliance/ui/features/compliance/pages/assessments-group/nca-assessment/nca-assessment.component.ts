import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TIMING } from '@app/runtime/_legacy/ui-constants';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import Chart from 'chart.js/auto';
import { devError } from '@app/runtime/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";
import { AccordionModule, ButtonModule, ContextMenuModule, DialogModule, DropdownModule, InputModule, PlaceholderModule, ProgressIndicatorModule, RadioModule, TableModule, TagModule, TilesModule, TooltipModule } from 'carbon-components-angular';

interface ECCControl {
  id: string; code: string; titleEn: string; titleAr: string;
  descEn: string; descAr: string; priority: string; automatable: boolean;
  evidenceTypes: string[]; mappedTo: string[];
}

interface ECCSubdomain {
  id: string; code: string; nameEn: string; nameAr: string;
  controls: ECCControl[];
}

interface ECCDomain {
  id: string; code: string; nameEn: string; nameAr: string;
  subdomains: ECCSubdomain[];
}

interface ECCStructure {
  instrumentId: string; nameEn: string; nameAr: string; version: string;
  summaryEn: string; summaryAr: string;
  domains: ECCDomain[];
  stats: { totalDomains: number; totalSubdomains: number; totalControls: number };
}

type ControlStatus = 'implemented' | 'partially' | 'not_implemented' | 'not_applicable';

interface ItemState {
  controlId: string; status: ControlStatus; notes: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-nca-assessment',
    imports: [
        CommonModule, FormsModule, RouterLink, GrcDataTableComponent, PageShellComponent, StatCardComponent, StatusBadgeComponent,
        ProgressIndicatorModule, AccordionModule, ButtonModule, TilesModule, TableModule, TagModule,
        TooltipModule, ProgressIndicatorModule, InputModule, InputModule,
        DialogModule, DropdownModule, RadioModule, PlaceholderModule, ContextMenuModule, AppDatePipe,
    ],
    templateUrl: './nca-assessment.component.html',
    styleUrls: ['./nca-assessment.component.scss']
})
export class NCAAssessmentComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  wizardMode = false;
  currentStep = 0;
  structure: ECCStructure | null = null;
  assessments: Record<string, any>[] = [];
  activeAssessment: Record<string, any> | null = null;
  activeAssessmentId: string | null = null;
  itemStates: Map<string, ItemState> = new Map();
  expandedSubdomains: Record<string, boolean> = {};
  domainProgress: number[] = [];
  wizardSteps: { labelEn: string; labelAr: string }[] = [];
  saving = false;
  private radarChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;
  private autoSave$ = new Subject<void>();
  private autoSaveSub: { unsubscribe(): void } | null;

  statusOptions = [
    { value: 'implemented' as ControlStatus, label: 'Implemented', labelAr: 'مطبق', icon: 'pi-check-circle' },
    { value: 'partially' as ControlStatus, label: 'Partial', labelAr: 'جزئي', icon: 'pi-minus-circle' },
    { value: 'not_implemented' as ControlStatus, label: 'Not Impl.', labelAr: 'غير مطبق', icon: 'pi-times-circle' },
    { value: 'not_applicable' as ControlStatus, label: 'N/A', labelAr: 'غير قابل', icon: 'pi-ban' },
  ];

  private cdr = inject(ChangeDetectorRef);

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.loadStructure();
    this.loadAssessments();
    this.autoSaveSub = this.autoSave$.pipe(debounceTime(TIMING.AUTOSAVE_DEBOUNCE), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.autoSaveProgress());
  }

  ngOnDestroy(): void {
    this.autoSaveSub?.unsubscribe();
  }

  private triggerAutoSave(): void {
    this.autoSave$.next();
  }

  private autoSaveProgress(): void {
    if (!this.activeAssessmentId) return;
    this.saving = true;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId, status: s.status, notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, any>) => { this.activeAssessment = r; this.saving = false; this.cdr.markForCheck(); },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  private loadStructure(): void {
    this.complianceSvc.getNCAStructure().subscribe({
      next: (s: any) => {
        this.structure = s;
        this.wizardSteps = [
          { labelEn: 'Overview', labelAr: 'نظرة عامة' },
          ...s.domains.map(d => ({ labelEn: d.nameEn, labelAr: d.nameAr })),
          { labelEn: 'Results', labelAr: 'النتائج' },
        ];
        this.domainProgress = s.domains.map(() => 0);
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private loadAssessments(): void {
    this.complianceSvc.listNCAAssessments().subscribe({
      next: (r: Record<string, any>) => {
        this.assessments = r.assessments || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  startNewAssessment(): void {
    this.complianceSvc.createNCAAssessment().subscribe({
      next: (r: Record<string, any>) => {
        this.activeAssessmentId = r.assessmentId;
        this.loadAssessment(r.assessmentId);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadAssessment(id: string): void {
    this.loading = true;
    this.complianceSvc.getNCAAssessment(id).subscribe({
      next: (a: Record<string, any>) => {
        this.activeAssessment = a;
        this.activeAssessmentId = id;
        this.itemStates.clear();
        for (const item of a.items) {
          this.itemStates.set(item.controlId, {
            controlId: item.controlId,
            status: item.status,
            notes: item.notes || '',
          });
        }
        this.updateDomainProgress();
        this.wizardMode = true;
        this.currentStep = a.status === 'completed' ? (this.structure?.domains.length || 5) + 1 : 0;
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.renderCharts(), TIMING.CHART_RENDER_DELAY);
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  getItemStatus(controlId: string): ControlStatus {
    return this.itemStates.get(controlId)?.status || 'not_implemented';
  }

  getItemNotes(controlId: string): string {
    return this.itemStates.get(controlId)?.notes || '';
  }

  setStatus(controlId: string, status: ControlStatus): void {
    const state = this.itemStates.get(controlId) || { controlId, status: 'not_implemented', notes: '' };
    state.status = status;
    this.itemStates.set(controlId, state);
    this.updateDomainProgress();
    this.triggerAutoSave();
  }

  setNotes(controlId: string, notes: string): void {
    const state = this.itemStates.get(controlId);
    if (state) { state.notes = notes; this.triggerAutoSave(); }
  }

  toggleSubdomain(key: string): void {
    this.expandedSubdomains[key] = !this.expandedSubdomains[key];
  }

  getSubdomainAssessed(domainId: string, sd: ECCSubdomain): number {
    return sd.controls.filter(c => this.getItemStatus(c.id) !== 'not_implemented').length;
  }

  getSubdomainProgress(domainId: string, sd: ECCSubdomain): number {
    if (sd.controls.length === 0) return 0;
    return Math.round((this.getSubdomainAssessed(domainId, sd) / sd.controls.length) * 100);
  }

  private updateDomainProgress(): void {
    if (!this.structure) return;
    this.domainProgress = this.structure.domains.map(d => {
      const allControls = d.subdomains.flatMap(s => s.controls);
      if (allControls.length === 0) return 0;
      const assessed = allControls.filter(c => this.getItemStatus(c.id) !== 'not_implemented').length;
      return Math.round((assessed / allControls.length) * 100);
    });
  }

  getDashArray(pct: number): string {
    const circumference = 2 * Math.PI * 25;
    const filled = (pct / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  saveProgress(): void {
    if (!this.activeAssessmentId) return;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId,
      status: s.status,
      notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, any>) => {
        this.activeAssessment = r;
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  goToResults(): void {
    if (!this.activeAssessmentId) return;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId,
      status: s.status,
      notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, any>) => {
        this.activeAssessment = r;
        if (this.structure) {
          this.currentStep = this.structure.domains.length + 1;
          setTimeout(() => this.renderCharts(), TIMING.CHART_RENDER_LONG);
        }
      },
      error: () => {
        // Still navigate to results even if save fails
        if (this.structure) {
          this.currentStep = this.structure.domains.length + 1;
          setTimeout(() => this.renderCharts(), TIMING.CHART_RENDER_LONG);
        }
      }
    });
  }

  getGapItems(): Record<string, any>[] {
    if (!this.activeAssessment) return [];
    const gaps = this.activeAssessment.items.filter(
      (i: Record<string, any>) => i.status === 'not_implemented' || i.status === 'partially'
    );
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return gaps.sort((a: Record<string, any>, b: Record<string, any>) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
  }

  downloadExport(format: 'pdf' | 'excel' | 'html', lang?: string): void {
    if (!this.activeAssessmentId) return;
    const url = this.complianceSvc.exportNCAAssessment(this.activeAssessmentId, format, lang);
    this.apiclientSvc.getBlob(url.replace('/api', '')).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'html';
        a.download = `nca-ecc-assessment.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (err) => devError('Export download failed:', err),
    });
  }

  exitWizard(): void {
    this.wizardMode = false;
    this.activeAssessment = null;
    this.activeAssessmentId = null;
    this.currentStep = 0;
    this.loadAssessments();
  }

  private renderCharts(): void {
    if (!this.activeAssessment) return;

    // Radar
    if (this.radarChartRef?.nativeElement) {
      if (this.radarChartInstance) this.radarChartInstance.destroy();
      this.radarChartInstance = new Chart(this.radarChartRef.nativeElement, {
        type: 'radar',
        data: {
          labels: this.activeAssessment.domainScores.map((d: Record<string, any>) => this.i18n.localize(d.nameEn, d.nameAr)),
          datasets: [{
            label: this.i18n.translate('dashboardCharts.compliance') + ' %',
            data: this.activeAssessment.domainScores.map((d: Record<string, any>) => d.score),
            backgroundColor: 'rgba(var(--color-blue-800-rgb), 0.15)',
            borderColor: '#1e40af',
            pointBackgroundColor: '#1e40af',
          }],
        },
        options: {
          responsive: true,
          scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
          plugins: { legend: { display: false } },
        },
      });
    }

    // Donut
    if (this.donutChartRef?.nativeElement) {
      if (this.donutChartInstance) this.donutChartInstance.destroy();
      const s = this.activeAssessment.summary;
      this.donutChartInstance = new Chart(this.donutChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: [
            this.i18n.translate('dashboardCharts.implemented'),
            this.i18n.translate('ncaAssessment.partial'),
            this.i18n.translate('ncaAssessment.notImpl'),
            this.i18n.translate('ncaAssessment.na'),
          ],
          datasets: [{
            data: [s.implemented, s.partial, s.notImplemented, s.notApplicable],
            backgroundColor: ['#16a34a', 'var(--warning)', 'var(--error)', 'var(--text-muted)'],
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    }
  }

}
