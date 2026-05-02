import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgrcEngineApiService } from '../../core/agrc-engine/agrc-engine.api.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-agrc-engine-page',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-6xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">{{ i18n.translate('admin.agrcOsEngine') }}</h1>
        <p class="text-sm text-gray-500">
          {{ i18n.translate('admin.runAndInspectEngine') }}
        </p>
      </div>

      <div class="border rounded-2xl bg-white p-4 flex gap-3 items-end">
        <label class="flex-1">
          <div class="mb-1 text-sm">{{ i18n.translate('admin.tenantId') }}</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="tenantId" />
        </label>

        <button class="border rounded px-4 py-2" (click)="reload()" [disabled]="loading()">
          {{ i18n.translate('admin.refreshRuns') }}
        </button>

        <button class="rounded px-4 py-2 bg-black text-white" (click)="run()" [disabled]="loading()">
          {{ i18n.translate('admin.runEngine') }}
        </button>
      </div>

      <div *ngIf="lastRun()" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="border rounded-xl bg-white p-4">
          <div class="text-xs text-gray-500">{{ i18n.translate('admin.staleControls') }}</div>
          <div class="text-2xl font-semibold">{{ lastRun()?.summary?.staleControls ?? 0 }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4">
          <div class="text-xs text-gray-500">{{ i18n.translate('admin.overdueRemediations') }}</div>
          <div class="text-2xl font-semibold">{{ lastRun()?.summary?.overdueRemediations ?? 0 }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4">
          <div class="text-xs text-gray-500">{{ i18n.translate('admin.kriBreaches') }}</div>
          <div class="text-2xl font-semibold">{{ lastRun()?.summary?.kriBreaches ?? 0 }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4">
          <div class="text-xs text-gray-500">{{ i18n.translate('admin.policyReviewsStarted') }}</div>
          <div class="text-2xl font-semibold">{{ lastRun()?.summary?.policyReviewsStarted ?? 0 }}</div>
        </div>
      </div>

      <div class="border rounded-2xl bg-white p-4 overflow-auto">
        <div class="font-semibold mb-3">{{ i18n.translate('admin.recentEngineRuns') }}</div>

        <table [attr.aria-label]="i18n.translate('admin.recentEngineRuns')" class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2 pr-4">{{ i18n.translate('admin.started') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.status') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.trigger') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.stale') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.remediation') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.kri') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.policy') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.tasks') }}</th>
              <th class="py-2 pr-4">{{ i18n.translate('admin.notifications') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of runs()" class="border-b">
              <td class="py-2 pr-4">{{ row.started_at }}</td>
              <td class="py-2 pr-4">{{ row.status }}</td>
              <td class="py-2 pr-4">{{ row.trigger_mode }}</td>
              <td class="py-2 pr-4">{{ row.stale_controls }}</td>
              <td class="py-2 pr-4">{{ row.overdue_remediations }}</td>
              <td class="py-2 pr-4">{{ row.kri_breaches }}</td>
              <td class="py-2 pr-4">{{ row.policy_reviews_started }}</td>
              <td class="py-2 pr-4">{{ row.tasks_created }}</td>
              <td class="py-2 pr-4">{{ row.notifications_created }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="runResult()" class="border rounded-2xl bg-white p-4">
        <div class="font-semibold mb-3">{{ i18n.translate('admin.lastManualResult') }}</div>
        <pre class="text-xs whitespace-pre-wrap">{{ runResult() | json }}</pre>
      </div>
    </div>
  `
})
export class AgrcEnginePageComponent {
  private api = inject(AgrcEngineApiService);
  readonly i18n = inject(I18nService);

  tenantId = '';
  readonly loading = signal(false);
  readonly runs = signal<GrcRecord[]>([]);
  readonly runResult = signal<GrcRecord | null>(null);
  readonly lastRun = signal<GrcRecord | null>(null);

  async run() {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.run(this.tenantId || undefined));
      this.runResult.set(result);
      this.lastRun.set(result);
      await this.reload();
    } finally {
      this.loading.set(false);
    }
  }

  async reload() {
    this.loading.set(true);
    try {
      const rows = await firstValueFrom(this.api.listRuns(this.tenantId || undefined));
      this.runs.set(rows || []);
    } finally {
      this.loading.set(false);
    }
  }

}
