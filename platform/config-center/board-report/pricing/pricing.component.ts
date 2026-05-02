import { Component, OnInit, signal, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import {
  PaymentService, PricingPlan, TierLevel, LifecycleState
} from '@app/core/services/user-account/payment.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { devError } from '../../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const TIER_ORDER: TierLevel[] = ['starter', 'scale', 'continuous'];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pricing',
    imports: [
        CommonModule, PageShellComponent,
        CardModule, ButtonModule, TagModule, DividerModule, MessageModule,
        ConfirmDialogModule, ToastModule, AppDatePipe
    ],
    providers: [ConfirmationService, MessageService],
    template: `
    <app-page-shell icon="pi pi-verified" [title]="i18n.translate('billing.pricingTitle')"
      [subtitle]="i18n.translate('billing.pricingSubtitle')"
      [breadcrumbs]="['Dashboard', i18n.translate('billing.freePreview')]" [loading]="loading()">

      <p-toast />
      <p-confirmDialog />

      <!-- Free Preview Notice -->
      <p-message severity="info" styleClass="mb-4 w-full">
        <ng-template pTemplate>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-shield text-xl"></i>
            <span class="font-medium">{{ i18n.translate('billing.freePreviewNotice') }}</span>
          </div>
        </ng-template>
      </p-message>

      <!-- Scheduled Downgrade Notice -->
      @if (lifecycle()?.pendingDowngrade) {
        <p-message severity="warn" styleClass="mb-4 w-full">
          <ng-template pTemplate>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-clock text-xl"></i>
              <span>Downgrade to {{ lifecycle()!.pendingDowngrade!.tier | titlecase }} scheduled for {{ lifecycle()!.pendingDowngrade!.effectiveAt | appDate:'medium' }}</span>
            </div>
          </ng-template>
        </p-message>
      }

      <!-- No-Charge Assurance -->
      <div class="text-center mb-4">
        <div class="inline-flex align-items-center gap-2 surface-100 border-round-lg px-4 py-2">
          <i class="pi pi-lock text-green-600"></i>
          <span class="text-sm text-color-secondary">{{ i18n.translate('billing.noChargeAssurance') }}</span>
        </div>
      </div>

      <!-- Tier Cards -->
      <div class="grid">
        @for (plan of plans(); track plan.tier) {
          <div class="col-12 md:col-4">
            <p-card [style]="isCurrentTier(plan.tier) ? {'border': '2px solid var(--primary-color)', 'position': 'relative'} : plan.popular ? {'border': '1px solid var(--surface-400)', 'position': 'relative'} : {}">
              @if (isCurrentTier(plan.tier)) {
                <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%)">
                  <p-tag value="Current Plan" severity="success" icon="pi pi-check" />
                </div>
              } @else if (plan.popular && !hasSubscription()) {
                <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%)">
                  <p-tag [value]="i18n.translate('billing.recommended')" severity="warning" icon="pi pi-star" />
                </div>
              }

              <div class="text-center">
                <h3 class="text-xl font-bold mb-1">{{ i18n.isAr() ? plan.nameAr : plan.nameEn }}</h3>

                <!-- Free Phase Badge -->
                <div class="my-3">
                  <p-tag [value]="i18n.translate('billing.freePhaseLabel')" severity="success"
                    icon="pi pi-check-circle" styleClass="text-lg px-3 py-2" />
                </div>

                <p class="text-sm text-color-secondary mt-1 mb-3">
                  {{ i18n.translate('billing.noPaymentRequired') }}
                </p>

                <p-divider />

                <!-- Limits -->
                <div class="text-left mb-3 px-2">
                  <div class="flex justify-content-between mb-1">
                    <span>{{ i18n.translate('billing.users') }}</span>
                    <strong>{{ plan.maxUsers === -1 ? i18n.translate('billing.unlimited') : plan.maxUsers }}</strong>
                  </div>
                  <div class="flex justify-content-between mb-1">
                    <span>{{ i18n.translate('billing.frameworks') }}</span>
                    <strong>{{ plan.maxFrameworks === -1 ? i18n.translate('billing.unlimited') : plan.maxFrameworks }}</strong>
                  </div>
                </div>

                <p-divider />

                <!-- Features -->
                <ul class="text-left text-sm list-none p-0 m-0 mb-3" style="max-height:200px;overflow-y:auto">
                  @for (f of plan.features.slice(0, 8); track f) {
                    <li class="py-1">
                      <i class="pi pi-check-circle text-green-500 mr-2"></i>
                      {{ formatFeature(f) }}
                    </li>
                  }
                  @if (plan.features.length > 8) {
                    <li class="py-1 text-color-secondary text-xs">
                      +{{ plan.features.length - 8 }} {{ i18n.translate('billing.moreFeatures') }}
                    </li>
                  }
                </ul>

                <!-- Actions -->
                @if (isCurrentTier(plan.tier)) {
                  <p-button [label]="i18n.translate('billing.registered')" severity="success"
                    icon="pi pi-check" styleClass="w-full" [disabled]="true" />
                } @else if (isUpgrade(plan.tier)) {
                  <p-button label="Upgrade" icon="pi pi-arrow-up"
                    severity="success" styleClass="w-full"
                    [loading]="actionLoading() === plan.tier"
                    (onClick)="confirmUpgrade(plan.tier)" />
                } @else if (isDowngrade(plan.tier)) {
                  <p-button label="Schedule Downgrade" icon="pi pi-arrow-down"
                    severity="warning" [outlined]="true" styleClass="w-full"
                    [loading]="actionLoading() === plan.tier"
                    (onClick)="confirmDowngrade(plan.tier)" />
                } @else {
                  <p-button [label]="i18n.translate('billing.registerTier')"
                    [icon]="actionLoading() === plan.tier ? 'pi pi-spin pi-spinner' : 'pi pi-user-plus'"
                    [severity]="plan.popular ? 'primary' : 'secondary'" styleClass="w-full"
                    [loading]="actionLoading() === plan.tier"
                    (onClick)="register(plan.tier)" />
                }
              </div>
            </p-card>
          </div>
        }
      </div>

      <!-- Already registered? View status -->
      @if (hasSubscription()) {
        <div class="text-center mt-4">
          <p-button [label]="i18n.translate('billing.viewRegistration')" icon="pi pi-id-card"
            [text]="true" (onClick)="goToBilling()" />
        </div>
      }

      <!-- Footer Disclaimer -->
      <div class="text-center mt-5 text-sm text-color-secondary">
        <i class="pi pi-info-circle mr-1"></i>
        {{ i18n.translate('billing.freePhaseDisclaimer') }}
      </div>
    </app-page-shell>
  `
})
export class PricingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  loading = signal(true);
  plans = signal<PricingPlan[]>([]);
  lifecycle = signal<LifecycleState | null>(null);
  actionLoading = signal<TierLevel | null>(null);


  constructor(
    public i18n: I18nService,
    private paymentSvc: PaymentService,
    private confirmSvc: ConfirmationService,
    private msgSvc: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.paymentSvc.getPlans().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.plans.set(Object.values(res.plans));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.paymentSvc.getLifecycleState().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (state) => this.lifecycle.set(state),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  hasSubscription(): boolean {
    return !!this.lifecycle()?.subscription;
  }

  isCurrentTier(tier: TierLevel): boolean {
    const lc = this.lifecycle();
    if (!lc?.subscription) return false;
    return lc.tier === tier;
  }

  isUpgrade(tier: TierLevel): boolean {
    const lc = this.lifecycle();
    if (!lc?.subscription) return false;
    return TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(lc.tier);
  }

  isDowngrade(tier: TierLevel): boolean {
    const lc = this.lifecycle();
    if (!lc?.subscription) return false;
    return TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(lc.tier);
  }

  formatFeature(f: string): string {
    return f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  confirmUpgrade(tier: TierLevel) {
    this.confirmSvc.confirm({
      message: `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan?`,
      header: 'Confirm Upgrade',
      icon: 'pi pi-arrow-up',
      acceptLabel: 'Upgrade',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.actionLoading.set(tier);
        this.paymentSvc.requestUpgrade(tier, 'User upgrade request').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('common.upgradeRequested'), detail: this.i18n.translate('common.upgradeToTierInitiated', { tier }) });
            this.loadData();
          },
          error: () => { this.actionLoading.set(null); this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.upgradeFailed') }); }
        });
      }
    });
  }

  confirmDowngrade(tier: TierLevel) {
    this.confirmSvc.confirm({
      message: `Schedule downgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}? This will take effect at the end of your current billing period.`,
      header: 'Confirm Downgrade',
      icon: 'pi pi-arrow-down',
      acceptLabel: 'Schedule Downgrade',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.actionLoading.set(tier);
        this.paymentSvc.scheduleDowngrade(tier, 'User downgrade request').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.msgSvc.add({ severity: 'info', summary: this.i18n.translate('common.downgradeScheduled'), detail: this.i18n.translate('common.downgradeToTierScheduled', { tier }) });
            this.loadData();
          },
          error: (err: unknown) => {
            this.actionLoading.set(null);
            this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || this.i18n.translate('common.downgradeFailed') });
          }
        });
      }
    });
  }

  register(tier: TierLevel) {
    this.actionLoading.set(tier);
    this.paymentSvc.startTrial(tier).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.router.navigate(['/billing']);
      },
      error: () => this.actionLoading.set(null)
    });
  }

  goToBilling() {
    this.router.navigate(['/billing']);
  }
}
