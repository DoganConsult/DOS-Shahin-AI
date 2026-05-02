import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { environment } from '@env/environment';

/** Shape returned by GET /api/webhooks-manage */
interface Webhook {
  webhook_id: string;
  url: string;
  event_types: string[];
  secret_masked: string | null;
  active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

@Component({
    selector: 'app-webhook-manager',
    imports: [CommonModule, FormsModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Webhook Endpoints</h2>
        <button (click)="showCreate = !showCreate"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {{ showCreate ? 'Cancel' : '+ New Webhook' }}
        </button>
      </div>

      <!-- Create form -->
      <div *ngIf="showCreate" class="mb-4 p-4 border rounded bg-gray-50">
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-sm font-medium">URL</label>
            <input [(ngModel)]="newUrl" type="url" placeholder="https://..."
                   class="w-full border rounded p-2 mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium">Event Types (comma-separated)</label>
            <input [(ngModel)]="newEventTypes"
                   placeholder="process_task.created, evidence_request.created"
                   class="w-full border rounded p-2 mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium">Secret (optional)</label>
            <input [(ngModel)]="newSecret" type="password" placeholder="Signing secret"
                   class="w-full border rounded p-2 mt-1" />
          </div>
          <button (click)="create()"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-fit">
            Create
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="text-center py-8">Loading webhooks...</div>

      <table *ngIf="!loading() && webhooks().length" class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b bg-gray-100">
            <th class="text-left p-2">URL</th>
            <th class="text-left p-2">Events</th>
            <th class="text-left p-2">Status</th>
            <th class="text-left p-2">Last Triggered</th>
            <th class="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let w of webhooks()" class="border-b hover:bg-gray-50">
            <td class="p-2 font-mono text-xs max-w-xs truncate">{{ w.url }}</td>
            <td class="p-2 text-xs">{{ w.event_types?.join(', ') }}</td>
            <td class="p-2">
              <span [class]="w.active ? 'text-green-600' : 'text-gray-400'">
                {{ w.active ? 'Active' : 'Inactive' }}
              </span>
              <span *ngIf="w.failure_count > 0" class="ml-2 text-red-500 text-xs">
                ({{ w.failure_count }} failures)
              </span>
            </td>
            <td class="p-2 text-xs">
              {{ w.last_triggered_at ? (w.last_triggered_at | date:'short') : '\u2014' }}
            </td>
            <td class="p-2 space-x-2">
              <button (click)="test(w.webhook_id)" class="text-blue-600 hover:underline">Test</button>
              <button (click)="remove(w.webhook_id)" class="text-red-600 hover:underline">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading() && !webhooks().length" class="text-center py-8 text-gray-500">
        No webhook endpoints configured.
      </div>
    </div>
    <p-confirmDialog />
  `
})
export class WebhookManagerComponent implements OnInit {
  private http = inject(HttpClient);
  private confirmationService = inject(ConfirmationService);

  webhooks = signal<Webhook[]>([]);
  loading = signal(true);
  showCreate = false;
  newUrl = '';
  newEventTypes = '';
  newSecret = '';

  ngOnInit(): void {
    this.loadWebhooks();
  }

  /** Fetch all webhook endpoints for the current tenant. */
  loadWebhooks(): void {
    this.loading.set(true);
    this.http.get<{ webhooks: Webhook[] }>(`${environment.apiUrl}/webhooks-manage`).subscribe({
      next: (res) => { this.webhooks.set(res.webhooks); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  /** Create a new webhook endpoint from the form values. */
  create(): void {
    if (!this.newUrl) return;
    const event_types = this.newEventTypes.split(',').map(s => s.trim()).filter(Boolean);
    this.http.post(`${environment.apiUrl}/webhooks-manage`, {
      url: this.newUrl,
      event_types,
      secret: this.newSecret || undefined,
    }).subscribe({
      next: () => {
        this.showCreate = false;
        this.newUrl = '';
        this.newEventTypes = '';
        this.newSecret = '';
        this.loadWebhooks();
      },
    });
  }

  /** Send a test ping to the given webhook and alert the user with the result. */
  test(id: string): void {
    this.http.post<{ success: boolean }>(`${environment.apiUrl}/webhooks-manage/${id}/test`, {}).subscribe({
      next: (res) => alert(res.success ? 'Webhook responded successfully' : 'Webhook test failed'),
    });
  }

  /** Soft-delete a webhook endpoint after user confirmation. */
  remove(id: string): void {
    this.confirmationService.confirm({
      message: 'Delete this webhook?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`${environment.apiUrl}/webhooks-manage/${id}`).subscribe({
          next: () => this.loadWebhooks(),
        });
      },
    });
  }
}
