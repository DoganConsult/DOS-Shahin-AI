// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ButtonModule, PlaceholderModule, TableModule, TabsModule, TagModule } from 'carbon-components-angular';

@Component({
    selector: 'app-compliance-evidence-ops-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, RouterModule, TabsModule, TagModule,
        ButtonModule, TableModule, PlaceholderModule,
        EmptyStateComponent, PageHeaderComponent,
    ],
    template: `
    <app-page-header titleEn="Evidence Operations" titleAr="عمليات الأدلة" icon="pi-folder-open"
                     subtitleEn="Track evidence requests, submissions, freshness, and quality"
                     subtitleAr="تتبع طلبات الأدلة والتقديمات والحداثة والجودة" />

    <!-- KPI Strip -->
    <section class="ev-kpi">
      <div class="ev-card"><span class="ev-val">{{ stats().totalRequests }}</span><span class="ev-lbl">Requests</span></div>
      <div class="ev-card"><span class="ev-val">{{ stats().totalSubmissions }}</span><span class="ev-lbl">Submissions</span></div>
      <div class="ev-card warn"><span class="ev-val">{{ stats().missing }}</span><span class="ev-lbl">Missing</span></div>
      <div class="ev-card danger"><span class="ev-val">{{ stats().expired }}</span><span class="ev-lbl">Expired</span></div>
      <div class="ev-card"><span class="ev-val">{{ stats().rejected }}</span><span class="ev-lbl">Rejected</span></div>
      <div class="ev-card success"><span class="ev-val">{{ stats().freshness }}%</span><span class="ev-lbl">Freshness</span></div>
    </section>

    @if (loading()) {
      <cds-placeholder></cds-placeholder>
    } @else {
      <cds-tabs [scrollable]="true">
        <!-- Requests -->
        <cds-tab header="Requests ({{ requests().length }})">
          @if (requests().length) {
            <table cdsTable [value]="requests()" [paginator]="requests().length > 20" [rows]="20" styleClass="p-datatable-sm">
              <ng-template pTemplate="header"><tr><th>Control</th><th>Evidence Type</th><th>Due Date</th><th>Status</th><th>Requested From</th></tr></ng-template>
              <ng-template pTemplate="body" let-r>
                <tr>
                  <td>{{ r.controlId || '—' }}</td>
                  <td>{{ r.evidenceType || '—' }}</td>
                  <td [class.overdue]="isOverdue(r.dueDate)">{{ r.dueDate ? (r.dueDate | date:'mediumDate') : '—' }}</td>
                  <td><cds-tag [value]="r.status" /></td>
                  <td>{{ r.requestedFrom || '—' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else { <app-empty-state variant="info" titleEn="No evidence requests" titleAr="لا توجد طلبات أدلة" /> }
        </cds-tab>

        <!-- Submissions -->
        <cds-tab header="Submissions ({{ submissions().length }})">
          @if (submissions().length) {
            <table cdsTable [value]="submissions()" [paginator]="submissions().length > 20" [rows]="20" styleClass="p-datatable-sm">
              <ng-template pTemplate="header"><tr><th>Title</th><th>Control</th><th>Submitted By</th><th>Status</th><th>Date</th></tr></ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td>{{ s.title || s.evidenceId || '—' }}</td>
                  <td>{{ s.controlId || '—' }}</td>
                  <td>{{ s.submittedBy || '—' }}</td>
                  <td><cds-tag [value]="s.status" [severity]="s.status === 'accepted' ? 'success' : s.status === 'rejected' ? 'danger' : 'info'" /></td>
                  <td>{{ s.submittedAt | date:'mediumDate' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else { <app-empty-state variant="info" titleEn="No submissions" titleAr="لا توجد تقديمات" /> }
        </cds-tab>

        <!-- Missing Evidence -->
        <cds-tab header="Missing ({{ missing().length }})">
          @if (missing().length) {
            <table cdsTable [value]="missing()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header"><tr><th>Control</th><th>Required Type</th><th>Obligation</th></tr></ng-template>
              <ng-template pTemplate="body" let-m>
                <tr><td>{{ m.controlId }}</td><td>{{ m.evidenceType }}</td><td>{{ m.obligationRef || '—' }}</td></tr>
              </ng-template>
            </table>
          } @else { <app-empty-state variant="info" titleEn="No missing evidence" titleAr="لا توجد أدلة مفقودة" /> }
        </cds-tab>

        <!-- Expired -->
        <cds-tab header="Expired ({{ expired().length }})">
          @if (expired().length) {
            <table cdsTable [value]="expired()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header"><tr><th>Title</th><th>Control</th><th>Expired On</th></tr></ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td>{{ e.title || e.evidenceId }}</td>
                  <td>{{ e.controlId || '—' }}</td>
                  <td class="overdue">{{ e.expiryDate | date:'mediumDate' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else { <app-empty-state variant="info" titleEn="No expired evidence" titleAr="لا توجد أدلة منتهية" /> }
        </cds-tab>
      </cds-tabs>
    }
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }
    .ev-kpi { display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0; }
    .ev-card {
      flex: 1; min-width: 110px; padding: 12px; text-align: center; border-radius: var(--radius);
      border: 1px solid var(--border, #e2e8f0); background: var(--bg-0, #fff);
    }
    .ev-card.warn { border-left: 3px solid var(--warning, #f59e0b); }
    .ev-card.danger { border-left: 3px solid var(--error, #dc2626); }
    .ev-card.success { border-left: 3px solid var(--success, #16a34a); }
    .ev-val { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-body, #1e293b); }
    .ev-lbl { font-size: var(--font-size-xs); color: var(--text-muted, #64748b); }
    .overdue { color: var(--error, #dc2626); font-weight: 600; }
  `]
})
export class ComplianceEvidenceOpsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);

  loading = signal(true);
  requests = signal<any[]>([]);
  submissions = signal<any[]>([]);
  missing = signal<any[]>([]);
  expired = signal<any[]>([]);
  stats = signal({ totalRequests: 0, totalSubmissions: 0, missing: 0, expired: 0, rejected: 0, freshness: 0 });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    // Load evidence data from evidence module endpoints
    Promise.allSettled([
      this.http.get<any>('/api/evidence/requests').toPromise(),
      this.http.get<any>('/api/evidence').toPromise(),
    ]).then(([reqResult, evResult]) => {
      const reqs = reqResult.status === 'fulfilled' ? (Array.isArray(reqResult.value) ? reqResult.value : reqResult.value?.items || []) : [];
      const evs = evResult.status === 'fulfilled' ? (Array.isArray(evResult.value) ? evResult.value : evResult.value?.items || []) : [];

      this.requests.set(reqs);
      this.submissions.set(evs.filter((e: Record<string, unknown>) => e.submitted_at || e.submittedAt));

      const now = new Date();
      const expiredItems = evs.filter((e: Record<string, unknown>) => {
        const exp = e.expiry_date || e.expiryDate;
        return exp && new Date(exp) < now;
      });
      this.expired.set(expiredItems);

      // Missing = requests without matching submissions
      const submittedControlIds = new Set(evs.map((e: Record<string, unknown>) => e.control_id || e.controlId));
      const missingItems = reqs.filter((r: Record<string, unknown>) => r.status === 'pending' || !submittedControlIds.has(r.control_id || r.controlId));
      this.missing.set(missingItems);

      const total = evs.length || 1;
      const fresh = evs.filter((e: Record<string, unknown>) => {
        const exp = e.expiry_date || e.expiryDate;
        return !exp || new Date(exp) > now;
      }).length;

      this.stats.set({
        totalRequests: reqs.length,
        totalSubmissions: evs.length,
        missing: missingItems.length,
        expired: expiredItems.length,
        rejected: evs.filter((e: Record<string, unknown>) => e.status === 'rejected').length,
        freshness: Math.round((fresh / total) * 100),
      });

      this.loading.set(false);
    });
  }

  isOverdue(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }
}
