import { safeQuery } from "@dos/db";

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  1: 'Initial',
  2: 'Managed',
  3: 'Defined',
  4: 'Quantitatively Managed',
  5: 'Optimizing',
};

export const MATURITY_LABELS_AR: Record<MaturityLevel, string> = {
  1: 'أولي',
  2: 'مُدار',
  3: 'مُعرَّف',
  4: 'مُدار كمياً',
  5: 'مُحسَّن',
};

export interface MaturityDimension {
  key: string;
  name: string;
  nameAr: string;
  score: number;
  level: MaturityLevel;
  levelLabel: string;
  /** Quantitative indicators driving the score */
  indicators: Record<string, number>;
  maxScore: number;
}

export interface SectorMaturityResult {
  overallScore: number;
  overallLevel: MaturityLevel;
  overallLevelLabel: string;
  dimensions: MaturityDimension[];
  sectorBenchmark: {
    sectorCode: string;
    sectorName: string;
    available: boolean;
  } | null;
  narrative: string;
  roadmap: MaturityRoadmapItem[];
  assessedAt: string;
}

export interface SectorBenchmarkResult {
  percentile: number;
  sectorAverage: number;
  topQuartile: number;
  dimensions: Array<{
    key: string;
    name: string;
    tenantScore: number;
    sectorAverage: number;
    topQuartile: number;
    percentile: number;
  }>;
  recommendations: string[];
}

export interface MaturityTrendPoint {
  date: string;
  overallScore: number;
  overallLevel: MaturityLevel;
  dimensions: Record<string, number>;
}

export interface MaturityTrendResult {
  trend: MaturityTrendPoint[];
  currentLevel: MaturityLevel;
  currentScore: number;
  projectedNextLevel: MaturityLevel | null;
  projectedDate: string | null;
  improvementVelocity: number;
}

export interface MaturityRoadmapItem {
  phase: number;
  title: string;
  description: string;
  dimension: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimatedWeeks: number;
  dependencies: string[];
}

export interface MaturityRoadmapResult {
  phases: Array<{
    phase: number;
    title: string;
    items: MaturityRoadmapItem[];
    estimatedWeeks: number;
  }>;
  quickWins: MaturityRoadmapItem[];
  longTermGoals: MaturityRoadmapItem[];
  estimatedTimeline: string;
}

export function scoreToLevel(score: number): MaturityLevel {
  if (score >= 85) return 5;
  if (score >= 65) return 4;
  if (score >= 45) return 3;
  if (score >= 25) return 2;
  return 1;
}
