import { Component, OnInit, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import {
  QuickGrcAcceleratorService,
  AcceleratorAction,
  AcceleratorProgress,
} from '@app/grc/quick-grc-accelerator.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-quick-grc-accelerator',
    imports: [
        CommonModule, ButtonModule, ProgressBarModule, TagModule,
        CardModule, TooltipModule, SkeletonModule, ConfirmDialogModule,
        ToastModule, AppDatePipe,
    ],
    providers: [MessageService, ConfirmationService],
    template: `
    <p-toast />
    <p-confirmDialog />

    <div class="accelerator-page" [class.rtl]="rtl()">
      <div class="accelerator-header">
        <div class="header-content">
          <h1>{{ rtl() ? 'مسرّع الحوكمة والمخاطر والامتثال' : 'Quick GRC Accelerator' }}</h1>
          <p class="subtitle">
            {{ rtl()
              ? 'أكمل هذه الإجراءات العشرة لتحقيق تغطية كاملة لعمليات الحوكمة والمخاطر والامتثال بسرعة'
              : 'Complete these 10 actions to rapidly achieve full GRC process coverage' }}
          </p>
        </div>
        <div class="header-actions">
          <p-button
            [label]="rtl() ? 'تنفيذ الكل' : 'Execute All'"
            icon="pi pi-play" severity="success"
            [loading]="executingAll"
            [disabled]="executingAll || !progress || progress.percentComplete === 100"
            (onClick)="onExecuteAll()" />
          <p-button
            [label]="rtl() ? 'إعادة تعيين' : 'Reset'"
            icon="pi pi-refresh" severity="secondary" [outlined]="true"
            [disabled]="executingAll"
            (onClick)="onReset()" />
        </div>
      </div>

      <!-- Progress Overview -->
      <div class="progress-overview" *ngIf="progress">
        <div class="progress-stats">
          <span class="stat-label">
            {{ rtl() ? 'التقدم' : 'Progress' }}:
            {{ progress.completedCount }}/{{ progress.totalCount }}
          </span>
          <span class="stat-percent">{{ progress.percentComplete }}%</span>
        </div>
        <p-progressBar [value]="progress.percentComplete" [showValue]="false" [style]="{ height: '12px' }" />
      </div>

      <!-- Loading Skeleton -->
      <div class="actions-grid" *ngIf="loading">
        <div class="action-card skeleton-card" *ngFor="let i of skeletonItems">
          <p-skeleton width="100%" height="180px" />
        </div>
      </div>

      <!-- Action Cards -->
      <div class="actions-grid" *ngIf="!loading && progress">
        <div *ngFor="let action of progress.actions; trackBy: trackAction"
          class="action-card"
          [class.completed]="action.status === 'completed'"
          [class.failed]="action.status === 'failed'"
          [class.in-progress]="action.status === 'in_progress'"
          [class.skipped]="action.status === 'skipped'">

          <div class="action-header">
            <div class="action-icon-wrap" [ngClass]="'cat-' + action.category">
              <i class="pi" [ngClass]="action.icon"></i>
            </div>
            <div class="action-order">#{{ action.order }}</div>
            <p-tag [value]="getStatusLabel(action.status)" [severity]="getStatusSeverity(action.status)" [rounded]="true" />
          </div>

          <h3 class="action-title">{{ rtl() ? action.titleAr : action.titleEn }}</h3>
          <p class="action-desc">{{ rtl() ? action.descriptionAr : action.descriptionEn }}</p>

          <div class="action-error" *ngIf="action.error">
            <i class="pi pi-exclamation-triangle"></i> {{ action.error }}
          </div>

          <div class="action-footer">
            <p-button *ngIf="action.status === 'pending' || action.status === 'failed'"
              [label]="rtl() ? 'تنفيذ' : 'Execute'" icon="pi pi-play" size="small"
              [loading]="executingAction === action.id" [disabled]="executingAll"
              (onClick)="onExecute(action)" />
            <p-button *ngIf="action.status === 'pending'"
              [label]="rtl() ? 'تخطي' : 'Skip'" icon="pi pi-forward" size="small"
              severity="secondary" [outlined]="true" [disabled]="executingAll"
              (onClick)="onSkip(action)" />
            <span class="completed-at" *ngIf="action.completedAt">
              <i class="pi pi-check-circle"></i> {{ action.completedAt | appDate:'short' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="error">
        <i class="pi pi-exclamation-circle"></i>
        <p>{{ error }}</p>
        <p-button [label]="rtl() ? 'إعادة المحاولة' : 'Retry'" icon="pi pi-refresh" (onClick)="loadProgress()" />
      </div>
    </div>
  `,
    styles: [`
    .accelerator-page { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .accelerator-page.rtl { direction: rtl; text-align: right; }
    .accelerator-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .header-content h1 { margin: 0 0 0.25rem; font-size: var(--font-size-3xl); font-weight: 600; color: var(--text-color); }
    .subtitle { margin: 0; color: var(--text-color-secondary); font-size: var(--font-size-body-sm); }
    .header-actions { display: flex; gap: 0.5rem; }
    .progress-overview { margin-bottom: 2rem; }
    .progress-stats { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .stat-label { font-size: var(--font-size-body-sm); color: var(--text-color-secondary); }
    .stat-percent { font-weight: 600; color: var(--primary-color); font-size: var(--font-size-body-md); }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
    .action-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 1.25rem; transition: all 0.2s ease; }
    .action-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .action-card.completed { border-color: var(--green-300); background: color-mix(in srgb, var(--green-50) 30%, var(--surface-card)); }
    .action-card.failed { border-color: var(--red-300); }
    .action-card.in-progress { border-color: var(--blue-300); }
    .action-card.skipped { opacity: 0.6; }
    .action-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .action-icon-wrap { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-body-lg); }
    .cat-setup { background: color-mix(in srgb, var(--blue-100) 50%, transparent); color: var(--blue-600); }
    .cat-governance { background: color-mix(in srgb, var(--purple-100) 50%, transparent); color: var(--purple-600); }
    .cat-monitoring { background: color-mix(in srgb, var(--orange-100) 50%, transparent); color: var(--orange-600); }
    .cat-ai { background: color-mix(in srgb, var(--teal-100) 50%, transparent); color: var(--teal-600); }
    .action-order { font-size: var(--font-size-caption); color: var(--text-color-secondary); font-weight: 600; }
    .action-title { margin: 0 0 0.5rem; font-size: 1.05rem; font-weight: 600; color: var(--text-color); }
    .action-desc { margin: 0 0 1rem; font-size: var(--font-size-tag); color: var(--text-color-secondary); line-height: 1.5; }
    .action-error { background: var(--red-50); color: var(--red-700); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: var(--font-size-caption); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    .action-footer { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .completed-at { font-size: var(--font-size-caption); color: var(--success); display: flex; align-items: center; gap: 0.25rem; }
    .error-state { text-align: center; padding: 3rem; color: var(--text-color-secondary); }
    .error-state i { font-size: var(--font-size-5xl); color: var(--red-400); margin-bottom: 1rem; display: block; }
    .skeleton-card { min-height: 180px; }
  `]
})
export class QuickGrcAcceleratorComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private svc = inject(QuickGrcAcceleratorService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);

  rtl = computed(() => this.i18n.direction() === 'rtl');
  skeletonItems = Array.from({ length: 10 }, (_, i) => i);

  progress: AcceleratorProgress | null = null;
  loading = true;
  error: string | null = null;
  executingAction: string | null = null;
  executingAll = false;

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    this.loading = true;
    this.error = null;
    this.svc.getProgress().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p: AcceleratorProgress) => { this.progress = p; this.loading = false; this.cdr.markForCheck(); },
      error: (e: unknown) => { this.error = e?.error?.error || 'Failed to load progress'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  onExecute(action: AcceleratorAction): void {
    this.executingAction = action.id;
    this.svc.executeAction(action.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.executingAction = null;
        const isRtl = this.rtl();
        this.msg.add({
          severity: r.success ? 'success' : 'warning',
          summary: r.success ? this.i18n.translate('common.executed') : this.i18n.translate('common.warning'),
          detail: r.message, life: 4000,
        });
        this.loadProgress();
      },
      error: (e: unknown) => {
        this.executingAction = null;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e?.error?.error || this.i18n.translate('common.executionFailed'), life: 5000 });
        this.loadProgress();
      },
    });
  }

  onSkip(action: AcceleratorAction): void {
    this.svc.skipAction(action.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.loadProgress(), error: () => this.loadProgress() });
  }

  onExecuteAll(): void {
    const isRtl = this.rtl();
    this.confirm.confirm({
      message: isRtl ? 'سيتم تنفيذ جميع الإجراءات المعلقة بالتسلسل. هل تريد المتابعة؟' : 'This will execute all pending actions in sequence. Continue?',
      header: isRtl ? 'تنفيذ الكل' : 'Execute All',
      icon: 'pi pi-play',
      accept: () => {
        this.executingAll = true;
        this.svc.executeAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (r) => {
            this.executingAll = false;
            this.progress = r.progress;
            const succeeded = r.results.filter((x) => x.success).length;
            this.msg.add({
              severity: 'success', summary: this.i18n.translate('common.complete'),
              detail: this.i18n.translate('common.actionsExecutedSuccessfully', { succeeded: String(succeeded), total: String(r.results.length) }),
              life: 5000,
            });
          },
          error: (e: unknown) => {
            this.executingAll = false;
            this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e?.error?.error || this.i18n.translate('common.batchExecutionFailed'), life: 5000 });
            this.loadProgress();
          },
        });
      },
    });
  }

  onReset(): void {
    const isRtl = this.rtl();
    this.confirm.confirm({
      message: isRtl ? 'سيتم إعادة تعيين جميع التقدم. هل أنت متأكد؟' : 'This will reset all progress. Are you sure?',
      header: isRtl ? 'إعادة تعيين' : 'Reset Progress',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.resetProgress().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (p: AcceleratorProgress) => {
            this.progress = p;
            this.msg.add({ severity: 'info', summary: this.i18n.translate('common.done'), detail: this.i18n.translate('common.progressReset'), life: 3000 });
          },
          error: () => this.loadProgress(),
        });
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'معلق' },
      in_progress: { en: 'Running', ar: 'قيد التنفيذ' },
      completed: { en: 'Done', ar: 'مكتمل' },
      failed: { en: 'Failed', ar: 'فشل' },
      skipped: { en: 'Skipped', ar: 'تم التخطي' },
    };
    const l = labels[status] || labels['pending'];
    return this.rtl() ? l.ar : l.en;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      pending: 'info', in_progress: 'warning', completed: 'success', failed: 'danger', skipped: 'secondary',
    };
    return map[status] || 'info';
  }

  trackAction(_: number, action: AcceleratorAction): string {
    return action.id;
  }

}
