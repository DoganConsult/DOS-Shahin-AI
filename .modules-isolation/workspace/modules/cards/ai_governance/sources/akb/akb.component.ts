import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-akb',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent, CardModule, TableModule, TagModule,
    ButtonModule, TabViewModule, ProgressBarModule, TooltipModule,
    ChipModule, BadgeModule, AppDatePipe],
  template: `
    <app-page-shell icon="shield" [title]="i18n.translate('akb.auditKnowledgeBase')"
      [subtitle]="i18n.translate('akb.comprehensiveAuditKnowledgeBasePoweredBy')"
      [breadcrumbs]="['Dashboard', 'AKB']" [loading]="loading()">

      <!-- ═══════════ Executive Health Bar ═══════════ -->
      @if (akb()) {
        <div class="exec-bar">
          <div class="exec-card health">
            <div class="exec-icon"><i class="pi pi-heart-fill"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().executiveSummary.healthScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.healthScore') }}</div>
            </div>
          </div>
          <div class="exec-card compliance">
            <div class="exec-icon"><i class="pi pi-check-circle"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().scorecard.overallComplianceScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.compliance') }}</div>
            </div>
          </div>
          <div class="exec-card maturity">
            <div class="exec-icon"><i class="pi pi-chart-bar"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().scorecard.overallMaturityScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.maturity') }}</div>
            </div>
          </div>
          <div class="exec-card confidence">
            <div class="exec-icon"><i class="pi pi-verified"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().scorecard.overallConfidenceScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.confidence') }}</div>
            </div>
          </div>
          <div class="exec-card freshness">
            <div class="exec-icon"><i class="pi pi-clock"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().scorecard.overallFreshnessScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.freshness') }}</div>
            </div>
          </div>
          <div class="exec-card readiness">
            <div class="exec-icon"><i class="pi pi-shield"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ akb().statistics.auditReadinessScore }}%</div>
              <div class="exec-label">{{ i18n.translate('akb.auditReadiness') }}</div>
            </div>
          </div>
        </div>

        <!-- ═══════════ Quick Stats Strip ═══════════ -->
        <div class="stats-strip">
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.totalRegulators }}</span><span class="strip-label">{{ i18n.translate('akb.regulators') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.totalFrameworks }}</span><span class="strip-label">{{ i18n.translate('akb.frameworks') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.implementedControls }}/{{ akb().statistics.totalControls }}</span><span class="strip-label">{{ i18n.translate('akb.controlsImpl') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.verifiedEvidence }}/{{ akb().statistics.totalEvidence }}</span><span class="strip-label">{{ i18n.translate('akb.evidenceVerified') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.activePolicies }}/{{ akb().statistics.totalPolicies }}</span><span class="strip-label">{{ i18n.translate('akb.activePolicies') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ akb().statistics.openHighRisks }}</span><span class="strip-label">{{ i18n.translate('akb.openHighRisks') }}</span></div>
          <div class="strip-item"><span class="strip-num">{{ gapCount() }}</span><span class="strip-label">{{ i18n.translate('akb.gaps') }}</span></div>
        </div>

        <!-- ═══════════ Download Button ═══════════ -->
        <div class="download-bar">
          <p-button [label]="i18n.translate('akb.downloadFullAkbPackageZip')"
            icon="pi pi-download" severity="success" [loading]="downloading()"
            (onClick)="downloadZip()" [raised]="true" />
          <span class="download-meta" *ngIf="akb().metadata">
            <i class="pi pi-calendar"></i> {{ akb().metadata.generatedAt | appDate:'medium' }}
            &nbsp;&bull;&nbsp;
            <i class="pi pi-tag"></i> v{{ akb().metadata.packageVersion }}
          </span>
        </div>

        <!-- ═══════════ Tabbed Layers ═══════════ -->
        <p-tabView [scrollable]="true" styleClass="akb-tabs">

          <!-- TAB 0: Executive Summary -->
          <p-tabPanel [header]="i18n.translate('akb.executiveSummary')">
            <div class="layer-grid">
              <p-card [header]="i18n.translate('akb.keyFindings')" styleClass="layer-card">
                @for (f of akb().executiveSummary.keyFindings; track f) {
                  <div class="finding-item"><i class="pi pi-exclamation-triangle text-orange-500"></i> {{ f }}</div>
                }
                @if (akb().executiveSummary.keyFindings.length === 0) {
                  <div class="text-color-secondary text-center p-3">{{ i18n.translate('akb.noKeyFindings') }}</div>
                }
              </p-card>
              <p-card [header]="i18n.translate('akb.recommendations')" styleClass="layer-card">
                @for (r of akb().executiveSummary.recommendations; track r) {
                  <div class="finding-item"><i class="pi pi-arrow-right text-blue-500"></i> {{ r }}</div>
                }
                @if (akb().executiveSummary.recommendations.length === 0) {
                  <div class="text-color-secondary text-center p-3">{{ i18n.translate('akb.noRecommendations') }}</div>
                }
              </p-card>
            </div>
            <div class="maturity-badge">
              {{ i18n.translate('akb.maturityLevel') }}: <span class="maturity-value">{{ akb().executiveSummary.maturityLevel }}</span>
            </div>
          </p-tabPanel>

          <!-- TAB 1: Sector Profile -->
          <p-tabPanel [header]="i18n.translate('akb.sectorProfile')">
            <div class="sector-grid">
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.sector') }}</span><span class="sector-value">{{ akb().sectorProfile.sector }}</span></div>
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.subsector') }}</span><span class="sector-value">{{ akb().sectorProfile.subsector || '-' }}</span></div>
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.entityType') }}</span><span class="sector-value">{{ akb().sectorProfile.entityType }}</span></div>
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.criticality') }}</span><span class="sector-value">{{ akb().sectorProfile.criticalityTier }}</span></div>
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.country') }}</span><span class="sector-value">{{ akb().sectorProfile.country }}</span></div>
              <div class="sector-item"><span class="sector-label">{{ i18n.translate('akb.companySize') }}</span><span class="sector-value">{{ akb().sectorProfile.companySize }}</span></div>
            </div>
          </p-tabPanel>

          <!-- TAB 2: Regulators -->
          <p-tabPanel [header]="i18n.translate('akb.regulators')">
            <p-table aria-label="Data table" [value]="akb().regulators" styleClass="p-datatable-sm p-datatable-striped" [paginator]="false">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('akb.code') }}</th>
                  <th>{{ i18n.translate('akb.name') }}</th>
                  <th>{{ i18n.translate('akb.binding') }}</th>
                  <th>{{ i18n.translate('akb.frameworks') }}</th>
                  <th>{{ i18n.translate('akb.controls') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-reg>
                <tr>
                  <td><p-chip [label]="reg.regulatorCode" /></td>
                  <td>{{ reg.regulatorName }}</td>
                  <td><p-tag [value]="reg.bindingStrength" [severity]="reg.bindingStrength === 'hard' ? 'danger' : 'warning'" /></td>
                  <td>{{ reg.frameworkCount }}</td>
                  <td>{{ reg.controlCount }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-3 text-color-secondary">{{ i18n.translate('akb.noRegulators') }}</td></tr></ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 3: Frameworks -->
          <p-tabPanel [header]="i18n.translate('akb.frameworks')">
            <div class="fw-grid">
              @for (fw of akb().frameworks; track fw.frameworkId) {
                <div class="fw-card">
                  <div class="fw-header">
                    <span class="fw-name">{{ fw.frameworkName }}</span>
                    <p-tag [value]="fw.coveragePercent + '%'" [severity]="fw.coveragePercent >= 80 ? 'success' : fw.coveragePercent >= 50 ? 'warning' : 'danger'" />
                  </div>
                  <p-progressBar [value]="fw.coveragePercent" [showValue]="false" [style]="{'height':'6px'}" />
                  <div class="fw-stats">
                    <span>{{ fw.implementedControls }}/{{ fw.totalControls }} {{ i18n.translate('akb.controls2') }}</span>
                    <span>{{ fw.testedControls }} {{ i18n.translate('akb.tested') }}</span>
                    <span>{{ fw.evidenceCount }} {{ i18n.translate('akb.evidence') }}</span>
                  </div>
                  @if (fw.lastAssessmentScore !== null) {
                    <div class="fw-assessment">
                      {{ i18n.translate('akb.lastAssessment') }}: {{ fw.lastAssessmentScore }}%
                      @if (fw.lastAssessmentDate) { &bull; {{ fw.lastAssessmentDate | appDate:'medium' }} }
                    </div>
                  }
                </div>
              }
            </div>
          </p-tabPanel>

          <!-- TAB 4: Controls -->
          <p-tabPanel [header]="i18n.translate('akb.controls3') + akb().controls.length + ')'">
            <p-table aria-label="Data table" [value]="akb().controls" styleClass="p-datatable-sm p-datatable-gridlines"
              [paginator]="true" [rows]="15" [rowsPerPageOptions]="[15, 30, 50]"
              [globalFilterFields]="['title', 'domain', 'controlCode', 'status']"
              [sortMode]="'single'" [sortField]="'domain'" [sortOrder]="1">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="controlCode">{{ i18n.translate('akb.code') }} <p-sortIcon field="controlCode" /></th>
                  <th pSortableColumn="title">{{ i18n.translate('akb.title') }} <p-sortIcon field="title" /></th>
                  <th pSortableColumn="domain">{{ i18n.translate('akb.domain') }} <p-sortIcon field="domain" /></th>
                  <th pSortableColumn="status">{{ i18n.translate('akb.status') }} <p-sortIcon field="status" /></th>
                  <th>{{ i18n.translate('akb.test') }}</th>
                  <th>{{ i18n.translate('akb.evidence2') }}</th>
                  <th>{{ i18n.translate('akb.owner') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-c>
                <tr>
                  <td><code class="ctrl-code">{{ c.controlCode }}</code></td>
                  <td>{{ c.title }}</td>
                  <td><p-chip [label]="c.domain" styleClass="text-xs" /></td>
                  <td><p-tag [value]="c.status" [severity]="statusSev(c.status)" /></td>
                  <td><p-tag [value]="c.testStatus" [severity]="testSev(c.testStatus)" /></td>
                  <td>
                    <span class="ev-badge" [class.ev-ok]="c.evidenceVerifiedCount > 0" [class.ev-warn]="c.evidenceCount > 0 && c.evidenceVerifiedCount === 0" [class.ev-none]="c.evidenceCount === 0">
                      {{ c.evidenceVerifiedCount }}/{{ c.evidenceCount }}
                    </span>
                  </td>
                  <td>{{ c.owner || '-' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 5: Evidence -->
          <p-tabPanel [header]="i18n.translate('akb.evidence3') + akb().evidence.length + ')'">
            <p-table aria-label="Data table" [value]="akb().evidence" styleClass="p-datatable-sm p-datatable-striped"
              [paginator]="true" [rows]="15" [sortField]="'collectedAt'" [sortOrder]="-1">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('akb.title') }}</th>
                  <th>{{ i18n.translate('akb.control') }}</th>
                  <th>{{ i18n.translate('akb.type') }}</th>
                  <th>{{ i18n.translate('akb.status') }}</th>
                  <th>{{ i18n.translate('akb.quality') }}</th>
                  <th>{{ i18n.translate('akb.date') }}</th>
                  <th>{{ i18n.translate('akb.hash') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td>{{ e.title }}</td>
                  <td><code class="ctrl-code">{{ e.controlId | slice:0:12 }}</code></td>
                  <td><p-tag [value]="e.type" /></td>
                  <td><p-tag [value]="e.verified ? 'verified' : e.status" [severity]="e.verified ? 'success' : 'warning'" /></td>
                  <td><span class="quality-badge" [class]="'q-' + e.qualityTier">{{ e.qualityTier }}</span></td>
                  <td>{{ e.collectedAt | appDate:'medium' }}</td>
                  <td><code class="hash-text">{{ e.hash | slice:0:16 }}...</code></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 6: Traceability Matrix -->
          <p-tabPanel [header]="i18n.translate('akb.traceability') + gapCount() + ' gaps)'">
            <div class="trace-summary">
              <span class="trace-stat"><i class="pi pi-check-circle text-green-500"></i> {{ verifiedTraceCount() }} {{ i18n.translate('akb.verified') }}</span>
              <span class="trace-stat"><i class="pi pi-exclamation-circle text-orange-500"></i> {{ partialTraceCount() }} {{ i18n.translate('akb.partial') }}</span>
              <span class="trace-stat"><i class="pi pi-times-circle text-red-500"></i> {{ gapCount() }} {{ i18n.translate('akb.gaps2') }}</span>
            </div>
            <p-table aria-label="Data table" [value]="akb().traceabilityMatrix" styleClass="p-datatable-sm p-datatable-gridlines"
              [paginator]="true" [rows]="20" [sortField]="'score'" [sortOrder]="1">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="frameworkId">{{ i18n.translate('akb.framework') }} <p-sortIcon field="frameworkId" /></th>
                  <th>{{ i18n.translate('akb.control') }}</th>
                  <th>{{ i18n.translate('akb.test') }}</th>
                  <th>{{ i18n.translate('akb.evidence2') }}</th>
                  <th>{{ i18n.translate('akb.remediation') }}</th>
                  <th pSortableColumn="score">{{ i18n.translate('akb.score') }} <p-sortIcon field="score" /></th>
                  <th>{{ i18n.translate('akb.gap') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr [class.gap-row]="row.gap">
                  <td><p-chip [label]="row.frameworkId" styleClass="text-xs" /></td>
                  <td><code class="ctrl-code">{{ row.controlCode }}</code> {{ row.controlTitle | slice:0:40 }}</td>
                  <td><p-tag [value]="row.testResult" [severity]="testSev(row.testResult)" /></td>
                  <td><p-tag [value]="row.evidenceStatus" [severity]="row.evidenceStatus === 'verified' ? 'success' : row.evidenceStatus === 'partial' ? 'warning' : 'danger'" /></td>
                  <td><p-tag *ngIf="row.remediationStatus" [value]="row.remediationStatus" /> <span *ngIf="!row.remediationStatus">-</span></td>
                  <td><span class="score-val" [class.score-low]="row.score < 0.5" [class.score-mid]="row.score >= 0.5 && row.score < 0.8" [class.score-hi]="row.score >= 0.8">{{ (row.score * 100).toFixed(0) }}%</span></td>
                  <td><i *ngIf="row.gap" class="pi pi-exclamation-triangle text-red-500"></i><i *ngIf="!row.gap" class="pi pi-check text-green-500"></i></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 7: Scorecard -->
          <p-tabPanel [header]="i18n.translate('akb.scorecard')">
            <div class="layer-grid">
              <p-card [header]="i18n.translate('akb.domainPerformance')" styleClass="layer-card">
                <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="akb().scorecard.domainScores" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>{{ i18n.translate('akb.domain') }}</th>
                      <th>{{ i18n.translate('akb.compliance') }}</th>
                      <th>{{ i18n.translate('akb.maturity') }}</th>
                      <th>{{ i18n.translate('akb.controls') }}</th>
                      <th>{{ i18n.translate('akb.evidence2') }}</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-d>
                    <tr>
                      <td>{{ d.domain }}</td>
                      <td><p-progressBar [value]="d.complianceScore" [showValue]="true" [style]="{'height':'16px'}" /></td>
                      <td><p-progressBar [value]="d.maturityScore" [showValue]="true" [style]="{'height':'16px'}" /></td>
                      <td>{{ d.controlCount }}</td>
                      <td>{{ d.evidenceCount }}</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
              <p-card [header]="i18n.translate('akb.frameworkPerformance')" styleClass="layer-card">
                <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="akb().scorecard.frameworkScores" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>{{ i18n.translate('akb.framework') }}</th>
                      <th>{{ i18n.translate('akb.score') }}</th>
                      <th>{{ i18n.translate('akb.coverage') }}</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-f>
                    <tr>
                      <td>{{ f.framework }}</td>
                      <td><p-progressBar [value]="f.score" [showValue]="true" [style]="{'height':'16px'}" /></td>
                      <td>{{ f.controlsCovered }}/{{ f.totalControls }}</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
          </p-tabPanel>

          <!-- TAB 8: Risk Posture -->
          <p-tabPanel [header]="i18n.translate('akb.riskPosture')">
            <div class="risk-dist">
              <div class="risk-box critical"><span class="risk-count">{{ akb().riskPosture.distribution['critical'] || 0 }}</span><span class="risk-lbl">{{ i18n.translate('akb.critical') }}</span></div>
              <div class="risk-box high"><span class="risk-count">{{ akb().riskPosture.distribution['high'] || 0 }}</span><span class="risk-lbl">{{ i18n.translate('akb.high') }}</span></div>
              <div class="risk-box medium"><span class="risk-count">{{ akb().riskPosture.distribution['medium'] || 0 }}</span><span class="risk-lbl">{{ i18n.translate('akb.medium') }}</span></div>
              <div class="risk-box low"><span class="risk-count">{{ akb().riskPosture.distribution['low'] || 0 }}</span><span class="risk-lbl">{{ i18n.translate('akb.low') }}</span></div>
            </div>
            @if (akb().riskPosture.topRisks.length > 0) {
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="akb().riskPosture.topRisks" styleClass="p-datatable-sm mt-3">
                <ng-template pTemplate="header"><tr><th>{{ i18n.translate('akb.risk') }}</th><th>{{ i18n.translate('akb.score') }}</th><th>{{ i18n.translate('akb.category') }}</th><th>{{ i18n.translate('akb.status') }}</th></tr></ng-template>
                <ng-template pTemplate="body" let-r>
                  <tr><td>{{ r.title }}</td><td><span class="score-val" [class.score-low]="r.score >= 12">{{ r.score }}</span></td><td>{{ r.category }}</td><td><p-tag [value]="r.status" /></td></tr>
                </ng-template>
              </p-table>
            }
          </p-tabPanel>

          <!-- TAB 9: Policies -->
          <p-tabPanel [header]="i18n.translate('akb.policies') + akb().policies.length + ')'">
            <p-table aria-label="Data table" [value]="akb().policies" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="15">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('akb.title') }}</th>
                  <th>{{ i18n.translate('akb.version') }}</th>
                  <th>{{ i18n.translate('akb.status') }}</th>
                  <th>{{ i18n.translate('akb.owner') }}</th>
                  <th>{{ i18n.translate('akb.lastReviewed') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-p>
                <tr>
                  <td>{{ p.title }}</td>
                  <td>v{{ p.version }}</td>
                  <td><p-tag [value]="p.status" [severity]="p.status === 'active' || p.status === 'approved' ? 'success' : 'warning'" /></td>
                  <td>{{ p.owner || '-' }}</td>
                  <td>{{ p.lastReviewed | appDate:'medium' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 10: Remediations -->
          <p-tabPanel [header]="i18n.translate('akb.remediations') + akb().remediations.length + ')'">
            <p-table aria-label="Data table" [value]="akb().remediations" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="15">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('akb.task') }}</th>
                  <th>{{ i18n.translate('akb.priority') }}</th>
                  <th>{{ i18n.translate('akb.status') }}</th>
                  <th>{{ i18n.translate('akb.dueDate') }}</th>
                  <th>{{ i18n.translate('akb.assignedTo') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-r>
                <tr>
                  <td>{{ r.title }}</td>
                  <td><p-tag [value]="r.priority" [severity]="r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'info'" /></td>
                  <td><p-tag [value]="r.status" [severity]="r.status === 'completed' ? 'success' : r.status === 'overdue' ? 'danger' : 'info'" /></td>
                  <td>{{ r.dueDate | appDate:'medium' }}</td>
                  <td>{{ r.assignedTo }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- TAB 11: Hash Manifest -->
          <p-tabPanel [header]="i18n.translate('akb.hashManifest')">
            <div class="manifest-hero">
              <div class="manifest-shield"><i class="pi pi-shield"></i></div>
              <div class="manifest-details">
                <div class="manifest-label">{{ i18n.translate('akb.rootHash') }}</div>
                <code class="root-hash">{{ akb().hashManifest.rootHash }}</code>
                <div class="manifest-meta">
                  {{ akb().hashManifest.algorithm }} &bull;
                  {{ akb().hashManifest.entries.length }} {{ i18n.translate('akb.entries') }} &bull;
                  {{ i18n.translate('akb.chainIntegrity') }}: <span [class.text-green-500]="akb().hashManifest.chainIntegrity" [class.text-red-500]="!akb().hashManifest.chainIntegrity">{{ akb().hashManifest.chainIntegrity ? (i18n.translate('akb.valid')) : (i18n.translate('akb.broken')) }}</span>
                </div>
              </div>
            </div>
            <p-table aria-label="Data table" [value]="akb().hashManifest.entries" styleClass="p-datatable-sm" [paginator]="true" [rows]="20">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('akb.type') }}</th>
                  <th>{{ i18n.translate('akb.name') }}</th>
                  <th>{{ i18n.translate('akb.hash') }}</th>
                  <th>{{ i18n.translate('akb.timestamp') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-entry>
                <tr>
                  <td><p-tag [value]="entry.entityType" /></td>
                  <td>{{ entry.entityName | slice:0:50 }}</td>
                  <td><code class="hash-text">{{ entry.hash | slice:0:20 }}...</code></td>
                  <td>{{ entry.timestamp | appDate:'medium' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

        </p-tabView>
      }

      <!-- ═══════════ Loading/Error ═══════════ -->
      @if (!loading() && !akb() && errorMsg()) {
        <div class="empty-state">
          <i class="pi pi-exclamation-circle" style="font-size:2rem; color:var(--red-400)"></i>
          <p>{{ errorMsg() }}</p>
          <p-button label="Retry" icon="pi pi-refresh" (onClick)="load()" />
        </div>
      }

    </app-page-shell>
  `,
  styles: [`
    .exec-bar { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:16px; }
    .exec-card { display:flex; align-items:center; gap:12px; padding:16px; background:var(--surface-card); border-radius:var(--radius-md); border:1px solid var(--surface-border); }
    .exec-icon { width:40px; height:40px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.2rem; }
    .health .exec-icon { background:var(--green-50); color:var(--success); }
    .compliance .exec-icon { background:var(--blue-50); color:var(--blue-600); }
    .maturity .exec-icon { background:var(--purple-50); color:var(--purple-600); }
    .confidence .exec-icon { background:var(--teal-50); color:var(--teal-600); }
    .freshness .exec-icon { background:var(--cyan-50); color:var(--cyan-600); }
    .readiness .exec-icon { background:var(--orange-50); color:var(--orange-600); }
    .exec-value { font-size:1.25rem; font-weight:700; color:var(--text-color); }
    .exec-label { font-size:0.75rem; color:var(--text-color-secondary); }

    .stats-strip { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
    .strip-item { display:flex; align-items:center; gap:6px; padding:6px 14px; background:var(--surface-card); border-radius:var(--radius-xl); border:1px solid var(--surface-border); font-size:0.82rem; }
    .strip-num { font-weight:700; color:var(--primary-color); }
    .strip-label { color:var(--text-color-secondary); }

    .download-bar { display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
    .download-meta { font-size:0.8rem; color:var(--text-color-secondary); }

    .layer-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; margin-bottom:16px; }
    .finding-item { display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:1px solid var(--surface-border); font-size:0.88rem; }
    .finding-item:last-child { border-bottom:none; }
    .maturity-badge { text-align:center; padding:12px; background:var(--surface-ground); border-radius:var(--radius); font-size:0.9rem; }
    .maturity-value { font-weight:700; color:var(--primary-color); font-size:1.1rem; }

    .sector-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
    .sector-item { padding:12px; background:var(--surface-card); border-radius:var(--radius); border:1px solid var(--surface-border); }
    .sector-label { display:block; font-size:0.75rem; color:var(--text-color-secondary); margin-bottom:4px; }
    .sector-value { font-weight:600; text-transform:capitalize; }

    .fw-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; }
    .fw-card { padding:16px; background:var(--surface-card); border-radius:var(--radius-md); border:1px solid var(--surface-border); }
    .fw-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .fw-name { font-weight:600; font-size:0.9rem; }
    .fw-stats { display:flex; gap:12px; margin-top:8px; font-size:0.78rem; color:var(--text-color-secondary); }
    .fw-assessment { margin-top:6px; font-size:0.75rem; color:var(--text-color-secondary); }

    .ctrl-code { font-size:0.75rem; background:var(--surface-ground); padding:2px 6px; border-radius:var(--radius-xs); }
    .ev-badge { font-size:0.8rem; font-weight:600; padding:2px 8px; border-radius:var(--radius-lg); }
    .ev-ok { background:var(--green-50); color:var(--green-700); }
    .ev-warn { background:var(--orange-50); color:var(--orange-700); }
    .ev-none { background:var(--red-50); color:var(--red-700); }

    .trace-summary { display:flex; gap:20px; margin-bottom:12px; font-size:0.88rem; }
    .trace-stat { display:flex; align-items:center; gap:6px; }
    .gap-row { background:var(--red-50); }
    .score-val { font-weight:700; font-size:0.85rem; }
    .score-low { color:var(--error); }
    .score-mid { color:var(--orange-600); }
    .score-hi { color:var(--success); }

    .risk-dist { display:flex; gap:12px; flex-wrap:wrap; }
    .risk-box { padding:16px 24px; border-radius:var(--radius-md); text-align:center; min-width:100px; }
    .risk-box.critical { background:var(--red-50); border:1px solid var(--red-200); }
    .risk-box.high { background:var(--orange-50); border:1px solid var(--orange-200); }
    .risk-box.medium { background:var(--yellow-50); border:1px solid var(--yellow-200); }
    .risk-box.low { background:var(--green-50); border:1px solid var(--green-200); }
    .risk-count { display:block; font-size:1.5rem; font-weight:700; }
    .risk-lbl { font-size:0.78rem; color:var(--text-color-secondary); }

    .quality-badge { padding:2px 8px; border-radius:var(--radius-md); font-size:0.75rem; font-weight:700; }
    .q-A { background:var(--green-100); color:var(--green-800); }
    .q-B { background:var(--blue-100); color:var(--blue-800); }
    .q-C { background:var(--orange-100); color:var(--orange-800); }

    .hash-text { font-size:0.72rem; word-break:break-all; background:var(--surface-ground); padding:2px 6px; border-radius:var(--radius-xs); }

    .manifest-hero { display:flex; align-items:center; gap:20px; padding:20px; margin-bottom:16px; background:var(--surface-card); border-radius:var(--radius-lg); border:1px solid var(--surface-border); }
    .manifest-shield { width:56px; height:56px; border-radius:var(--radius-lg); background:var(--green-50); display:flex; align-items:center; justify-content:center; }
    .manifest-shield i { font-size:1.5rem; color:var(--success); }
    .manifest-label { font-size:0.8rem; color:var(--text-color-secondary); margin-bottom:4px; }
    .root-hash { display:block; font-size:0.82rem; word-break:break-all; margin-bottom:6px; }
    .manifest-meta { font-size:0.78rem; color:var(--text-color-secondary); }

    .empty-state { text-align:center; padding:3rem; }
    .empty-state p { margin:12px 0; color:var(--text-color-secondary); }


    /* akb-tabs PrimeNG override — migrated from primeng-component-rules.css (Law 2) */
    .akb-tabs .p-tabview-panels { padding: 16px 0; }
  `]
})
export class AkbComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);

  loading = signal(false);
  downloading = signal(false);
  akb = signal<GrcRecord | null>(null);
  errorMsg = signal('');

  gapCount = computed(() => {
    const a = this.akb();
    return a ? a.traceabilityMatrix.filter((r: Record<string, unknown>) => r.gap).length : 0;
  });

  verifiedTraceCount = computed(() => {
    const a = this.akb();
    return a ? a.traceabilityMatrix.filter((r: Record<string, unknown>) => r.evidenceStatus === 'verified').length : 0;
  });

  partialTraceCount = computed(() => {
    const a = this.akb();
    return a ? a.traceabilityMatrix.filter((r: Record<string, unknown>) => r.evidenceStatus === 'partial').length : 0;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.apiclientSvc.get('/akb/build').subscribe({
      next: (data: any) => {
        this.akb.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.errorMsg.set(this.getErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  downloadZip(): void {
    this.downloading.set(true);
    this.apiclientSvc.getBlob('/akb/download').subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AGRC-OS-AKB-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => { this.downloading.set(false); }
    });
  }

  statusSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'implemented') return 'success';
    if (s === 'partial') return 'warning';
    if (s === 'not_implemented') return 'danger';
    return 'info';
  }

  testSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'passed') return 'success';
    if (s === 'partial') return 'warning';
    if (s === 'failed') return 'danger';
    return 'info';
  }

  private getErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const apiError = err as { error?: { details?: unknown; message?: unknown }; message?: unknown };

      if (typeof apiError.error?.details === 'string' && apiError.error.details.trim().length > 0) {
        return apiError.error.details;
      }

      if (typeof apiError.error?.message === 'string' && apiError.error.message.trim().length > 0) {
        return apiError.error.message;
      }

      if (typeof apiError.message === 'string' && apiError.message.trim().length > 0) {
        return apiError.message;
      }
    }

    return 'Failed to load AKB';
  }
}
