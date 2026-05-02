import { Injectable, inject, computed } from '@angular/core';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingDataLoaderService } from './onboarding-data-loader.service';
import { StageDefinition } from '../../services/onboarding-config.service';
import { OnboardingQuestion, OnboardingBlocker } from '../../models/onboarding.models';
import { StageItem } from '../../components/story-rail/onboarding-story-rail.component';
import type { PainCard } from '../../services/onboarding-api.service';

@Injectable()
export class OnboardingNavigationService {
  private readonly store = inject(OnboardingStore);
  private readonly validationService = inject(OnboardingValidationService);
  private readonly dataLoader = inject(OnboardingDataLoaderService);

  readonly visibleStages = computed(() => {
    const allStages = this.store.stages();
    const qs = this.store.questions();
    return allStages.filter(s => {
      if (this.store.SPECIAL_STAGES.has(s.stageCode)) return true;
      return qs.some(q => q.stage_code === s.stageCode);
    });
  });

  readonly currentScene = computed(() => {
    const stage = this.activeStage;
    if (!stage) return null;
    return this.store.scenes().find(s => s.stage_codes.includes(stage.stageCode)) ?? null;
  });

  readonly activePainCards = computed(() => {
    const stage = this.activeStage;
    if (!stage || stage.stageCode !== 'pain_profile') return [];
    return this.store.painCards();
  });

  readonly activeModuleStates = computed(() => {
    return this.store.moduleStates().filter(m => m.state === 'on' || m.state === 'trial');
  });

  readonly storyRailStages = computed<StageItem[]>(() => {
    const all = this.visibleStages();
    return all.map((s, idx) => ({
      stageCode: s.stageCode,
      labelEn: s.labelEn ?? s.stageCode,
      labelAr: s.labelAr ?? s.stageCode,
      descriptionEn: s.descriptionEn,
      descriptionAr: s.descriptionAr,
      iconClass: s.iconClass,
      status: this.getStageStatus(s.stageCode) === 'completed' ? 'completed' as const
        : this.store.activeStageIdx() === idx ? 'in_progress' as const
        : 'pending' as const,
      percent: this.getStagePercent(s.stageCode),
    }));
  });

  readonly skippedQuestionCount = computed(() => {
    const stage = this.activeStage;
    if (!stage) return 0;
    const allStageQs = this.store.questions().filter(q => q.stage_code === stage.stageCode);
    const visibleQs = this.currentQuestions();
    return Math.max(0, allStageQs.length - visibleQs.length);
  });

  readonly canSkipCurrentStage = computed(() => {
    const cfg = this.store.uiConfig();
    if (!cfg?.features?.enableStageSkip) return false;
    const stage = this.activeStage;
    return !!stage && !stage.isRequired && !this.store.SPECIAL_STAGES.has(stage.stageCode);
  });

  get activeStage(): StageDefinition | undefined {
    return this.visibleStages()[this.store.activeStageIdx()];
  }

  get isQuestionStage(): boolean {
    const code = this.activeStage?.stageCode;
    return !!code && !this.store.SPECIAL_STAGES.has(code);
  }

  get isReviewStage(): boolean {
    return this.activeStage?.stageCode === 'review_confirmation';
  }

  get isProvisionStage(): boolean {
    return this.activeStage?.stageCode === 'provision_workspace';
  }

  get isDedicatedComponentStage(): boolean {
    const code = this.activeStage?.stageCode;
    return !!code && this.store.DEDICATED_COMPONENT_STAGES.has(code);
  }

  isSpecialStageCode(code: string): boolean {
    return this.store.SPECIAL_STAGES.has(code);
  }

  goToStage(idx: number): void {
    this.store.validationErrors = {};
    this.store.activeStageIdx.set(idx);
    const stage = this.visibleStages()[idx];
    if (stage?.stageCode === 'review_confirmation') {
      return;
    }
    if (stage && !this.store.SPECIAL_STAGES.has(stage.stageCode)) {
      this.preloadLookupsForCurrentStage();
    }
  }

  skipCurrentStage(): void {
    const next = Math.min(this.store.activeStageIdx() + 1, this.visibleStages().length - 1);
    this.goToStage(next);
  }

  navigateToBlocker(blocker: OnboardingBlocker): void {
    const stageCode = blocker.stage_code as string | undefined;
    if (stageCode) {
      this.navigateToStageCode(stageCode);
    } else {
      this.goToStage(0);
    }
  }

  navigateToStageCode(stageCode: string): void {
    const idx = this.findVisibleStageIndex(stageCode);
    this.goToStage(idx >= 0 ? idx : 0);
  }

  findVisibleStageIndex(stageCode: string): number {
    return this.visibleStages().findIndex(s => s.stageCode === stageCode);
  }

  maxReachableStage(): number {
    const s = this.store.session();
    const vis = this.visibleStages();
    const maxIdx = vis.length - 1;
    if (!s || maxIdx < 0) return 0;
    if (s.status === 'provisioning' || s.status === 'active') return maxIdx;
    if (s.status === 'review_ready' || s.status === 'approved_for_provisioning') return Math.max(0, maxIdx - 1);
    const maxCompleted = vis.reduce((max, st, idx) => {
      const stageData = s.stages?.find(ss => ss.stage_code === st.stageCode);
      return (stageData?.status === 'completed' || (stageData?.percent_complete ?? 0) > 0)
        ? Math.max(max, idx) : max;
    }, -1);
    return Math.min(maxIdx, maxCompleted + 2);
  }

  getStageStatus(stageCode: string): string {
    return this.store.session()?.stages?.find(s => s.stage_code === stageCode)?.status ?? 'not_started';
  }

  getStagePercent(stageCode: string): number {
    const stageObj = this.store.session()?.stages?.find(s => s.stage_code === stageCode);
    if (stageObj?.percent_complete != null && stageObj.percent_complete > 0) return Number(stageObj.percent_complete);
    const stageQs = this.store.questions().filter(q => q.stage_code === stageCode);
    if (stageQs.length === 0) return 100;
    const answered = stageQs.filter(q => {
      const v = this.store.answers[q.question_code];
      return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
    return Math.round((answered / stageQs.length) * 100);
  }

  getStageBlockerCount(stageCode: string): number {
    const review = this.store.review();
    if (!review?.blockers) return 0;
    return review.blockers.filter(b => b.stage_code === stageCode).length;
  }

  getStageTimeEstimate(stage: StageDefinition): string | null {
    const qs = this.store.questions().filter(q => q.stage_code === stage.stageCode);
    if (qs.length === 0) return null;
    const minutes = Math.max(1, Math.ceil(qs.length * 0.5));
    return this.store.isAr ? `~${minutes} د` : `~${minutes} min`;
  }

  currentQuestions(): OnboardingQuestion[] {
    const stage = this.activeStage;
    if (!stage) return [];
    const stageCode = stage.stageCode;
    const profile = this.store.selectedProfile();
    const visibleTiers = profile?.question_tiers_visible ?? ['anchor', 'inferred', 'advanced', 'expert'];
    return this.store.questions()
      .filter(q => {
        if (q.stage_code !== stageCode) return false;
        if (!this.validationService.isQuestionVisible(q, this.store.answers)) return false;
        const tier = (q as OnboardingQuestion & { question_tier?: string }).question_tier ?? 'anchor';
        if (tier === 'hidden') return false;
        return visibleTiers.includes(tier);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  currentSections(): Array<{ code: string; label: string; icon: string; questions: OnboardingQuestion[] }> {
    const qs = this.currentQuestions();
    if (qs.length === 0) return [];
    const grouped = new Map<string, OnboardingQuestion[]>();
    const order: string[] = [];
    for (const q of qs) {
      const sec = q.section_code || '_default';
      if (!grouped.has(sec)) { grouped.set(sec, []); order.push(sec); }
      grouped.get(sec)!.push(q);
    }
    return order.map(code => {
      const meta = this.store.SECTION_LABELS[code];
      return {
        code,
        label: meta ? (this.store.isAr ? meta.ar : meta.en) : code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: meta?.icon || 'pi-circle',
        questions: grouped.get(code)!,
      };
    });
  }

  answeredCount(): number {
    const activeKeys = new Set(this.store.questions().map(q => q.question_code));
    return Object.keys(this.store.answers).filter(k => activeKeys.has(k) && this.store.answers[k] != null && this.store.answers[k] !== '').length;
  }

  activeQuestionCount(): number {
    return this.store.questions().length;
  }

  suggestedModules(): string[] {
    const liveModules = this.store.sectorResolution()?.modules;
    if (liveModules && liveModules.length > 0) {
      return liveModules.map((m: string) => m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));
    }
    const dbModules = this.store.review()?.impactSummary?.modules;
    if (dbModules && dbModules.length > 0) {
      return dbModules.map(m => m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
    return [];
  }

  getWillCreateItems(): Array<{ labelEn: string; labelAr: string; count: number }> {
    const sr = this.store.sectorResolution();
    if (!sr) return [];
    const items: Array<{ labelEn: string; labelAr: string; count: number }> = [];
    if (sr.controlCount) items.push({ labelEn: 'Controls', labelAr: 'ضوابط', count: sr.controlCount });
    if (sr.evidenceTaskCount) items.push({ labelEn: 'Evidence Tasks', labelAr: 'مهام الأدلة', count: sr.evidenceTaskCount });
    if ((sr as Record<string, any>)['riskCount']) items.push({ labelEn: 'Risks', labelAr: 'مخاطر', count: (sr as Record<string, any>)['riskCount'] as number });
    if ((sr as Record<string, any>)['policyCount']) items.push({ labelEn: 'Policies', labelAr: 'سياسات', count: (sr as Record<string, any>)['policyCount'] as number });
    return items;
  }

  getResolvedOptions(q: OnboardingQuestion): Array<{ label: string; value: string }> {
    if (q.lookup_table) return this.store.answerSvc.getLookupOptions(q) as Array<{ label: string; value: string }>;
    return this.store.answerSvc.mapOptions(q);
  }

  getQuestionLabel(questionCode: string): string {
    const q = this.store.questions().find(q => q.question_code === questionCode);
    if (q) return this.store.isAr ? q.label_ar : q.label_en;
    const labels: Record<string, string> = {
      'org.display_name': this.store.isAr ? 'اسم المؤسسة' : 'Organization Name',
      'org.legal_name': this.store.isAr ? 'الاسم القانوني' : 'Legal Name',
      'org.country': this.store.isAr ? 'الدولة' : 'Country',
      'org.industry': this.store.isAr ? 'القطاع' : 'Industry',
      'org.tenant_slug': this.store.isAr ? 'معرف الجهة' : 'Tenant Slug',
      'people.tenant_admin_email': this.store.isAr ? 'بريد مسؤول الجهة' : 'Tenant Admin Email',
    };
    return labels[questionCode] || questionCode;
  }

  getStageCodeForQuestion(questionCode: string): string | undefined {
    const q = this.store.questions().find(q => q.question_code === questionCode);
    if (q) return q.stage_code;
    if (questionCode.startsWith('org.')) return 'organization_identity';
    if (questionCode.startsWith('reg.')) return 'regulatory_scope';
    if (questionCode.startsWith('tech.')) return 'technology_landscape';
    if (questionCode.startsWith('gov.')) return 'governance_model';
    if (questionCode.startsWith('maturity.')) return 'risk_compliance_maturity';
    if (questionCode.startsWith('ops.')) return 'operating_model';
    if (questionCode.startsWith('people.')) return 'people_ownership';
    return undefined;
  }

  getTooltip(q: OnboardingQuestion): string {
    if (!q.tooltip_en && !q.tooltip_ar) return '';
    return this.store.isAr ? (q.tooltip_ar || '') : (q.tooltip_en || '');
  }

  getQuestionNumber(q: OnboardingQuestion): string {
    const allQs = this.currentQuestions();
    const idx = allQs.findIndex(x => x.question_code === q.question_code);
    return `${idx + 1}`;
  }

  preloadLookupsForCurrentStage(): void {
    const stage = this.activeStage;
    if (!stage) return;
    this.dataLoader.preloadLookupsForCurrentStage(
      stage.stageCode,
      this.store.questions(),
      this.store.answers,
      this.store.isAr,
    );
  }

  applySessionStageJump(): void {
    const s = this.store.session();
    if (!s) return;
    const vis = this.visibleStages();
    if (vis.length === 0) return;
    if (s.status === 'provisioning' || s.status === 'provisioned' || s.status === 'active') {
      const idx = this.findVisibleStageIndex('provision_workspace');
      if (idx >= 0) this.store.activeStageIdx.set(idx);
    } else if (s.status === 'review_ready' || s.status === 'approved_for_provisioning') {
      const idx = this.findVisibleStageIndex('review_confirmation');
      if (idx >= 0) this.store.activeStageIdx.set(idx);
    }
  }

  trackStage = (_: number, stage: StageDefinition) => stage.stageCode;
  trackSection = (_: number, sec: { code: string }) => sec.code;
  trackQuestion = (_: number, q: OnboardingQuestion) => q.question_code;
}
