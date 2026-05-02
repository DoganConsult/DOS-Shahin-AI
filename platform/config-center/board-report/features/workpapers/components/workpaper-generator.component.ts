/**
 * Advanced Workpaper Generator Component
 * Feature 24: Automated Workpaper Generator
 * 
 * Generates comprehensive audit workpapers with traceability matrices,
 * test procedures, and evidence mappings.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/infrastructure/sanitizer/html-sanitizer.service';
import {
  WorkpaperGeneratorApiService,
  Workpaper,
  WorkpaperGenerationRequest,
  TraceabilityMatrixRow,
} from '@app/core/services/reporting/workpaper-generator-api.service';
import { WORKPAPER_COMPLIANCE_PORT, WorkpaperCompliancePort } from '../ports/compliance.port';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabs';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcFormFieldComponent, GrcDataTableComponent } from '@app/shared/components';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-workpaper-generator',
    imports: [
        CommonModule,
        FormsModule,
        GrcDataTableComponent, GrcFormFieldComponent,
        ToastModule,
        CardModule,
        ButtonModule,
        TableModule,
        TagModule,
        DialogModule,
        InputTextModule,
        InputTextarea,
        DropdownModule,
        CalendarModule,
        SkeletonModule,
        ProgressSpinnerModule,
        TooltipModule,
        TabViewModule,
        EmptyStateComponent,
        PageHeaderComponent,
        AppDatePipe,
    ],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './workpaper-generator.component.html',
    styleUrls: ['./workpaper-generator.component.scss']
})
export class WorkpaperGeneratorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly workpaperService = inject(WorkpaperGeneratorApiService);
  private readonly complianceService = inject(WORKPAPER_COMPLIANCE_PORT);
  private readonly messageService = inject(MessageService);
  private readonly htmlSanitizer = inject(HtmlSanitizerService);
  readonly i18n = inject(I18nService);

  // State
  generationRequest: WorkpaperGenerationRequest = {
    auditId: '',
    frameworkId: '',
    includeTestProcedures: true,
    includeEvidence: true,
    notes: '',
  };
  availableFrameworks = signal<Array<{ id: string; name: string }>>([]);
  generating = signal(false);
  generatedWorkpapers = signal<Workpaper[]>([]);
  previewWorkpaper = signal<Workpaper | null>(null);
  showPreviewDialog = signal(false);

  // Computed
  canGenerate = computed(() => {
    return (
      !!this.generationRequest.auditId &&
      !!this.generationRequest.frameworkId &&
      !this.generating()
    );
  });

  ngOnInit(): void {
    this.loadAvailableFrameworks();
  }

  loadAvailableFrameworks(): void {
    this.complianceService
      .getFrameworks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('workpaper.frameworksLoadFailed'),
          });
          return of([]);
        }),
      )
      .subscribe((frameworks) => {
        this.availableFrameworks.set(
          frameworks.map((f) => ({
            id: f.frameworkCode || (f as GrcRecord).code || (f as GrcRecord).id || '',
            name: f.frameworkName || (f as GrcRecord).name || (f as GrcRecord).title || `Framework ${f.frameworkCode}`,
          })),
        );
      });
  }

  generateWorkpapers(): void {
    if (!this.canGenerate()) return;

    this.generating.set(true);
    this.generatedWorkpapers.set([]);

    this.workpaperService
      .generateWorkpapers(this.generationRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('workpaper.generationFailed'),
          });
          return of({ workpapers: [] });
        }),
        finalize(() => this.generating.set(false)),
      )
      .subscribe((result) => {
        this.generatedWorkpapers.set(result.workpapers);
        if (result.workpapers.length > 0) {
          this.messageService.add({
            severity: 'success',
            summary: this.i18n.translate('workpaper.generationSuccess'),
            detail: `${result.workpapers.length} ${this.i18n.translate('workpaper.workpapersGenerated')}`,
          });
        }
      });
  }

  clearForm(): void {
    this.generationRequest = {
      auditId: '',
      frameworkId: '',
      includeTestProcedures: true,
      includeEvidence: true,
      notes: '',
    };
    this.generatedWorkpapers.set([]);
  }

  downloadWorkpaper(workpaper: Workpaper): void {
    // In a real implementation, download PDF
    this.messageService.add({
      severity: 'info',
      summary: this.i18n.translate('workpaper.downloadStarted'),
      detail: workpaper.controlTitle || (workpaper as GrcRecord).workpaperTitle,
    });
  }

  downloadAll(): void {
    this.generatedWorkpapers().forEach((wp) => this.downloadWorkpaper(wp));
  }

  viewWorkpaper(workpaper: Workpaper): void {
    this.previewWorkpaper.set(workpaper);
    this.showPreviewDialog.set(true);
  }

  formatWorkpaperContent(workpaper: Workpaper): SafeHtml {
    // Format workpaper content for preview
    let content = `<h3>${workpaper.controlTitle || (workpaper as GrcRecord).workpaperTitle}</h3>`;
    content += `<p><strong>Control:</strong> ${workpaper.controlCode}</p>`;
    content += `<p><strong>Test Procedures:</strong> ${workpaper.testProcedures?.length ?? 0}</p>`;
    content += `<p><strong>Evidence Items:</strong> ${workpaper.evidence.length}</p>`;
    // Sanitize HTML content for security
    return this.htmlSanitizer.sanitize(content);
  }

  getTestStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status.toLowerCase()) {
      case 'passed':
        return 'success';
      case 'partial':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'info';
    }
  }

  getEvidenceStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'success';
      case 'partial':
        return 'warning';
      case 'missing':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTestResultSeverity(result: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (result.toLowerCase()) {
      case 'pass':
        return 'success';
      case 'partial':
        return 'warning';
      case 'fail':
        return 'danger';
      default:
        return 'info';
    }
  }
}
