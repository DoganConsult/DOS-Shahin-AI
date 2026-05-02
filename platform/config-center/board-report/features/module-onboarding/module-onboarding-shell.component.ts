/**
 * ModuleOnboardingShellComponent
 *
 * Lightweight onboarding shell for per-module setup. No registration gate —
 * workspace must already be provisioned. Loads questions from the DB-driven
 * question bank filtered by module_code.
 *
 * Route: /modules/:moduleCode/setup
 */

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import {
  QuestionRendererComponent,
  AnswerChangedEvent,
} from '../onboarding-os/components/question-renderer.component';
import type { OnboardingQuestion, SaveAnswerDto } from '../onboarding-os/models/onboarding.models';
import { environment } from '@env/environment';
import { toErrorMessage } from '../../../shared/utils/error';
import { GrcRecord } from '@app/core/models/shared.types';
import { LottieStateComponent } from '@app/shared/components/layouts/primitives/lottie-state.component';

interface StageGroup {
  stageCode: string;
  label: string;
  questions: OnboardingQuestion[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-onboarding-shell',
    imports: [
        CommonModule, StepsModule, ButtonModule, CardModule,
        ProgressBarModule, MessageModule, QuestionRendererComponent, LottieStateComponent,
    ],
    template: `
    <div class="module-onboarding">
      <div class="header">
        <h2>{{ moduleLabel() }} Setup</h2>
        <p class="subtitle">Configure {{ moduleCode() }} module for your workspace</p>
      </div>

      @if (loading()) {
        <app-lottie-state state="loading" message="Loading module setup..." messageAr="جارٍ تحميل إعداد الوحدة..." [width]="140" [height]="140" />
      } @else if (error()) {
        <p-message severity="error" [text]="error()!"></p-message>
      } @else if (provisioned()) {
        <p-card>
          <div class="text-center py-4">
            <app-lottie-state state="success" [message]="moduleLabel() + ' module is now active'" [messageAr]="moduleLabel() + ' الوحدة نشطة الآن'" [width]="120" [height]="120" [loop]="false" />
            <p>{{ seedResult()?.appliedCount || 0 }} settings applied successfully.</p>
            <button pButton [label]="i18n.translate('onboarding.goToDashboard')" icon="pi pi-arrow-right"
                    (click)="goToDashboard()" class="mt-3"></button>
          </div>
        </p-card>
      } @else {
        <!-- Stepper -->
        @if (stages().length > 1) {
          <p-steps [model]="stepItems()" [activeIndex]="activeStageIdx()"
                   (activeIndexChange)="activeStageIdx.set($event)" [readonly]="false"
                   styleClass="mb-4">
          </p-steps>
        }

        <!-- Questions for current stage -->
        <p-card>
          @for (q of currentQuestions(); track q.question_code) {
            <app-question-renderer
              [question]="q"
              [currentValue]="answers()[q.question_code]"
              (answerChanged)="onAnswer($event)">
            </app-question-renderer>
          }

          @if (currentQuestions().length === 0) {
            <p class="text-color-secondary text-center py-3">No questions for this stage.</p>
          }
        </p-card>

        <!-- Navigation -->
        <div class="nav-buttons mt-3">
          @if (activeStageIdx() > 0) {
            <button pButton [label]="i18n.translate('onboarding.previous')" icon="pi pi-arrow-left" severity="secondary"
                    (click)="prev()"></button>
          }
          <span class="flex-grow-1"></span>
          @if (activeStageIdx() < stages().length - 1) {
            <button pButton [label]="i18n.translate('onboarding.next')" icon="pi pi-arrow-right" iconPos="right"
                    (click)="next()"></button>
          } @else {
            <button pButton [label]="i18n.translate('onboarding.reviewAndActivate')" icon="pi pi-check" severity="success"
                    (click)="provision()" [loading]="provisioning()"></button>
          }
        </div>

        <!-- Auto-save indicator -->
        @if (saving()) {
          <small class="text-color-secondary mt-2 block">Saving...</small>
        }
      }
    </div>
  `,
    styles: [`
    .module-onboarding { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    .header { margin-bottom: 2rem; }
    .header h2 { margin: 0; font-size: var(--font-size-2xl); }
    .subtitle { color: var(--text-color-secondary); margin-top: 0.25rem; }
    .nav-buttons { display: flex; gap: 1rem; align-items: center; }
    .flex-grow-1 { flex-grow: 1; }
  `]
})
export class ModuleOnboardingShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  readonly i18n = inject(I18nService);

  moduleCode = signal('');
  sessionId = signal('');
  loading = signal(true);
  saving = signal(false);
  provisioning = signal(false);
  provisioned = signal(false);
  error = signal<string | null>(null);
  activeStageIdx = signal(0);
  answers = signal<Record<string, unknown>>({});
  seedResult = signal<{ appliedCount: number; skippedCount: number } | null>(null);

  private allQuestions = signal<OnboardingQuestion[]>([]);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  moduleLabel = computed(() => {
    const labels: Record<string, string> = {
      foundation: 'Foundation', governance: 'Governance', risk: 'Risk Management',
      compliance: 'Compliance', evidence: 'Evidence', audit: 'Audit',
      reports: 'Reports', qiyas: 'Qiyas',
    };
    return labels[this.moduleCode()] || this.moduleCode();
  });

  stages = computed<StageGroup[]>(() => {
    const qs = this.allQuestions();
    const map = new Map<string, OnboardingQuestion[]>();
    for (const q of qs) {
      const stage = q.stage_code || 'default';
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(q);
    }
    return [...map.entries()].map(([code, questions]) => ({
      stageCode: code,
      label: code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      questions,
    }));
  });

  stepItems = computed(() =>
    this.stages().map(s => ({ label: s.label }))
  );

  currentQuestions = computed(() => {
    const idx = this.activeStageIdx();
    return this.stages()[idx]?.questions || [];
  });

  async ngOnInit(): Promise<void> {
    const moduleCode = this.route.snapshot.paramMap.get('moduleCode') || '';
    this.moduleCode.set(moduleCode);

    try {
      // Start session
      const startRes = await firstValueFrom(
        this.http.post<GrcRecord>(`${environment.apiUrl}/modules/${moduleCode}/onboarding/start`, {})
      );
      this.sessionId.set(String(startRes['sessionId'] ?? ''));

      // Load questions
      const qRes = await firstValueFrom(
        this.http.get<GrcRecord>(`${environment.apiUrl}/modules/${moduleCode}/onboarding/questions`)
      );
      this.allQuestions.set((qRes['questions'] as OnboardingQuestion[]) || []);

      this.loading.set(false);
    } catch (err: unknown) {
      this.error.set(((err as GrcRecord).error)?.error || toErrorMessage(err) || 'Failed to load module onboarding');
      this.loading.set(false);
    }
  }

  onAnswer(event: AnswerChangedEvent): void {
    this.answers.update(a => ({ ...a, [event.questionCode]: event.value }));
    this.debouncedSave();
  }

  prev(): void {
    this.activeStageIdx.update(i => Math.max(0, i - 1));
  }

  next(): void {
    this.activeStageIdx.update(i => Math.min(this.stages().length - 1, i + 1));
  }

  async provision(): Promise<void> {
    this.provisioning.set(true);
    try {
      // Save any pending answers
      await this.saveAnswers();

      // Provision
      const res: GrcRecord = await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/modules/${this.moduleCode()}/onboarding/sessions/${this.sessionId()}/provision`,
          {}
        )
      );
      this.seedResult.set(res.seedResult);
      this.provisioned.set(true);
    } catch (err: unknown) {
      this.error.set(((err as GrcRecord).error)?.error || toErrorMessage(err) || 'Provisioning failed');
    } finally {
      this.provisioning.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/big_picture']);
  }

  private debouncedSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveAnswers(), 800);
  }

  private async saveAnswers(): Promise<void> {
    const answers = this.answers();
    const payload: SaveAnswerDto[] = Object.entries(answers).map(([questionCode, value]) => ({
      questionCode,
      answerText: typeof value === 'string' ? value : null,
      answerNumber: typeof value === 'number' ? value : null,
      answerBool: typeof value === 'boolean' ? value : null,
      answerJson: Array.isArray(value) || (typeof value === 'object' && value !== null) ? value : null,
    }));

    if (payload.length === 0) return;

    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.put(
          `${environment.apiUrl}/modules/${this.moduleCode()}/onboarding/sessions/${this.sessionId()}/answers`,
          { answers: payload }
        )
      );
    } catch { /* silently ignore save failures */ }
    this.saving.set(false);
  }
}
