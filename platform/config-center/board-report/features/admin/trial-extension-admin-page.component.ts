import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TrialExtensionApiService } from '../../core/subscription/trial-extension.api.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-trial-extension-admin-page',
    imports: [CommonModule, AppDatePipe, FormsModule],
    template: `
    <div class="p-6 max-w-4xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">{{ i18n.translate('admin.trialExtensionRequests') }}</h1>
        <p class="text-sm text-gray-500">{{ i18n.translate('admin.reviewAndManageTrialExtensionRequests') }}</p>
      </div>

      <button class="border rounded px-4 py-2" (click)="load()" [disabled]="loading()">
        {{ i18n.translate('admin.refresh') }}
      </button>

      <div class="border rounded-2xl bg-white p-4 overflow-auto">
        <table aria-label="Trial Extension Requests table" class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2 pr-4">{{ i18n.translate('admin.created') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.tenant') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.days') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.reason') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.status') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of requests()" class="border-b">
              <td class="py-2 pr-4">{{ r.created_at | appDate:'short' }}</td>
              <td class="py-2 pr-4">{{ r.tenant_id }}</td>
              <td class="py-2 pr-4">{{ r.requested_days }}</td>
              <td class="py-2 pr-4 max-w-xs truncate">{{ r.reason }}</td>
              <td class="py-2 pr-4">
                <span [class]="statusClass(r.status)">{{ r.status }}</span>
              </td>
              <td class="py-2 pr-4">
                <div *ngIf="r.status === 'pending'" class="flex gap-2">
                  <button class="rounded px-3 py-1 bg-green-600 text-white text-xs"
                    (click)="approve(r.request_id)">{{ i18n.translate('admin.approve') }}</button>
                  <button class="rounded px-3 py-1 bg-red-600 text-white text-xs"
                    (click)="reject(r.request_id)">{{ i18n.translate('admin.reject') }}</button>
                </div>
                <span *ngIf="r.status !== 'pending'" class="text-xs text-gray-400">
                  {{ r.decision_notes || '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!requests().length" class="text-sm text-gray-400 py-4 text-center">
          {{ i18n.translate('admin.noExtensionRequestsFound') }}
        </div>
      </div>
    </div>
  `
})
export class TrialExtensionAdminPageComponent implements OnInit {
  private api = inject(TrialExtensionApiService);
  readonly i18n = inject(I18nService);
  readonly loading = signal(false);
  readonly requests = signal<GrcRecord[]>([]);

  async load() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.api.getStatus());
      this.requests.set(res?.requests ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async approve(requestId: string) {
    await firstValueFrom(this.api.approve(requestId, 'Approved via admin panel'));
    await this.load();
  }

  async reject(requestId: string) {
    await firstValueFrom(this.api.reject(requestId, 'Rejected via admin panel'));
    await this.load();
  }

  statusClass(status: string): string {
    if (status === 'approved') return 'text-green-600 font-semibold';
    if (status === 'rejected') return 'text-red-600 font-semibold';
    return 'text-amber-600 font-semibold';
  }

  ngOnInit(): void {
    this.load();
  }

}
