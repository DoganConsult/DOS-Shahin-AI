/**
 * Foundation shared UI stub components.
 *
 * These replace @app/shared/components/* references in Foundation pages.
 * Each stub is a self-contained Angular standalone component that renders
 * a minimal but functional UI using IBM Carbon design tokens.
 *
 * As the platform matures, these will be superseded by proper @dos/ui-system
 * primitives or Carbon component compositions.
 */

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// ── StatCard ──────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="fsc" [class.fsc--highlight]="highlight">
      <p class="fsc__label">{{ label }}</p>
      <p class="fsc__value">{{ value }}</p>
      @if (subtitle) { <p class="fsc__sub">{{ subtitle }}</p> }
    </div>`,
  styles: [`:host{display:block}.fsc{padding:1rem 1.25rem;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;background:var(--cds-layer-02,#fff)}.fsc--highlight{border-inline-start:3px solid var(--cds-interactive,#0f62fe)}.fsc__label{font-size:.75rem;color:var(--cds-text-secondary,#525252);margin:0 0 .25rem}.fsc__value{font-size:1.5rem;font-weight:700;color:var(--cds-text-primary,#161616);margin:0}.fsc__sub{font-size:.7rem;color:var(--cds-text-secondary,#525252);margin:.25rem 0 0}`],
})
export class FoundationStatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle = '';
  @Input() highlight = false;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<span class="fsb" [class]="'fsb--' + status">{{ label || status }}</span>`,
  styles: [`.fsb{display:inline-block;padding:.15rem .625rem;border-radius:999px;font-size:.7rem;font-weight:600}.fsb--active,.fsb--open,.fsb--enabled{background:var(--cds-support-success-background,#defbe6);color:var(--cds-support-success,#24a148)}.fsb--inactive,.fsb--closed,.fsb--disabled{background:var(--cds-layer-01,#f4f4f4);color:var(--cds-text-secondary,#525252)}.fsb--warning,.fsb--review{background:var(--cds-support-warning-background,#fff8e1);color:var(--cds-support-warning,#f1c21b)}.fsb--error,.fsb--blocked{background:var(--cds-support-error-background,#fff1f1);color:var(--cds-support-error,#da1e28)}`],
})
export class FoundationStatusBadgeComponent {
  @Input() status = '';
  @Input() label  = '';
}

// ── PaginationBar ─────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-pagination-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <nav class="fpb" aria-label="Pagination">
      <button class="fpb__btn" [disabled]="page <= 1" (click)="prev()">‹</button>
      <span class="fpb__info">{{ page }} / {{ totalPages }}</span>
      <button class="fpb__btn" [disabled]="page >= totalPages" (click)="next()">›</button>
    </nav>`,
  styles: [`.fpb{display:flex;align-items:center;gap:.5rem;justify-content:flex-end;padding:.5rem 0}.fpb__btn{background:transparent;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;padding:.25rem .75rem;cursor:pointer;font-size:.875rem;color:var(--cds-text-primary,#161616)}.fpb__btn:disabled{opacity:.4;cursor:not-allowed}.fpb__info{font-size:.75rem;color:var(--cds-text-secondary,#525252)}`],
})
export class FoundationPaginationBarComponent {
  @Input() page       = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  prev() { if (this.page > 1)              { this.pageChange.emit(this.page - 1); } }
  next() { if (this.page < this.totalPages) { this.pageChange.emit(this.page + 1); } }
}

// ── PageShell (thin wrapper for layout compatibility) ─────────────────────────
@Component({
  selector: 'foundation-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="fps"><ng-content /></div>`,
  styles: [`:host{display:block}.fps{display:flex;flex-direction:column;min-height:100%;padding:0}`],
})
export class FoundationPageShellStubComponent {}

// ── PageHeader ────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <header class="fph">
      <h1 class="fph__title">{{ title }}</h1>
      @if (subtitle) { <p class="fph__sub">{{ subtitle }}</p> }
    </header>`,
  styles: [`.fph{padding:var(--cds-spacing-05,16px) var(--cds-spacing-06,24px);border-bottom:1px solid var(--cds-border-subtle-01,#c6c6c6)}.fph__title{font-size:1.25rem;font-weight:600;margin:0;color:var(--cds-text-primary,#161616)}.fph__sub{font-size:.875rem;color:var(--cds-text-secondary,#525252);margin:.25rem 0 0}`],
})
export class FoundationPageHeaderStubComponent {
  @Input() title    = '';
  @Input() subtitle = '';
}

// ── EmptyState ────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="fes">
      @if (icon) { <p class="fes__icon">{{ icon }}</p> }
      <p class="fes__heading">{{ heading }}</p>
      @if (description) { <p class="fes__desc">{{ description }}</p> }
    </div>`,
  styles: [`.fes{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;text-align:center}.fes__icon{font-size:2rem;margin:0 0 .5rem}.fes__heading{font-size:1rem;font-weight:600;color:var(--cds-text-primary,#161616);margin:0}.fes__desc{font-size:.875rem;color:var(--cds-text-secondary,#525252);margin:.5rem 0 0}`],
})
export class FoundationEmptyStateStubComponent {
  @Input() icon        = '';
  @Input() heading     = 'No data';
  @Input() description = '';
}

// ── RecentActivityTable ───────────────────────────────────────────────────────
@Component({
  selector: 'foundation-recent-activity-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <table class="frat" aria-label="Recent activity">
      <thead>
        <tr><th>Action</th><th>Actor</th><th>Time</th></tr>
      </thead>
      <tbody>
        @for (row of rows; track row.id) {
          <tr>
            <td>{{ row['action'] }}</td>
            <td>{{ row['actorName'] }}</td>
            <td>{{ row['timestamp'] }}</td>
          </tr>
        }
        @if (!rows.length) {
          <tr><td colspan="3" class="frat__empty">No recent activity</td></tr>
        }
      </tbody>
    </table>`,
  styles: [`.frat{width:100%;border-collapse:collapse;font-size:.875rem}.frat th,.frat td{padding:.5rem .75rem;text-align:start;border-bottom:1px solid var(--cds-border-subtle-01,#c6c6c6)}.frat th{font-weight:600;color:var(--cds-text-secondary,#525252)}.frat__empty{color:var(--cds-text-placeholder,#a8a8a8);text-align:center;padding:1rem}`],
})
export class FoundationRecentActivityTableComponent {
  @Input() rows: Record<string, unknown>[] = [];
}

// ── ModuleGrid ────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-module-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fmg">
      @for (item of items; track item['code']) {
        <a class="fmg__tile" [routerLink]="item['route']">
          <span class="fmg__name">{{ item['displayName'] }}</span>
        </a>
      }
    </div>`,
  styles: [`.fmg{display:flex;flex-wrap:wrap;gap:.75rem}.fmg__tile{padding:.75rem 1rem;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;text-decoration:none;color:var(--cds-text-primary,#161616);background:var(--cds-layer-02,#fff);font-size:.875rem}.fmg__tile:hover{border-color:var(--cds-interactive,#0f62fe)}`],
})
export class FoundationModuleGridComponent {
  @Input() items: Record<string, unknown>[] = [];
}

// ── RaciPanel ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-raci-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <aside class="frp">
      <h4 class="frp__title">RACI</h4>
      <ng-content />
    </aside>`,
  styles: [`.frp{padding:1rem;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;background:var(--cds-layer-02,#fff)}.frp__title{margin:0 0 .75rem;font-size:.875rem;font-weight:600;color:var(--cds-text-secondary,#525252)}`],
})
export class FoundationRaciPanelComponent {}

// ── AgentBadge ────────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-agent-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span class="fab" [title]="agentName">
      <span class="fab__dot"></span>{{ agentName }}
    </span>`,
  styles: [`.fab{display:inline-flex;align-items:center;gap:.25rem;padding:.15rem .625rem;border-radius:999px;font-size:.7rem;font-weight:600;background:var(--cds-layer-01,#f4f4f4);color:var(--cds-text-primary,#161616)}.fab__dot{width:6px;height:6px;border-radius:50%;background:var(--cds-interactive,#0f62fe)}`],
})
export class FoundationAgentBadgeComponent {
  @Input() agentName = 'AI Agent';
  @Input() agentCode = '';
}

// ── HubHelpPanel ──────────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-hub-help-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <aside class="fhhp">
      <h4 class="fhhp__title">Help</h4>
      <ng-content />
    </aside>`,
  styles: [`.fhhp{padding:1rem;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;background:var(--cds-layer-02,#fff)}.fhhp__title{margin:0 0 .5rem;font-size:.875rem;font-weight:600;color:var(--cds-text-secondary,#525252)}`],
})
export class FoundationHubHelpPanelComponent {}

// ── HubConnectionsStrip ────────────────────────────────────────────────────────
@Component({
  selector: 'foundation-hub-connections-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fhcs">
      @for (c of connections; track c['id']) {
        <a class="fhcs__chip" [routerLink]="c['route']">{{ c['label'] }}</a>
      }
    </div>`,
  styles: [`.fhcs{display:flex;flex-wrap:wrap;gap:.5rem}.fhcs__chip{padding:.25rem .75rem;border-radius:999px;border:1px solid var(--cds-border-subtle-01,#c6c6c6);font-size:.75rem;text-decoration:none;color:var(--cds-text-primary,#161616);background:var(--cds-layer-02,#fff)}.fhcs__chip:hover{border-color:var(--cds-interactive,#0f62fe)}`],
})
export class FoundationHubConnectionsStripComponent {
  @Input() connections: Record<string, unknown>[] = [];
}

// ── AiPanel (stub replacing @app/shared/ai-panel) ────────────────────────────
@Component({
  selector: 'foundation-ai-panel-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <aside class="faip" [class.faip--open]="open">
      <h4 class="faip__title">AI Assistant</h4>
      <ng-content />
    </aside>`,
  styles: [`.faip{padding:1rem;border:1px solid var(--cds-border-subtle-01,#c6c6c6);border-radius:4px;background:var(--cds-layer-02,#fff)}.faip--open{border-color:var(--cds-interactive,#0f62fe)}.faip__title{margin:0 0 .75rem;font-size:.875rem;font-weight:600;color:var(--cds-text-secondary,#525252)}`],
})
export class FoundationAiPanelStubComponent {
  @Input() open = false;
  @Input() moduleCode = '';
}
