import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { ObligationRowDto, ObligationDetailDto, FrameworkSummaryDto } from '../../../models/compliance.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-obligations-page',
    imports: [CommonModule, FormsModule, RouterModule, ExportButtonComponent],
    template: `
    <div class="obligations-page" [dir]="i18n.direction()">
      <div class="page-toolbar">
        <h2>{{ i18n.translate('common.regulatoryObligations') }}</h2>
        <div class="toolbar-actions">
          <select class="filter-select" [(ngModel)]="frameworkFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('common.allFrameworks') }}</option>
            @for (fw of frameworks(); track fw.frameworkId) {
              <option [value]="fw.frameworkId">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('common.allStatuses') }}</option>
            <option value="covered">{{ i18n.translate('common.covered') }}</option>
            <option value="partially_covered">{{ i18n.translate('common.partiallyCovered') }}</option>
            <option value="uncovered">{{ i18n.translate('common.uncovered') }}</option>
            <option value="not_assessed">{{ i18n.translate('common.notAssessed') }}</option>
          </select>
          <select class="filter-select" [(ngModel)]="priorityFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('common.allPriorities') }}</option>
            <option value="critical">{{ i18n.translate('common.critical') }}</option>
            <option value="high">{{ i18n.translate('common.high') }}</option>
            <option value="medium">{{ i18n.translate('common.medium') }}</option>
            <option value="low">{{ i18n.translate('common.low') }}</option>
          </select>
          <select class="filter-select" [(ngModel)]="ownerFilter" (ngModelChange)="applyFilters()">
            <option value="">All Owners</option>
            <option value="__mine__">My Obligations</option>
          </select>
          <select class="filter-select" [(ngModel)]="applicabilityFilter" (ngModelChange)="applyFilters()">
            <option value="">All Applicability</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not Applicable</option>
            <option value="conditional">Conditional</option>
            <option value="under_review">Under Review</option>
          </select>
          <select class="filter-select" [(ngModel)]="evidenceStateFilter" (ngModelChange)="applyFilters()">
            <option value="">All Evidence States</option>
            <option value="complete">Evidence Complete</option>
            <option value="partial">Partial Evidence</option>
            <option value="missing">Missing Evidence</option>
          </select>
          <app-export-button module="compliance-obligations" [label]="i18n.translate('common.export')" [data]="filtered()" />
        </div>
      </div>

      <div class="health-strip">
        <div tabindex="0" role="button" (keyup.enter)="clearFilters()" class="hs-card" (click)="clearFilters()">
          <span class="hs-num">{{ allObligations().length }}</span>
          <span class="hs-label">{{ i18n.translate('common.total') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="filterByStatus('covered')" class="hs-card covered" (click)="filterByStatus('covered')">
          <span class="hs-num">{{ countByStatus('covered') }}</span>
          <span class="hs-label">{{ i18n.translate('common.covered') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="filterByStatus('partially_covered')" class="hs-card partial" (click)="filterByStatus('partially_covered')">
          <span class="hs-num">{{ countByStatus('partially_covered') }}</span>
          <span class="hs-label">{{ i18n.translate('common.partial') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="filterByStatus('uncovered')" class="hs-card uncovered" (click)="filterByStatus('uncovered')">
          <span class="hs-num">{{ countByStatus('uncovered') }}</span>
          <span class="hs-label">{{ i18n.translate('common.uncovered') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="filterByStatus('not_assessed')" class="hs-card not-assessed" (click)="filterByStatus('not_assessed')">
          <span class="hs-num">{{ countByStatus('not_assessed') }}</span>
          <span class="hs-label">{{ i18n.translate('common.notAssessed') }}</span>
        </div>
      </div>

      <!-- Saved Views -->
      <div class="saved-views">
        <span class="sv-label">Quick Views:</span>
        <button class="sv-chip" [class.active]="ownerFilter === '__mine__'" (click)="ownerFilter = '__mine__'; applyFilters()">My Obligations</button>
        <button class="sv-chip" [class.active]="evidenceStateFilter === 'missing'" (click)="evidenceStateFilter = 'missing'; applyFilters()">Missing Evidence</button>
        <button class="sv-chip" [class.active]="statusFilter === 'uncovered'" (click)="statusFilter = 'uncovered'; applyFilters()">Unmapped</button>
        <button class="sv-chip" (click)="clearFilters()">Clear All</button>
      </div>

      <!-- View Mode -->
      <div class="view-modes">
        <button class="vm-btn" [class.active]="viewMode === 'table'" (click)="viewMode = 'table'"><i class=""></i> Table</button>
        <button class="vm-btn" [class.active]="viewMode === 'kanban'" (click)="viewMode = 'kanban'"><i class=""></i> Kanban</button>
        <button class="vm-btn" [class.active]="viewMode === 'coverage'" (click)="viewMode = 'coverage'"><i class=""></i> Coverage</button>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); load()">{{ i18n.translate('common.retry') }}</button>
        </div>
      }

      @if (loading()) {
        <div class="loading-state" aria-live="polite"><i class=" pi-spinner"></i> {{ i18n.translate('common.loading') }}</div>
      }

      @if (!loading() && !loadError() && filtered().length === 0) {
        <div class="empty-state"><i class=""></i><p>{{ i18n.translate('common.noObligationsFound') }}</p></div>
      }

      @if (!loading() && !loadError() && filtered().length > 0) {
        <div class="count-row"><span class="count-badge">{{ filtered().length }} {{ i18n.translate('common.obligationsUnit') }}</span></div>

        <!-- ═══ TABLE VIEW ═══ -->
        @if (viewMode === 'table') {
          <div class="table-wrap">
            <table aria-label="Data Table table" class="data-table">
              <thead>
                <tr>
                  <th>{{ i18n.translate('common.code') }}</th>
                  <th>{{ i18n.translate('common.obligation') }}</th>
                  <th>{{ i18n.translate('common.framework') }}</th>
                  <th>{{ i18n.translate('common.domain') }}</th>
                  <th>Owner</th>
                  <th>{{ i18n.translate('common.priority') }}</th>
                  <th>{{ i18n.translate('common.controls') }}</th>
                  <th>{{ i18n.translate('common.evidence') }}</th>
                  <th>{{ i18n.translate('common.status') }}</th>
                  <th>Score</th>
                  <th>Next Review</th>
                </tr>
              </thead>
              <tbody>
                @for (o of filtered(); track o.nodeId) {
                  <tr tabindex="0" role="button" (keyup.enter)="openDetail(o)" (click)="openDetail(o)" class="clickable-row">
                    <td class="code-cell">{{ o.code }}</td>
                    <td class="title-cell">{{ i18n.localize(o.titleEn, o.titleAr) }}</td>
                    <td>{{ o.frameworkName }}</td>
                    <td>{{ i18n.localize(o.domainName || '', o.domainNameAr || o.domainName || '') }}</td>
                    <td>{{ o.owner || '—' }}</td>
                    <td><span class="priority-badge" [attr.data-priority]="o.priority">{{ o.priority }}</span></td>
                    <td class="num-cell">{{ o.controlCoverage }}</td>
                    <td class="num-cell">{{ o.evidenceCoverage }}%</td>
                    <td><span class="status-badge" [attr.data-status]="o.status">{{ formatStatus(o.status) }}</span></td>
                    <td class="num-cell">{{ o.controlCoverage > 0 ? Math.round((o.controlCoverage + o.evidenceCoverage) / 2) : 0 }}%</td>
                    <td class="date-cell">{{ o.dueDate || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ═══ KANBAN VIEW (DB-driven status grouping) ═══ -->
        @if (viewMode === 'kanban') {
          <div class="kanban-board">
            @for (col of KANBAN_STATUSES; track col) {
              <div class="kanban-col">
                <div class="kanban-col-header" [attr.data-status]="col">
                  <span class="kanban-col-title">{{ formatStatus(col) }}</span>
                  <span class="kanban-col-count">{{ countByStatus(col) }}</span>
                </div>
                <div class="kanban-col-body">
                  @for (o of filteredByStatus(col); track o.nodeId) {
                    <div class="kanban-card" (click)="openDetail(o)" tabindex="0" role="button" (keyup.enter)="openDetail(o)">
                      <span class="kanban-card-code">{{ o.code }}</span>
                      <span class="kanban-card-title">{{ i18n.localize(o.titleEn, o.titleAr) }}</span>
                      <div class="kanban-card-meta">
                        <span class="priority-badge" [attr.data-priority]="o.priority">{{ o.priority }}</span>
                        @if (o.owner) { <span class="kanban-card-owner">{{ o.owner }}</span> }
                      </div>
                      <div class="kanban-card-bars">
                        <div class="cov-bar"><div class="cov-bar-fill" [style.width.%]="o.controlCoverage" [attr.data-status]="col"></div></div>
                        <span class="kanban-card-pct">{{ o.controlCoverage }}% / {{ o.evidenceCoverage }}%</span>
                      </div>
                    </div>
                  }
                  @if (countByStatus(col) === 0) {
                    <div class="kanban-empty">No items</div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- ═══ COVERAGE VIEW (DB-driven coverage matrix) ═══ -->
        @if (viewMode === 'coverage') {
          <div class="coverage-view">
            <div class="coverage-summary">
              <div class="cov-card">
                <span class="cov-val">{{ filtered().length }}</span>
                <span class="cov-lbl">Total Obligations</span>
              </div>
              <div class="cov-card cov-good">
                <span class="cov-val">{{ countByStatus('covered') }}</span>
                <span class="cov-lbl">Fully Covered</span>
              </div>
              <div class="cov-card cov-warn">
                <span class="cov-val">{{ countByStatus('partially_covered') }}</span>
                <span class="cov-lbl">Partially Covered</span>
              </div>
              <div class="cov-card cov-bad">
                <span class="cov-val">{{ countByStatus('uncovered') }}</span>
                <span class="cov-lbl">Uncovered</span>
              </div>
              <div class="cov-card">
                <span class="cov-val">{{ countByStatus('not_assessed') }}</span>
                <span class="cov-lbl">Not Assessed</span>
              </div>
            </div>
            <div class="coverage-grid">
              @for (o of filtered(); track o.nodeId) {
                <div class="cov-tile" [attr.data-status]="o.status" (click)="openDetail(o)" tabindex="0" role="button" (keyup.enter)="openDetail(o)">
                  <span class="cov-tile-code">{{ o.code }}</span>
                  <span class="cov-tile-title">{{ i18n.localize(o.titleEn, o.titleAr) }}</span>
                  <div class="cov-tile-bars">
                    <div class="cov-bar-row">
                      <span class="cov-bar-label">Controls</span>
                      <div class="cov-bar"><div class="cov-bar-fill" [style.width.%]="o.controlCoverage" [attr.data-status]="o.status"></div></div>
                      <span class="cov-bar-pct">{{ o.controlCoverage }}%</span>
                    </div>
                    <div class="cov-bar-row">
                      <span class="cov-bar-label">Evidence</span>
                      <div class="cov-bar"><div class="cov-bar-fill" [style.width.%]="o.evidenceCoverage" [attr.data-status]="o.status"></div></div>
                      <span class="cov-bar-pct">{{ o.evidenceCoverage }}%</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (selectedObligation()) {
        <div tabindex="0" role="button" (keyup.enter)="closeDetail()" class="drawer-overlay" (click)="closeDetail()"></div>
        <aside class="detail-drawer" [dir]="i18n.direction()">
          <div class="drawer-header">
            <h3>{{ selectedObligation()!.obligation.code }}</h3>
            <button aria-label="Close" class="close-btn" (click)="closeDetail()"><i class=""></i></button>
          </div>
          <div class="drawer-body">
            <div class="detail-section">
              <label>{{ i18n.translate('common.obligation') }}</label>
              <p>{{ i18n.localize(selectedObligation()!.obligation.titleEn, selectedObligation()!.obligation.titleAr) }}</p>
            </div>
            @if (selectedObligation()!.obligation.descriptionEn) {
              <div class="detail-section">
                <label>{{ i18n.translate('common.description') }}</label>
                <p>{{ i18n.localize(selectedObligation()!.obligation.descriptionEn || '', selectedObligation()!.obligation.descriptionAr || selectedObligation()!.obligation.descriptionEn || '') }}</p>
              </div>
            }
            <div class="detail-section">
              <label>{{ i18n.translate('common.linkedControls') }} ({{ selectedObligation()!.controls?.length || 0 }})</label>
              @if (selectedObligation()!.controls?.length) {
                <ul class="linked-list">
                  @for (c of selectedObligation()!.controls; track c.control_id || $index) {
                    <li>{{ c.control_id || c.title }} — <span class="status-badge" [attr.data-status]="c.status">{{ c.status }}</span></li>
                  }
                </ul>
              } @else {
                <p class="muted">{{ i18n.translate('common.noControlsLinked') }}</p>
              }
            </div>
            <div class="detail-section">
              <label>{{ i18n.translate('common.linkedEvidence') }} ({{ selectedObligation()!.evidence?.length || 0 }})</label>
              @if (selectedObligation()!.evidence?.length) {
                <ul class="linked-list">
                  @for (e of selectedObligation()!.evidence; track e.evidence_id || $index) {
                    <li>{{ e.title || e.evidence_id }}</li>
                  }
                </ul>
              } @else {
                <p class="muted">{{ i18n.translate('common.noEvidenceLinked') }}</p>
              }
            </div>
            <div class="drawer-actions">
              <a class="action-link" [routerLink]="['/compliance/assessments']" [queryParams]="{ frameworkId: selectedObligation()!.obligation.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.isAr() ? 'تقييمات الإطار' : 'Framework Assessments' }}
              </a>
              <a class="action-link" [routerLink]="['/compliance/controls']" [queryParams]="{ frameworkId: selectedObligation()!.obligation.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.isAr() ? 'ضوابط الإطار' : 'Framework Controls' }}
              </a>
              <a class="action-link" [routerLink]="['/compliance/gaps']" [queryParams]="{ frameworkId: selectedObligation()!.obligation.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.isAr() ? 'فجوات الإطار' : 'Framework Gaps' }}
              </a>
              <a class="action-link" [routerLink]="['/foundation/evidence']" (click)="closeDetail()">
                <i class=""></i> {{ i18n.isAr() ? 'مستودع الأدلة' : 'Evidence Repository' }}
              </a>
              <a class="action-link" [routerLink]="['/risk']" (click)="closeDetail()">
                <i class=""></i> {{ i18n.isAr() ? 'سجل المخاطر' : 'Risk Register' }}
              </a>
              <a class="action-link" (click)="viewAuditLog()">
                <i class=""></i> {{ i18n.translate('common.auditLog') }}
              </a>
            </div>
          </div>
        </aside>
      }
    </div>
  `,
    styles: [`
    .obligations-page { padding: 20px 28px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .page-toolbar h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); }
    .count-row { margin-bottom: 8px; }
    .count-badge { font-size: var(--font-size-sm); padding: 4px 10px; border-radius: var(--radius-lg); background: var(--surface-200, var(--border-subtle)); color: var(--text-color-secondary); }

    .health-strip { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .hs-card { flex: 1; min-width: 100px; padding: 12px 16px; border-radius: var(--radius); text-align: center; cursor: pointer; transition: box-shadow .15s; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .hs-card:hover { box-shadow: var(--shadow-card); }
    .hs-card .hs-num { display: block; font-size: var(--font-size-2xl); font-weight: 700; }
    .hs-card .hs-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); }
    .hs-card.covered { border-inline-start: 3px solid var(--success); }
    .hs-card.covered .hs-num { color: #15803d; }
    .hs-card.partial { border-inline-start: 3px solid var(--warning); }
    .hs-card.partial .hs-num { color: #a16207; }
    .hs-card.uncovered { border-inline-start: 3px solid var(--error); }
    .hs-card.uncovered .hs-num { color: #b91c1c; }
    .hs-card.not-assessed { border-inline-start: 3px solid var(--text-muted); }
    .hs-card.not-assessed .hs-num { color: var(--text-muted); }

    .loading-state, .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary, var(--text-muted)); }
    .empty-state i { font-size: 40px; margin-bottom: 12px; display: block; opacity: .4; }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }

    .table-wrap { overflow-x: auto; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .data-table th { background: var(--surface-100, var(--surface-ice)); padding: 10px 12px; text-align: start; font-weight: 600; white-space: nowrap; border-bottom: 1px solid var(--surface-border); }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .clickable-row { cursor: pointer; transition: background .1s; }
    .clickable-row:hover { background: var(--surface-50, #f9fafb); }
    .code-cell { font-family: monospace; font-size: var(--font-size-sm); white-space: nowrap; }
    .title-cell { max-width: 300px; }
    .num-cell { text-align: center; }

    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .status-badge[data-status="covered"] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status="partially_covered"] { background: #fef9c3; color: #a16207; }
    .status-badge[data-status="uncovered"] { background: #fee2e2; color: #b91c1c; }
    .status-badge[data-status="under_review"] { background: #dbeafe; color: #1d4ed8; }
    .status-badge[data-status="not_assessed"] { background: var(--surface-200); color: var(--text-color-secondary); }
    .status-badge[data-status="implemented"] { background: #dcfce7; color: #15803d; }

    .priority-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .priority-badge[data-priority="high"], .priority-badge[data-priority="critical"] { background: #fee2e2; color: #b91c1c; }
    .priority-badge[data-priority="medium"] { background: #fef9c3; color: #a16207; }
    .priority-badge[data-priority="low"] { background: #dcfce7; color: #15803d; }

    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .3); z-index: var(--z-modal-backdrop); }
    .detail-drawer { position: fixed; top: 0; right: 0; width: 480px; max-width: 90vw; height: 100vh; background: var(--surface-card, #fff); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), .15); overflow-y: auto; }
    [dir="rtl"] .detail-drawer { right: auto; left: 0; box-shadow: 4px 0 20px rgba(var(--color-black-rgb), .15); }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border); }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; font-size: var(--font-size-lg); color: var(--text-color-secondary); }
    .drawer-body { padding: 20px; }
    .detail-section { margin-bottom: 20px; }
    .detail-section label { display: block; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-bottom: 4px; }
    .detail-section p { margin: 0; font-size: var(--font-size-base); line-height: 1.5; }
    .linked-list { list-style: none; padding: 0; margin: 0; }
    .linked-list li { padding: 6px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-sm); }
    .muted { color: var(--text-color-secondary); font-size: var(--font-size-sm); font-style: italic; }
    .drawer-actions { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--surface-border); }
    .action-link { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; }
    .action-link:hover { text-decoration: underline; }

    .saved-views { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .sv-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); }
    .sv-chip { padding: 4px 12px; border-radius: var(--radius-xl); border: 1px solid var(--surface-border); background: var(--surface-ground, var(--surface-ice)); font-size: var(--font-size-xs); cursor: pointer; transition: all 0.15s; }
    .sv-chip:hover, .sv-chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }

    .view-modes { display: flex; gap: 4px; margin: 8px 0; }
    .vm-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: var(--radius-sm); font-size: var(--font-size-xs); cursor: pointer; transition: all 0.15s; }
    .vm-btn:hover, .vm-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .vm-btn i { font-size: var(--font-size-xs); }

    /* ═══ Kanban View ═══ */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; overflow-x: auto; min-height: 400px; }
    .kanban-col { background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); min-width: 220px; display: flex; flex-direction: column; }
    .kanban-col-header { padding: 10px 12px; border-radius: var(--radius) 8px 0 0; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: var(--font-size-sm); }
    .kanban-col-header[data-status="covered"] { background: var(--severity-low-bg, #dcfce7); color: var(--severity-low, #166534); }
    .kanban-col-header[data-status="partially_covered"] { background: var(--severity-medium-bg, #fef9c3); color: var(--severity-medium, #854d0e); }
    .kanban-col-header[data-status="uncovered"] { background: var(--severity-high-bg, #fee2e2); color: var(--severity-high, #991b1b); }
    .kanban-col-header[data-status="not_assessed"] { background: var(--surface-200, #e2e8f0); color: var(--text-color-secondary); }
    .kanban-col-title { text-transform: capitalize; }
    .kanban-col-count { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-md); background: rgba(var(--color-white-rgb), 0.6); }
    .kanban-col-body { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 600px; }
    .kanban-card { padding: 10px; border-radius: var(--radius-sm); background: var(--surface-card, #fff); border: 1px solid var(--surface-border); cursor: pointer; transition: box-shadow 0.15s; }
    .kanban-card:hover { box-shadow: var(--shadow-card, 0 2px 8px rgba(var(--color-black-rgb), 0.08)); }
    .kanban-card-code { display: block; font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-bottom: 2px; }
    .kanban-card-title { display: block; font-size: var(--font-size-sm); font-weight: 500; margin-bottom: 6px; line-height: 1.3; }
    .kanban-card-meta { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
    .kanban-card-owner { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .kanban-card-bars { display: flex; align-items: center; gap: 6px; }
    .kanban-card-pct { font-size: var(--font-size-xs); color: var(--text-color-secondary); white-space: nowrap; }
    .kanban-empty { text-align: center; padding: 20px; color: var(--text-color-secondary); font-size: var(--font-size-sm); font-style: italic; }

    /* ═══ Coverage View ═══ */
    .coverage-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .cov-card { flex: 1; min-width: 120px; padding: 12px; text-align: center; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card, #fff); }
    .cov-card.cov-good { border-left: 3px solid var(--success, #16a34a); }
    .cov-card.cov-warn { border-left: 3px solid var(--warning, #f59e0b); }
    .cov-card.cov-bad { border-left: 3px solid var(--error, #dc2626); }
    .cov-val { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .cov-lbl { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .coverage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
    .cov-tile { padding: 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card, #fff); cursor: pointer; transition: box-shadow 0.15s; }
    .cov-tile:hover { box-shadow: var(--shadow-card, 0 2px 8px rgba(var(--color-black-rgb), 0.08)); }
    .cov-tile[data-status="covered"] { border-left: 3px solid var(--success, #16a34a); }
    .cov-tile[data-status="partially_covered"] { border-left: 3px solid var(--warning, #f59e0b); }
    .cov-tile[data-status="uncovered"] { border-left: 3px solid var(--error, #dc2626); }
    .cov-tile[data-status="not_assessed"] { border-left: 3px solid var(--text-color-secondary); }
    .cov-tile-code { display: block; font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .cov-tile-title { display: block; font-size: var(--font-size-sm); font-weight: 500; margin: 4px 0 8px; }
    .cov-tile-bars { display: flex; flex-direction: column; gap: 4px; }
    .cov-bar-row { display: flex; align-items: center; gap: 6px; }
    .cov-bar-label { font-size: var(--font-size-xs); color: var(--text-color-secondary); min-width: 55px; }
    .cov-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--surface-200, #e2e8f0); overflow: hidden; }
    .cov-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .cov-bar-fill[data-status="covered"] { background: var(--success, #16a34a); }
    .cov-bar-fill[data-status="partially_covered"] { background: var(--warning, #f59e0b); }
    .cov-bar-fill[data-status="uncovered"] { background: var(--error, #dc2626); }
    .cov-bar-fill[data-status="not_assessed"] { background: var(--text-color-secondary); }
    .cov-bar-pct { font-size: var(--font-size-xs); color: var(--text-color-secondary); min-width: 35px; text-align: end; }

    @media (max-width: 768px) {
      .kanban-board { grid-template-columns: 1fr; }
      .coverage-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ComplianceObligationsPageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  allObligations = signal<ObligationRowDto[]>([]);
  obligations = signal<ObligationRowDto[]>([]);
  frameworks = signal<FrameworkSummaryDto[]>([]);
  selectedObligation = signal<ObligationDetailDto | null>(null);

  frameworkFilter = '';
  statusFilter = '';
  priorityFilter = '';
  ownerFilter = '';
  applicabilityFilter = '';
  evidenceStateFilter = '';
  viewMode: 'table' | 'kanban' | 'coverage' = 'table';
  readonly KANBAN_STATUSES = ['covered', 'partially_covered', 'uncovered', 'not_assessed'] as const;

  Math = Math; // expose to template

  filtered = computed(() => {
    let list = this.allObligations();
    if (this.frameworkFilter) list = list.filter(o => o.frameworkId === this.frameworkFilter);
    if (this.statusFilter) list = list.filter(o => o.status === this.statusFilter);
    if (this.priorityFilter) list = list.filter(o => o.priority === this.priorityFilter);
    if (this.ownerFilter === '__mine__') list = list.filter(o => !!o.owner);
    if (this.applicabilityFilter) {
      // Filter by coverage-based applicability interpretation
      if (this.applicabilityFilter === 'applicable') list = list.filter(o => o.status !== 'not_assessed');
      else if (this.applicabilityFilter === 'not_applicable') list = list.filter(o => o.status === 'not_assessed');
    }
    if (this.evidenceStateFilter) {
      if (this.evidenceStateFilter === 'complete') list = list.filter(o => o.evidenceCoverage >= 100);
      else if (this.evidenceStateFilter === 'partial') list = list.filter(o => o.evidenceCoverage > 0 && o.evidenceCoverage < 100);
      else if (this.evidenceStateFilter === 'missing') list = list.filter(o => o.evidenceCoverage === 0);
    }
    return list;
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['frameworkId']) this.frameworkFilter = qp['frameworkId'];
    if (qp['status']) this.statusFilter = qp['status'];
    if (qp['priority']) this.priorityFilter = qp['priority'];
    if (qp['owner']) this.ownerFilter = qp['owner'];
    if (qp['applicability']) this.applicabilityFilter = qp['applicability'];
    if (qp['evidenceState']) this.evidenceStateFilter = qp['evidenceState'];
    this.load();
  }

  /** Set when load fails so we show "Failed to load" + retry */
  loadError = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    forkJoin({
      obligations: this.api.getObligations().pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
      frameworks: this.api.getFrameworks().pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
    }).subscribe(res => {
      this.allObligations.set(Array.isArray(res.obligations) ? res.obligations : []);
      this.frameworks.set(Array.isArray(res.frameworks) ? res.frameworks : []);
      this.loading.set(false);
    });
  }

  countByStatus(status: string): number {
    return this.allObligations().filter(o => o.status === status).length;
  }

  /** Return filtered obligations matching a given status (for kanban columns). */
  filteredByStatus(status: string): ObligationRowDto[] {
    return this.filtered().filter(o => o.status === status);
  }

  filterByStatus(status: string): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.applyFilters();
  }

  clearFilters(): void {
    this.frameworkFilter = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.ownerFilter = '';
    this.applicabilityFilter = '';
    this.evidenceStateFilter = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        frameworkId: this.frameworkFilter || null,
        status: this.statusFilter || null,
        priority: this.priorityFilter || null,
        owner: this.ownerFilter || null,
        applicability: this.applicabilityFilter || null,
        evidenceState: this.evidenceStateFilter || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  openDetail(o: ObligationRowDto): void {
    this.api.getObligationDetail(o.nodeId).pipe(catchError(() => of(null))).subscribe(detail => {
      if (detail) this.selectedObligation.set(detail);
    });
  }

  closeDetail(): void {
    this.selectedObligation.set(null);
  }

  viewAuditLog(): void {
    const obl = this.selectedObligation()?.obligation;
    if (!obl) return;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'obligation', entityId: obl.nodeId } });
  }
}
