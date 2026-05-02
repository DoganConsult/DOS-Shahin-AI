import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PackPolicyApiService } from '../../../../core/packs/pack-policy.api.service';
import { ProvisioningOrchestratorApiService } from '../../core/provisioning/provisioning-orchestrator.api.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pack-policy-review-page',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-5xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">Pack Policy Review</h1>
        <p class="text-sm text-gray-500">Evaluate pack selection policies and review decisions before provisioning.</p>
      </div>

      <div class="border rounded-2xl bg-white p-4 flex gap-3 items-end flex-wrap">
        <label class="flex-1 min-w-[200px]">
          <div class="mb-1 text-sm">Session ID</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="sessionId" />
        </label>
        <label class="flex-1 min-w-[200px]">
          <div class="mb-1 text-sm">Tenant ID</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="tenantId" />
        </label>
        <button class="rounded px-4 py-2 bg-black text-white" (click)="evaluate()" [disabled]="loading()">
          Evaluate
        </button>
        <button class="rounded px-4 py-2 border" (click)="provision()" [disabled]="loading() || !selectedPacks().length">
          Provision
        </button>
      </div>

      <div *ngIf="selectedPacks().length" class="border rounded-2xl bg-white p-4">
        <div class="font-semibold mb-3">Selected Packs</div>
        <div class="flex gap-2 flex-wrap">
          <span *ngFor="let p of selectedPacks()"
                class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {{ p.packCode }}
          </span>
        </div>
      </div>

      <div *ngIf="decisions().length" class="border rounded-2xl bg-white p-4 overflow-auto">
        <div class="font-semibold mb-3">Decision Log</div>
        <table aria-label="Min W Full table" class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2 pr-4">Policy</th>
              <th class="py-2 pr-4">Pack</th>
              <th class="py-2 pr-4">Status</th>
              <th class="py-2 pr-4">Matched</th>
              <th class="py-2 pr-4">Priority</th>
              <th class="py-2 pr-4">Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of decisions()" class="border-b">
              <td class="py-2 pr-4">{{ d.policyCode || d.policy_code }}</td>
              <td class="py-2 pr-4">{{ d.targetPackCode || d.target_pack_code }}</td>
              <td class="py-2 pr-4">
                <span [class]="(d.decisionStatus || d.decision_status) === 'selected' ? 'text-green-700' : 'text-gray-400'">
                  {{ d.decisionStatus || d.decision_status }}
                </span>
              </td>
              <td class="py-2 pr-4">{{ d.matched ? 'Yes' : 'No' }}</td>
              <td class="py-2 pr-4">{{ d.priority }}</td>
              <td class="py-2 pr-4 max-w-xs truncate">{{ d.rationale }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="provisionResult()" class="border rounded-2xl bg-white p-4">
        <div class="font-semibold mb-3">Provisioning Result</div>
        <pre class="text-xs whitespace-pre-wrap">{{ provisionResult() | json }}</pre>
      </div>
    </div>
  `
})
export class PackPolicyReviewPageComponent {
  private policyApi = inject(PackPolicyApiService);
  private orchApi = inject(ProvisioningOrchestratorApiService);

  sessionId = '';
  tenantId = '';
  readonly loading = signal(false);
  readonly selectedPacks = signal<Record<string, unknown>[]>([]);
  readonly decisions = signal<Record<string, unknown>[]>([]);
  readonly provisionResult = signal<GrcRecord | null>(null);

  async evaluate() {
    if (!this.sessionId) return;
    this.loading.set(true);
    try {
      const result: Record<string, unknown> = await firstValueFrom(this.policyApi.evaluate(this.sessionId));
      this.selectedPacks.set(result?.selectedPacks ?? []);
      this.decisions.set(result?.decisions ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async provision() {
    if (!this.sessionId || !this.tenantId) return;
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.orchApi.run({ sessionId: this.sessionId, tenantId: this.tenantId }));
      this.provisionResult.set(result);
    } finally {
      this.loading.set(false);
    }
  }

}
