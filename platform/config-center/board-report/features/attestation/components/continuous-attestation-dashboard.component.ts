/**
 * Advanced Continuous Attestation Dashboard Component
 * Feature 22: Continuous Attestation Engine
 * 
 * Displays framework and control readiness scores with drill-down capabilities
 * and attestation draft generation.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import {
  ContinuousAttestationApiService,
  FrameworkReadiness,
  ControlReadiness,
  AttestationDraft,
} from '../services/continuous-attestation-api.service';
import { ATTESTATION_COMPLIANCE_PORT, AttestationCompliancePort } from '../ports/compliance.port';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

@Component({
  selector: 'app-continuous-attestation-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GrcDataTableComponent,
    ToastModule,
    CardModule,
    ButtonModule,
    TableModule,
    ProgressBarModule,
    TagModule,
    DialogModule,
    SkeletonModule,
    TooltipModule,
    EmptyStateComponent,
    PageHeaderComponent,
    AppDatePipe,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './continuous-attestation-dashboard.component.html',
  styleUrls: ['./continuous-attestation-dashboard.component.scss'],
})
export class ContinuousAttestationDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly attestationService = inject(ContinuousAttestationApiService);
  private readonly complianceService = inject(ATTESTATION_COMPLIANCE_PORT);
  private readonly messageService = inject(MessageService);
  readonly i18n = inject(I18nService);
  private htmlSanitizer = inject(HtmlSanitizerService);

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  frameworks = signal<FrameworkReadiness[]>([]);
  controls = signal<ControlReadiness[]>([]);
  selectedFrameworkId = signal<string | null>(null);
  generatingDraft = signal<string | null>(null);
  currentDraft = signal<AttestationDraft | null>(null);
  showDraftDialog = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.attestationService
      .getAllFrameworkReadiness()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.error.set(err.error?.message || this.i18n.translate('common.failedToLoad'));
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((frameworks) => {
        this.frameworks.set(frameworks);
      });
  }

  onFrameworkClick(frameworkId: string): void {
    if (this.selectedFrameworkId() === frameworkId) {
      this.selectedFrameworkId.set(null);
      this.controls.set([]);
      return;
    }

    this.selectedFrameworkId.set(frameworkId);
    this.loadControlsForFramework(frameworkId);
  }

  loadControlsForFramework(frameworkId: string): void {
    this.complianceService
      .getControls(frameworkId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('attestation.controlsLoadFailed'),
          });
          return of({ items: [], total: 0 });
        }),
      )
      .subscribe((response) => {
        // Map the controls to ControlReadiness format
        // Note: The API returns controls, but we need to map them to ControlReadiness
        // For now, we'll create a basic mapping. In a full implementation,
        // you might need a separate endpoint that returns readiness scores per control.
        const readinessControls: ControlReadiness[] = response.items.map((control) => ({
          controlId: control.id || control.controlId,
          controlCode: control.code || control.controlCode || '',
          overallScore: control.readinessScore || 0,
          evidenceScore: control.evidenceCount || 0,
          testScore: 0,
          readinessLevel: (control.status === 'effective' ? 'ready' : control.status === 'partial' ? 'needs-improvement' : 'not-ready') as 'ready' | 'needs-improvement' | 'not-ready',
        }));
        this.controls.set(readinessControls);
      });
  }

  generateFrameworkDraft(frameworkId: string): void {
    this.generatingDraft.set(frameworkId);

    this.attestationService
      .generateDraft('framework', frameworkId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('attestation.draftGenerationFailed'),
          });
          return of(null);
        }),
        finalize(() => this.generatingDraft.set(null)),
      )
      .subscribe((draft) => {
        if (draft) {
          this.currentDraft.set(draft);
          this.showDraftDialog.set(true);
        }
      });
  }

  generateControlDraft(controlId: string): void {
    this.generatingDraft.set(controlId);

    this.attestationService
      .generateDraft('control', controlId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('attestation.draftGenerationFailed'),
          });
          return of(null);
        }),
        finalize(() => this.generatingDraft.set(null)),
      )
      .subscribe((draft) => {
        if (draft) {
          this.currentDraft.set(draft);
          this.showDraftDialog.set(true);
        }
      });
  }

  downloadDraft(): void {
    const draft = this.currentDraft();
    if (!draft) return;

    const blob = new Blob([draft.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-draft-${draft.entityType}-${draft.entityId}-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getReadinessClass(score: number): string {
    if (score >= 70) return 'ready';
    if (score >= 40) return 'needs-improvement';
    return 'not-ready';
  }

  getReadinessLevel(score: number): 'ready' | 'needs-improvement' | 'not-ready' {
    if (score >= 70) return 'ready';
    if (score >= 40) return 'needs-improvement';
    return 'not-ready';
  }

  getReadinessSeverity(level: 'ready' | 'needs-improvement' | 'not-ready'): 'success' | 'warning' | 'danger' {
    switch (level) {
      case 'ready':
        return 'success';
      case 'needs-improvement':
        return 'warning';
      case 'not-ready':
        return 'danger';
    }
  }

  getFrameworkName(frameworkId: string): string {
    const fw = this.frameworks().find((f) => f.frameworkId === frameworkId);
    return fw ? this.i18n.localize(fw.frameworkName, fw.frameworkName) : frameworkId;
  }

  formatDraftContent(content: string): string {
    // Simple formatting - in production, you might use markdown parsing
    // Sanitize HTML content for security
    const formatted = content.replace(/\n/g, '<br>');
    return this.htmlSanitizer.sanitizeMarkdown(formatted);
  }
}
