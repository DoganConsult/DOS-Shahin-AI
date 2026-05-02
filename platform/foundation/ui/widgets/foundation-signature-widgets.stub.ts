/**
 * Foundation G1/G2/G7 signature widgets — real implementations.
 * Each widget fetches live data from the Foundation API service and renders
 * it with IBM Carbon design tokens.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoundationApiService } from '../services/foundation-api.service';

const CARD_STYLES = `
  :host { display: block; }
  .fw-card {
    padding: 1rem 1.25rem;
    border: 1px solid var(--cds-border-subtle-01, #c6c6c6);
    border-radius: 8px;
    background: var(--cds-layer-02, #fff);
    font-size: 13px;
  }
  .fw-title { margin: 0 0 .75rem; font-weight: 600; font-size: 14px; color: var(--cds-text-primary, #161616); }
  .fw-row { display: flex; align-items: center; justify-content: space-between; padding: .35rem 0; border-bottom: 1px solid var(--cds-border-subtle-00, #e0e0e0); }
  .fw-row:last-child { border-bottom: none; }
  .fw-label { color: var(--cds-text-secondary, #525252); }
  .fw-value { font-weight: 600; color: var(--cds-text-primary, #161616); }
  .fw-badge { padding: .15rem .5rem; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .fw-badge.warn  { background: var(--cds-support-warning-background, #fff8e1); color: var(--cds-support-warning, #f1c21b); }
  .fw-badge.error { background: var(--cds-support-error-background, #fff1f1); color: var(--cds-support-error, #da1e28); }
  .fw-badge.ok    { background: var(--cds-support-success-background, #defbe6); color: var(--cds-support-success, #24a148); }
  .fw-empty { color: var(--cds-text-placeholder, #a8a8a8); font-style: italic; font-size: 12px; }
  .fw-loading { color: var(--cds-text-placeholder, #a8a8a8); font-size: 12px; }
  .fw-kpi { font-size: 28px; font-weight: 700; color: var(--cds-interactive, #0f62fe); margin: .25rem 0; }
  .fw-sub { font-size: 11px; color: var(--cds-text-secondary, #525252); }
`;

// ── 1. Onboarding Kanban ───────────────────────────────────────────────────
@Component({
  selector: 'foundation-onboarding-kanban-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Onboarding Kanban</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-row"><span class="fw-label">Invited</span>     <span class="fw-value">{{ counts().invited }}</span></div>
        <div class="fw-row"><span class="fw-label">Pending setup</span><span class="fw-value">{{ counts().pending }}</span></div>
        <div class="fw-row"><span class="fw-label">Active</span>      <span class="fw-value">{{ counts().active }}</span></div>
        <div class="fw-row"><span class="fw-label">Offboarding</span> <span class="fw-value">{{ counts().offboarding }}</span></div>
      }
    </div>`,
})
export class FoundationOnboardingKanbanComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  counts = signal({ invited: 0, pending: 0, active: 0, offboarding: 0 });

  ngOnInit() {
    this.api.getUsers({ limit: 500 }).subscribe({
      next: (r) => {
        const users = (r.users ?? []) as Array<{ status: string }>;
        this.counts.set({
          invited:     users.filter(u => u.status === 'invited').length,
          pending:     users.filter(u => u.status === 'pending').length,
          active:      users.filter(u => u.status === 'active').length,
          offboarding: users.filter(u => u.status === 'offboarding').length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 2. Probation Queue ─────────────────────────────────────────────────────
@Component({
  selector: 'foundation-probation-queue-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Probation Queue</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else if (items().length === 0) { <p class="fw-empty">No users in probation.</p> }
      @else {
        @for (u of items(); track u.id) {
          <div class="fw-row">
            <span class="fw-label">{{ u.name }}</span>
            <span class="fw-badge warn">Probation</span>
          </div>
        }
      }
    </div>`,
})
export class FoundationProbationQueueComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  items = signal<Array<{ id: string; name: string }>>([]);

  ngOnInit() {
    this.api.getUsers({ status: 'probation', limit: 10 }).subscribe({
      next: (r) => {
        const users = (r.users ?? []) as Array<{ user_id: string; first_name?: string; last_name?: string; email?: string }>;
        this.items.set(users.map(u => ({
          id: u.user_id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email ?? u.user_id),
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 3. Lifecycle Timeline ─────────────────────────────────────────────────
@Component({
  selector: 'foundation-lifecycle-timeline-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Lifecycle Timeline</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else if (events().length === 0) { <p class="fw-empty">No recent lifecycle events.</p> }
      @else {
        @for (e of events(); track e.id) {
          <div class="fw-row">
            <span class="fw-label">{{ e.action }}</span>
            <span class="fw-value fw-sub">{{ e.date }}</span>
          </div>
        }
      }
    </div>`,
})
export class FoundationLifecycleTimelineComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  events = signal<Array<{ id: string; action: string; date: string }>>([]);

  ngOnInit() {
    this.api.getAuditTrail({ module: 'user-lifecycle', limit: 8 }).subscribe({
      next: (r: { entries?: Array<{ id: string; action?: string; created_at?: string }>; rows?: Array<{ id: string; action?: string; created_at?: string }> }) => {
        const rows = (r.entries ?? r.rows ?? []);
        this.events.set(rows.map(e => ({
          id: e.id,
          action: e.action ?? 'event',
          date: e.created_at ? new Date(e.created_at).toLocaleDateString() : '—',
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 4. Authority Matrix ───────────────────────────────────────────────────
@Component({
  selector: 'foundation-authority-matrix-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Authority Matrix</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-row"><span class="fw-label">Authority kinds</span><span class="fw-value">{{ stats().kinds }}</span></div>
        <div class="fw-row"><span class="fw-label">Positions covered</span><span class="fw-value">{{ stats().positions }}</span></div>
        <div class="fw-row"><span class="fw-label">Monetary limits set</span><span class="fw-value">{{ stats().monetary }}</span></div>
      }
    </div>`,
})
export class FoundationAuthorityMatrixComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  stats = signal({ kinds: 0, positions: 0, monetary: 0 });

  ngOnInit() {
    this.api.getAuthorityKinds?.().subscribe({
      next: (r: { kinds?: unknown[]; data?: unknown[] }) => {
        const kinds = (r.kinds ?? r.data ?? []) as Array<{ is_monetary?: boolean }>;
        this.stats.set({
          kinds: kinds.length,
          positions: 0,
          monetary: kinds.filter(k => k.is_monetary).length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 5. SoD Rules ──────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-sod-rules-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">SoD Rules</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else if (rules().length === 0) { <p class="fw-empty">No SoD rules configured.</p> }
      @else {
        @for (r of rules(); track r.id) {
          <div class="fw-row">
            <span class="fw-label">{{ r.desc }}</span>
            <span class="fw-badge" [class.error]="r.severity==='critical'" [class.warn]="r.severity==='high'" [class.ok]="r.severity==='medium'">{{ r.severity }}</span>
          </div>
        }
      }
    </div>`,
})
export class FoundationSodRulesComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  rules = signal<Array<{ id: string; desc: string; severity: string }>>([]);

  ngOnInit() {
    (this.api.getSodRules?.() as any)?.subscribe({
      next: (r: { data?: Array<{ rule_id: string; description?: string; severity?: string }> }) => {
        this.rules.set((r.data ?? []).slice(0, 6).map(row => ({
          id: row.rule_id,
          desc: row.description ?? row.rule_id,
          severity: row.severity ?? 'medium',
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 6. SoD Violations ────────────────────────────────────────────────────
@Component({
  selector: 'foundation-sod-violations-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">SoD Violations</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-kpi">{{ stats().open }}</div>
        <div class="fw-sub">open violations</div>
        <div class="fw-row" style="margin-top:.75rem"><span class="fw-label">Accepted risk</span><span class="fw-value">{{ stats().accepted }}</span></div>
        <div class="fw-row"><span class="fw-label">Remediated</span><span class="fw-value">{{ stats().remediated }}</span></div>
      }
    </div>`,
})
export class FoundationSodViolationsComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  stats = signal({ open: 0, accepted: 0, remediated: 0 });

  ngOnInit() {
    (this.api.getSodViolations?.() as any)?.subscribe({
      next: (r: { data?: Array<{ resolution?: string }> }) => {
        const rows = r.data ?? [];
        this.stats.set({
          open:       rows.filter(v => v.resolution === 'open').length,
          accepted:   rows.filter(v => v.resolution === 'accepted_risk').length,
          remediated: rows.filter(v => v.resolution === 'remediated').length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 7. Policy Acknowledgements ────────────────────────────────────────────
@Component({
  selector: 'foundation-policy-acks-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Policy Acknowledgements</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-kpi">{{ pct() }}%</div>
        <div class="fw-sub">acknowledgement rate</div>
        <div class="fw-row" style="margin-top:.75rem"><span class="fw-label">Acknowledged</span><span class="fw-value">{{ stats().acked }}</span></div>
        <div class="fw-row"><span class="fw-label">Pending</span><span class="fw-badge warn">{{ stats().pending }}</span></div>
        <div class="fw-row"><span class="fw-label">Overdue</span><span class="fw-badge error">{{ stats().overdue }}</span></div>
      }
    </div>`,
})
export class FoundationPolicyAcksComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  stats = signal({ acked: 0, pending: 0, overdue: 0, total: 0 });

  pct() {
    const s = this.stats();
    return s.total > 0 ? Math.round((s.acked / s.total) * 100) : 0;
  }

  ngOnInit() {
    (this.api.getGovernancePolicies?.() as any)?.subscribe({
      next: (r: { policies?: Array<{ acknowledgement_status?: string; ack_due_date?: string }> }) => {
        const rows = r.policies ?? [];
        const now = Date.now();
        this.stats.set({
          acked:   rows.filter(p => p.acknowledgement_status === 'acknowledged').length,
          pending: rows.filter(p => p.acknowledgement_status === 'pending').length,
          overdue: rows.filter(p =>
            p.acknowledgement_status === 'pending' &&
            p.ack_due_date != null &&
            new Date(p.ack_due_date).getTime() < now,
          ).length,
          total: rows.length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 8. Training Board ─────────────────────────────────────────────────────
@Component({
  selector: 'foundation-training-board-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">Training Board</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-row"><span class="fw-label">Completed</span><span class="fw-badge ok">{{ stats().completed }}</span></div>
        <div class="fw-row"><span class="fw-label">In progress</span><span class="fw-value">{{ stats().inProgress }}</span></div>
        <div class="fw-row"><span class="fw-label">Not started</span><span class="fw-value">{{ stats().notStarted }}</span></div>
        <div class="fw-row"><span class="fw-label">Overdue</span><span class="fw-badge error">{{ stats().overdue }}</span></div>
      }
    </div>`,
})
export class FoundationTrainingBoardComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  stats = signal({ completed: 0, inProgress: 0, notStarted: 0, overdue: 0 });

  ngOnInit() {
    (this.api.getTrainingAssignments?.() as any)?.subscribe({
      next: (r: { assignments?: Array<{ status?: string; due_date?: string }> }) => {
        const rows = r.assignments ?? [];
        const now = Date.now();
        this.stats.set({
          completed:  rows.filter(a => a.status === 'completed').length,
          inProgress: rows.filter(a => a.status === 'in_progress').length,
          notStarted: rows.filter(a => a.status === 'not_started').length,
          overdue:    rows.filter(a =>
            a.status !== 'completed' &&
            a.due_date != null &&
            new Date(a.due_date).getTime() < now,
          ).length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

// ── 9. COI Declarations ───────────────────────────────────────────────────
@Component({
  selector: 'foundation-coi-declarations-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CARD_STYLES],
  template: `
    <div class="fw-card">
      <p class="fw-title">COI Declarations</p>
      @if (loading()) { <p class="fw-loading">Loading…</p> }
      @else {
        <div class="fw-kpi">{{ stats().declared }}</div>
        <div class="fw-sub">declarations on file</div>
        <div class="fw-row" style="margin-top:.75rem"><span class="fw-label">Under review</span><span class="fw-badge warn">{{ stats().underReview }}</span></div>
        <div class="fw-row"><span class="fw-label">Conflicts confirmed</span><span class="fw-badge error">{{ stats().confirmed }}</span></div>
        <div class="fw-row"><span class="fw-label">Cleared</span><span class="fw-badge ok">{{ stats().cleared }}</span></div>
      }
    </div>`,
})
export class FoundationCoiDeclarationsComponent implements OnInit {
  private api = inject(FoundationApiService);
  loading = signal(true);
  stats = signal({ declared: 0, underReview: 0, confirmed: 0, cleared: 0 });

  ngOnInit() {
    (this.api.getCoiDeclarations?.() as any)?.subscribe({
      next: (r: { declarations?: Array<{ status?: string }> }) => {
        const rows = r.declarations ?? [];
        this.stats.set({
          declared:    rows.length,
          underReview: rows.filter(d => d.status === 'under_review').length,
          confirmed:   rows.filter(d => d.status === 'conflict_confirmed').length,
          cleared:     rows.filter(d => d.status === 'cleared').length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
