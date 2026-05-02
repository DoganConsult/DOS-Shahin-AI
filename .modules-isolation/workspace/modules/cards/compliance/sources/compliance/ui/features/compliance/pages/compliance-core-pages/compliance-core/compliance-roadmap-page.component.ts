import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RoadmapTimelineComponent } from '../../../components/remediation/roadmap-timeline.component';
import { ComplianceRoadmapDto, AuditReadinessDto } from '../../../models/compliance.models';
import { COMPLIANCE_EN } from '../../../config/compliance.labels.en';
import { COMPLIANCE_AR } from '../../../config/compliance.labels.ar';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { ButtonModule, NotificationModule, PlaceholderModule, ProgressIndicatorModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-roadmap-page',
    imports: [CommonModule, FormsModule, RoadmapTimelineComponent, ButtonModule, ProgressIndicatorModule, PlaceholderModule, NotificationModule],
    providers: [],
    template: `
    <cds-notification></cds-notification>
    <div class="crp-page">
      <div class="crp-header">
        <div>
          <h2 style="margin:0">{{ isAr() ? 'خارطة طريق الامتثال' : 'Compliance Roadmap' }}</h2>
          <p class="crp-subtitle">{{ isAr() ? 'تتبع التقدم عبر مراحل الامتثال' : 'Track progress across compliance phases' }}</p>
        </div>
        <div class="crp-actions">
          <button cdsButton [label]="isAr() ? 'إنشاء خارطة الطريق' : 'Generate Roadmap'" icon="" class=" " [loading]="generating()" (click)="generate()"></button>
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); load()">{{ i18n.translate('common.retry') || (isAr() ? 'إعادة المحاولة' : 'Retry') }}</button>
        </div>
      }

      @if (loading()) {
        <cds-placeholder></cds-placeholder>
        <cds-placeholder></cds-placeholder>
      }

      @if (!loading() && !loadError() && !roadmap()) {
        <div class="crp-empty">
          <i class="" style="font-size:3rem;color:var(--text-color-secondary)"></i>
          <h3>{{ isAr() ? 'لم يتم إنشاء خارطة طريق بعد' : 'No roadmap generated yet' }}</h3>
          <p>{{ isAr() ? 'أنشئ خارطة طريق من الفجوات المفتوحة' : 'Generate a roadmap from open gaps to create a compliance action plan' }}</p>
          <button cdsButton [label]="isAr() ? 'إنشاء خارطة الطريق' : 'Generate Roadmap'" icon="" [loading]="generating()" (click)="generate()"></button>
        </div>
      }

      @if (!loading() && !loadError() && roadmap()) {
        <div class="crp-summary-grid">
          <div class="crp-summary-card">
            <span class="crp-sv">{{ roadmap()!.completionPercent }}%</span>
            <span class="crp-sl">{{ L().completion }}</span>
            <cds-progress-bar [value]="roadmap()!.completionPercent" [showValue]="false" styleClass="crp-bar" />
          </div>
          <div class="crp-summary-card">
            <span class="crp-sv">{{ roadmap()!.completedTasks }}/{{ roadmap()!.totalTasks }}</span>
            <span class="crp-sl">{{ L().tasks }}</span>
          </div>
          @if (roadmap()!.currentWave) {
            <div class="crp-summary-card">
              <span class="crp-sv crp-sv-phase">{{ roadmap()!.currentWave }}</span>
              <span class="crp-sl">{{ L().currentWave }}</span>
            </div>
          }
          @if (roadmap()!.nextMilestone) {
            <div class="crp-summary-card">
              <span class="crp-sv crp-sv-next">{{ roadmap()!.nextMilestone }}</span>
              <span class="crp-sl">{{ L().nextMilestone }}</span>
            </div>
          }
        </div>

        <compliance-roadmap-timeline [roadmap]="roadmap()!" [L]="L()" />

        @if (roadmap()!.tasks?.length) {
          <div class="crp-tasks-section">
            <h4 class="crp-section-title">{{ isAr() ? 'المهام' : 'Tasks' }} ({{ roadmap()!.tasks.length }})</h4>
            <div class="crp-task-list">
              @for (task of roadmap()!.tasks; track task.taskId) {
                <div class="crp-task-row" [class.crp-overdue]="isTaskOverdue(task)" [class.crp-done]="task.status === 'completed'">
                  <div class="crp-task-info">
                    <span class="crp-task-title">{{ task.titleEn }}</span>
                    <span class="crp-task-meta">{{ task.phaseType }} · {{ task.priority }}</span>
                  </div>
                  <div class="crp-task-controls">
                    <select class="crp-task-select" [ngModel]="task.status" (ngModelChange)="updateTask(task.taskId, {status: $event})">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <select class="crp-task-select" [ngModel]="task.owner || ''" (ngModelChange)="updateTask(task.taskId, {ownerUserId: $event})">
                      <option value="">{{ isAr() ? 'بدون مالك' : 'No Owner' }}</option>
                      @for (u of foundationUsers(); track u.user_id) { <option [value]="u.user_id">{{ u.display_name || u.email }}</option> }
                    </select>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (auditReadiness()) {
          <div class="crp-audit-section">
            <h4 class="crp-section-title">{{ L().auditReadiness }}</h4>
            <div class="crp-audit-grid">
              <div class="crp-audit-item">
                <span class="crp-av">{{ auditReadiness()!.readinessScore }}%</span>
                <span class="crp-al">{{ L().readinessScore }}</span>
              </div>
              <div class="crp-audit-item">
                <span class="crp-av">{{ auditReadiness()!.implementedPct }}%</span>
                <span class="crp-al">{{ L().implemented }}</span>
              </div>
              <div class="crp-audit-item">
                <span class="crp-av">{{ auditReadiness()!.testedPct }}%</span>
                <span class="crp-al">{{ L().tested }}</span>
              </div>
              <div class="crp-audit-item">
                <span class="crp-av">{{ auditReadiness()!.evidencePct }}%</span>
                <span class="crp-al">{{ L().withEvidence }}</span>
              </div>
              <div class="crp-audit-item">
                <span class="crp-av" style="color:var(--green-500)">{{ auditReadiness()!.fullyReady }}/{{ auditReadiness()!.totalControls }}</span>
                <span class="crp-al">{{ L().fullyReady }}</span>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
    styles: [`
    .crp-page { padding: 20px 24px; }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }
    .crp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .crp-subtitle { margin: 4px 0 0; font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .crp-actions { display: flex; gap: 8px; }
    .crp-empty { text-align: center; padding: 60px 24px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .crp-empty h3 { margin: 0; font-size: var(--font-size-lg); }
    .crp-empty p { margin: 0; color: var(--text-color-secondary); font-size: var(--font-size-sm); }
    .crp-summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .crp-summary-card { padding: 16px; border-radius: var(--border-radius); text-align: center; border: 1px solid var(--surface-border); background: var(--surface-card); }
    .crp-sv { display: block; font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color); }
    .crp-sv-phase { font-size: var(--font-size-base); color: var(--primary-color); }
    .crp-sv-next { font-size: var(--font-size-base); color: var(--green-500); }
    .crp-sl { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; margin-top: 4px; }
    .crp-audit-section { margin-top: 24px; }
    .crp-section-title { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 12px; }
    .crp-audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .crp-audit-item { padding: 14px; border-radius: var(--border-radius); text-align: center; border: 1px solid var(--surface-border); background: var(--surface-card); }
    .crp-av { display: block; font-size: var(--font-size-2xl); font-weight: 800; }
    .crp-al { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; margin-top: 2px; }
    .crp-tasks-section { margin-top: 24px; }
    .crp-task-list { display: flex; flex-direction: column; gap: 6px; }
    .crp-task-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius); }
    .crp-task-row.crp-overdue { border-inline-start: 3px solid #ef4444; }
    .crp-task-row.crp-done { opacity: .65; }
    .crp-task-info { flex: 1; min-width: 0; }
    .crp-task-title { display: block; font-size: var(--font-size-sm); font-weight: 600; }
    .crp-task-meta { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .crp-task-controls { display: flex; gap: 6px; }
    .crp-task-select { padding: 4px 8px; font-size: var(--font-size-xs); border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); }
  `]
})
export class ComplianceRoadmapPageComponent implements OnInit {
  private api = inject(ComplianceFeatureApiService);
  protected i18n = inject(I18nService);
  private msg = inject(MessageService);

  isAr = () => this.i18n.currentLang() === 'ar';
  L = () => this.isAr() ? COMPLIANCE_AR : COMPLIANCE_EN;

  loading = signal(true);
  loadError = signal<string | null>(null);
  generating = signal(false);
  roadmap = signal<ComplianceRoadmapDto | null>(null);
  auditReadiness = signal<AuditReadinessDto | null>(null);
  foundationUsers = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(u => this.foundationUsers.set(u));
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.api.getRoadmap().subscribe({
      next: (rm) => {
        this.roadmap.set(rm);
        this.loading.set(false);
        this.loadAuditReadiness();
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.i18n.translate('common.failedToLoad') || 'Failed to load');
      },
    });
  }

  private loadAuditReadiness(): void {
    this.api.getAuditReadiness().subscribe({
      next: (ar) => this.auditReadiness.set(ar),
      error: (err) => {
        devError('[Compliance] Failed to load audit readiness', err);
        this.auditReadiness.set(null);
      },
    });
  }

  generate(): void {
    this.generating.set(true);
    this.api.generateRoadmap().subscribe({
      next: (rm) => {
        this.roadmap.set(rm);
        this.generating.set(false);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.isAr() ? 'تم إنشاء خارطة الطريق' : 'Roadmap generated successfully', life: 3000 });
      },
      error: () => {
        this.generating.set(false);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.isAr() ? 'فشل الإنشاء' : 'Failed to generate roadmap', life: 4000 });
      },
    });
  }

  isTaskOverdue(task: GrcRecord): boolean {
    if (!task.endDate || task.status === 'completed') return false;
    return new Date(task.endDate) < new Date();
  }

  updateTask(taskId: string, data: GrcRecord): void {
    this.api.updateRoadmapTask(taskId, data).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.taskUpdateFailed') });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.updated'), detail: this.i18n.translate('common.taskUpdated') });
        this.load();
      }
    });
  }
}
