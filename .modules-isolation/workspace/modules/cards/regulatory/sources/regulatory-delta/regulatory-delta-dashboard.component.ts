import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

/* ── Interfaces ── */

interface DeltaNode {
  path: string;
  title?: string;
  description?: string;
}

interface RegulatoryDelta {
  deltaId: string;
  instrumentId: string;
  instrumentName: string;
  previousVersion: string;
  newVersion: string;
  addedNodes: DeltaNode[];
  modifiedNodes: DeltaNode[];
  removedNodes: DeltaNode[];
  detectedAt: string;
}

interface DeltaImpact {
  impactId: string;
  deltaId: string;
  instrumentName: string;
  controlId: string;
  controlTitle: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  status: string;
  resolvedAt: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-regulatory-delta-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppDatePipe,
    ButtonModule, TableModule, TagModule, TooltipModule, SkeletonModule,
  ],
  template: `
    <!-- ════ Page Header ════ -->
    <div class="rd-page-header">
      <div class="rd-header-left">
        <h1 class="rd-title">{{ i18n.translate('regulatoryDelta.title') || 'Regulatory Delta Dashboard' }}</h1>
        <p class="rd-subtitle">{{ i18n.translate('regulatoryDelta.subtitle') || 'Track regulatory changes and assess their impact on your compliance posture' }}</p>
      </div>
      <div class="rd-header-actions">
        <button pButton
          [label]="scanning() ? (i18n.translate('regulatoryDelta.scanning') || 'Scanning...') : (i18n.translate('regulatoryDelta.scanNow') || 'Scan Now')"
          icon="pi pi-sync"
          [loading]="scanning()"
          class="p-button-raised"
          [disabled]="scanning()"
          (click)="triggerScan()">
        </button>
      </div>
    </div>

    <!-- ════ KPI Strip ════ -->
    <div class="rd-kpi-strip">
      @if (loading()) {
        @for (i of [1,2,3,4]; track i) {
          <div class="rd-kpi-card">
            <p-skeleton width="60px" height="32px" />
            <p-skeleton width="100px" height="14px" styleClass="mt-2" />
          </div>
        }
      } @else {
        <div class="rd-kpi-card">
          <span class="rd-kpi-value">{{ totalDeltas() }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.totalDeltas') || 'Total Deltas' }}</span>
        </div>
        <div class="rd-kpi-card rd-kpi-critical">
          <span class="rd-kpi-value">{{ criticalImpacts() }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.criticalImpacts') || 'Critical Impacts' }}</span>
        </div>
        <div class="rd-kpi-card rd-kpi-pending">
          <span class="rd-kpi-value">{{ pendingResolution() }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.pendingResolution') || 'Pending Resolution' }}</span>
        </div>
        <div class="rd-kpi-card">
          <span class="rd-kpi-value rd-kpi-date">{{ lastScanDisplay() }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.lastScan') || 'Last Scan Date' }}</span>
        </div>
      }
    </div>

    <!-- ════ Filters ════ -->
    <div class="rd-filters">
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterInstrument') || 'Instrument' }}</label>
        <select class="rd-filter-select" [ngModel]="selectedInstrument()" (ngModelChange)="selectedInstrument.set($event)">
          <option value="">{{ i18n.translate('regulatoryDelta.allInstruments') || 'All Instruments' }}</option>
          @for (inst of instrumentOptions(); track inst) {
            <option [value]="inst">{{ inst }}</option>
          }
        </select>
      </div>
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterDateFrom') || 'From' }}</label>
        <input type="date" class="rd-filter-input" [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" />
      </div>
      <div class="rd-filter-group">
        <label class="rd-filter-label">{{ i18n.translate('regulatoryDelta.filterDateTo') || 'To' }}</label>
        <input type="date" class="rd-filter-input" [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" />
      </div>
    </div>

    <!-- ════ Delta History Table ════ -->
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class="pi pi-history"></i>
        {{ i18n.translate('regulatoryDelta.deltaHistory') || 'Delta History' }}
      </h2>

      @if (loading()) {
        <div class="rd-skeleton-table">
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton width="100%" height="48px" styleClass="mb-2" />
          }
        </div>
      } @else if (filteredDeltas().length === 0) {
        <div class="rd-empty-state">
          <i class="pi pi-inbox"></i>
          <p>{{ i18n.translate('regulatoryDelta.noDeltas') || 'No regulatory deltas detected yet. Run a scan to check for changes.' }}</p>
        </div>
      } @else {
        <p-table
          [value]="filteredDeltas()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          [rowHover]="true"
          dataKey="deltaId"
          [attr.aria-label]="i18n.translate('regulatoryDelta.ariaDeltaTable') || 'Regulatory delta history table'">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:3rem"></th>
              <th>{{ i18n.translate('regulatoryDelta.col.instrument') || 'Instrument' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.previousVersion') || 'Previous Version' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.newVersion') || 'New Version' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.changes') || 'Changes' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.detectedDate') || 'Detected Date' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-delta let-expanded="expanded">
            <tr>
              <td>
                <button pButton type="button"
                  [pRowToggler]="delta"
                  class="p-button-text p-button-rounded p-button-sm"
                  [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                  [pTooltip]="expanded ? 'Collapse' : 'Expand'">
                </button>
              </td>
              <td class="rd-instrument-cell">
                <span class="rd-instrument-name">{{ delta.instrumentName }}</span>
              </td>
              <td><code class="rd-version-badge">{{ delta.previousVersion }}</code></td>
              <td><code class="rd-version-badge rd-version-new">{{ delta.newVersion }}</code></td>
              <td>
                <div class="rd-change-badges">
                  @if (delta.addedNodes?.length) {
                    <span class="rd-badge rd-badge-added" [pTooltip]="'Added nodes'">
                      +{{ delta.addedNodes.length }}
                    </span>
                  }
                  @if (delta.modifiedNodes?.length) {
                    <span class="rd-badge rd-badge-modified" [pTooltip]="'Modified nodes'">
                      ~{{ delta.modifiedNodes.length }}
                    </span>
                  }
                  @if (delta.removedNodes?.length) {
                    <span class="rd-badge rd-badge-removed" [pTooltip]="'Removed nodes'">
                      -{{ delta.removedNodes.length }}
                    </span>
                  }
                  @if (!delta.addedNodes?.length && !delta.modifiedNodes?.length && !delta.removedNodes?.length) {
                    <span class="rd-badge rd-badge-none">{{ i18n.translate('regulatoryDelta.noChanges') || 'None' }}</span>
                  }
                </div>
              </td>
              <td class="rd-date-cell">{{ delta.detectedAt | appDate:'medium' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="rowexpansion" let-delta>
            <tr>
              <td colspan="6">
                <div class="rd-expansion-content">
                  @if (delta.addedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-added">
                        <i class="pi pi-plus-circle"></i>
                        {{ i18n.translate('regulatoryDelta.addedNodes') || 'Added' }} ({{ delta.addedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.addedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) {
                              <span class="rd-node-title">{{ node.title }}</span>
                            }
                            @if (node.description) {
                              <span class="rd-node-desc">{{ node.description }}</span>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  @if (delta.modifiedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-modified">
                        <i class="pi pi-pencil"></i>
                        {{ i18n.translate('regulatoryDelta.modifiedNodes') || 'Modified' }} ({{ delta.modifiedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.modifiedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) {
                              <span class="rd-node-title">{{ node.title }}</span>
                            }
                            @if (node.description) {
                              <span class="rd-node-desc">{{ node.description }}</span>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  @if (delta.removedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-removed">
                        <i class="pi pi-minus-circle"></i>
                        {{ i18n.translate('regulatoryDelta.removedNodes') || 'Removed' }} ({{ delta.removedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.removedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) {
                              <span class="rd-node-title">{{ node.title }}</span>
                            }
                            @if (node.description) {
                              <span class="rd-node-desc">{{ node.description }}</span>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-4">
                {{ i18n.translate('regulatoryDelta.noDeltas') || 'No regulatory deltas found.' }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- ════ Impact Assessment ════ -->
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class="pi pi-shield"></i>
        {{ i18n.translate('regulatoryDelta.impactAssessment') || 'Impact Assessment' }}
      </h2>

      @if (loading()) {
        <div class="rd-impact-grid">
          @for (i of [1,2,3]; track i) {
            <div class="rd-impact-card">
              <p-skeleton width="100%" height="120px" />
            </div>
          }
        </div>
      } @else if (impacts().length === 0) {
        <div class="rd-empty-state">
          <i class="pi pi-check-circle"></i>
          <p>{{ i18n.translate('regulatoryDelta.noImpacts') || 'No impact assessments available. Impacts are generated after scanning for regulatory deltas.' }}</p>
        </div>
      } @else {
        @for (group of impactGroups(); track group.level) {
          <div class="rd-impact-section">
            <h3 class="rd-impact-level-header">
              <p-tag [value]="group.label" [severity]="group.severity" />
              <span class="rd-impact-count">({{ group.impacts.length }})</span>
            </h3>
            <div class="rd-impact-grid">
              @for (impact of group.impacts; track impact.impactId) {
                <div class="rd-impact-card" [class]="'rd-impact-' + impact.impactLevel">
                  <div class="rd-impact-card-header">
                    <span class="rd-impact-control-title">{{ impact.controlTitle }}</span>
                    <p-tag
                      [value]="impact.impactLevel | titlecase"
                      [severity]="impactSeverity(impact.impactLevel)"
                      [rounded]="true" />
                  </div>
                  <div class="rd-impact-instrument">
                    <i class="pi pi-book"></i>
                    {{ impact.instrumentName }}
                  </div>
                  <p class="rd-impact-recommendation">{{ impact.recommendation }}</p>
                  <div class="rd-impact-card-footer">
                    <span class="rd-impact-status" [class]="'rd-status-' + impact.status">
                      <i class="pi" [ngClass]="impact.status === 'resolved' ? 'pi-check-circle' : 'pi-clock'"></i>
                      {{ impact.status === 'resolved'
                        ? (i18n.translate('regulatoryDelta.resolved') || 'Resolved')
                        : (i18n.translate('regulatoryDelta.pending') || 'Pending') }}
                    </span>
                    @if (impact.status !== 'resolved') {
                      <button pButton
                        [label]="i18n.translate('regulatoryDelta.resolve') || 'Resolve'"
                        icon="pi pi-check"
                        class="p-button-sm p-button-outlined p-button-success"
                        (click)="resolveImpact(impact)"
                        [loading]="resolvingId() === impact.impactId">
                      </button>
                    } @else {
                      <span class="rd-resolved-date">{{ impact.resolvedAt | appDate:'medium' }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>

    <!-- ════ Timeline Visualization ════ -->
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class="pi pi-calendar"></i>
        {{ i18n.translate('regulatoryDelta.timeline') || 'Detection Timeline' }}
      </h2>

      @if (loading()) {
        <p-skeleton width="100%" height="200px" />
      } @else if (timelineEntries().length === 0) {
        <div class="rd-empty-state">
          <i class="pi pi-calendar-times"></i>
          <p>{{ i18n.translate('regulatoryDelta.noTimeline') || 'No timeline entries yet.' }}</p>
        </div>
      } @else {
        <div class="rd-timeline">
          @for (entry of timelineEntries(); track entry.deltaId) {
            <div class="rd-timeline-item">
              <div class="rd-timeline-marker" [class]="'rd-marker-' + entry.changeLevel"></div>
              <div class="rd-timeline-connector"></div>
              <div class="rd-timeline-content">
                <div class="rd-timeline-date">{{ entry.detectedAt | appDate:'medium' }}</div>
                <div class="rd-timeline-title">{{ entry.instrumentName }}</div>
                <div class="rd-timeline-detail">
                  {{ entry.previousVersion }} <i class="pi pi-arrow-right"></i> {{ entry.newVersion }}
                </div>
                <div class="rd-timeline-changes">
                  @if (entry.addedCount) {
                    <span class="rd-badge rd-badge-added">+{{ entry.addedCount }}</span>
                  }
                  @if (entry.modifiedCount) {
                    <span class="rd-badge rd-badge-modified">~{{ entry.modifiedCount }}</span>
                  }
                  @if (entry.removedCount) {
                    <span class="rd-badge rd-badge-removed">-{{ entry.removedCount }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- ════ Error State ════ -->
    @if (error()) {
      <div class="rd-error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ error() }}</p>
        <button pButton
          [label]="i18n.translate('common.retry') || 'Retry'"
          icon="pi pi-refresh"
          class="p-button-sm p-button-outlined p-button-danger"
          (click)="retry()">
        </button>
      </div>
    }
  `,
  styles: [`
    /* ── Page Header ── */
    .rd-page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .rd-title {
      font-size: var(--font-size-3xl); font-weight: 800;
      color: var(--text-heading, #1e293b); margin: 0 0 4px 0;
    }
    .rd-subtitle {
      font-size: var(--font-size-body-sm); color: var(--text-color-secondary, #64748b);
      margin: 0;
    }

    /* ── KPI Strip ── */
    .rd-kpi-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .rd-kpi-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 20px 16px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s;
    }
    .rd-kpi-card:hover { box-shadow: 0 4px 20px rgba(var(--color-black-rgb), 0.06); }
    .rd-kpi-value {
      font-size: var(--font-size-4xl); font-weight: 800;
      color: var(--text-heading, #1e293b);
    }
    .rd-kpi-date { font-size: var(--font-size-md); }
    .rd-kpi-label {
      font-size: var(--font-size-caption); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-color-secondary, #64748b);
    }
    .rd-kpi-critical .rd-kpi-value { color: var(--error); }
    .rd-kpi-pending .rd-kpi-value { color: var(--warning); }

    /* ── Filters ── */
    .rd-filters {
      display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
      padding: 16px 20px; background: var(--surface-ground, var(--surface-ice, #f8fafc));
      border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, #e2e8f0);
      margin-bottom: 24px;
    }
    .rd-filter-group { display: flex; flex-direction: column; gap: 4px; }
    .rd-filter-label {
      font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-color-secondary, #64748b);
    }
    .rd-filter-select, .rd-filter-input {
      padding: 8px 12px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-subtle, #e2e8f0); font-size: var(--font-size-base);
      background: var(--surface-card, #fff); color: var(--text-heading, #1e293b);
      min-width: 180px;
    }
    .rd-filter-select:focus, .rd-filter-input:focus {
      outline: none; border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 2px rgba(var(--module-accent-blue-rgb), 0.15);
    }

    /* ── Section ── */
    .rd-section { margin-bottom: 32px; }
    .rd-section-title {
      display: flex; align-items: center; gap: 10px;
      font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, #1e293b);
      margin: 0 0 16px 0; padding-bottom: 12px;
      border-bottom: 2px solid var(--border-subtle, #e2e8f0);
    }
    .rd-section-title i { font-size: var(--font-size-body-md); color: var(--primary, #3b82f6); }

    /* ── Table cells ── */
    .rd-instrument-cell { font-weight: 600; }
    .rd-instrument-name { color: var(--text-heading, #1e293b); }
    .rd-version-badge {
      display: inline-block; padding: 2px 10px; border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-caption); font-weight: 600; font-family: 'Fira Code', 'Cascadia Code', monospace;
      background: var(--surface-ground, var(--surface-ice, #f1f5f9)); color: var(--text-color-secondary, #64748b);
      border: 1px solid var(--border-subtle, #e2e8f0);
    }
    .rd-version-new {
      background: var(--primary-50, #eff6ff); color: var(--primary); border-color: var(--primary-200, #bfdbfe);
    }
    .rd-date-cell { font-size: var(--font-size-tag); white-space: nowrap; color: var(--text-color-secondary, #64748b); }

    /* ── Change badges ── */
    .rd-change-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .rd-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 2px 10px; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 700; min-width: 32px;
    }
    .rd-badge-added { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
    .rd-badge-modified { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
    .rd-badge-removed { background: color-mix(in srgb, var(--error) 15%, transparent); color: var(--error); }
    .rd-badge-none { background: var(--surface-ground, #f1f5f9); color: var(--text-color-secondary, #94a3b8); }

    /* ── Expansion content ── */
    .rd-expansion-content {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px; padding: 16px 8px;
    }
    .rd-node-group {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 14px; border: 1px solid var(--border-subtle, #e2e8f0);
    }
    .rd-node-group-title {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-tag); font-weight: 700; margin: 0 0 10px 0;
    }
    .rd-node-group-title.rd-added { color: var(--success); }
    .rd-node-group-title.rd-modified { color: var(--warning); }
    .rd-node-group-title.rd-removed { color: var(--error); }
    .rd-node-list { list-style: none; padding: 0; margin: 0; }
    .rd-node-item {
      display: flex; flex-direction: column; gap: 2px;
      padding: 6px 0; border-bottom: 1px solid var(--border-subtle, #f1f5f9);
    }
    .rd-node-item:last-child { border-bottom: none; }
    .rd-node-path {
      font-size: var(--font-size-caption); font-family: 'Fira Code', 'Cascadia Code', monospace;
      color: var(--primary, #3b82f6); word-break: break-all;
    }
    .rd-node-title { font-size: var(--font-size-caption); font-weight: 600; color: var(--text-heading, #1e293b); }
    .rd-node-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary, #64748b); }

    /* ── Impact Assessment ── */
    .rd-impact-section { margin-bottom: 20px; }
    .rd-impact-level-header {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 12px 0; font-size: var(--font-size-md); font-weight: 600;
    }
    .rd-impact-count { font-size: var(--font-size-tag); color: var(--text-color-secondary, #64748b); }
    .rd-impact-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .rd-impact-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 18px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s; display: flex; flex-direction: column; gap: 10px;
    }
    .rd-impact-card:hover { box-shadow: 0 4px 20px rgba(var(--color-black-rgb), 0.06); }
    .rd-impact-critical { border-left: 4px solid var(--severity-critical); }
    .rd-impact-high { border-left: 4px solid var(--severity-high); }
    .rd-impact-medium { border-left: 4px solid var(--severity-medium); }
    .rd-impact-low { border-left: 4px solid var(--severity-low); }
    .rd-impact-card-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
    }
    .rd-impact-control-title {
      font-size: var(--font-size-body-sm); font-weight: 700; color: var(--text-heading, #1e293b);
      flex: 1;
    }
    .rd-impact-instrument {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-caption); color: var(--text-color-secondary, #64748b);
    }
    .rd-impact-instrument i { font-size: var(--font-size-sm); }
    .rd-impact-recommendation {
      font-size: var(--font-size-tag); color: var(--text-color-secondary, #475569);
      line-height: 1.5; margin: 0;
      background: var(--surface-ground, var(--surface-ice, #f8fafc));
      padding: 10px 12px; border-radius: var(--radius-md, 8px);
    }
    .rd-impact-card-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 8px; border-top: 1px solid var(--border-subtle, #f1f5f9);
    }
    .rd-impact-status {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: var(--font-size-caption); font-weight: 600;
    }
    .rd-status-pending { color: var(--warning); }
    .rd-status-resolved { color: var(--success); }
    .rd-resolved-date { font-size: var(--font-size-sm); color: var(--text-color-secondary, #94a3b8); }

    /* ── Timeline ── */
    .rd-timeline {
      position: relative; padding: 0 0 0 32px;
    }
    .rd-timeline::before {
      content: ''; position: absolute; left: 11px; top: 0; bottom: 0;
      width: 2px; background: var(--border-subtle, #e2e8f0);
    }
    .rd-timeline-item {
      position: relative; padding: 0 0 28px 24px;
    }
    .rd-timeline-item:last-child { padding-bottom: 0; }
    .rd-timeline-item:last-child .rd-timeline-connector { display: none; }
    .rd-timeline-marker {
      position: absolute; left: -26px; top: 4px;
      width: 14px; height: 14px; border-radius: 50%;
      border: 3px solid var(--primary, #3b82f6);
      background: var(--surface-card, #fff);
      z-index: 1;
    }
    .rd-marker-high { border-color: var(--severity-high); }
    .rd-marker-critical { border-color: var(--severity-critical); }
    .rd-marker-medium { border-color: var(--severity-medium); }
    .rd-marker-low { border-color: var(--severity-low); }
    .rd-timeline-connector {
      position: absolute; left: -20px; top: 18px; bottom: -10px;
      width: 2px; background: transparent;
    }
    .rd-timeline-content {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 14px 18px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s;
    }
    .rd-timeline-content:hover { box-shadow: 0 2px 12px rgba(var(--color-black-rgb), 0.05); }
    .rd-timeline-date {
      font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--primary, #3b82f6);
      margin-bottom: 4px;
    }
    .rd-timeline-title {
      font-size: var(--font-size-body-sm); font-weight: 700; color: var(--text-heading, #1e293b);
      margin-bottom: 4px;
    }
    .rd-timeline-detail {
      font-size: var(--font-size-caption); color: var(--text-color-secondary, #64748b);
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
    }
    .rd-timeline-detail i { font-size: var(--font-size-xs); }
    .rd-timeline-changes { display: flex; gap: 6px; }

    /* ── Skeleton / Empty / Error ── */
    .rd-skeleton-table { display: flex; flex-direction: column; gap: 8px; }
    .rd-empty-state {
      text-align: center; padding: 48px 24px;
      color: var(--text-color-secondary, #94a3b8);
    }
    .rd-empty-state i { font-size: var(--font-size-6xl); opacity: 0.2; display: block; margin-bottom: 12px; }
    .rd-empty-state p { font-size: var(--font-size-body-sm); margin: 0; }
    .rd-error-state {
      text-align: center; padding: 32px;
      color: var(--error); background: color-mix(in srgb, var(--error) 8%, var(--bg-0));
      border-radius: var(--radius-md, 8px); margin-top: 16px;
      border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
    }
    .rd-error-state i { font-size: 36px; display: block; margin-bottom: 12px; }
    .rd-error-state p { margin: 0 0 16px 0; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .rd-page-header { flex-direction: column; }
      .rd-kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .rd-filters { flex-direction: column; }
      .rd-filter-select, .rd-filter-input { width: 100%; }
      .rd-impact-grid { grid-template-columns: 1fr; }
      .rd-expansion-content { grid-template-columns: 1fr; }
    }
  `]
})
export class RegulatoryDeltaDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  private readonly apiBase = `${environment.apiUrl}/regulatory-delta`;

  /* ── State ── */
  loading = signal(false);
  scanning = signal(false);
  error = signal('');
  resolvingId = signal<string | null>(null);

  /* ── Data ── */
  deltas = signal<RegulatoryDelta[]>([]);
  impacts = signal<DeltaImpact[]>([]);

  /* ── Filters ── */
  selectedInstrument = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  /* ── Computed: Instrument dropdown options ── */
  instrumentOptions = computed(() => {
    const names = new Set(this.deltas().map(d => d.instrumentName));
    return Array.from(names).sort();
  });

  /* ── Computed: Filtered deltas ── */
  filteredDeltas = computed(() => {
    let result = this.deltas();
    const instrument = this.selectedInstrument();
    const from = this.dateFrom();
    const to = this.dateTo();

    if (instrument) {
      result = result.filter(d => d.instrumentName === instrument);
    }

    if (from) {
      const fromTs = new Date(from).getTime();
      result = result.filter(d => new Date(d.detectedAt).getTime() >= fromTs);
    }

    if (to) {
      const toTs = new Date(to).getTime() + 86400000;
      result = result.filter(d => new Date(d.detectedAt).getTime() <= toTs);
    }

    return result;
  });

  /* ── Computed: KPI values ── */
  totalDeltas = computed(() => this.deltas().length);

  criticalImpacts = computed(() =>
    this.impacts().filter(i => i.impactLevel === 'critical').length
  );

  pendingResolution = computed(() =>
    this.impacts().filter(i => i.status !== 'resolved').length
  );

  lastScanDisplay = computed(() => {
    const sorted = [...this.deltas()].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
    if (sorted.length === 0) return '--';
    const d = new Date(sorted[0].detectedAt);
    return this.i18n.formatDate(d);
  });

  /* ── Computed: Impact groups by severity ── */
  impactGroups = computed(() => {
    const allImpacts = this.impacts();
    const order: Array<{ level: DeltaImpact['impactLevel']; label: string; severity: 'danger' | 'warning' | 'info' | 'success' }> = [
      { level: 'critical', label: 'Critical',  severity: 'danger'  },
      { level: 'high',     label: 'High',      severity: 'warning' },
      { level: 'medium',   label: 'Medium',    severity: 'info'    },
      { level: 'low',      label: 'Low',       severity: 'success' },
    ];

    return order
      .map(o => ({
        ...o,
        impacts: allImpacts.filter(i => i.impactLevel === o.level),
      }))
      .filter(g => g.impacts.length > 0);
  });

  /* ── Computed: Timeline entries ── */
  timelineEntries = computed(() => {
    const sorted = [...this.deltas()].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    return sorted.map(d => {
      const totalChanges = (d.addedNodes?.length || 0) + (d.modifiedNodes?.length || 0) + (d.removedNodes?.length || 0);
      let changeLevel: string;
      if (totalChanges >= 10) changeLevel = 'critical';
      else if (totalChanges >= 5) changeLevel = 'high';
      else if (totalChanges >= 2) changeLevel = 'medium';
      else changeLevel = 'low';

      return {
        deltaId: d.deltaId,
        instrumentName: d.instrumentName,
        previousVersion: d.previousVersion,
        newVersion: d.newVersion,
        detectedAt: d.detectedAt,
        addedCount: d.addedNodes?.length || 0,
        modifiedCount: d.modifiedNodes?.length || 0,
        removedCount: d.removedNodes?.length || 0,
        changeLevel,
      };
    });
  });

  /* ── Lifecycle ── */

  ngOnInit(): void {
    this.loadData();
  }

  /* ── Actions ── */

  triggerScan(): void {
    this.scanning.set(true);
    this.error.set('');

    this.http.post<{ scanned: number; deltas: RegulatoryDelta[] }>(`${this.apiBase}/scan`, {}).subscribe({
      next: (res) => {
        this.scanning.set(false);
        // Merge newly detected deltas into existing list
        const existing = new Set(this.deltas().map(d => d.deltaId));
        const merged = [...this.deltas()];
        for (const delta of (res.deltas || [])) {
          if (!existing.has(delta.deltaId)) {
            merged.unshift(delta);
          }
        }
        this.deltas.set(merged);
        // Reload impacts as they may have changed
        this.loadImpacts();
      },
      error: (err) => {
        this.scanning.set(false);
        this.error.set(err?.error?.message || 'Failed to trigger regulatory scan.');
      },
    });
  }

  resolveImpact(impact: DeltaImpact): void {
    this.resolvingId.set(impact.impactId);

    this.http.patch<DeltaImpact>(`${this.apiBase}/impacts/${impact.impactId}/resolve`, {}).subscribe({
      next: (updated) => {
        this.resolvingId.set(null);
        // Update the impact in-place
        const current = this.impacts();
        this.impacts.set(
          current.map(i => i.impactId === impact.impactId
            ? { ...i, status: 'resolved', resolvedAt: updated?.resolvedAt || new Date().toISOString() }
            : i
          )
        );
      },
      error: (err) => {
        this.resolvingId.set(null);
        this.error.set(err?.error?.message || 'Failed to resolve impact.');
      },
    });
  }

  onFilterChange(): void {
  }

  retry(): void {
    this.error.set('');
    this.loadData();
  }

  impactSeverity(level: string): 'danger' | 'warning' | 'info' | 'success' {
    switch (level) {
      case 'critical': return 'danger';
      case 'high':     return 'warning';
      case 'medium':   return 'info';
      case 'low':      return 'success';
      default:         return 'info';
    }
  }

  /* ── Data Loading ── */

  private loadData(): void {
    this.loading.set(true);
    this.error.set('');

    let completedCount = 0;
    const checkComplete = () => {
      completedCount++;
      if (completedCount >= 2) {
        this.loading.set(false);
      }
    };

    // Load delta history
    this.http.get<{ deltas: RegulatoryDelta[]; count: number }>(`${this.apiBase}/history`, {
      params: { limit: '50' },
    }).subscribe({
      next: (res) => {
        this.deltas.set(res.deltas || []);
        checkComplete();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load delta history.');
        checkComplete();
      },
    });

    // Load impacts
    this.loadImpacts(checkComplete);
  }

  private loadImpacts(onComplete?: () => void): void {
    this.http.get<{ impacts: DeltaImpact[]; count: number }>(`${this.apiBase}/impacts`).subscribe({
      next: (res) => {
        this.impacts.set(res.impacts || []);
        onComplete?.();
      },
      error: (err) => {
        if (!this.error()) {
          this.error.set(err?.error?.message || 'Failed to load impact assessments.');
        }
        onComplete?.();
      },
    });
  }
}
