/**
 * Governance Framework Grid — Dumb sub-component
 * Renders the two-column layout with Recent Policies table and Open Actions table,
 * plus the Upcoming Events strip, Board Attention Items, Ownership Gaps,
 * Leadership OS KPIs, and Cross-Module Links sections.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcRecord } from '@app/core/models/shared.types';

export interface PolicyRow { title: string; status: string; version: number; next_review_date?: string; }
export interface ActionRow { title: string; status: string; deadline?: string; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-framework-grid',
    imports: [CommonModule, TableModule, StatusBadgeComponent, EmptyStateComponent, AppDatePipe, DatePipe],
    template: `
    <div class="gov-ov-two-col">
      <!-- Recent Policies -->
      <div class="gov-ov-col">
        <div class="gov-section-header">
          <span class="gov-section-title"><i class="pi pi-file" aria-hidden="true"></i> {{ i18n.translate('Recent Policies') }}</span>
          <a class="gov-link" [attr.href]="null" (click)="navigate.emit('/governance/policies')">{{ i18n.translate('View all') }} <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
        </div>
        @if (recentPolicies.length > 0) {
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
            [value]="recentPolicies" styleClass="p-datatable-sm p-datatable-striped" [tableStyle]="{'min-width':'100%'}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Title') }}</th>
                <th>{{ i18n.translate('Status') }}</th>
                <th>{{ i18n.translate('Ver.') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr class="clickable-row" (click)="navigate.emit('/governance/policies')" tabindex="0" (keyup.enter)="navigate.emit('/governance/policies')">
                <td class="policy-title">{{ p.title }}</td>
                <td><app-status-badge [status]="p.status" /></td>
                <td class="policy-ver">v{{ p.version || 1 }}</td>
              </tr>
            </ng-template>
          </p-table>
        } @else {
          <app-empty-state variant="default" [title]="i18n.translate('No policies yet')" [description]="i18n.translate('Start by creating your first policy')" [actionLabel]="i18n.translate('Create Policy')" [dir]="dir" (action)="navigate.emit('/governance/policies')" />
        }
      </div>

      <!-- Open Actions -->
      <div class="gov-ov-col">
        <div class="gov-section-header">
          <span class="gov-section-title"><i class="pi pi-bolt" aria-hidden="true"></i> {{ i18n.translate('Open Actions') }}</span>
          <a class="gov-link" [attr.href]="null" (click)="navigate.emit('/governance/actions')">{{ i18n.translate('View all') }} <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
        </div>
        @if (recentActions.length > 0) {
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
            [value]="recentActions" styleClass="p-datatable-sm p-datatable-striped" [tableStyle]="{'min-width':'100%'}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Title') }}</th>
                <th>{{ i18n.translate('Status') }}</th>
                <th>{{ i18n.translate('Due') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr class="clickable-row" [class.row-overdue]="isOverdue(a.deadline)" (click)="navigate.emit('/governance/actions')" tabindex="0" (keyup.enter)="navigate.emit('/governance/actions')">
                <td class="action-title">{{ a.title }}</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td class="action-deadline" [class.text-danger]="isOverdue(a.deadline)">{{ a.deadline | appDate:'medium' }}</td>
              </tr>
            </ng-template>
          </p-table>
        } @else {
          <app-empty-state variant="success" [title]="i18n.translate('No open actions')" [description]="i18n.translate('All actions are completed')" [dir]="dir" />
        }
      </div>
    </div>

    <!-- Upcoming Events Strip -->
    @if (upcomingEvents.length > 0) {
      <div class="upcoming-strip">
        <div class="upcoming-header"><i class="pi pi-calendar-clock"></i><span>{{ i18n.translate('Upcoming Events') }}</span></div>
        <div class="upcoming-list">
          @for (ev of upcomingEvents; track ev.id) {
            <div tabindex="0" role="button" (keyup.enter)="navigate.emit(ev.route)" class="upcoming-item" (click)="navigate.emit(ev.route)">
              <div class="upcoming-icon" [ngClass]="'ev-' + ev.type">
                <i class="pi" [ngClass]="ev.type === 'meeting' ? 'pi-users' : ev.type === 'review' ? 'pi-file' : 'pi-shield'"></i>
              </div>
              <div class="upcoming-body">
                <span class="upcoming-title">{{ i18n.localize(ev.titleEn, ev.titleAr) }}</span>
                <span class="upcoming-date">{{ ev.date | date:'EEE, MMM d' }}</span>
              </div>
              <div class="upcoming-days" [class.ev-urgent]="ev.daysLeft <= 3">
                {{ ev.daysLeft === 0 ? (i18n.translate('Today')) : ev.daysLeft + (i18n.translate('d')) }}
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Board Attention Items -->
    @if (boardAttentionItems.length > 0) {
      <div class="board-attention-section">
        <div class="gov-section-header">
          <span class="gov-section-title"><i class="pi pi-exclamation-circle" aria-hidden="true" style="color:var(--error)"></i> {{ i18n.translate('Board Attention Items') }}</span>
          <a class="gov-link" [attr.href]="null" (click)="navigate.emit('/governance/board-packs')">{{ i18n.translate('View all') }} <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
        </div>
        <div class="board-items-list">
          @for (item of boardAttentionItems; track item.action_id) {
            <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/governance/actions')" class="board-item" (click)="navigate.emit('/governance/actions')">
              <div class="board-item-priority" [class]="'bp-' + item.priority">{{ item.priority }}</div>
              <div class="board-item-body">
                <span class="board-item-title">{{ item.title_en }}</span>
                <span class="board-item-source">{{ item.source_type }} &middot; {{ item.created_at | appDate:'medium' }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Ownership Gaps -->
    @if (ownershipGaps.length > 0) {
      <div class="ownership-gaps-section">
        <div class="gov-section-header">
          <span class="gov-section-title"><i class="pi pi-user-minus" aria-hidden="true" style="color:var(--warning)"></i> {{ i18n.translate('Ownership Gaps') }}</span>
        </div>
        <div class="ownership-gap-list">
          @for (gap of ownershipGaps; track gap.id) {
            <div tabindex="0" role="button" (keyup.enter)="navigate.emit(gap.route)" class="gap-item" (click)="navigate.emit(gap.route)">
              <i class="pi pi-exclamation-triangle" style="color:var(--warning)"></i>
              <span class="gap-desc">{{ i18n.localize(gap.descEn, gap.descAr) }}</span>
              <span class="gap-count">{{ gap.count }}</span>
            </div>
          }
        </div>
      </div>
    }

    <!-- Leadership Layer -->
    @if (leadershipData) {
      <div class="leadership-section">
        <div class="gov-section-header">
          <span class="gov-section-title"><i class="pi pi-crown" aria-hidden="true" style="color:var(--primary)"></i> {{ i18n.translate('Leadership OS') }}</span>
        </div>
        <div class="leadership-kpis">
          <div class="ldr-kpi"><div class="ldr-kpi-value">{{ leadershipData?.milestones?.total ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('Milestones') }}</div></div>
          <div class="ldr-kpi"><div class="ldr-kpi-value" style="color:var(--success)">{{ leadershipData?.milestones?.completed ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('Completed') }}</div></div>
          <div class="ldr-kpi"><div class="ldr-kpi-value" style="color:var(--error)">{{ leadershipData?.milestones?.blocked ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('Blocked') }}</div></div>
          <div class="ldr-kpi"><div class="ldr-kpi-value" style="color:var(--warning)">{{ leadershipData?.milestones?.atRisk ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('At Risk') }}</div></div>
          <div class="ldr-kpi"><div class="ldr-kpi-value" style="color:var(--info)">{{ leadershipData?.initiatives?.recentRuns ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('Initiatives') }}</div></div>
          <div class="ldr-kpi"><div class="ldr-kpi-value">{{ leadershipData?.expertPacks ?? 0 }}</div><div class="ldr-kpi-label">{{ i18n.translate('Expert Packs') }}</div></div>
        </div>
      </div>
    }

    <!-- Cross-Module Links -->
    <div class="cross-module-section">
      <div class="gov-section-header">
        <span class="gov-section-title"><i class="pi pi-link" aria-hidden="true"></i> {{ i18n.translate('Cross-Module Hooks') }}</span>
      </div>
      <div class="cross-links-grid">
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/risk')" class="cross-link-card" (click)="navigate.emit('/risk')"><i class="pi pi-shield"></i><span>{{ i18n.translate('Risk Register') }}</span><small>{{ i18n.translate('Risks without committee review') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/compliance/overview')" class="cross-link-card" (click)="navigate.emit('/compliance/overview')"><i class="pi pi-check-circle"></i><span>{{ i18n.translate('Compliance') }}</span><small>{{ i18n.translate('Obligations lacking policies') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/compliance/controls')" class="cross-link-card" (click)="navigate.emit('/compliance/controls')"><i class="pi pi-lock"></i><span>{{ i18n.translate('Controls') }}</span><small>{{ i18n.translate('Controls lacking owner') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/foundation/evidence')" class="cross-link-card" (click)="navigate.emit('/foundation/evidence')"><i class="pi pi-folder-open"></i><span>{{ i18n.translate('Evidence') }}</span><small>{{ i18n.translate('Stale evidence impacting health') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/audit')" class="cross-link-card" (click)="navigate.emit('/audit')"><i class="pi pi-search"></i><span>{{ i18n.translate('Audit') }}</span><small>{{ i18n.translate('Overdue findings not escalated') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/incidents')" class="cross-link-card" (click)="navigate.emit('/incidents')"><i class="pi pi-bell"></i><span>{{ i18n.translate('Incidents') }}</span><small>{{ i18n.translate('Major incidents awaiting attention') }}</small></div>
        <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/qiyas')" class="cross-link-card" (click)="navigate.emit('/qiyas')"><i class="pi pi-chart-bar"></i><span>{{ i18n.translate('Qiyas') }}</span><small>{{ i18n.translate('Governance maturity score') }}</small></div>
      </div>
    </div>
  `,
    styles: [`
    .gov-ov-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .gov-ov-col { background: var(--surface-card, #fff); border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .gov-section-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid var(--border-subtle, var(--surface-ice)); }
    .gov-section-title { display: inline-flex; align-items: center; gap: 7px; font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .gov-section-title .pi { color: var(--primary-600, #2563eb); }
    .gov-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-600, #2563eb); cursor: pointer; text-decoration: none; }
    .gov-link:hover { text-decoration: underline; }
    .gov-link .pi { font-size: var(--font-size-xs); }
    [dir="rtl"] .gov-link .pi { transform: scaleX(-1); }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: var(--surface-50, var(--surface-ice)); }
    .clickable-row:focus-visible td { outline: 2px solid var(--primary-200, #bfdbfe); }
    .row-overdue td { background: var(--status-danger-bg, #fff1f1); }
    .policy-title { font-weight: 600; font-size: var(--font-size-sm); }
    .policy-ver { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .action-title { font-weight: 600; font-size: var(--font-size-sm); }
    .action-deadline { font-size: var(--font-size-sm); }
    .text-danger { color: var(--error); font-weight: 600; }

    .upcoming-strip { background: var(--surface-card,#fff); border: 1px solid var(--border-subtle,var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .upcoming-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle,var(--surface-ice)); font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading,var(--text-heading)); }
    .upcoming-header .pi { color: var(--primary-600,#2563eb); }
    .upcoming-list { display: flex; flex-direction: column; }
    .upcoming-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-subtle,var(--surface-ice)); transition: background 150ms; }
    .upcoming-item:last-child { border-bottom: none; }
    .upcoming-item:hover { background: var(--surface-50,var(--surface-ice)); }
    .upcoming-icon { width: 32px; height: 32px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-base); flex-shrink: 0; }
    .ev-review { background: #dbeafe; color: #1d4ed8; }
    .ev-expiry { background: #ffedd5; color: var(--warning); }
    .ev-meeting { background: #d1fae5; color: var(--success); }
    .upcoming-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .upcoming-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading,var(--text-heading)); }
    .upcoming-date { font-size: var(--font-size-xs); color: var(--text-muted,var(--text-muted)); }
    .upcoming-days { font-size: var(--font-size-sm); font-weight: 700; color: var(--primary-600,#2563eb); min-width: 30px; text-align: end; }
    .ev-urgent { color: var(--error); }

    .board-attention-section, .ownership-gaps-section, .cross-module-section, .leadership-section {
      background: var(--surface-card, #fff); border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden;
    }
    .board-items-list { display: flex; flex-direction: column; }
    .board-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-subtle, var(--surface-ice)); transition: background 150ms; }
    .board-item:last-child { border-bottom: none; }
    .board-item:hover { background: var(--surface-50, var(--surface-ice)); }
    .board-item-priority { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: var(--radius-xs); }
    .bp-critical { background: #fee2e2; color: var(--error); }
    .bp-high { background: #ffedd5; color: var(--warning); }
    .bp-medium { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .board-item-body { display: flex; flex-direction: column; gap: 2px; }
    .board-item-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, var(--text-heading)); }
    .board-item-source { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }

    .ownership-gap-list { display: flex; flex-direction: column; }
    .gap-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-subtle, var(--surface-ice)); transition: background 150ms; }
    .gap-item:last-child { border-bottom: none; }
    .gap-item:hover { background: var(--surface-50, var(--surface-ice)); }
    .gap-desc { flex: 1; font-size: var(--font-size-sm); }
    .gap-count { font-size: var(--font-size-md); font-weight: 700; color: var(--warning); }

    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 12px 16px; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 14px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-ground, var(--surface-ice)); cursor: pointer; transition: all 0.15s; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-lg); color: var(--primary-500, var(--primary)); }
    .cross-link-card span { font-size: var(--font-size-sm); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }

    .leadership-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; padding: 14px 16px; }
    .ldr-kpi { text-align: center; padding: 10px 8px; border: 1px solid var(--border-subtle, var(--surface-ice)); border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); }
    .ldr-kpi-value { font-size: var(--font-size-xl, 1.5rem); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .ldr-kpi-label { font-size: var(--font-size-xs, 0.75rem); color: var(--text-muted, var(--text-muted)); font-weight: 500; margin-top: 2px; }

    @media (max-width: 1024px) { .gov-ov-two-col { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .leadership-kpis { grid-template-columns: repeat(3, 1fr); } }
  `]
})
export class GovernanceFrameworkGridComponent {
  readonly i18n = inject(I18nService);

  @Input() recentPolicies: PolicyRow[] = [];
  @Input() recentActions: ActionRow[] = [];
  @Input() upcomingEvents: GrcRecord[] = [];
  @Input() boardAttentionItems: GrcRecord[] = [];
  @Input() ownershipGaps: GrcRecord[] = [];
  @Input() leadershipData: GrcRecord | null = null;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  @Output() navigate = new EventEmitter<string>();

  isOverdue(deadline?: string): boolean {
    return !!deadline && new Date(deadline) < new Date();
  }
}
