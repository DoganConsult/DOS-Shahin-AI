import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProvisioningOrchestratorApiService } from '../../core/provisioning/provisioning-orchestrator.api.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-provisioning-orchestrator-page',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-3xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">Provisioning Orchestrator</h1>
        <p class="text-sm text-gray-500">
          Run onboarding-driven pack installation and tenant activation.
        </p>
      </div>

      <div class="border rounded-2xl bg-white p-4 space-y-4">
        <label class="block">
          <div class="mb-1 text-sm">Session ID</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="sessionId" />
        </label>

        <label class="block">
          <div class="mb-1 text-sm">Tenant ID</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="tenantId" />
        </label>

        <button
          class="rounded px-4 py-2 bg-black text-white"
          (click)="run()"
          [disabled]="loading()"
        >
          {{ loading() ? 'Running...' : 'Run Orchestrator' }}
        </button>
      </div>

      <div *ngIf="result()" class="border rounded-2xl bg-white p-4">
        <div class="font-semibold mb-3">Result</div>
        <pre class="text-xs whitespace-pre-wrap">{{ result() | json }}</pre>
      </div>
    </div>
  `
})
export class ProvisioningOrchestratorPageComponent {
  private api = inject(ProvisioningOrchestratorApiService);

  sessionId = '';
  tenantId = '';

  readonly loading = signal(false);
  readonly result = signal<GrcRecord | null>(null);

  async run() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.run({
          sessionId: this.sessionId,
          tenantId: this.tenantId || undefined,
        })
      );
      this.result.set(res);
    } finally {
      this.loading.set(false);
    }
  }
}
