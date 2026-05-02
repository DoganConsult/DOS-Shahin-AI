import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PackInstallerApiService } from '../../../../core/packs/pack-installer.api.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pack-installer-page',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-3xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">Pack Installer</h1>
        <p class="text-sm text-gray-500">
          Install AGRC, Qiyas, and government operating model packs into this tenant.
        </p>
      </div>

      <div class="border rounded-2xl bg-white p-4 space-y-4">
        <label class="block">
          <div class="mb-1 text-sm">Pack Code</div>
          <select class="w-full border rounded px-3 py-2" [(ngModel)]="packCode">
            <option value="agrc-core">agrc-core</option>
            <option value="qiyas-core">qiyas-core</option>
            <option value="nic-government-core">nic-government-core</option>
          </select>
        </label>

        <label class="block">
          <div class="mb-1 text-sm">Applies To Role</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="appliesToRole" placeholder="optional" aria-label="optional" />
        </label>

        <label class="block">
          <div class="mb-1 text-sm">Workspace ID</div>
          <input class="w-full border rounded px-3 py-2" [(ngModel)]="workspaceId" placeholder="optional" aria-label="optional" />
        </label>

        <button
          class="rounded px-4 py-2 bg-black text-white"
          (click)="install()"
          [disabled]="loading()"
        >
          {{ loading() ? 'Installing...' : 'Install Pack' }}
        </button>
      </div>

      <div *ngIf="result()" class="border rounded-2xl bg-white p-4">
        <div class="font-semibold mb-3">Result</div>
        <pre class="text-xs whitespace-pre-wrap">{{ result() | json }}</pre>
      </div>
    </div>
  `
})
export class PackInstallerPageComponent {
  private api = inject(PackInstallerApiService);

  packCode = 'agrc-core';
  appliesToRole = '';
  workspaceId = '';

  readonly loading = signal(false);
  readonly result = signal<GrcRecord | null>(null);

  async install() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.installPack({
          packCode: this.packCode,
          appliesToRole: this.appliesToRole || null,
          workspaceId: this.workspaceId || null,
        })
      );
      this.result.set(res);
    } finally {
      this.loading.set(false);
    }
  }
}
