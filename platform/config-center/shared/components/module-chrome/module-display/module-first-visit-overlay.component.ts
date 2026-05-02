import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { StepsModule } from 'primeng/steps';
import { TagModule } from 'primeng/tag';
import { ModuleReadinessService, type ReadinessState, type StageResult, type ReadinessCheck } from '@app/core/modules/module-readiness.service';
import { ModuleKickstartService } from '@app/core/modules/module-kickstart.service';

interface SetupStep {
  label: string;
  description: string;
  completed: boolean;
  action?: string;
  route?: string;
}

const MODULE_INFO: Record<string, { title: string; description: string; icon: string }> = {
  risk: { title: 'Risk Management', description: 'Register, assess, treat, and escalate organizational risks with AI-powered scoring.', icon: 'pi-exclamation-triangle' },
  compliance: { title: 'Compliance Management', description: 'Map frameworks, assess controls, identify gaps, and track remediation across regulations.', icon: 'pi-check-square' },
  policy: { title: 'Policy Lifecycle', description: 'Create, review, approve, publish, and retire organizational policies with version control.', icon: 'pi-file' },
  evidence: { title: 'Evidence Collection', description: 'Plan evidence schedules, collect artifacts, and prove control effectiveness.', icon: 'pi-folder-open' },
  audit: { title: 'Audit Management', description: 'Plan audits, execute fieldwork, track findings, and issue reports with full traceability.', icon: 'pi-search' },
  foundation: { title: 'Foundation', description: 'Establish organization structure, business units, departments, and role ownership.', icon: 'pi-building' },
  governance: { title: 'Governance', description: 'Define authority structures, committees, mandates, and accountability matrices.', icon: 'pi-sitemap' },
  reporting: { title: 'Reporting', description: 'Generate executive reports, board packs, and regulatory submissions automatically.', icon: 'pi-chart-bar' },
  incident: { title: 'Incident Management', description: 'Report, triage, investigate, and resolve security and operational incidents.', icon: 'pi-bolt' },
  vendor: { title: 'Vendor Risk Management', description: 'Assess vendor risks, conduct due diligence, and monitor third-party compliance.', icon: 'pi-users' },
  bcp: { title: 'Business Continuity', description: 'Build continuity plans, conduct BIAs, schedule exercises, and manage crisis response.', icon: 'pi-shield' },
  asset: { title: 'Asset Management', description: 'Inventory assets, classify sensitivity, assign ownership, and manage lifecycle.', icon: 'pi-server' },
  exception: { title: 'Exception Management', description: 'Request, review, and approve temporary deviations from policy or control requirements.', icon: 'pi-flag' },
  remediation: { title: 'Remediation Tracking', description: 'Track remediation tasks from audit findings, gap assessments, and incidents to closure.', icon: 'pi-wrench' },
  action: { title: 'Action Items', description: 'Manage cross-module action items with escalation, approvals, and due date tracking.', icon: 'pi-list-check' },
  training: { title: 'Security Training', description: 'Create training catalogs, launch campaigns, track completions, and issue certificates.', icon: 'pi-graduation-cap' },
  'ai-governance': { title: 'AI Governance', description: 'Register AI systems, assess risks, monitor performance, and enforce ethical policies.', icon: 'pi-microchip' },
  privacy: { title: 'Privacy Management', description: 'Manage ROPA, DPIAs, data subject requests, breach notifications, and retention policies.', icon: 'pi-eye-slash' },
  qiyas: { title: 'Qiyas Assessment', description: 'Run maturity assessments aligned with KSA regulatory frameworks.', icon: 'pi-chart-line' },
  integrations: { title: 'Integrations', description: 'Connect external tools, configure webhooks, and manage API integrations.', icon: 'pi-link' },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-first-visit-overlay',
    imports: [CommonModule, ButtonModule, CardModule, ProgressBarModule, StepsModule, TagModule],
    template: `
    <div class="first-visit-overlay" [attr.dir]="'ltr'">
      <p-card>
        <div class="overlay-header">
          <div class="module-icon-wrap">
            <i class="pi {{ moduleIcon() }} text-4xl"></i>
          </div>
          <h2>{{ moduleTitle() }}</h2>
          <p class="module-desc">{{ moduleDesc() }}</p>
          <p-tag [value]="stateLabel()" [severity]="stateSeverity()"></p-tag>
        </div>

        @if (readinessScore() !== null) {
          <div class="readiness-bar">
            <span class="readiness-label">Module Readiness</span>
            <p-progressBar [value]="readinessScore()!" [showValue]="true"></p-progressBar>
          </div>
        }

        <div class="setup-steps">
          <h3>Setup Checklist</h3>
          @for (step of setupSteps(); track step.label) {
            <div class="setup-step" [class.completed]="step.completed">
              <i class="pi" [ngClass]="step.completed ? 'pi-check-circle text-green-500' : 'pi-circle text-400'"></i>
              <div class="step-content">
                <span class="step-label">{{ step.label }}</span>
                <small class="step-desc">{{ step.description }}</small>
              </div>
              @if (!step.completed && step.action) {
                <button pButton [label]="step.action" severity="secondary" size="small"
                        (click)="onStepAction(step)"></button>
              }
            </div>
          }
        </div>

        <div class="overlay-actions">
          <button pButton label="Start Setup Wizard" icon="pi pi-play" (click)="startSetup.emit()"
                  [loading]="kickstarting()"></button>
          @if (state() === 'ready' || state() === 'in_progress') {
            <button pButton label="Continue to Module" icon="pi pi-arrow-right" severity="secondary"
                    (click)="dismiss.emit()"></button>
          }
        </div>
      </p-card>
    </div>
  `,
    styles: [`
    .first-visit-overlay { max-width: 700px; margin: 2rem auto; }
    .overlay-header { text-align: center; margin-bottom: 1.5rem; }
    .module-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: var(--surface-100); margin-bottom: 0.75rem; }
    .module-desc { color: var(--text-color-secondary); max-width: 500px; margin: 0.5rem auto; }
    .readiness-bar { margin: 1.5rem 0; }
    .readiness-label { font-size: var(--font-size-base); color: var(--text-color-secondary); margin-bottom: 0.5rem; display: block; }
    .setup-steps { margin: 1.5rem 0; }
    .setup-steps h3 { font-size: var(--font-size-md); margin-bottom: 1rem; }
    .setup-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--surface-200); }
    .setup-step:last-child { border-bottom: none; }
    .step-content { flex: 1; }
    .step-label { display: block; font-weight: 500; }
    .step-desc { color: var(--text-color-secondary); }
    .overlay-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; }
  `]
})
export class ModuleFirstVisitOverlayComponent implements OnInit {
  @Input() moduleCode = '';
  @Output() startSetup = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  private readinessService = inject(ModuleReadinessService);
  private kickstartService = inject(ModuleKickstartService);
  private router = inject(Router);

  kickstarting = signal(false);
  state = signal<ReadinessState | null>(null);
  stages = signal<StageResult[]>([]);
  checks = signal<ReadinessCheck[]>([]);
  score = signal(0);
  maxScore = signal(0);

  moduleTitle = computed(() => MODULE_INFO[this.moduleCode]?.title || this.moduleCode);
  moduleDesc = computed(() => MODULE_INFO[this.moduleCode]?.description || '');
  moduleIcon = computed(() => MODULE_INFO[this.moduleCode]?.icon || 'pi-cog');

  readinessScore = computed(() => {
    const max = this.maxScore();
    return max > 0 ? Math.round((this.score() / max) * 100) : null;
  });

  stateLabel = computed(() => {
    const s = this.state();
    const labels: Record<string, string> = { ready: 'Ready', needs_setup: 'Needs Setup', in_progress: 'In Progress', attention_required: 'Attention Required' };
    return s ? labels[s] || s : 'Loading...';
  });

  stateSeverity = computed((): 'success' | 'info' | 'warn' | 'danger' => {
    const s = this.state();
    if (s === 'ready') return 'success';
    if (s === 'in_progress') return 'info';
    if (s === 'needs_setup') return 'warn';
    return 'danger';
  });

  setupSteps = computed<SetupStep[]>(() => {
    const stgs = this.stages();
    const chks = this.checks();
    const steps: SetupStep[] = [];

    for (const s of stgs) {
      const labels: Record<string, string> = {
        S0_entitlement: 'Module Licensed', S1_provisioning: 'Database Tables Provisioned',
        S2_kickstart: 'Initial Data Seeded', S3_lifecycle: 'Lifecycle Workflows Active',
        S4_events: 'Event Wiring Configured', S5_ui_shell: 'UI Navigation Registered',
        S6_operational: 'Operational Data Present',
      };
      steps.push({
        label: labels[s.stage] || s.stage,
        description: s.detail,
        completed: s.passed,
        action: s.passed ? undefined : 'Configure',
      });
    }

    for (const c of chks) {
      steps.push({
        label: c.label,
        description: c.detail,
        completed: c.passed,
        action: c.passed ? undefined : 'Fix',
      });
    }

    return steps;
  });

  ngOnInit(): void {
    if (!this.moduleCode) return;
    const report = this.readinessService.getModuleReport(this.moduleCode);
    if (report) {
      this.applyReport(report);
    } else {
      this.readinessService.getModuleReadiness(this.moduleCode).subscribe({
        next: r => this.applyReport(r),
        error: () => this.state.set('attention_required'),
      });
    }
  }

  onStepAction(step: SetupStep): void {
    if (step.route) {
      this.router.navigate([step.route]);
    } else {
      this.startSetup.emit();
    }
  }

  private applyReport(r: any): void {
    this.state.set(r.state ?? 'not_checked');
    this.score.set(r.score ?? 0);
    this.maxScore.set(r.maxScore ?? 100);
    this.stages.set(r.stages ?? []);
    this.checks.set(r.readinessChecks ?? []);
  }
}
