import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { StepperModule } from 'primeng/stepper';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuModule } from 'primeng/menu';
import Chart from 'chart.js/auto';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ECCControl {
  id: string; code: string; titleEn: string; titleAr: string;
  descEn: string; descAr: string; priority: string; automatable: boolean;
  evidenceTypes: string[]; mappedTo: string[];
}

interface ECCSubdomain {
  id: string; code: string; nameEn: string; nameAr: string;
  controls: ECCControl[];
}

interface ECCDomain {
  id: string; code: string; nameEn: string; nameAr: string;
  subdomains: ECCSubdomain[];
}

interface ECCStructure {
  instrumentId: string; nameEn: string; nameAr: string; version: string;
  summaryEn: string; summaryAr: string;
  domains: ECCDomain[];
  stats: { totalDomains: number; totalSubdomains: number; totalControls: number };
}

type ControlStatus = 'implemented' | 'partially' | 'not_implemented' | 'not_applicable';

interface ItemState {
  controlId: string; status: ControlStatus; notes: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nca-assessment',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, PageShellComponent, StatCardComponent, StatusBadgeComponent,
    StepperModule, AccordionModule, ButtonModule, CardModule, TableModule, TagModule,
    TooltipModule, ProgressBarModule, InputTextModule, InputTextarea,
    DialogModule, DropdownModule, RadioButtonModule, SkeletonModule, MenuModule, AppDatePipe,],
  template: `
    <app-page-shell
      icon="shield"
      [title]="i18n.translate('ncaAssessment.title')"
      [subtitle]="i18n.translate('ncaAssessment.subtitle')"
      [breadcrumbs]="['Dashboard', 'NCA Assessment']"
      [loading]="loading">

      <!-- Assessment List View -->
      <ng-container *ngIf="!activeAssessment && !wizardMode">
        <div class="list-toolbar">
          <p-button [label]="i18n.translate('ncaAssessment.newAssessment')"
                    icon="pi pi-plus" (onClick)="startNewAssessment()" />
        </div>

        <div class="assessment-cards" *ngIf="assessments.length > 0">
          <div tabindex="0" role="button" (keyup.enter)="loadAssessment(a.assessmentId)" *ngFor="let a of assessments" class="assess-card" (click)="loadAssessment(a.assessmentId)">
            <div class="assess-card-header">
              <h3>{{ a.title }}</h3>
              <app-status-badge [status]="a.status" />
            </div>
            <div class="assess-card-meta">
              <span><i class="pi pi-calendar"></i> {{ a.createdAt | appDate:'medium' }}</span>
              <span><i class="pi pi-user"></i> {{ a.createdBy }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="!loading && assessments.length === 0" class="empty-state">
          <i class="pi pi-shield" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
          <h3>{{ i18n.translate('ncaAssessment.noAssessments') }}</h3>
          <p>{{ i18n.translate('ncaAssessment.startFirstAssessment') }}</p>
          <p-button [label]="i18n.translate('ncaAssessment.startAssessment')"
                    icon="pi pi-play" (onClick)="startNewAssessment()" styleClass="mt-3" />
        </div>
      </ng-container>

      <!-- Wizard Mode: Assessment in Progress -->
      <ng-container *ngIf="wizardMode && structure">
        <div class="wizard-nav">
          <button *ngFor="let step of wizardSteps; let idx = index"
                  class="wizard-step-btn"
                  [class.active]="currentStep === idx"
                  [class.completed]="idx < currentStep || (idx > 0 && idx <= structure.domains.length && domainProgress[idx - 1] === 100)"
                  (click)="currentStep = idx">
            <span class="step-num">{{ idx }}</span>
            <span class="step-label">{{ i18n.localize(step.labelEn, step.labelAr) }}</span>
          </button>
        </div>

        <!-- Step 0: Introduction -->
        <div *ngIf="currentStep === 0" class="intro-step">
          <div class="intro-card">
            <div class="intro-icon">
              <i class="pi pi-shield" style="font-size: 48px; color: var(--primary);"></i>
            </div>
            <h2>{{ i18n.localize(structure.nameEn, structure.nameAr) }}</h2>
            <p class="intro-version">{{ structure.version }}</p>
            <p class="intro-desc">{{ i18n.localize(structure.summaryEn, structure.summaryAr) }}</p>

            <div class="intro-stats">
              <div class="intro-stat">
                <div class="intro-stat-val">{{ structure.stats.totalDomains }}</div>
                <div class="intro-stat-label">{{ i18n.translate('ncaAssessment.domains') }}</div>
              </div>
              <div class="intro-stat">
                <div class="intro-stat-val">{{ structure.stats.totalSubdomains }}</div>
                <div class="intro-stat-label">{{ i18n.translate('ncaAssessment.subdomains') }}</div>
              </div>
              <div class="intro-stat">
                <div class="intro-stat-val">{{ structure.stats.totalControls }}</div>
                <div class="intro-stat-label">{{ i18n.translate('ncaAssessment.controls') }}</div>
              </div>
            </div>

            <p-button [label]="i18n.translate('ncaAssessment.beginAssessment')"
                      icon="pi pi-arrow-right" (onClick)="currentStep = 1" styleClass="p-button-lg mt-4" />
          </div>
        </div>

        <!-- Steps 1-5: Domain Assessment -->
        <ng-container *ngFor="let domain of structure.domains; let dIdx = index">
          <div *ngIf="currentStep === dIdx + 1" class="domain-step">
            <div class="domain-header">
              <div class="domain-title">
                <span class="domain-code">{{ domain.code }}</span>
                <h2>{{ i18n.localize(domain.nameEn, domain.nameAr) }}</h2>
              </div>
              <div class="domain-progress-ring">
                <svg viewBox="0 0 60 60" class="progress-svg">
                  <circle cx="30" cy="30" r="25" fill="none" stroke="#e2e8f0" stroke-width="5"/>
                  <circle cx="30" cy="30" r="25" fill="none" [attr.stroke]="domainProgress[dIdx] >= 70 ? '#16a34a' : domainProgress[dIdx] >= 40 ? 'var(--warning)' : '#3b82f6'" stroke-width="5"
                          stroke-linecap="round" [attr.stroke-dasharray]="getDashArray(domainProgress[dIdx])"
                          transform="rotate(-90 30 30)"/>
                </svg>
                <div class="progress-text">{{ domainProgress[dIdx] }}%</div>
              </div>
            </div>

            <div *ngFor="let sd of domain.subdomains; let sIdx = index" class="subdomain-section">
              <div tabindex="0" role="button" (keyup.enter)="toggleSubdomain(domain.id + '-' + sd.id)" class="subdomain-header" (click)="toggleSubdomain(domain.id + '-' + sd.id)">
                <div class="subdomain-title">
                  <i class="pi" [ngClass]="expandedSubdomains[domain.id + '-' + sd.id] ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                  <span class="sd-code">{{ sd.code }}</span>
                  {{ i18n.localize(sd.nameEn, sd.nameAr) }}
                </div>
                <div class="sd-progress">
                  <span class="sd-count">{{ getSubdomainAssessed(domain.id, sd) }}/{{ sd.controls.length }}</span>
                  <p-progressBar [value]="getSubdomainProgress(domain.id, sd)" [showValue]="false" styleClass="sd-bar" />
                </div>
              </div>

              <div *ngIf="expandedSubdomains[domain.id + '-' + sd.id]" class="controls-list">
                <div *ngFor="let ctrl of sd.controls" class="control-card" [class.assessed]="getItemStatus(ctrl.id) !== 'not_implemented'">
                  <div class="ctrl-top">
                    <span class="ctrl-code">{{ ctrl.code }}</span>
                    <span class="ctrl-priority" [class]="'priority-' + ctrl.priority">{{ ctrl.priority }}</span>
                    <span *ngIf="ctrl.automatable" class="ctrl-auto" pTooltip="Automatable"><i class="pi pi-bolt"></i></span>
                  </div>
                  <div class="ctrl-title">{{ i18n.localize(ctrl.titleEn, ctrl.titleAr) }}</div>
                  <div class="ctrl-desc">{{ i18n.localize(ctrl.descEn, ctrl.descAr) }}</div>

                  <div class="status-pills">
                    <button *ngFor="let opt of statusOptions" class="pill" [class.active]="getItemStatus(ctrl.id) === opt.value"
                            [class]="'pill-' + opt.value" (click)="setStatus(ctrl.id, opt.value)">
                      <i class="pi" [ngClass]="opt.icon"></i>
                      {{ i18n.localize(opt.label, opt.labelAr) }}
                    </button>
                  </div>

                  <div class="ctrl-notes" *ngIf="getItemStatus(ctrl.id) !== 'not_implemented'">
                    <textarea pInputTextarea [rows]="1"
                              [placeholder]="i18n.translate('ncaAssessment.notesPlaceholder')" [attr.aria-label]="i18n.translate('ncaAssessment.notesPlaceholder')"
                              [ngModel]="getItemNotes(ctrl.id)"
                              (ngModelChange)="setNotes(ctrl.id, $event)"></textarea>
                  </div>

                  <div class="ctrl-evidence" *ngIf="ctrl.evidenceTypes.length > 0">
                    <span class="evidence-label"><i class="pi pi-paperclip"></i>
                      {{ i18n.translate('ncaAssessment.evidenceNeeded') }}:</span>
                    <p-tag *ngFor="let et of ctrl.evidenceTypes" [value]="et" severity="info" styleClass="ev-tag" />
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <p-button *ngIf="dIdx > 0" [label]="i18n.translate('ncaAssessment.previous')"
                        icon="pi pi-arrow-left" (onClick)="currentStep = dIdx" styleClass="p-button-outlined" />
              <p-button [label]="i18n.translate('ncaAssessment.saveProgress')"
                        icon="pi pi-save" (onClick)="saveProgress()" styleClass="p-button-outlined" />
              <p-button [label]="dIdx < structure.domains.length - 1 ? i18n.translate('ncaAssessment.nextDomain') : i18n.translate('ncaAssessment.viewResults')"
                        [icon]="dIdx < structure.domains.length - 1 ? 'pi pi-arrow-right' : 'pi pi-chart-bar'"
                        (onClick)="dIdx < structure.domains.length - 1 ? currentStep = dIdx + 2 : goToResults()" />
            </div>
          </div>
        </ng-container>

        <!-- Step 6: Results Dashboard -->
        <div *ngIf="currentStep === structure.domains.length + 1 && activeAssessment" class="results-step">
          <div class="results-kpi-row">
            <app-stat-card icon="percentage" [value]="activeAssessment.overallScore + '%'"
                          [label]="i18n.translate('ncaAssessment.complianceScore')"
                          [accentColor]="activeAssessment.overallScore >= 70 ? '#16a34a' : activeAssessment.overallScore >= 40 ? 'var(--warning)' : 'var(--error)'" />
            <app-stat-card icon="exclamation-triangle" [value]="activeAssessment.riskExposure + '%'"
                          [label]="i18n.translate('ncaAssessment.riskExposure')"
                          accentColor="var(--error)" />
            <app-stat-card icon="check-circle" [value]="activeAssessment.summary.implemented + '/' + activeAssessment.summary.total"
                          [label]="i18n.translate('ncaAssessment.implemented')"
                          accentColor="#16a34a" />
            <app-stat-card icon="times-circle" [value]="activeAssessment.summary.criticalGaps"
                          [label]="i18n.translate('ncaAssessment.criticalGaps')"
                          accentColor="var(--error)" />
          </div>

          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-title"><i class="pi pi-chart-pie"></i> {{ i18n.translate('ncaAssessment.domainRadar') }}</div>
              <canvas #radarChart></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title"><i class="pi pi-chart-bar"></i> {{ i18n.translate('ncaAssessment.statusDistribution') }}</div>
              <canvas #donutChart></canvas>
            </div>
          </div>

          <!-- Domain Score Bars -->
          <div class="domain-scores-section">
            <h3>{{ i18n.translate('ncaAssessment.domainScores') }}</h3>
            <div *ngFor="let ds of activeAssessment.domainScores" class="score-bar-row">
              <div class="score-bar-label">{{ i18n.localize(ds.nameEn, ds.nameAr) }}</div>
              <div class="score-bar-track">
                <div class="score-bar-fill" [style.width.%]="ds.score"
                     [style.background]="ds.score >= 70 ? '#16a34a' : ds.score >= 40 ? 'var(--warning)' : 'var(--error)'">
                  {{ ds.score }}%
                </div>
              </div>
              <div class="score-bar-detail">{{ ds.implemented }}/{{ ds.total - ds.notApplicable }}</div>
            </div>
          </div>

          <!-- Priority Gaps Table -->
          <h3 class="section-heading">{{ i18n.translate('ncaAssessment.priorityGaps') }}</h3>
          <p-table aria-label="Data table" [value]="getGapItems()" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,25,50]"
                   styleClass="p-datatable-striped p-datatable-sm" [globalFilterFields]="['code','titleEn','titleAr']">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="code">{{ i18n.translate('ncaAssessment.code') }}</th>
                <th>{{ i18n.translate('ncaAssessment.control') }}</th>
                <th pSortableColumn="priority">{{ i18n.translate('ncaAssessment.priority') }}</th>
                <th>{{ i18n.translate('ncaAssessment.status') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ item.code }}</strong></td>
                <td>{{ i18n.localize(item.titleEn, item.titleAr) }}</td>
                <td><span class="priority-badge" [class]="'priority-' + item.priority">{{ item.priority }}</span></td>
                <td><app-status-badge [status]="item.status" /></td>
              </tr>
            </ng-template>
          </p-table>

          <!-- Cross-Navigation to Related KSA Pages -->
          <div class="cross-nav-section">
            <h3>{{ i18n.translate('ncaAssessment.exploreFurther') }}</h3>
            <div class="cross-nav-cards">
              <a routerLink="/regulator-heatmap" class="cross-nav-card" style="--cn-color: #0d9488">
                <i class="pi pi-chart-bar" style="color: #0d9488; font-size: var(--font-size-2xl);"></i>
                <div class="cn-text">
                  <div class="cn-title">{{ i18n.translate('ncaAssessment.regulatorHeatmap') }}</div>
                  <div class="cn-desc">{{ i18n.translate('ncaAssessment.regulatorHeatmapDesc') }}</div>
                </div>
                <i class="pi pi-arrow-right"></i>
              </a>
              <a routerLink="/framework-mapping" class="cross-nav-card" style="--cn-color: #7c3aed">
                <i class="pi pi-sitemap" style="color: #7c3aed; font-size: var(--font-size-2xl);"></i>
                <div class="cn-text">
                  <div class="cn-title">{{ i18n.translate('ncaAssessment.crossFrameworkMapping') }}</div>
                  <div class="cn-desc">{{ i18n.translate('ncaAssessment.crossFrameworkMappingDesc') }}</div>
                </div>
                <i class="pi pi-arrow-right"></i>
              </a>
              <a routerLink="/dpia" class="cross-nav-card" style="--cn-color: #9333ea">
                <i class="pi pi-file-edit" style="color: #9333ea; font-size: var(--font-size-2xl);"></i>
                <div class="cn-text">
                  <div class="cn-title">{{ i18n.translate('ncaAssessment.dpiaAssessment') }}</div>
                  <div class="cn-desc">{{ i18n.translate('ncaAssessment.dpiaAssessmentDesc') }}</div>
                </div>
                <i class="pi pi-arrow-right"></i>
              </a>
            </div>
          </div>

          <!-- Export Actions -->
          <div class="export-bar">
            <h3>{{ i18n.translate('ncaAssessment.exportReport') }}</h3>
            <div class="export-buttons">
              <button class="export-btn pdf" (click)="downloadExport('pdf', 'en')">
                <i class="pi pi-file-pdf"></i> PDF (English)
              </button>
              <button class="export-btn pdf" (click)="downloadExport('pdf', 'ar')">
                <i class="pi pi-file-pdf"></i> PDF (عربي)
              </button>
              <button class="export-btn excel" (click)="downloadExport('excel')">
                <i class="pi pi-file-excel"></i> Excel
              </button>
              <button class="export-btn html" (click)="downloadExport('html')">
                <i class="pi pi-globe"></i> Interactive HTML
              </button>
            </div>
          </div>

          <div class="step-actions">
            <p-button [label]="i18n.translate('ncaAssessment.editAssessment')"
                      icon="pi pi-pencil" (onClick)="currentStep = 1" styleClass="p-button-outlined" />
            <p-button [label]="i18n.translate('ncaAssessment.backToList')"
                      icon="pi pi-list" (onClick)="exitWizard()" styleClass="p-button-outlined" />
          </div>
        </div>
      </ng-container>
    </app-page-shell>
  `,
  styles: [`
    /* --- List View --- */
    .list-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .assessment-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .assess-card {
      background: var(--card-bg, #fff); border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg);
      padding: 20px; cursor: pointer; transition: all 200ms;
    }
    .assess-card:hover { border-color: var(--primary, var(--primary)); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .assess-card-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .assess-card-header h3 { font-size: var(--font-size-base); font-weight: 600; margin: 0; }
    .assess-card-meta { display: flex; gap: 16px; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .assess-card-meta i { margin-inline-end: 4px; }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-state h3 { margin: 8px 0; font-size: var(--font-size-lg); }
    .empty-state p { color: var(--text-muted, var(--text-muted)); }

    /* --- Wizard Nav --- */
    .wizard-nav { display: flex; gap: 4px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; }
    .wizard-step-btn {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-md); background: #fff;
      font-size: var(--font-size-sm); cursor: pointer; white-space: nowrap; transition: all 200ms;
    }
    .wizard-step-btn.active { background: var(--primary, #1e40af); color: #fff; border-color: var(--primary, #1e40af); }
    .wizard-step-btn.completed { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .step-num { width: 24px; height: 24px; border-radius: var(--radius-pill); background: var(--surface-ice); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--font-size-sm); }
    .wizard-step-btn.active .step-num { background: rgba(255,255,255,0.2); color: #fff; }
    .wizard-step-btn.completed .step-num { background: var(--success); color: #fff; }
    .step-label { font-weight: 600; }

    /* --- Intro Step --- */
    .intro-step { display: flex; justify-content: center; padding: 40px 0; }
    .intro-card { text-align: center; max-width: 600px; }
    .intro-icon { margin-bottom: 16px; }
    .intro-card h2 { font-size: var(--font-size-2xl); font-weight: 800; color: var(--primary, #1e40af); margin: 0 0 8px; }
    .intro-version { font-size: var(--font-size-base); color: var(--text-muted); margin-bottom: 12px; }
    .intro-desc { font-size: var(--font-size-base); color: var(--text, #334155); line-height: 1.7; margin-bottom: 24px; }
    .intro-stats { display: flex; justify-content: center; gap: 32px; }
    .intro-stat { text-align: center; }
    .intro-stat-val { font-size: var(--font-size-4xl); font-weight: 800; color: var(--primary, #1e40af); }
    .intro-stat-label { font-size: var(--font-size-sm); color: var(--text-muted); }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }

    /* --- Domain Step --- */
    .domain-step { }
    .domain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .domain-title { display: flex; align-items: center; gap: 12px; }
    .domain-code { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary, #1e40af); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); font-weight: 800; }
    .domain-title h2 { margin: 0; font-size: var(--font-size-xl); }
    .domain-progress-ring { position: relative; width: 60px; height: 60px; }
    .progress-svg { width: 100%; height: 100%; }
    .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: var(--font-size-sm); font-weight: 700; }

    /* --- Subdomain --- */
    .subdomain-section { margin-bottom: 4px; }
    .subdomain-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: var(--surface-ice); border: 1px solid var(--border, var(--border-subtle));
      border-radius: var(--radius); cursor: pointer; transition: background 200ms;
    }
    .subdomain-header:hover { background: var(--status-info-bg, #edf5ff); }
    .subdomain-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: var(--font-size-base); }
    .sd-code { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-weight: 700; }
    .sd-progress { display: flex; align-items: center; gap: 8px; min-width: 150px; }
    .sd-count { font-size: var(--font-size-sm); color: var(--text-muted); white-space: nowrap; }

    /* --- Control Card --- */
    .controls-list { padding: 8px 0 8px 16px; }
    .control-card {
      padding: 16px; margin-bottom: 8px; background: #fff; border: 1px solid var(--border, var(--border-subtle));
      border-radius: var(--radius-md); transition: all 200ms;
    }
    .control-card.assessed { border-color: #bae6fd; background: var(--status-info-bg, #edf5ff); }
    .ctrl-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ctrl-code { font-weight: 700; font-size: var(--font-size-sm); color: var(--primary, #1e40af); }
    .ctrl-priority { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-pill); }
    .priority-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-high { background: #fed7aa; color: #9a3412; }
    .priority-medium { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }
    .ctrl-auto { color: var(--warning); }
    .ctrl-title { font-weight: 600; font-size: var(--font-size-base); margin-bottom: 4px; }
    .ctrl-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-bottom: 10px; line-height: 1.5; }

    /* --- Status Pills --- */
    .status-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .pill {
      padding: 6px 14px; border-radius: var(--radius-pill); border: 1.5px solid var(--border, var(--border-subtle));
      background: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 4px; transition: all 200ms;
    }
    .pill:hover { border-color: var(--text-muted); }
    .pill.active.pill-implemented { background: #dcfce7; border-color: var(--success); color: var(--success); }
    .pill.active.pill-partially { background: var(--status-warning-bg, #fcf4d6); border-color: var(--warning); color: var(--warning); }
    .pill.active.pill-not_implemented { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .pill.active.pill-not_applicable { background: var(--surface-ice); border-color: var(--text-muted); color: var(--text-muted); }

    .ctrl-notes { margin-top: 8px; }
    .ctrl-notes textarea { width: 100%; font-size: var(--font-size-sm); }
    .ctrl-evidence { margin-top: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .evidence-label { font-size: var(--font-size-xs); color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

    .step-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border, var(--border-subtle)); }

    /* Cross-Navigation */
    .cross-nav-section { margin: 24px 0; }
    .cross-nav-section h3 { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 12px; }
    .cross-nav-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .cross-nav-card {
      display: flex; align-items: center; gap: 14px; padding: 16px; background: #fff;
      border: 1.5px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg); text-decoration: none; color: inherit;
      transition: all 200ms; cursor: pointer;
    }
    .cross-nav-card:hover { border-color: var(--cn-color, var(--primary)); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .cn-text { flex: 1; }
    .cn-title { font-size: var(--font-size-base); font-weight: 700; margin-bottom: 2px; }
    .cn-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .cross-nav-card .pi-arrow-right { color: var(--text-muted); font-size: var(--font-size-base); }

    /* --- Results --- */
    .results-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .chart-card { background: #fff; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 20px; }
    .chart-title { font-size: var(--font-size-base); font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

    .domain-scores-section { margin-bottom: 24px; }
    .domain-scores-section h3, .section-heading { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 12px; }
    .score-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .score-bar-label { width: 260px; font-size: var(--font-size-sm); font-weight: 600; }
    .score-bar-track { flex: 1; height: 24px; background: var(--surface-ice); border-radius: var(--radius-lg); overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: flex-end; padding-inline-end: 8px; font-size: var(--font-size-xs); font-weight: 700; color: #fff; transition: width 600ms ease; }
    .score-bar-detail { font-size: var(--font-size-sm); color: var(--text-muted); min-width: 50px; text-align: end; }

    .priority-badge { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 10px; border-radius: var(--radius-pill); }

    /* --- Export Bar --- */
    .export-bar { background: linear-gradient(135deg, var(--status-info-bg, #edf5ff), #e0f2fe); border-radius: var(--radius-lg); padding: 20px; margin: 24px 0; }
    .export-bar h3 { margin: 0 0 12px; font-size: var(--font-size-md); }
    .export-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .export-btn {
      padding: 10px 20px; border-radius: var(--radius-md); border: 1.5px solid; font-size: var(--font-size-sm);
      font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: all 200ms;
    }
    .export-btn.pdf { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .export-btn.pdf:hover { background: var(--error); color: #fff; }
    .export-btn.excel { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .export-btn.excel:hover { background: var(--success); color: #fff; }
    .export-btn.html { background: #eff6ff; border-color: var(--primary); color: var(--primary); }
    .export-btn.html:hover { background: var(--primary); color: #fff; }

    @media (max-width: 768px) {
      .results-kpi-row { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .score-bar-label { width: 120px; }
    }
  `],
})
export class NCAAssessmentComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  wizardMode = false;
  currentStep = 0;
  structure: ECCStructure | null = null;
  assessments: Record<string, unknown>[] = [];
  activeAssessment: Record<string, unknown> | null = null;
  activeAssessmentId: string | null = null;
  itemStates: Map<string, ItemState> = new Map();
  expandedSubdomains: Record<string, boolean> = {};
  domainProgress: number[] = [];
  wizardSteps: { labelEn: string; labelAr: string }[] = [];
  saving = false;
  private radarChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;
  private autoSave$ = new Subject<void>();
  private autoSaveSub: { unsubscribe(): void } | null;

  statusOptions = [
    { value: 'implemented' as ControlStatus, label: 'Implemented', labelAr: 'مطبق', icon: 'pi-check-circle' },
    { value: 'partially' as ControlStatus, label: 'Partial', labelAr: 'جزئي', icon: 'pi-minus-circle' },
    { value: 'not_implemented' as ControlStatus, label: 'Not Impl.', labelAr: 'غير مطبق', icon: 'pi-times-circle' },
    { value: 'not_applicable' as ControlStatus, label: 'N/A', labelAr: 'غير قابل', icon: 'pi-ban' },
  ];

  private keycloakAuth = inject(GrcAuthService);
  private cdr = inject(ChangeDetectorRef);

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.loadStructure();
    this.loadAssessments();
    this.autoSaveSub = this.autoSave$.pipe(debounceTime(3000), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.autoSaveProgress());
  }

  ngOnDestroy(): void {
    this.autoSaveSub?.unsubscribe();
  }

  private triggerAutoSave(): void {
    this.autoSave$.next();
  }

  private autoSaveProgress(): void {
    if (!this.activeAssessmentId) return;
    this.saving = true;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId, status: s.status, notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, unknown>) => { this.activeAssessment = r; this.saving = false; this.cdr.markForCheck(); },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  private loadStructure(): void {
    this.complianceSvc.getNCAStructure().subscribe({
      next: (s: ECCStructure) => {
        this.structure = s;
        this.wizardSteps = [
          { labelEn: 'Overview', labelAr: 'نظرة عامة' },
          ...s.domains.map(d => ({ labelEn: d.nameEn, labelAr: d.nameAr })),
          { labelEn: 'Results', labelAr: 'النتائج' },
        ];
        this.domainProgress = s.domains.map(() => 0);
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private loadAssessments(): void {
    this.complianceSvc.listNCAAssessments().subscribe({
      next: (r: Record<string, unknown>) => {
        this.assessments = r.assessments || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  startNewAssessment(): void {
    this.complianceSvc.createNCAAssessment().subscribe({
      next: (r: Record<string, unknown>) => {
        this.activeAssessmentId = r.assessmentId;
        this.loadAssessment(r.assessmentId);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadAssessment(id: string): void {
    this.loading = true;
    this.complianceSvc.getNCAAssessment(id).subscribe({
      next: (a: Record<string, unknown>) => {
        this.activeAssessment = a;
        this.activeAssessmentId = id;
        this.itemStates.clear();
        for (const item of a.items) {
          this.itemStates.set(item.controlId, {
            controlId: item.controlId,
            status: item.status,
            notes: item.notes || '',
          });
        }
        this.updateDomainProgress();
        this.wizardMode = true;
        this.currentStep = a.status === 'completed' ? (this.structure?.domains.length || 5) + 1 : 0;
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  getItemStatus(controlId: string): ControlStatus {
    return this.itemStates.get(controlId)?.status || 'not_implemented';
  }

  getItemNotes(controlId: string): string {
    return this.itemStates.get(controlId)?.notes || '';
  }

  setStatus(controlId: string, status: ControlStatus): void {
    const state = this.itemStates.get(controlId) || { controlId, status: 'not_implemented', notes: '' };
    state.status = status;
    this.itemStates.set(controlId, state);
    this.updateDomainProgress();
    this.triggerAutoSave();
  }

  setNotes(controlId: string, notes: string): void {
    const state = this.itemStates.get(controlId);
    if (state) { state.notes = notes; this.triggerAutoSave(); }
  }

  toggleSubdomain(key: string): void {
    this.expandedSubdomains[key] = !this.expandedSubdomains[key];
  }

  getSubdomainAssessed(domainId: string, sd: ECCSubdomain): number {
    return sd.controls.filter(c => this.getItemStatus(c.id) !== 'not_implemented').length;
  }

  getSubdomainProgress(domainId: string, sd: ECCSubdomain): number {
    if (sd.controls.length === 0) return 0;
    return Math.round((this.getSubdomainAssessed(domainId, sd) / sd.controls.length) * 100);
  }

  private updateDomainProgress(): void {
    if (!this.structure) return;
    this.domainProgress = this.structure.domains.map(d => {
      const allControls = d.subdomains.flatMap(s => s.controls);
      if (allControls.length === 0) return 0;
      const assessed = allControls.filter(c => this.getItemStatus(c.id) !== 'not_implemented').length;
      return Math.round((assessed / allControls.length) * 100);
    });
  }

  getDashArray(pct: number): string {
    const circumference = 2 * Math.PI * 25;
    const filled = (pct / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  saveProgress(): void {
    if (!this.activeAssessmentId) return;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId,
      status: s.status,
      notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, unknown>) => {
        this.activeAssessment = r;
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  goToResults(): void {
    if (!this.activeAssessmentId) return;
    const updates = Array.from(this.itemStates.values()).map(s => ({
      controlId: s.controlId,
      status: s.status,
      notes: s.notes,
    }));
    this.complianceSvc.updateNCAItems(this.activeAssessmentId, updates).subscribe({
      next: (r: Record<string, unknown>) => {
        this.activeAssessment = r;
        if (this.structure) {
          this.currentStep = this.structure.domains.length + 1;
          setTimeout(() => this.renderCharts(), 200);
        }
      },
      error: () => {
        // Still navigate to results even if save fails
        if (this.structure) {
          this.currentStep = this.structure.domains.length + 1;
          setTimeout(() => this.renderCharts(), 200);
        }
      }
    });
  }

  getGapItems(): Record<string, unknown>[] {
    if (!this.activeAssessment) return [];
    const gaps = this.activeAssessment.items.filter(
      (i: Record<string, unknown>) => i.status === 'not_implemented' || i.status === 'partially'
    );
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return gaps.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
  }

  downloadExport(format: 'pdf' | 'excel' | 'html', lang?: string): void {
    if (!this.activeAssessmentId) return;
    const url = this.complianceSvc.exportNCAAssessment(this.activeAssessmentId, format, lang);
    this.apiclientSvc.getBlob(url.replace('/api', '')).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'html';
        a.download = `nca-ecc-assessment.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (err) => devError('Export download failed:', err),
    });
  }

  exitWizard(): void {
    this.wizardMode = false;
    this.activeAssessment = null;
    this.activeAssessmentId = null;
    this.currentStep = 0;
    this.loadAssessments();
  }

  private renderCharts(): void {
    if (!this.activeAssessment) return;

    // Radar
    if (this.radarChartRef?.nativeElement) {
      if (this.radarChartInstance) this.radarChartInstance.destroy();
      this.radarChartInstance = new Chart(this.radarChartRef.nativeElement, {
        type: 'radar',
        data: {
          labels: this.activeAssessment.domainScores.map((d: Record<string, unknown>) => this.i18n.localize(d.nameEn, d.nameAr)),
          datasets: [{
            label: this.i18n.translate('dashboardCharts.compliance') + ' %',
            data: this.activeAssessment.domainScores.map((d: Record<string, unknown>) => d.score),
            backgroundColor: 'rgba(30,64,175,0.15)',
            borderColor: '#1e40af',
            pointBackgroundColor: '#1e40af',
          }],
        },
        options: {
          responsive: true,
          scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
          plugins: { legend: { display: false } },
        },
      });
    }

    // Donut
    if (this.donutChartRef?.nativeElement) {
      if (this.donutChartInstance) this.donutChartInstance.destroy();
      const s = this.activeAssessment.summary;
      this.donutChartInstance = new Chart(this.donutChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: [
            this.i18n.translate('dashboardCharts.implemented'),
            this.i18n.translate('ncaAssessment.partial'),
            this.i18n.translate('ncaAssessment.notImpl'),
            this.i18n.translate('ncaAssessment.na'),
          ],
          datasets: [{
            data: [s.implemented, s.partial, s.notImplemented, s.notApplicable],
            backgroundColor: ['#16a34a', 'var(--warning)', 'var(--error)', 'var(--text-muted)'],
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    }
  }

}
