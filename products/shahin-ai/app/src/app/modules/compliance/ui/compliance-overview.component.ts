import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  TilesModule,
  NotificationModule,
  TagModule,
  GridModule,
} from 'carbon-components-angular';
import { DosPageLayoutComponent, DosPageTabDirective } from '../../../../../../../../platform/core/platform/shell';

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceOverviewData — typed subset of GET /api/compliance-ws/overview
// Full shape: { summary, frameworks, domains, priorityIssues, trends, recentAssessments }
// ─────────────────────────────────────────────────────────────────────────────
interface ComplianceOverviewSummary {
  overallScore:         number;
  activeFrameworks:     number;
  openGaps:             number;
  criticalGaps:         number;
  controlsMapped:       number;
  evidenceCoverage:     number;
  auditReadiness:       number;
  overdueActions:       number;
  maturityLevel:        string;
  maturityScore:        number;
  obligationsCovered?:  number;
}

interface ComplianceFrameworkSummary {
  frameworkId:         string;
  name:                string;
  category?:           string;
  totalControls:       number;
  implementedControls: number;
  completionPercent:   number;
  maturityLevel?:      string;
  maturityScore?:      number;
  status?:             string;
}

interface CompliancePriorityIssue {
  type:        string;
  severity?:   string;
  title?:      string;
  message?:    string;
  controlId?:  string;
  findingId?:  string;
}

interface ComplianceOverviewData {
  summary:            ComplianceOverviewSummary;
  frameworks:         ComplianceFrameworkSummary[];
  priorityIssues?:    CompliancePriorityIssue[];
}

@Component({
  selector: 'app-compliance-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TilesModule,
    NotificationModule,
    TagModule,
    GridModule,
    DosPageLayoutComponent,
    DosPageTabDirective,
  ],
  template: `
    <dos-page-layout
      eyebrow="Compliance"
      title="Compliance Overview"
      [subtitle]="data() && !loading() ? 'Maturity: ' + data()!.summary.maturityLevel + ' · ' + data()!.summary.activeFrameworks + ' frameworks · ' + data()!.summary.openGaps + ' open gaps' : 'GRC compliance posture for this tenant'"
      [loading]="loading()"
      [error]="error()"
      pageId="compliance-overview"
      id="compliance-overview-page">

      <!-- Tab 1: Summary KPIs -->
      <ng-container dosPageTab label="Summary" tabId="tab-summary">
            <div class="co__kpi-grid" id="compliance-kpi-grid">
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Overall Score</p>
                <p class="co__kpi-value" id="kpi-overall-score">{{ data()!.summary.overallScore | number:'1.0-0' }}%</p>
                <cds-tag [type]="maturityTagType()" size="sm">{{ data()!.summary.maturityLevel }}</cds-tag>
              </cds-tile>
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Frameworks</p>
                <p class="co__kpi-value" id="kpi-frameworks">{{ data()!.summary.activeFrameworks }}</p>
                <p class="co__kpi-sub">active</p>
              </cds-tile>
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Open Gaps</p>
                <p class="co__kpi-value" id="kpi-gaps" [class.co__kpi-value--warn]="data()!.summary.criticalGaps > 0">
                  {{ data()!.summary.openGaps }}
                </p>
                @if (data()!.summary.criticalGaps > 0) {
                  <p class="co__kpi-sub co__kpi-sub--warn">{{ data()!.summary.criticalGaps }} critical</p>
                }
              </cds-tile>
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Evidence Coverage</p>
                <p class="co__kpi-value" id="kpi-evidence">{{ data()!.summary.evidenceCoverage | number:'1.0-0' }}%</p>
                <p class="co__kpi-sub">Audit readiness: {{ data()!.summary.auditReadiness | number:'1.0-0' }}%</p>
              </cds-tile>
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Controls Mapped</p>
                <p class="co__kpi-value" id="kpi-controls">{{ data()!.summary.controlsMapped }}</p>
              </cds-tile>
              <cds-tile class="co__kpi">
                <p class="co__kpi-label">Overdue Actions</p>
                <p class="co__kpi-value" id="kpi-overdue" [class.co__kpi-value--warn]="data()!.summary.overdueActions > 0">
                  {{ data()!.summary.overdueActions }}
                </p>
              </cds-tile>
            </div>
      </ng-container>

      <!-- Tab 2: Frameworks -->
      <ng-container dosPageTab [label]="'Frameworks (' + (data()?.frameworks?.length ?? 0) + ')'" tabId="tab-frameworks">
            @if (data()!.frameworks.length > 0) {
              <div class="co__framework-list">
                @for (fw of data()!.frameworks; track fw.frameworkId) {
                  <cds-tile class="co__fw">
                    <div class="co__fw-head">
                      <strong class="co__fw-name">{{ fw.name }}</strong>
                      @if (fw.category) { <cds-tag type="blue" size="sm">{{ fw.category }}</cds-tag> }
                      @if (fw.maturityLevel) { <cds-tag [type]="frameworkTagType(fw.maturityLevel)" size="sm">{{ fw.maturityLevel }}</cds-tag> }
                    </div>
                    <div class="co__fw-bar">
                      <div class="co__fw-bar-fill" [style.width.%]="fw.completionPercent"></div>
                    </div>
                    <p class="co__fw-stats">
                      {{ fw.implementedControls }}/{{ fw.totalControls }} controls
                      &nbsp;·&nbsp;
                      {{ fw.completionPercent | number:'1.0-0' }}% complete
                    </p>
                  </cds-tile>
                }
              </div>
            } @else {
              <cds-tile id="compliance-no-frameworks">
                <p style="color:var(--cds-text-secondary)">No frameworks configured for this tenant.</p>
              </cds-tile>
            }
      </ng-container>

      <!-- Tab 3: Priority Issues -->
      <ng-container dosPageTab [label]="'Issues (' + (data()?.priorityIssues?.length ?? 0) + ')'" tabId="tab-issues">
            @if (data()!.priorityIssues && data()!.priorityIssues!.length > 0) {
              <div class="co__issue-list">
                @for (issue of data()!.priorityIssues!.slice(0, 20); track $index) {
                  <cds-tile class="co__issue">
                    @if (issue.severity) {
                      <cds-tag [type]="severityTagType(issue.severity)" size="sm">{{ issue.severity }}</cds-tag>
                    }
                    <p class="co__issue-title">{{ issue.title || issue.message || issue.type }}</p>
                    @if (issue.type && issue.title) {
                      <p class="co__issue-type">{{ issue.type }}</p>
                    }
                  </cds-tile>
                }
              </div>
            } @else {
              <cds-tile id="compliance-no-issues">
                <p style="color:var(--cds-text-secondary)">No priority issues — great work!</p>
              </cds-tile>
            }
      </ng-container>

    </dos-page-layout>
  `,
  styles: [`
    .co {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem);
      max-width: 1280px;
      margin-inline: auto;
    }
    .co__head { display: flex; flex-direction: column; gap: var(--cds-spacing-02, .25rem); }
    .co__eyebrow { margin: 0; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: var(--cds-text-secondary); }
    .co__title { margin: 0; font-size: 2rem; font-weight: 300; color: var(--cds-text-primary); }
    .co__sub { margin: 0; color: var(--cds-text-secondary); font-size: .9375rem; }
    .co__kpi-grid {
      display: grid;
      gap: var(--cds-spacing-04, .75rem);
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    .co__kpi { display: flex; flex-direction: column; gap: .25rem; }
    .co__kpi-label { margin: 0; font-size: .75rem; color: var(--cds-text-secondary); text-transform: uppercase; letter-spacing: .05em; }
    .co__kpi-value { margin: 0; font-size: 2.5rem; font-weight: 300; color: var(--cds-text-primary); line-height: 1; }
    .co__kpi-value--warn { color: var(--cds-support-warning, #f1c21b); }
    .co__kpi-sub { margin: 0; font-size: .75rem; color: var(--cds-text-secondary); }
    .co__kpi-sub--warn { color: var(--cds-support-error, #da1e28); }
    .co__skeleton-grid { display: grid; gap: var(--cds-spacing-04, .75rem); grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .co__skeleton-line { background: var(--cds-skeleton-element, #e8e8e8); border-radius: 2px; margin-bottom: .5rem; }
    .co__skeleton-line--sm { height: .75rem; width: 60%; }
    .co__skeleton-line--lg { height: 2.5rem; width: 40%; }
    .co__section { display: flex; flex-direction: column; gap: var(--cds-spacing-04, .75rem); }
    .co__section-title { margin: 0; font-size: 1.125rem; font-weight: 400; color: var(--cds-text-primary); }
    .co__framework-list { display: grid; gap: var(--cds-spacing-04, .75rem); grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .co__fw { display: flex; flex-direction: column; gap: .5rem; }
    .co__fw-head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .co__fw-name { font-weight: 500; color: var(--cds-text-primary); }
    .co__fw-bar { background: var(--cds-layer-02, #e8e8e8); height: 4px; border-radius: 2px; overflow: hidden; }
    .co__fw-bar-fill { height: 100%; background: var(--cds-interactive, #0f62fe); border-radius: 2px; transition: width .3s ease; }
    .co__fw-stats { margin: 0; font-size: .75rem; color: var(--cds-text-secondary); }
    .co__issue-list { display: grid; gap: var(--cds-spacing-03, .5rem); }
    .co__issue { display: flex; flex-direction: column; gap: .25rem; }
    .co__issue-title { margin: 0; font-size: .875rem; color: var(--cds-text-primary); }
    .co__issue-type { margin: 0; font-size: .75rem; color: var(--cds-text-secondary); }
    .co__h2 { margin: 0 0 .5rem 0; font-size: 1.125rem; }
    .co__empty { margin: 0; color: var(--cds-text-secondary); }
  `],
})
export class ComplianceOverviewPageComponent {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly data    = signal<ComplianceOverviewData | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.http
        .get<ComplianceOverviewData>('/api/compliance-ws/overview?light=1')
        .toPromise();
      this.data.set(res ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Failed to load compliance overview';
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  maturityTagType(): string {
    const level = this.data()?.summary?.maturityLevel?.toLowerCase() ?? '';
    if (level.includes('optimized') || level.includes('advanced')) return 'green';
    if (level.includes('managed') || level.includes('defined')) return 'blue';
    if (level.includes('initial') || level.includes('ad hoc')) return 'red';
    return 'warm-gray';
  }

  frameworkTagType(level: string): string {
    const l = level.toLowerCase();
    if (l.includes('optimized') || l.includes('advanced')) return 'green';
    if (l.includes('managed') || l.includes('defined')) return 'blue';
    return 'warm-gray';
  }

  severityTagType(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'red';
      case 'high':     return 'orange';
      case 'medium':   return 'purple';
      case 'low':      return 'blue';
      default:         return 'warm-gray';
    }
  }
}
