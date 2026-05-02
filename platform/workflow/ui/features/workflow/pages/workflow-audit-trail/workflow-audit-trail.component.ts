/**
 * WorkflowAuditTrailComponent — Timeline view of workflow events.
 *
 * Displays workflow events grouped by instance, with filters for event type
 * and module code. Queries GET /api/module-workflows/events.
 */

import {
  Component, OnInit, signal, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleWorkflowService, WorkflowEvent } from '@app/modules';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

interface GroupedEvents {
  instanceId: string;
  events: WorkflowEvent[];
}

@Component({
    selector: 'app-workflow-audit-trail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DatePipe, FormsModule],
    template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-xl font-bold text-[var(--text-0)]">
          {{ i18n.isAr ? 'سجل تدقيق سير العمل' : 'Workflow Audit Trail' }}
        </h1>
        <p class="text-sm text-[var(--text-1)] mt-1">
          {{ i18n.isAr ? 'عرض الجدول الزمني لأحداث سير العمل' : 'Timeline view of workflow events' }}
        </p>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-1)]">
            {{ i18n.isAr ? 'الوحدة' : 'Module' }}
          </label>
          <select [(ngModel)]="filterModule"
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-1.5 text-sm text-[var(--text-0)]">
            <option value="">{{ i18n.isAr ? 'الكل' : 'All' }}</option>
            @for (mod of moduleOptions; track mod) {
              <option [value]="mod">{{ mod }}</option>
            }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-1)]">
            {{ i18n.isAr ? 'نوع الحدث' : 'Event Type' }}
          </label>
          <select [(ngModel)]="filterEventType"
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-1.5 text-sm text-[var(--text-0)]">
            <option value="">{{ i18n.isAr ? 'الكل' : 'All' }}</option>
            @for (et of eventTypeOptions; track et) {
              <option [value]="et">{{ et }}</option>
            }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-1)]">
            {{ i18n.isAr ? 'معرف النسخة' : 'Instance ID' }}
          </label>
          <input type="text" [(ngModel)]="filterInstanceId"
            placeholder="Optional..."
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-1.5 text-sm text-[var(--text-0)] w-48" />
        </div>
        <button type="button"
          (click)="applyFilter()"
          class="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {{ i18n.isAr ? 'تطبيق' : 'Apply' }}
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="text-center py-8 text-sm text-[var(--text-1)]">Loading...</div>
      }

      <!-- Grouped Events -->
      @if (!loading() && groups().length === 0) {
        <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-8 text-center">
          <p class="text-sm text-[var(--text-1)] italic">
            {{ i18n.isAr ? 'لا توجد أحداث' : 'No workflow events found' }}
          </p>
        </div>
      }

      @for (group of groups(); track group.instanceId) {
        <section class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
          <div class="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-0)] flex items-center justify-between">
            <h3 class="text-sm font-semibold text-[var(--text-0)]">
              {{ i18n.isAr ? 'نسخة' : 'Instance' }}: {{ group.instanceId | slice:0:12 }}...
            </h3>
            <span class="text-xs text-[var(--text-1)]">{{ group.events.length }} {{ i18n.isAr ? 'أحداث' : 'events' }}</span>
          </div>

          <!-- Timeline -->
          <div class="px-5 py-4">
            <div class="relative pl-6 space-y-4">
              <!-- Timeline line -->
              <div class="absolute left-[9px] top-0 bottom-0 w-0.5 bg-[var(--border)]"></div>

              @for (evt of group.events; track evt.event_id) {
                <div class="relative">
                  <!-- Timeline dot -->
                  <div class="absolute -left-6 top-1 w-[14px] h-[14px] rounded-full border-2"
                    [class]="eventDotClass(evt.event_type)">
                  </div>

                  <div class="pb-1">
                    <div class="flex items-center gap-2">
                      <span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        [class]="eventBadgeClass(evt.event_type)">
                        {{ evt.event_type }}
                      </span>
                      @if (evt.step_id) {
                        <span class="text-xs text-[var(--text-1)]">Step: {{ evt.step_id }}</span>
                      }
                    </div>
                    <div class="mt-1 flex items-center gap-3 text-xs text-[var(--text-1)]">
                      <span>{{ evt.occurred_at | date:'medium' }}</span>
                      <span>{{ i18n.isAr ? 'بواسطة' : 'by' }} {{ evt.triggered_by | slice:0:12 }}</span>
                    </div>
                    @if (evt.payload && hasPayloadContent(evt.payload)) {
                      <div class="mt-1 text-xs text-[var(--text-1)] bg-[var(--bg-0)] rounded p-2 font-mono max-w-lg truncate">
                        {{ summarizePayload(evt.payload) }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `
})
export class WorkflowAuditTrailComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly wfService = inject(ModuleWorkflowService);

  groups = signal<GroupedEvents[]>([]);
  loading = signal(false);

  filterModule = '';
  filterEventType = '';
  filterInstanceId = '';

  readonly moduleOptions = [
    'risk', 'compliance', 'governance', 'audit', 'evidence',
    'incident', 'vendor', 'policy', 'workflow',
  ];

  readonly eventTypeOptions = [
    'started', 'step_entered', 'task_created', 'task_assigned',
    'task_completed', 'approved', 'rejected', 'escalated',
    'completed', 'cancelled', 'reassigned',
  ];

  ngOnInit(): void {
    this.loadEvents();
  }

  applyFilter(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.loading.set(true);
    const opts: Record<string, string> = { limit: '500' };
    if (this.filterInstanceId) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.filterInstanceId)) {
        opts.instanceId = this.filterInstanceId;
      } else {
        this.groups.set([]);
        this.loading.set(false);
        return;
      }
    }
    if (this.filterModule) opts.moduleCode = this.filterModule;

    this.wfService.getWorkflowEvents(opts).subscribe({
      next: (events) => {
        let filtered = events;
        if (this.filterEventType) {
          filtered = filtered.filter(e => e.event_type === this.filterEventType);
        }

        // Group by instance_id
        const map = new Map<string, WorkflowEvent[]>();
        for (const evt of filtered) {
          const key = evt.instance_id || 'unknown';
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(evt);
        }

        const grouped: GroupedEvents[] = [];
        for (const [instanceId, evts] of map) {
          grouped.push({ instanceId, events: evts });
        }

        this.groups.set(grouped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  eventDotClass(type: string): string {
    if (type === 'completed') return 'bg-[var(--success)] border-[var(--success)]';
    if (type === 'failed' || type === 'cancelled') return 'bg-[var(--danger)] border-[var(--danger)]';
    if (type === 'escalated' || type === 'rejected') return 'bg-[var(--warning)] border-[var(--warning)]';
    return 'bg-[var(--info)] border-[var(--info)]';
  }

  eventBadgeClass(type: string): string {
    if (type === 'completed') return 'bg-[var(--success)]/20 text-[var(--success)]';
    if (type === 'failed' || type === 'cancelled') return 'bg-[var(--danger)]/20 text-[var(--danger)]';
    if (type === 'escalated' || type === 'rejected') return 'bg-[var(--warning)]/20 text-[var(--warning)]';
    return 'bg-[var(--info)]/20 text-[var(--info)]';
  }

  hasPayloadContent(payload: Record<string, any>): boolean {
    return payload && Object.keys(payload).length > 0;
  }

  summarizePayload(payload: Record<string, any>): string {
    try {
      const str = JSON.stringify(payload);
      return str.length > 120 ? str.substring(0, 120) + '...' : str;
    } catch {
      return '{}';
    }
  }
}
