import { Component, inject, signal, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkItemsApiService, type WorkItemDto } from '../../services/work-items-api.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-work-items-inbox-page',
    imports: [AppDatePipe, FormsModule],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] p-4">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Work Items Inbox</h1>
          <p class="text-sm text-[var(--text-1)]">Workspace: {{ workspaceId() }}</p>
        </div>
        <div class="flex gap-2 items-center">
          <label for="module-filter" class="text-sm text-[var(--text-1)]">Module:</label>
          <select id="module-filter" [ngModel]="moduleFilter()" (ngModelChange)="onModuleFilterChange($event)"
                  class="rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-2 py-1 text-sm">
            <option value="">All modules</option>
            <option value="risk">Risk</option>
            <option value="compliance">Compliance</option>
            <option value="policy">Policy</option>
            <option value="evidence">Evidence</option>
            <option value="audit">Audit</option>
            <option value="incident">Incident</option>
            <option value="exception">Exception</option>
            <option value="governance">Governance</option>
            <option value="vendor">Vendor</option>
            <option value="bcp">BCP</option>
            <option value="asset">Asset</option>
            <option value="remediation">Remediation</option>
            <option value="action">Action</option>
            <option value="training">Training</option>
          </select>
        </div>
      </header>
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
        <table aria-label="Work Items Inbox table" class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--border)] bg-[var(--bg-2)]">
              <th class="text-left p-3 font-medium">Title</th>
              <th class="text-left p-3 font-medium">Status</th>
              <th class="text-left p-3 font-medium">Due</th>
              <th class="text-left p-3 font-medium">Source</th>
              <th class="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr class="border-b border-[var(--border)] hover:bg-[var(--bg-2)]">
                <td class="p-3">{{ item.title }}</td>
                <td class="p-3"><span class="rounded-full px-2 py-0.5 text-xs" [class]="statusClass(item.status)">{{ item.status }}</span></td>
                <td class="p-3">{{ item.dueDate ? (item.dueDate | appDate:'short') : '—' }}</td>
                <td class="p-3">{{ item.source }}{{ item.sourceId ? ' · ' + item.sourceId : '' }}</td>
                <td class="p-3 text-right">
                  @if (item.status !== 'completed' && item.status !== 'cancelled') {
                    <button type="button" (click)="complete(item)" class="px-2 py-1 rounded-lg bg-[var(--primary)] text-white text-xs">Complete</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="p-8 text-center text-[var(--text-1)]">No work items.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class WorkItemsInboxPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkItemsApiService);

  workspaceId = signal('');
  moduleFilter = signal('');
  items = signal<WorkItemDto[]>([]);

  ngOnInit(): void {
    const wid = this.route.snapshot.params['workspaceId'];
    this.workspaceId.set(wid ?? '');
    this.load();
  }

  onModuleFilterChange(moduleCode: string): void {
    this.moduleFilter.set(moduleCode);
    this.load();
  }

  private load(): void {
    this.api.list({
      workspaceId: this.workspaceId() || undefined,
      moduleCode: this.moduleFilter() || undefined,
      limit: 50,
    }).subscribe({
      next: (list) => this.items.set(list),
      error: () => this.items.set([]),
    });
  }

  statusClass(status: string): string {
    if (status === 'completed') return 'bg-[var(--success)]/20 text-[var(--success)]';
    if (status === 'pending') return 'bg-[var(--info)]/20 text-[var(--info)]';
    return 'bg-[var(--bg-2)] text-[var(--text-1)]';
  }

  complete(item: WorkItemDto): void {
    this.api.complete(item.id, 'Done').subscribe({
      next: () => this.load(),
      error: (err) => devError(err),
    });
  }
}
