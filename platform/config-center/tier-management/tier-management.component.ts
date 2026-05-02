import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tier-management',
  standalone: true,
  imports: [CommonModule, PageShellComponent, CardModule, ButtonModule, TagModule, ProgressBarModule],
  template: `
    <app-page-shell icon="star" [title]="i18n.translate('grcOs.tierUpgrade')"
      [subtitle]="'Manage your subscription tier and feature access'"
      [breadcrumbs]="['Dashboard', 'Tier Management']" [loading]="loading">
      <div class="grid">
        @for (tier of tiers; track tier.tier) {
          <div class="col-4">
            <p-card [header]="tier.nameEn" [subheader]="tier.nameAr"
                    [style]="{'border': currentTier === tier.tier ? '2px solid var(--primary-color)' : ''}">
              @if (currentTier === tier.tier) {
                <p-tag value="Current Plan" severity="success" class="mb-2" />
              }
              <div class="mb-2"><strong>Users:</strong> {{ tier.maxUsers === -1 ? 'Unlimited' : tier.maxUsers }}</div>
              <div class="mb-2"><strong>Frameworks:</strong> {{ tier.maxFrameworks === -1 ? 'Unlimited' : tier.maxFrameworks }}</div>
              <div class="mb-2"><strong>Features:</strong> {{ tier.features.length }}</div>
              <ul class="text-sm" style="max-height: 200px; overflow-y: auto;">
                @for (f of tier.features.slice(0, 10); track f) {
                  <li>{{ f.replace('_', ' ') }}</li>
                }
                @if (tier.features.length > 10) {
                  <li class="text-color-secondary">+{{ tier.features.length - 10 }} more</li>
                }
              </ul>
              @if (currentTier !== tier.tier && canUpgrade(tier.tier)) {
                <p-button [label]="'Upgrade to ' + tier.nameEn" icon="pi pi-arrow-up" styleClass="w-full mt-2" (onClick)="upgrade(tier.tier)" />
              }
            </p-card>
          </div>
        }
      </div>
      @if (usage) {
        <p-card header="Current Usage" styleClass="mt-3">
          <div class="grid">
            <div class="col-6">
              <div class="mb-2">Users: {{ usage.users }} / {{ usage.maxUsers === -1 ? 'Unlimited' : usage.maxUsers }}</div>
              @if (usage.maxUsers > 0) { <p-progressBar [value]="usage.users / usage.maxUsers * 100" [showValue]="false" /> }
            </div>
            <div class="col-6">
              <div class="mb-2">Frameworks: {{ usage.frameworks }} / {{ usage.maxFrameworks === -1 ? 'Unlimited' : usage.maxFrameworks }}</div>
              @if (usage.maxFrameworks > 0) { <p-progressBar [value]="usage.frameworks / usage.maxFrameworks * 100" [showValue]="false" /> }
            </div>
          </div>
        </p-card>
      }
    </app-page-shell>
  `
})
export class TierManagementComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  tiers: Record<string, unknown>[] = [];
  currentTier = 'starter';
  usage: Record<string, unknown> | null = null;
  tierOrder = ['starter', 'scale', 'continuous'];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/tier').subscribe({
      next: (d: Record<string, unknown>) => { this.tiers = d.tiers || []; this.currentTier = d.currentTier || 'starter'; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get('/tier/usage').subscribe({ next: (d: Record<string, unknown>) => { this.usage = d; } });
  }
  canUpgrade(tier: string): boolean {
    return this.tierOrder.indexOf(tier) > this.tierOrder.indexOf(this.currentTier);
  }
  upgrade(tier: string) {
    this.apiclientSvc.post('/tier/upgrade', { newTier: tier }).subscribe({ next: () => this.ngOnInit() });
  }
}
