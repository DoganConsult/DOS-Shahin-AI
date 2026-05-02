import { Component, OnInit, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import {
  PaymentService, LifecycleState, SubscriptionAuditEntry, Payment, TierLevel
} from '@app/core/services/user-account/payment.service';
import { SubscriptionUsageCardComponent } from '@app/shared/components/messaging/subscription-usage-card.component';
import { SubscriptionAuditTimelineComponent } from '@app/shared/components/messaging/subscription-audit-timeline.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Router } from '@angular/router';
import { devError } from '../../core/utils/dev-logger';
import { AppDatePipe } from '@app/shared/pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent, FormsModule,
    CardModule, ButtonModule, TagModule,
    DividerModule, MessageModule, ConfirmDialogModule,
    ToastModule, ProgressBarModule, InputSwitchModule, TableModule,
    SubscriptionUsageCardComponent, SubscriptionAuditTimelineComponent, AppDatePipe
  ],
  providers: [ConfirmationService, MessageService, DatePipe],
  template: `
    <app-page-shell icon="pi pi-id-card" [title]="i18n.translate('billing.registrationTitle')"
      [subtitle]="i18n.translate('billing.registrationSubtitle')"
      [breadcrumbs]="['Dashboard', i18n.translate('billing.registrationTitle')]" [loading]="loading()">

      <p-toast />
      <p-confirmDialog />

      <!-- Degradation Warning -->
      @if (lifecycle()?.degradation?.active) {
        <p-message severity="warn" styleClass="mb-4 w-full">
          <ng-template pTemplate>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-exclamation-triangle text-xl"></i>
              <span class="font-medium">{{ lifecycle()!.degradation.reason }}</span>
            </div>
          </ng-template>
        </p-message>
      }

      @if (lifecycle()?.warnings?.length) {
        @for (w of lifecycle()!.warnings; track w) {
          <p-message severity="info" [text]="w" styleClass="mb-2 w-full" />
        }
      }

      <div class="grid">
        <!-- Subscription Status Card -->
        <div class="col-12 md:col-6">
          <p-card [header]="i18n.translate('billing.subscriptionStatus')">
            @if (lifecycle()?.subscription) {
              <div class="flex flex-column gap-3">
                <div class="flex justify-content-between align-items-center">
                  <span class="text-color-secondary">Current Plan</span>
                  <p-tag [value]="lifecycle()!.tier | titlecase"
                    [severity]="lifecycle()!.tier === 'continuous' ? 'success' : lifecycle()!.tier === 'scale' ? 'info' : 'warning'" />
                </div>
                <div class="flex justify-content-between align-items-center">
                  <span class="text-color-secondary">Status</span>
                  <p-tag [value]="formatStatus(lifecycle()!.subscription.status)" [severity]="getStatusSeverity(lifecycle()!.subscription.status)" />
                </div>
                @if (lifecycle()?.mode) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Mode</span>
                    <span class="font-medium">{{ lifecycle()!.mode | titlecase }}</span>
                  </div>
                }
                <div class="flex justify-content-between">
                  <span class="text-color-secondary">Renewal Mode</span>
                  <span class="font-medium">{{ lifecycle()!.renewalMode | titlecase }}</span>
                </div>
                @if (lifecycle()?.subscription?.billing_cycle) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Billing Cycle</span>
                    <span class="font-medium">{{ lifecycle()!.subscription.billing_cycle | titlecase }}</span>
                  </div>
                }
                @if (lifecycle()?.subscription?.gateway) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Gateway</span>
                    <span class="font-medium">{{ lifecycle()!.subscription.gateway | titlecase }}</span>
                  </div>
                }
                @if (lifecycle()?.subscription?.current_period_start) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Period Start</span>
                    <span>{{ lifecycle()!.subscription.current_period_start | appDate:'medium' }}</span>
                  </div>
                }
                @if (lifecycle()?.subscription?.current_period_end) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Period End</span>
                    <span>{{ lifecycle()!.subscription.current_period_end | appDate:'medium' }}</span>
                  </div>
                }
                @if (lifecycle()?.daysRemaining !== null) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Days Remaining</span>
                    <strong [class]="lifecycle()!.daysRemaining! <= 7 ? 'text-red-500' : ''">
                      {{ lifecycle()!.daysRemaining }}
                    </strong>
                  </div>
                }
                @if (lifecycle()?.isInGracePeriod) {
                  <div class="surface-100 border-round p-2 border-left-3 border-orange-500">
                    <span class="text-sm text-orange-700 font-medium">Grace period active</span>
                  </div>
                }
                @if (lifecycle()?.subscription?.contract_reference) {
                  <div class="flex justify-content-between">
                    <span class="text-color-secondary">Contract Ref</span>
                    <span>{{ lifecycle()!.subscription.contract_reference }}</span>
                  </div>
                }

                <p-divider />

                <!-- Auto-Renew Toggle -->
                <div class="flex justify-content-between align-items-center">
                  <span class="text-color-secondary">Auto-Renew</span>
                  <p-inputSwitch [(ngModel)]="autoRenewEnabled" (onChange)="toggleAutoRenew()" />
                </div>

                <!-- Pending Downgrade -->
                @if (lifecycle()?.pendingDowngrade) {
                  <div class="surface-100 border-round p-3 border-left-3 border-blue-500">
                    <div class="flex justify-content-between align-items-center">
                      <div>
                        <span class="text-sm font-medium">Scheduled Downgrade</span>
                        <p class="text-xs text-color-secondary m-0 mt-1">
                          → {{ lifecycle()!.pendingDowngrade!.tier | titlecase }} on {{ lifecycle()!.pendingDowngrade!.effectiveAt | appDate:'medium' }}
                        </p>
                      </div>
                      <p-button label="Cancel" size="small" severity="secondary" [outlined]="true"
                        (onClick)="cancelDowngrade()" />
                    </div>
                  </div>
                }

                <p-divider />

                <!-- Quick Actions -->
                <div class="flex gap-2 flex-wrap">
                  @if (lifecycle()?.canUpgrade) {
                    <p-button label="Upgrade" icon="pi pi-arrow-up" severity="success" [outlined]="true"
                      (onClick)="goToPricing()" />
                  }
                  @if (lifecycle()?.isPaused) {
                    <p-button label="Resume" icon="pi pi-play" severity="info"
                      (onClick)="resume()" [loading]="actionLoading()" />
                  } @else {
                    @if (lifecycle()?.subscription?.status === 'active' || lifecycle()?.subscription?.status === 'renewal_due') {
                      <p-button label="Pause" icon="pi pi-pause" severity="warning" [outlined]="true"
                        (onClick)="confirmPause()" />
                    }
                  }
                  <p-button label="Cancel" icon="pi pi-times" severity="danger" [outlined]="true"
                    (onClick)="confirmCancel()" />
                  <p-button label="View Plans" icon="pi pi-arrow-right" severity="secondary" [outlined]="true"
                    (onClick)="goToPricing()" />
                </div>
              </div>
            } @else {
              <div class="text-center py-4">
                <i class="pi pi-user-plus text-4xl text-color-secondary mb-3"></i>
                <p class="text-color-secondary mb-3">{{ i18n.translate('billing.notRegistered') }}</p>
                <p-button [label]="i18n.translate('billing.registerNow')" icon="pi pi-verified"
                  (onClick)="goToPricing()" />
              </div>
            }
          </p-card>
        </div>

        <!-- Usage Meters -->
        <div class="col-12 md:col-6">
          <app-subscription-usage-card [usage]="usage()" />
        </div>

        <!-- Payment History -->
        <div class="col-12 md:col-6">
          <p-card [header]="i18n.translate('billing.paymentHistory')">
            @if (payments().length > 0) {
              <p-table aria-label="Data table" [value]="payments()" [rows]="5" [paginator]="payments().length > 5" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Gateway</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-p>
                  <tr>
                    <td>{{ p.createdAt | appDate:'short' }}</td>
                    <td>{{ p.amount }} {{ p.currency }}</td>
                    <td><p-tag [value]="p.status" [severity]="p.status === 'succeeded' ? 'success' : p.status === 'failed' ? 'danger' : 'info'" /></td>
                    <td>{{ p.gateway | titlecase }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center text-color-secondary py-3">No payments</td></tr>
                </ng-template>
              </p-table>
            } @else {
              <div class="text-center py-4">
                <i class="pi pi-shield text-3xl text-green-500 mb-2"></i>
                <p class="text-color-secondary text-sm m-0">{{ i18n.translate('billing.noPaymentEverCharged') }}</p>
              </div>
            }
          </p-card>
        </div>

        <!-- Audit Timeline -->
        <div class="col-12 md:col-6">
          <app-subscription-audit-timeline [entries]="auditLog()" title="Subscription History" />
        </div>
      </div>
    </app-page-shell>
  `
})
export class BillingComponent implements OnInit {
  loading = signal(true);
  actionLoading = signal(false);
  lifecycle = signal<LifecycleState | null>(null);
  usage = signal<Record<string, { current: number; limit: number; remaining: number }>>({});
  auditLog = signal<SubscriptionAuditEntry[]>([]);
  payments = signal<Payment[]>([]);
  autoRenewEnabled = false;

  constructor(
    public i18n: I18nService,
    private paymentSvc: PaymentService,
    private confirmSvc: ConfirmationService,
    private msgSvc: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.loading.set(true);
    this.paymentSvc.getLifecycleState().subscribe({
      next: (state) => {
        this.lifecycle.set(state);
        this.autoRenewEnabled = state.autoRenew;
        if (state.usageSummary) this.usage.set(state.usageSummary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.paymentSvc.getUsage().subscribe({
      next: (res) => this.usage.set(res.usage),
      error: (e) => devError("[API]", e)
    });
    this.paymentSvc.getAuditLog(20).subscribe({
      next: (res) => this.auditLog.set(res.auditLog),
      error: (e) => devError("[API]", e)
    });
    this.paymentSvc.getPaymentHistory(10).subscribe({
      next: (res) => this.payments.set(res.payments),
      error: (e) => devError("[API]", e)
    });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (status === 'active') return 'success';
    if (status === 'trialing' || status === 'trial_active' || status === 'preview') return 'info';
    if (status === 'renewal_due' || status === 'past_due' || status === 'grace_period' || status === 'paused') return 'warning';
    if (status === 'expired' || status === 'cancelled' || status === 'suspended' || status === 'trial_expired') return 'danger';
    return 'secondary';
  }

  toggleAutoRenew() {
    this.paymentSvc.setAutoRenew(this.autoRenewEnabled).subscribe({
      next: () => this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('common.updated'), detail: this.i18n.translate('common.autoRenewUpdated', { state: this.autoRenewEnabled ? 'enabled' : 'disabled' }) }),
      error: () => {
        this.autoRenewEnabled = !this.autoRenewEnabled;
        this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToUpdateAutoRenew') });
      }
    });
  }

  cancelDowngrade() {
    this.paymentSvc.cancelScheduledDowngrade().subscribe({
      next: () => { this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('common.cancelled'), detail: this.i18n.translate('common.scheduledDowngradeCancelled') }); this.loadAll(); },
      error: () => this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCancelDowngrade') })
    });
  }

  confirmPause() {
    this.confirmSvc.confirm({
      message: 'Pausing your subscription will put it in read-only mode. Continue?',
      header: 'Pause Subscription',
      icon: 'pi pi-pause',
      acceptLabel: 'Yes, Pause',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.actionLoading.set(true);
        this.paymentSvc.pauseSubscription('User-requested pause').subscribe({
          next: () => { this.actionLoading.set(false); this.msgSvc.add({ severity: 'info', summary: this.i18n.translate('common.paused'), detail: this.i18n.translate('common.subscriptionPaused') }); this.loadAll(); },
          error: () => { this.actionLoading.set(false); this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToPause') }); }
        });
      }
    });
  }

  resume() {
    this.actionLoading.set(true);
    this.paymentSvc.resumeSubscription().subscribe({
      next: () => { this.actionLoading.set(false); this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('common.resumed'), detail: this.i18n.translate('common.subscriptionResumed') }); this.loadAll(); },
      error: () => { this.actionLoading.set(false); this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToResume') }); }
    });
  }

  confirmCancel() {
    this.confirmSvc.confirm({
      message: this.i18n.translate('billing.optOutConfirmMessage'),
      header: this.i18n.translate('billing.optOutConfirmTitle'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translate('billing.yesOptOut'),
      rejectLabel: this.i18n.translate('billing.keepRegistration'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.paymentSvc.cancelSubscription().subscribe({
          next: () => { this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('common.cancelled'), detail: this.i18n.translate('common.subscriptionCancelled') }); this.loadAll(); },
          error: () => this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.cancellationFailed') })
        });
      }
    });
  }

  goToPricing() {
    this.router.navigate(['/pricing']);
  }
}
