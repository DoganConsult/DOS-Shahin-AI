import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { of, catchError, map } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GuidedExperienceService, SetupProgress, NextAction } from './guided-experience.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { StorageService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-setup-progress-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, ProgressBarModule, ButtonModule, TagModule],
  template: `
    <div class="guided-panel" *ngIf="!dismissed() && (progress() || actions().length > 0)" [dir]="i18n.direction()">

      <!-- Setup Progress Tracker -->
      <div class="setup-tracker" *ngIf="progress() as p">
        <div class="tracker-header" *ngIf="p.percentage < 100">
          <div class="tracker-title-row">
            <i class="pi pi-flag"></i>
            <div>
              <h3 class="tracker-title">{{ i18n.translate('setupProgress.title') }}</h3>
              <span class="tracker-sub">{{ p.completedCount }}/{{ p.totalCount }} {{ i18n.translate('setupProgress.completed') }}</span>
            </div>
          </div>
          <button class="dismiss-btn" (click)="dismiss()" [attr.aria-label]="'Dismiss'"><i class="pi pi-times"></i></button>
        </div>
        <p-progressBar *ngIf="p.percentage < 100" [value]="p.percentage" [showValue]="true" styleClass="tracker-bar" />
        <div class="step-list" *ngIf="p.percentage < 100">
          <a *ngFor="let step of nextSteps()" [routerLink]="step.route" class="step-item" [class.done]="step.completed">
            <i class="pi" [ngClass]="step.completed ? 'pi-check-circle' : 'pi-circle'"></i>
            <div class="step-info">
              <span class="step-label">{{ i18n.localize(step.label, step.labelAr) }}</span>
              <span class="step-desc">{{ i18n.localize(step.description, step.descriptionAr) }}</span>
            </div>
            <i class="pi pi-arrow-right step-go"></i>
          </a>
        </div>
      </div>

      <!-- Next Actions -->
      <div class="next-actions" *ngIf="actions().length > 0">
        <h3 class="section-title">
          <i class="pi pi-list"></i>
          {{ i18n.translate('setupProgress.suggestedActions') }}
        </h3>
        <div class="action-list">
          <a *ngFor="let action of actions()" [routerLink]="action.route" class="action-item">
            <div class="action-info">
              <span class="action-label">{{ i18n.localize(action.label, action.labelAr) }}</span>
              <span class="action-reason">{{ i18n.localize(action.reason, action.reasonAr) }}</span>
            </div>
            <i class="pi pi-arrow-right action-go"></i>
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .guided-panel {
      background: linear-gradient(135deg, #eff6ff, var(--status-success-bg, #defbe6));
      border: 1.5px solid #bae6fd; border-radius: var(--radius-lg);
      padding: 20px; margin-bottom: 20px;
    }

    .tracker-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .tracker-title-row { display: flex; align-items: center; gap: 10px; }
    .tracker-title-row > .pi { font-size: var(--font-size-xl); color: var(--primary); }
    .tracker-title { font-size: var(--font-size-md); font-weight: 700; color: #0c4a6e; margin: 0; }
    .tracker-sub { font-size: var(--font-size-sm); color: var(--text-muted); }
    .dismiss-btn {
      background: transparent; border: none; color: var(--text-muted); cursor: pointer;
      padding: 4px; border-radius: var(--radius-xs); font-size: var(--font-size-base);
    }
    .dismiss-btn:hover { color: #334155; background: rgba(var(--color-black-rgb), 0.05); }


    .step-list { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
    .step-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: var(--radius);
      background: #fff; border: 1px solid #e0f2fe;
      text-decoration: none; color: inherit;
      transition: all 150ms;
    }
    .step-item:hover { border-color: var(--primary); background: var(--status-info-bg, #edf5ff); transform: translateX(2px); }
    .step-item.done { opacity: 0.5; }
    .step-item.done .pi-check-circle { color: var(--success); }
    .step-item .pi-circle { color: var(--text-muted); font-size: var(--font-size-md); flex-shrink: 0; }
    .step-item .pi-check-circle { font-size: var(--font-size-md); flex-shrink: 0; }
    .step-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .step-label { font-size: var(--font-size-sm); font-weight: 600; color: #0c4a6e; }
    .step-desc { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .step-go { color: var(--text-muted); font-size: var(--font-size-sm); flex-shrink: 0; }

    .next-actions { margin-top: 16px; }
    .section-title {
      font-size: var(--font-size-base); font-weight: 700; color: #0c4a6e; margin: 0 0 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title .pi { color: var(--primary); }
    .action-list { display: flex; flex-direction: column; gap: 6px; }
    .action-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: var(--radius);
      background: #fff; border: 1px solid #e0f2fe;
      text-decoration: none; color: inherit;
      transition: all 150ms;
    }
    .action-item:hover { border-color: var(--primary); background: var(--status-info-bg, #edf5ff); transform: translateX(2px); }
    .action-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .action-label { font-size: var(--font-size-sm); font-weight: 600; color: #1e40af; }
    .action-reason { font-size: var(--font-size-xs); color: var(--text-muted); }
    .action-go { color: var(--text-muted); font-size: var(--font-size-sm); flex-shrink: 0; }
  `]
})
export class SetupProgressPanelComponent {
  i18n = inject(I18nService);
  private guided = inject(GuidedExperienceService);
  private _storage = inject(StorageService);

  dismissed = signal(this._storage.get('guided_setup_dismissed') === '1');

  progress = toSignal(
    this.dismissed()
      ? of(null)
      : this.guided.getSetupProgress().pipe(catchError(() => of(null))),
    { initialValue: null as SetupProgress | null },
  );

  actions = toSignal(
    this.dismissed()
      ? of([])
      : this.guided.getNextActions().pipe(
          map(a => a.slice(0, 5)),
          catchError(() => of([])),
        ),
    { initialValue: [] as NextAction[] },
  );

  nextSteps = computed(() => {
    const p = this.progress();
    if (!p) return [];
    return p.steps.filter(s => !s.completed).slice(0, 4);
  });

  dismiss(): void {
    this.dismissed.set(true);
    this._storage.set('guided_setup_dismissed', '1');
  }
}
