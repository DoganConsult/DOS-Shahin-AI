import { Injectable, signal } from '@angular/core';

export type Category = 'core' | 'advanced' | 'premium' | 'ai';
export type Maturity = 'beginner' | 'intermediate' | 'advanced';

export interface CapabilityItem {
  content_id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  route: string;
  category: Category;
  relevanceTags: string[];
  detailContent: { en: string; ar: string };
}

export interface UserContext {
  sector: string;
  role: string;
  maturity: Maturity;
}

export interface ScoredCapability extends CapabilityItem {
  score: number;
  stage: string;
}

export interface StageGroup {
  stage: string;
  items: ScoredCapability[];
}

const SECTOR_TAG_MAP: Record<string, string[]> = {
  banking: ['banking', 'compliance', 'risk', 'vendor', 'audit', 'incident'],
  telecom: ['telecom', 'compliance', 'incident', 'bcp', 'risk'],
  government: ['government', 'governance', 'compliance', 'audit', 'bcp'],
  healthcare: ['healthcare', 'compliance', 'risk', 'incident'],
  energy: ['energy', 'compliance', 'risk', 'bcp'],
  education: ['education', 'governance', 'compliance'],
  general: ['all-sectors'],
};

const ROLE_TAG_MAP: Record<string, string[]> = {
  ciso: ['risk', 'incident', 'compliance', 'ai', 'digital-twin'],
  compliance_officer: ['compliance', 'controls', 'frameworks', 'audit', 'reports'],
  risk_manager: ['risk', 'vendor', 'controls', 'incident'],
  auditor: ['audit', 'evidence', 'compliance', 'controls'],
  executive: ['governance', 'risk', 'reports', 'ai'],
  general: ['all-sectors'],
};

const STAGE_DEFS = [
  { stage: 'foundation', categories: ['core'] },
  { stage: 'growth', categories: ['advanced'] },
  { stage: 'excellence', categories: ['premium', 'ai'] },
];

@Injectable({ providedIn: 'root' })
export class SequencingEngineService {
  readonly context = signal<UserContext>({
    sector: 'general',
    role: 'general',
    maturity: 'beginner',
  });

  updateContext(ctx: UserContext): void {
    this.context.set(ctx);
  }

  rankCapabilities(caps: CapabilityItem[], ctx?: UserContext): ScoredCapability[] {
    const c = ctx ?? this.context();
    return caps
      .map(cap => ({
        ...cap,
        score: this.scoreCapability(cap, c),
        stage: this.assignStageGroup(cap.category),
      }))
      .sort((a, b) => b.score - a.score);
  }

  groupByStage(scored: ScoredCapability[]): StageGroup[] {
    const map = new Map<string, ScoredCapability[]>();
    for (const s of scored) {
      const list = map.get(s.stage) ?? [];
      list.push(s);
      map.set(s.stage, list);
    }
    return STAGE_DEFS
      .map(d => ({ stage: d.stage, items: map.get(d.stage) ?? [] }))
      .filter(g => g.items.length > 0);
  }

  private scoreCapability(cap: CapabilityItem, ctx: UserContext): number {
    let score = 0;
    const tags = cap.relevanceTags || [];
    const sectorTags = SECTOR_TAG_MAP[ctx.sector] || SECTOR_TAG_MAP['general'];
    score += tags.filter(t => sectorTags.includes(t)).length * 10;
    const roleTags = ROLE_TAG_MAP[ctx.role] || ROLE_TAG_MAP['general'];
    score += tags.filter(t => roleTags.includes(t)).length * 8;
    if (tags.includes('all-sectors')) score += 5;
    if (ctx.maturity === 'beginner' && cap.category === 'core') score += 15;
    if (ctx.maturity === 'intermediate' && cap.category === 'advanced') score += 10;
    if (ctx.maturity === 'advanced' && (cap.category === 'premium' || cap.category === 'ai')) score += 12;
    return score;
  }

  private assignStageGroup(category: string): string {
    const def = STAGE_DEFS.find(d => d.categories.includes(category));
    return def?.stage || 'foundation';
  }
}
