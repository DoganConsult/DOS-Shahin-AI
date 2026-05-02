// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ButtonModule, DropdownModule, PlaceholderModule, TableModule, TabsModule, TagModule } from 'carbon-components-angular';

interface WorkQueueItem {
  id: string;
  type: 'evidence' | 'assessment' | 'approval' | 'remediation' | 'exception' | 'change';
  title: string;
  obligationRef?: string;
  owner?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  frameworkName?: string;
  entityId?: string;
}

@Component({
    selector: 'app-compliance-work-queue-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, RouterModule, TabsModule, TagModule,
        ButtonModule, TableModule, PlaceholderModule, DropdownModule,
        EmptyStateComponent, PageHeaderComponent,
    ],
    template: `
    <app-page-header titleEn="Work Queue" titleAr="قائمة المهام" icon="pi-inbox"
                     subtitleEn="Daily compliance operations" subtitleAr="عمليات الالتزام اليومية" />

    <!-- KPI Summary -->
    <section class="queue-kpi">
      <div class="kpi-chip" (click)="activeTab = 0">
        <span class="kpi-val">{{ allItems().length }}</span>
        <span class="kpi-lbl">All</span>
      </div>
      <div class="kpi-chip evidence" (click)="activeTab = 1">
        <span class="kpi-val">{{ countByType('evidence') }}</span>
        <span class="kpi-lbl">Evidence Pending</span>
      </div>
      <div class="kpi-chip assessment" (click)="activeTab = 2">
        <span class="kpi-val">{{ countByType('assessment') }}</span>
        <span class="kpi-lbl">Assessments Due</span>
      </div>
      <div class="kpi-chip approval" (click)="activeTab = 3">
        <span class="kpi-val">{{ countByType('approval') }}</span>
        <span class="kpi-lbl">Approvals</span>
      </div>
      <div class="kpi-chip remediation" (click)="activeTab = 4">
        <span class="kpi-val">{{ countByType('remediation') }}</span>
        <span class="kpi-lbl">Overdue Remediation</span>
      </div>
      <div class="kpi-chip exception" (click)="activeTab = 5">
        <span class="kpi-val">{{ countByType('exception') }}</span>
        <span class="kpi-lbl">Expiring Exceptions</span>
      </div>
      <div class="kpi-chip change" (click)="activeTab = 6">
        <span class="kpi-val">{{ countByType('change') }}</span>
        <span class="kpi-lbl">Changes</span>
      </div>
    </section>

    @if (loading()) {
      <cds-placeholder></cds-placeholder>
    } @else {
      <cds-tabs [(activeIndex)]="activeTab" [scrollable]="true">
        <cds-tab header="All ({{ allItems().length }})">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: allItems() }" />
        </cds-tab>
        <cds-tab header="Evidence Pending">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('evidence') }" />
        </cds-tab>
        <cds-tab header="Assessments Due">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('assessment') }" />
        </cds-tab>
        <cds-tab header="Approvals Pending">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('approval') }" />
        </cds-tab>
        <cds-tab header="Overdue Remediation">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('remediation') }" />
        </cds-tab>
        <cds-tab header="Expiring Exceptions">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('exception') }" />
        </cds-tab>
        <cds-tab header="Changes Awaiting Triage">
          <ng-container *ngTemplateOutlet="queueTable; context: { $implicit: itemsByType('change') }" />
        </cds-tab>
      </cds-tabs>
    }

    <ng-template #queueTable let-items>
      @if (items.length) {
        <table cdsTable [value]="items" [paginator]="items.length > 25" [rows]="25"
                 [rowsPerPageOptions]="[10, 25, 50]" styleClass="p-datatable-sm p-datatable-striped"
                 (onRowSelect)="onRowClick($event.data)">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:100px">Type</th>
              <th>Title</th>
              <th>Obligation</th>
              <th>Owner</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Framework</th>
              <th style="width:80px">Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr class="cursor-pointer" (click)="onRowClick(item)">
              <td><cds-tag [value]="item.type" [severity]="typeSeverity(item.type)" /></td>
              <td>{{ item.title }}</td>
              <td>{{ item.obligationRef || '—' }}</td>
              <td>{{ item.owner || '—' }}</td>
              <td [class.overdue]="isOverdue(item.dueDate)">{{ item.dueDate ? (item.dueDate | date:'mediumDate') : '—' }}</td>
              <td><cds-tag *ngIf="item.priority" [value]="item.priority" [severity]="item.priority === 'critical' || item.priority === 'high' ? 'danger' : 'info'" /></td>
              <td>{{ item.status || '—' }}</td>
              <td>{{ item.frameworkName || '—' }}</td>
              <td><button cdsButton icon="" class=" " (click)="onRowClick(item); $event.stopPropagation()"></button></td>
            </tr>
          </ng-template>
        </table>
      } @else {
        <app-empty-state variant="info" titleEn="No items in this queue" titleAr="لا توجد عناصر" />
      }
    </ng-template>
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }

    .queue-kpi {
      display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0;
    }
    .kpi-chip {
      display: flex; flex-direction: column; align-items: center; padding: 10px 16px;
      border-radius: var(--radius); cursor: pointer; border: 1px solid var(--border, #e2e8f0);
      background: var(--bg-0, #fff); transition: border-color 0.15s, box-shadow 0.15s; min-width: 100px;
    }
    .kpi-chip:hover { border-color: var(--primary, #3b82f6); box-shadow: 0 0 0 1px var(--primary, #3b82f6); }
    .kpi-val { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-body, #1e293b); }
    .kpi-lbl { font-size: var(--font-size-xs); color: var(--text-muted, #64748b); text-align: center; }
    .kpi-chip.evidence { border-left: 3px solid var(--warning, #f59e0b); }
    .kpi-chip.assessment { border-left: 3px solid var(--info, #0ea5e9); }
    .kpi-chip.approval { border-left: 3px solid var(--primary, #3b82f6); }
    .kpi-chip.remediation { border-left: 3px solid var(--error, #dc2626); }
    .kpi-chip.exception { border-left: 3px solid var(--severity-medium, #8b5cf6); }
    .kpi-chip.change { border-left: 3px solid var(--success, #059669); }

    .cursor-pointer { cursor: pointer; }
    .overdue { color: var(--error, #dc2626); font-weight: 600; }
  `]
})
export class ComplianceWorkQueuePageComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly api = inject(ComplianceFeatureApiService);
  private readonly router = inject(Router);

  loading = signal(true);
  allItems = signal<WorkQueueItem[]>([]);
  activeTab = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    // Use unified backend work-queue endpoint (DB-driven aggregation)
    this.api.getWorkQueue(this.activeTab === 0 ? undefined : 'my').subscribe({
      next: (result) => {
        const items: WorkQueueItem[] = (result.items || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          type: (item.type as string) || 'remediation',
          title: (item.title as string) || '—',
          obligationRef: item.obligation_ref as string,
          owner: item.owner as string,
          dueDate: item.due_date as string,
          priority: item.priority as string,
          status: item.status as string,
          frameworkName: item.framework_id as string,
          entityId: item.id as string,
        }));
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: () => { this.allItems.set([]); this.loading.set(false); }
    });
  }

  countByType(type: string): number {
    return this.allItems().filter(i => i.type === type).length;
  }

  itemsByType(type: string): WorkQueueItem[] {
    return this.allItems().filter(i => i.type === type);
  }

  typeSeverity(type: string): string {
    const map: Record<string, string> = {
      evidence: 'warning', assessment: 'info', approval: 'info',
      remediation: 'danger', exception: 'warning', change: 'success',
    };
    return map[type] || 'info';
  }

  isOverdue(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  onRowClick(item: WorkQueueItem): void {
    switch (item.type) {
      case 'remediation': this.router.navigate(['/compliance/gaps'], { queryParams: { gapId: item.entityId } }); break;
      case 'change': this.router.navigate(['/compliance/regulatory-changes'], { queryParams: { changeId: item.entityId } }); break;
      case 'evidence': this.router.navigate(['/foundation/evidence'], { queryParams: { id: item.entityId } }); break;
      case 'assessment': this.router.navigate(['/compliance/assessments'], { queryParams: { id: item.entityId } }); break;
      case 'exception': this.router.navigate(['/compliance/exceptions'], { queryParams: { id: item.entityId } }); break;
      default: break;
    }
  }
}
