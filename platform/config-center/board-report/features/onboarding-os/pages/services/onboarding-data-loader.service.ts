import { Injectable, inject } from '@angular/core';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { OnboardingLookupService } from '../../services/onboarding-lookup.service';
import { OnboardingQuestion, OnboardingScore, OnboardingSession } from '../../models/onboarding.models';
import { devError, devWarn } from '../../utils/dev-logger';

/**
 * OnboardingDataLoaderService
 *
 * Centralizes data-loading responsibilities for the onboarding shell:
 * answers, scores, recommendations, lookups, and sector resolution.
 */
@Injectable()
export class OnboardingDataLoaderService {

  private api = inject(OnboardingApiService);
  private lookupService = inject(OnboardingLookupService);

  /** Cache of resolved lookup options per question (or question:parentValue key). */
  lookupOptionsCache: Record<string, Array<{ label: string; value: string; data?: Record<string, any> }>> = {};

  /** Set of cache keys currently being loaded (prevents duplicate requests). */
  private lookupLoading = new Set<string>();

  private static readonly EMPTY_OPTIONS: Array<{ label: string; value: string; data?: Record<string, any> }> = [];

  /** Column mapping for cascading dependent lookups. */
  private static readonly DEPENDS_COL_MAP: Record<string, string> = {
    lookup_cities: 'country_code',
    lookup_timezones: 'countries',
    lookup_frameworks: 'jurisdiction',
    lookup_sectors: 'parent_sector_code',
  };

  // ── Answer Loading ──

  /**
   * Load saved answers for a session and populate the answers dictionary.
   * Also triggers dependent lookup preloading and sector resolution.
   */
  loadAnswers(
    sessionId: string,
    answers: Record<string, any>,
    callbacks: {
      onAnswersLoaded: () => void;
      onScoresLoaded: (scores: OnboardingScore[]) => void;
      onRecommendationsLoaded: (recs: unknown[]) => void;
    },
  ): void {
    this.api.getAnswers(sessionId).subscribe({
      next: (rows) => {
        for (const rawRow of rows) {
          const row = rawRow as Record<string, any>;
          const val = row.answer_json ?? row.answer_text ?? row.answer_number ?? row.answer_bool ?? row.answer_date;
          if (val != null) answers[row.question_code as string] = val;
        }
        callbacks.onAnswersLoaded();
      },
      error: (e: unknown) => devError('[API]', e),
    });

    // Load scores for right panel
    this.api.getScores(sessionId).subscribe({
      next: (scores) => {
        callbacks.onScoresLoaded(
          (scores || []).map((s: Record<string, any>) => ({
            scoreType: s.score_type,
            scoreDomain: s.score_domain,
            scoreValue: Number(s.score_value),
            maxScore: Number(s.max_score),
            ratingLabel: s.rating_label,
          })),
        );
      },
      error: (e: unknown) => devError('[API]', e),
    });

    // Load recommendations for right panel
    this.api.getRecommendations(sessionId).subscribe({
      next: (recs) => callbacks.onRecommendationsLoaded(recs ?? []),
      error: (e: unknown) => devError('[API]', e),
    });
  }

  /**
   * Load scores only (used after save operations).
   */
  loadScores(sessionId: string, onScoresLoaded: (scores: OnboardingScore[]) => void): void {
    this.api.getScores(sessionId).subscribe({
      next: (scores) => {
        onScoresLoaded(
          (scores || []).map((s: Record<string, any>) => ({
            scoreType: s.score_type,
            scoreDomain: s.score_domain,
            scoreValue: Number(s.score_value),
            maxScore: Number(s.max_score),
            ratingLabel: s.rating_label,
          })),
        );
      },
      error: (e: unknown) => devError('[API]', e),
    });
  }

  /**
   * Load recommendations only.
   */
  loadRecommendations(sessionId: string, onRecommendationsLoaded: (recs: unknown[]) => void): void {
    this.api.getRecommendations(sessionId).subscribe({
      next: (recs) => onRecommendationsLoaded(recs ?? []),
      error: (e: unknown) => devError('[API]', e),
    });
  }

  /**
   * Load the current session by ID.
   */
  loadCurrentSession(sessionId: string, callbacks: {
    onSuccess: (session: OnboardingSession) => void;
    onError: (err: unknown) => void;
  }): void {
    this.api.getSession(sessionId).subscribe({
      next: (s) => callbacks.onSuccess(s),
      error: (err) => callbacks.onError(err),
    });
  }

  // ── Lookup Loading ──

  /**
   * Preload lookup options for all lookup-backed questions in the current stage.
   */
  preloadLookupsForCurrentStage(
    stageCode: string,
    questions: OnboardingQuestion[],
    answers: Record<string, any>,
    isAr: boolean,
  ): void {
    const stageQs = questions.filter(q => q.stage_code === stageCode && q.lookup_table);
    for (const q of stageQs) {
      if (q.lookup_depends_on) {
        const depValue = answers[q.lookup_depends_on] as string | undefined;
        if (depValue) {
          this.loadLookupForQuestion(q, isAr, depValue);
        }
      } else {
        this.loadLookupForQuestion(q, isAr);
      }
    }
  }

  /**
   * Load lookup options for a single question, optionally filtered by parent value.
   */
  loadLookupForQuestion(q: OnboardingQuestion, isAr: boolean, parentValue?: string): void {
    if (!q.lookup_table) return;
    const cacheKey = parentValue ? `${q.question_code}:${parentValue}` : q.question_code;
    if (this.lookupOptionsCache[cacheKey]?.length > 0 || this.lookupLoading.has(cacheKey)) return;

    this.lookupLoading.add(cacheKey);

    const dependsOnCol = q.lookup_depends_on
      ? (OnboardingDataLoaderService.DEPENDS_COL_MAP[q.lookup_table] || 'country_code')
      : undefined;

    this.lookupService.resolveLookup(q.lookup_table, parentValue, dependsOnCol).subscribe({
      next: (rows) => {
        const mapped = rows.map(r => ({
          label: this.formatLookupLabel(q.lookup_table!, r, isAr),
          value: r.value,
          data: r,
        }));
        this.lookupOptionsCache[cacheKey] = mapped;
        this.lookupLoading.delete(cacheKey);
      },
      error: (err) => {
        devError(`[Onboarding] Failed to load lookup ${q.lookup_table} for ${q.question_code}:`, err);
        this.lookupLoading.delete(cacheKey);
      },
    });
  }

  /**
   * Retrieve cached lookup options for a question, triggering a load if not yet cached.
   */
  getLookupOptions(
    q: OnboardingQuestion,
    answers: Record<string, any>,
    isAr: boolean,
  ): Array<{ label: string; value: string; data?: Record<string, any> }> {
    if (!q.lookup_table) return OnboardingDataLoaderService.EMPTY_OPTIONS;
    if (q.lookup_depends_on) {
      const depVal = answers[q.lookup_depends_on] as string | undefined;
      if (!depVal) return OnboardingDataLoaderService.EMPTY_OPTIONS;
      const cacheKey = `${q.question_code}:${depVal}`;
      const cached = this.lookupOptionsCache[cacheKey];
      if (!cached && !this.lookupLoading.has(cacheKey)) {
        this.loadLookupForQuestion(q, isAr, depVal);
      }
      return cached || OnboardingDataLoaderService.EMPTY_OPTIONS;
    }
    const cached = this.lookupOptionsCache[q.question_code];
    if (!cached && !this.lookupLoading.has(q.question_code)) {
      this.loadLookupForQuestion(q, isAr);
    }
    return cached || OnboardingDataLoaderService.EMPTY_OPTIONS;
  }

  /**
   * Format a lookup row into a human-readable label based on its table type.
   */
  formatLookupLabel(table: string, row: Record<string, any>, isAr: boolean): string {
    // Safe label getter -- fallback to English if Arabic is null/undefined/None
    const lbl = (r: Record<string, any>): string => {
      if (isAr && r.label_ar && r.label_ar !== 'None' && r.label_ar !== 'null') return r.label_ar as string;
      return (r.label_en || r.value || '') as string;
    };
    switch (table) {
      case 'lookup_countries':
        return `${row.flag_emoji || ''} ${lbl(row)}`.trim();
      case 'lookup_cities':
        return `${lbl(row)}${row.is_capital ? ' ★' : ''}`;
      case 'lookup_timezones':
        return `${row.value} (${row.utc_offset || ''})`;
      case 'lookup_languages':
        return `${row.language_name_native || lbl(row)} — ${row.label_en || row.value}`;
      case 'lookup_frameworks':
        return `${row.framework_acronym || row.value} — ${lbl(row)}`;
      case 'lookup_sectors':
        return `${row.value} — ${lbl(row)}`;
      case 'lookup_employee_ranges': {
        const etype = row.enterprise_type as string | undefined;
        if (!etype) return lbl(row);
        const etypeMap: Record<string, string> = { micro: 'صغيرة جداً', small: 'صغيرة', medium: 'متوسطة', large: 'كبيرة', enterprise: 'مؤسسة' };
        return `${lbl(row)} (${isAr ? (etypeMap[etype] || etype) : etype})`;
      }
      case 'lookup_maturity_levels':
        return `${row.color_code ? '● ' : ''}${lbl(row)}${row.level_number != null ? ` (L${row.level_number})` : ''}`;
      case 'lookup_sla_tiers':
        return `${lbl(row)}${row.hours ? ` — ${row.hours}h` : ''}${row.severity ? ` [${row.severity}]` : ''}`;
      case 'lookup_connectors':
        return `${lbl(row)}${row.category ? ` (${row.category})` : ''}`;
      case 'lookup_data_classifications':
        return `${row.color_code ? '● ' : ''}${lbl(row)}`;
      case 'lookup_sso_providers':
        return `${lbl(row)}${row.protocol ? ` — ${row.protocol}` : ''}`;
      case 'lookup_cloud_providers':
      case 'lookup_grc_tools':
        return `${lbl(row)}${row.vendor ? ` (${row.vendor})` : ''}`;
      case 'lookup_incident_categories':
        return `${lbl(row)}${row.severity ? ` [${row.severity}]` : ''}`;
      default:
        return lbl(row);
    }
  }
}
