import { Injectable, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingDataLoaderService } from './onboarding-data-loader.service';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import {
  OnboardingQuestion,
  SaveAnswerDto,
  InferredFact,
  ConfidenceDimension,
  SectorResolutionResult,
} from '../../models/onboarding.models';
import type { LiveInferenceResult } from '../../services/onboarding-api.service';
import { devError } from '../../utils/dev-logger';

/** Context the component provides so debounced autosave can resolve session/stage lazily. */
export interface AutoSaveContext {
  getSessionId: () => string | null;
  getStageCode: () => string | null;
  getCurrentQuestions: () => OnboardingQuestion[];
  onSessionUpdate: (session: Record<string, unknown>) => void;
  onScoresUpdate: (scores: unknown) => void;
}

@Injectable()
export class OnboardingAnswerService {
  readonly saving = signal(false);
  readonly lastSaved = signal(false);
  readonly sectorResolution = signal<SectorResolutionResult | null>(null);
  readonly liveInferenceData = signal<LiveInferenceResult | null>(null);
  readonly inferenceComputing = signal(false);
  readonly inferredFacts = signal<InferredFact[]>([]);
  readonly confidenceScores = signal<ConfidenceDimension[]>([]);
  readonly answersVersion = signal(0);
  readonly hasOfflineQueue = signal(false);

  answers: Record<string, unknown> = {};
  validationErrors: Record<string, string> = {};

  private mapOptionsCache = new Map<string, Array<{ label: string; value: string }>>();
  private lastResolvedSector = '';
  private saveDebounce: ReturnType<typeof setTimeout> | null;
  private autoSaveCtx: AutoSaveContext | null = null;

  private readonly api = inject(OnboardingApiService);
  private readonly validationService = inject(OnboardingValidationService);
  private readonly dataLoader = inject(OnboardingDataLoaderService);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private readonly messageService = inject(MessageService);

  get isAr(): boolean { return this.platform.i18n.currentLang() === 'ar'; }

  /** Component must call this once in ngOnInit so debounced autosave can resolve context lazily. */
  setAutoSaveContext(ctx: AutoSaveContext): void {
    this.autoSaveCtx = ctx;
  }

  onAnswer(questionCode: string, value: unknown, questions: OnboardingQuestion[], uiConfig: unknown): void {
    this.answers[questionCode] = value;
    this.answersVersion.update(v => v + 1);
    const err = this.validationService.validateField(questionCode, value, questions, this.isAr);
    if (err) { this.validationErrors[questionCode] = err; } else { delete this.validationErrors[questionCode]; }
    this.lastSaved.set(false);
    this.scheduleDebouncedSave(uiConfig);
  }

  /** Schedule a debounced autosave. Uses the lazy context from the component. */
  private scheduleDebouncedSave(uiConfig: unknown): void {
    clearTimeout(this.saveDebounce!);
    const cfg = uiConfig as Record<string, unknown> | null;
    const behavior = cfg?.behavior as Record<string, unknown> | undefined;
    const delay = (behavior?.autosaveDelayMs as number) ?? 2000;
    this.saveDebounce = setTimeout(() => {
      if (!this.autoSaveCtx) return;
      this.autoSave(
        this.autoSaveCtx.getSessionId(),
        this.autoSaveCtx.getStageCode(),
        this.autoSaveCtx.getCurrentQuestions(),
        this.autoSaveCtx.onSessionUpdate,
        this.autoSaveCtx.onScoresUpdate,
      );
    }, delay);
  }

  autoSave(sessionId: string | null, stageCode: string | null, currentQuestions: OnboardingQuestion[], sessionSetter?: (s: Record<string, unknown>) => void, scoresSetter?: (s: unknown) => void): void {
    if (!sessionId || !stageCode) return;
    const stageAnswers = currentQuestions
      .filter(q => this.answers[q.question_code] != null)
      .map(q => this.buildSaveDto(q.question_code));
    if (stageAnswers.length === 0) return;

    this.saving.set(true);
    this.api.saveAnswers(sessionId, { stageCode, answers: stageAnswers }).subscribe({
      next: (raw) => {
        const res = raw as Record<string, unknown> | null;
        this.saving.set(false);
        this.lastSaved.set(true);
        if (res?.session && sessionSetter) sessionSetter(res.session as Record<string, unknown>);
        if (res?.scores && scoresSetter) {
          scoresSetter((res.scores as Array<Record<string, unknown>>).map((sc: Record<string, unknown>) => ({
            scoreType: sc.scoreType, scoreDomain: sc.scoreDomain,
            scoreValue: sc.scoreValue, maxScore: sc.maxScore, ratingLabel: sc.ratingLabel
          })));
        }
        this.fetchSectorResolution();
        this.triggerLiveInference();
        this.triggerInferredFactsCompute(sessionId);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.isAr ? 'فشل الحفظ التلقائي' : 'Auto-save failed',
          detail: this.isAr ? 'لم يتم حفظ التغييرات. حاول مرة أخرى.' : 'Changes were not saved. Please try again.',
          life: 4000,
        });
      }
    });
  }

  saveAndContinue(
    sessionId: string,
    stageCode: string,
    currentQuestions: OnboardingQuestion[],
    callbacks: {
      onSuccess: (res: unknown) => void;
      onError: (err: unknown) => void;
    },
  ): void {
    // Cancel any pending debounced save — explicit save takes over
    clearTimeout(this.saveDebounce!);

    const stageQuestionCodes = new Set(currentQuestions.map(q => q.question_code));
    const allAnswers = Object.keys(this.answers)
      .filter(k => stageQuestionCodes.has(k) && this.answers[k] != null)
      .map(k => this.buildSaveDto(k));

    this.saving.set(true);
    this.api.saveAnswers(sessionId, { stageCode, answers: allAnswers }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.lastSaved.set(true);
        callbacks.onSuccess(res);
      },
      error: (err) => {
        this.saving.set(false);
        callbacks.onError(err);
      }
    });
  }

  validateCurrentStage(currentQuestions: OnboardingQuestion[]): boolean {
    const visibleQuestions = currentQuestions.filter(q => this.validationService.isQuestionVisible(q, this.answers));
    const requiredMissing: string[] = [];
    for (const q of visibleQuestions) {
      if (!q.is_required) continue;
      const val = this.answers[q.question_code];
      if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
        this.validationErrors[q.question_code] = this.isAr ? 'هذا الحقل مطلوب' : 'This field is required';
        requiredMissing.push(this.isAr ? q.label_ar : q.label_en);
      }
    }
    if (requiredMissing.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.isAr ? 'حقول مطلوبة مفقودة' : 'Required fields missing',
        detail: requiredMissing.slice(0, 3).join(', ') + (requiredMissing.length > 3 ? ` (+${requiredMissing.length - 3})` : ''),
        life: 6000,
      });
      return false;
    }
    for (const q of visibleQuestions) {
      if (q.question_type === 'json' && (q.ui_variant === 'contacts_table' || q.ui_variant === 'invite_table')) {
        const rows = this.getJsonRows(q.question_code);
        const incomplete = rows.filter((r: Record<string, unknown>) => r.email && !r.role);
        if (incomplete.length > 0) {
          this.validationErrors[q.question_code] = this.isAr
            ? (q.ui_variant === 'contacts_table' ? 'يرجى اختيار الدور لكل جهة اتصال' : 'يرجى اختيار الدور لكل مستخدم مدعو')
            : (q.ui_variant === 'contacts_table' ? 'Please select a role for each contact' : 'Please select a role for each invited user');
        }
      }
    }
    const hasErrors = Object.keys(this.validationErrors).some(k =>
      visibleQuestions.some(q => q.question_code === k)
    );
    if (hasErrors) {
      this.messageService.add({
        severity: 'warn',
        summary: this.isAr ? 'أخطاء في البيانات' : 'Validation errors',
        detail: this.isAr ? 'يرجى تصحيح الأخطاء المشار إليها قبل المتابعة' : 'Please fix the highlighted errors before continuing',
        life: 5000,
      });
      return false;
    }
    return true;
  }

  buildSaveDto(questionCode: string): SaveAnswerDto {
    const val = this.answers[questionCode];
    const dto: SaveAnswerDto = { questionCode };
    if (typeof val === 'boolean') dto.answerBool = val;
    else if (typeof val === 'number') dto.answerNumber = val;
    else if (typeof val === 'string') dto.answerText = val;
    else if (val != null) dto.answerJson = val;
    return dto;
  }

  // ── Chip helpers ──
  addChip(questionCode: string, event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const val = input.value?.trim();
    if (!val) return;
    if (!Array.isArray(this.answers[questionCode])) this.answers[questionCode] = [];
    (this.answers[questionCode] as unknown[]).push(val);
    input.value = '';
    this.markDirtyAndScheduleSave(questionCode);
  }

  removeChip(questionCode: string, index: number): void {
    if (!Array.isArray(this.answers[questionCode])) return;
    (this.answers[questionCode] as unknown[]).splice(index, 1);
    this.markDirtyAndScheduleSave(questionCode);
  }

  // ── JSON row helpers ──
  getJsonRows(questionCode: string): unknown[] {
    const val = this.answers[questionCode];
    return Array.isArray(val) ? val : [];
  }

  addJsonRow(questionCode: string, template: Record<string, string>): void {
    if (!Array.isArray(this.answers[questionCode])) this.answers[questionCode] = [];
    (this.answers[questionCode] as unknown[]).push({ ...template });
    this.markDirtyAndScheduleSave(questionCode);
  }

  removeJsonRow(questionCode: string, index: number): void {
    if (!Array.isArray(this.answers[questionCode])) return;
    (this.answers[questionCode] as unknown[]).splice(index, 1);
    this.markDirtyAndScheduleSave(questionCode);
  }

  updateJsonField(questionCode: string, rowIndex: number, field: string, value: unknown): void {
    const arr = this.answers[questionCode];
    if (!Array.isArray(arr)) return;
    if (!arr[rowIndex]) return;
    (arr[rowIndex] as Record<string, unknown>)[field] = value;
    this.markDirtyAndScheduleSave(questionCode);
  }

  jsonStringify(questionCode: string): string {
    const val = this.answers[questionCode];
    if (val == null) return '';
    try { return JSON.stringify(val, null, 2); } catch { return ''; }
  }

  jsonParse(questionCode: string, text: string): void {
    try {
      const parsed = JSON.parse(text);
      this.answers[questionCode] = parsed;
      this.markDirtyAndScheduleSave(questionCode);
    } catch (e) { devError('[catch]', e); }
  }

  /** Mark answer dirty + schedule debounced autosave (used by chip/json helpers that bypass full onAnswer). */
  private markDirtyAndScheduleSave(_questionCode: string): void {
    this.lastSaved.set(false);
    this.answersVersion.update(v => v + 1);
    this.scheduleDebouncedSave(null);
  }

  // ── Option mapping ──
  mapOptions(q: OnboardingQuestion): Array<{ label: string; value: string }> {
    const cacheKey = `${q.question_code}:${this.isAr ? 'ar' : 'en'}`;
    const cached = this.mapOptionsCache.get(cacheKey);
    if (cached) return cached;
    let opts = q.options_json;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { opts = []; }
    }
    if (!Array.isArray(opts)) opts = [];
    const isSector = q.question_code === 'org.industry';
    const mapped = opts.map((o: Record<string, unknown>) => {
      const name = (this.isAr ? (o.label_ar || o.label_en || o.value) : (o.label_en || o.label_ar || o.value)) as string;
      return {
        label: isSector ? `${o.value} — ${name}` : name,
        value: o.value as string,
      };
    });
    this.mapOptionsCache.set(cacheKey, mapped);
    return mapped;
  }

  getLookupOptions(q: OnboardingQuestion): Array<{ label: string; value: string; data?: Record<string, unknown> }> {
    return this.dataLoader.getLookupOptions(q, this.answers, this.isAr);
  }

  onLookupAnswer(q: OnboardingQuestion, value: unknown, questions: OnboardingQuestion[], uiConfig: unknown): void {
    this.answers[q.question_code] = value;
    const err = this.validationService.validateField(q.question_code, value, questions, this.isAr);
    if (err) { this.validationErrors[q.question_code] = err; } else { delete this.validationErrors[q.question_code]; }
    this.lastSaved.set(false);

    const dependents = questions.filter(dq => dq.lookup_depends_on === q.question_code);
    for (const dep of dependents) {
      this.answers[dep.question_code] = null;
      if (value) {
        this.dataLoader.loadLookupForQuestion(dep, this.isAr, value as string);
      }
    }

    if (q.lookup_table === 'lookup_countries' && value) {
      const tzQ = questions.find(tq => tq.lookup_table === 'lookup_timezones');
      if (tzQ) {
        const cacheKey = `${tzQ.question_code}:${value}`;
        if (!this.dataLoader.lookupOptionsCache[cacheKey]) {
          this.dataLoader.loadLookupForQuestion(tzQ, this.isAr, value as string);
        }
      }
    }

    this.scheduleDebouncedSave(uiConfig);
  }

  // ── Sector resolution ──
  fetchSectorResolution(): void {
    const sector = (this.answers['gov.primary_sector'] || this.answers['org.industry']) as string | undefined;
    if (!sector || typeof sector !== 'string' || sector.length < 1) return;
    if (sector === this.lastResolvedSector) return;
    this.lastResolvedSector = sector;
    this.api.getReviewPreview(sector).subscribe({
      next: (res: SectorResolutionResult) => this.sectorResolution.set(res),
      error: (e: unknown) => devError('[API]', e),
    });
  }

  // ── Live inference ──
  private triggerLiveInference(): void {
    if (!this.answers || Object.keys(this.answers).length === 0) return;
    this.inferenceComputing.set(true);
    this.api.liveInference(this.answers).subscribe({
      next: (result) => {
        this.liveInferenceData.set(result);
        this.inferenceComputing.set(false);
      },
      error: () => { this.inferenceComputing.set(false); },
    });
  }

  private triggerInferredFactsCompute(sessionId: string): void {
    if (!this.answers || Object.keys(this.answers).length === 0) return;
    this.api.computeInferredFacts(sessionId, this.answers).subscribe({
      next: (res) => this.inferredFacts.set(res.facts ?? []),
      error: () => {},
    });
    this.api.computeConfidenceScores(sessionId).subscribe({
      next: (res) => this.confidenceScores.set(res.scores ?? []),
      error: () => {},
    });
  }

  clearOptionsCache(): void {
    this.mapOptionsCache.clear();
  }

  destroy(): void {
    clearTimeout(this.saveDebounce!);
    this.autoSaveCtx = null;
  }
}
