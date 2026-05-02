import { Component, ChangeDetectionStrategy, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { OnboardingStore } from '../store/onboarding.store';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import { ActivationMilestonesComponent } from '../../components/activation/activation-milestones.component';
import { CockpitRevealBannerComponent } from '../../components/activation/cockpit-reveal-banner.component';
import { GrcRecord } from '../../models/onboarding.models';

@Component({
  selector: 'app-provision-stage-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, ActivationMilestonesComponent, CockpitRevealBannerComponent],
  template: `
    <div class="onb-stage-content">
      <div class="onb-stage-header">
        <h2><i class="pi pi-bolt"></i> {{ store.isAr ? 'شاهين يُعِد بيئة العمل' : 'Shahin Is Preparing Your Workspace' }}</h2>
        <p class="onb-stage-subtitle">{{ store.isAr ? 'كل ضابط وسجل مخاطر ومهمة أدلة ووكيل ذكاء يتم تهيئته لمشهدك التنظيمي. هذا يستغرق لحظات فقط.' : 'Every control, risk register, evidence task, and AI agent is being configured for your regulatory landscape. This takes just a moment.' }}</p>
      </div>
      <div *ngIf="store.provisionError()" class="onb-provision-error-banner">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ store.provisionError() }}</span>
        <span *ngIf="store.provisionCorrelationId()" class="onb-provision-correlation">
          <span class="correlation-label">{{ platform.i18n.translate('common.correlationId') || 'Correlation ID' }}:</span>
          <code>{{ store.provisionCorrelationId() }}</code>
        </span>
        <button type="button" class="onb-provision-retry" (click)="retryPoll.emit()"
          [attr.aria-label]="platform.i18n.translate('common.retry') || 'Retry'">
          <i class="pi pi-refresh"></i> {{ platform.i18n.translate('common.retry') || 'Retry' }}
        </button>
      </div>

      <app-activation-milestones
        [provJob]="store.provJob()" [provSteps]="store.provSteps()"
        [milestones]="store.provisioningMilestones()" [elapsedSeconds]="store.provisionElapsedSeconds()"
        [error]="store.provisionError()" [correlationId]="store.provisionCorrelationId()"
        [lang]="store.isAr ? 'ar' : 'en'" [temporalStatus]="store.temporalStatus()"
        [provisioningEvents]="store.provisioningEvents()"
        (retryProvisioning)="retryProvisioning.emit()" (retryPoll)="retryPoll.emit()"
        (cancelProvisioning)="cancelProvisioning.emit()" (techLogExpanded)="techLogExpanded.emit()">
      </app-activation-milestones>

      <app-cockpit-reveal-banner
        *ngIf="store.provJob()?.job_status === 'completed'"
        [checklist]="store.startupChecklist" [summary]="store.provisioningSummary()"
        [complete]="true" [lang]="store.isAr ? 'ar' : 'en'"
        (enterWorkspace)="enterWorkspace.emit()" (toggleChecklistItem)="toggleChecklistItem.emit($event)"
        (npsRated)="npsRated.emit($event)">
      </app-cockpit-reveal-banner>
    </div>
  `,
})
export class ProvisionStageContainerComponent {
  readonly store = inject(OnboardingStore);
  readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);

  @Output() retryProvisioning = new EventEmitter<void>();
  @Output() retryPoll = new EventEmitter<void>();
  @Output() cancelProvisioning = new EventEmitter<void>();
  @Output() techLogExpanded = new EventEmitter<void>();
  @Output() enterWorkspace = new EventEmitter<void>();
  @Output() toggleChecklistItem = new EventEmitter<GrcRecord>();
  @Output() npsRated = new EventEmitter<number>();
}
