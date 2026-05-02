// ============================================
// Shahin-Ai — Qiyas Maturity Model
// Level definitions (Initial→Optimizing), progression
// tracking, level criteria validation
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// === Types ===

export interface MaturityLevelDefinition {
  level: number;
  name: string;
  nameAr: string;
  description: string;
  criteria: string[];
  minScore: number;
  maxScore: number;
  color: string;
}

export interface MaturityProgressionRecord {
  tenantId: string;
  assessmentId: string;
  framework: string;
  currentLevel: number;
  previousLevel: number | null;
  scoreAtLevel: number;
  achievedAt: string;
  criteria: string[];
  nextLevelCriteria: string[];
}

export interface LevelCriteriaValidation {
  level: number;
  met: string[];
  unmet: string[];
  score: number;
  isValid: boolean;
}

// === Maturity Level Definitions ===

export const MATURITY_LEVELS: MaturityLevelDefinition[] = [
  {
    level: 1,
    name: "Initial",
    nameAr: "مبدئي",
    description: "Processes are unpredictable, poorly controlled, and reactive",
    criteria: [
      "Ad-hoc security practices exist",
      "No formal policies or procedures",
      "Reactive incident response only",
    ],
    minScore: 0,
    maxScore: 29,
    color: "#EF4444",
  },
  {
    level: 2,
    name: "Managed",
    nameAr: "مُدار",
    description: "Processes are planned and tracked but inconsistently applied",
    criteria: [
      "Basic security policies documented",
      "Some controls implemented",
      "Management awareness of security risks",
      "Incident tracking in place",
    ],
    minScore: 30,
    maxScore: 49,
    color: "#F97316",
  },
  {
    level: 3,
    name: "Defined",
    nameAr: "محدد",
    description: "Processes are well-characterized and understood across the organization",
    criteria: [
      "Comprehensive security policies and procedures",
      "Controls consistently implemented and documented",
      "Regular risk assessments conducted",
      "Security awareness training program",
      "Incident response procedures defined",
    ],
    minScore: 50,
    maxScore: 69,
    color: "#EAB308",
  },
  {
    level: 4,
    name: "Quantitatively Managed",
    nameAr: "مُدار كمياً",
    description: "Processes are measured and controlled using quantitative techniques",
    criteria: [
      "Metrics-driven security management",
      "Quantitative performance targets established",
      "Regular audits and assessments",
      "Advanced threat detection capabilities",
      "Continuous monitoring implemented",
      "Third-party risk management program",
    ],
    minScore: 70,
    maxScore: 89,
    color: "#22C55E",
  },
  {
    level: 5,
    name: "Optimizing",
    nameAr: "محسّن",
    description: "Focus on continuous improvement through both incremental and innovative changes",
    criteria: [
      "Continuous improvement program",
      "Proactive threat intelligence",
      "Automated security controls",
      "Industry benchmark participation",
      "Security culture embedded organization-wide",
      "Zero-trust architecture implementation",
      "Regular red team exercises",
    ],
    minScore: 90,
    maxScore: 100,
    color: "#6366F1",
  },
];

// === Pure Functions ===

export function getLevelByScore(score: number): MaturityLevelDefinition {
  return MATURITY_LEVELS.find(l => score >= l.minScore && score <= l.maxScore) ?? MATURITY_LEVELS[0];
}

export function getLevelById(level: number): MaturityLevelDefinition | null {
  return MATURITY_LEVELS.find(l => l.level === level) ?? null;
}

export function getNextLevel(currentLevel: number): MaturityLevelDefinition | null {
  return MATURITY_LEVELS.find(l => l.level === currentLevel + 1) ?? null;
}

export function computeLevelProgression(currentScore: number, currentLevel: number): {
  progressWithinLevel: number;
  pointsToNextLevel: number;
  nextLevelMinScore: number | null;
} {
  const levelDef = getLevelById(currentLevel);
  if (!levelDef) return { progressWithinLevel: 0, pointsToNextLevel: 0, nextLevelMinScore: null };

  const nextLevel = getNextLevel(currentLevel);
  const range = levelDef.maxScore - levelDef.minScore;
  const progressWithinLevel = range > 0 ? Math.round(((currentScore - levelDef.minScore) / range) * 100) : 100;
  const pointsToNextLevel = nextLevel ? Math.max(0, nextLevel.minScore - currentScore) : 0;

  return {
    progressWithinLevel,
    pointsToNextLevel,
    nextLevelMinScore: nextLevel?.minScore ?? null,
  };
}

export function validateLevelCriteria(
  level: number,
  evidenceItems: string[]
): LevelCriteriaValidation {
  const def = getLevelById(level);
  if (!def) return { level, met: [], unmet: [], score: 0, isValid: false };
  const normalized = evidenceItems.map((e) => String(e).toLowerCase());
  const met = def.criteria.filter((c) => normalized.some((e) => e.includes(c.toLowerCase().slice(0, 12))));
  const unmet = def.criteria.filter((c) => !met.includes(c));
  const score = def.criteria.length > 0 ? Math.round((met.length / def.criteria.length) * 100) : 0;
  return { level, met, unmet, score, isValid: unmet.length === 0 };
}

// === DB Functions ===

export async function recordMaturityProgression(
  tenantId: string,
  assessmentId: string,
  framework: string,
  currentLevel: number,
  scoreAtLevel: number
): Promise<MaturityProgressionRecord> {
  const schema = tenantSchema(tenantId);

  const prevResult = await safeQuery(
    `SELECT maturity_level, score FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND status = 'completed'
       AND deleted_at IS NULL AND id != $3
     ORDER BY updated_at DESC LIMIT 1`,
    [tenantId, framework, assessmentId]
  );

  const prev = prevResult.rows[0];
  const levelDef = getLevelById(currentLevel);
  const nextLevel = getNextLevel(currentLevel);

  return {
    tenantId,
    assessmentId,
    framework,
    currentLevel,
    previousLevel: prev ? parseInt(prev.maturity_level, 10) : null,
    scoreAtLevel,
    achievedAt: new Date().toISOString(),
    criteria: levelDef?.criteria || [],
    nextLevelCriteria: nextLevel?.criteria || [],
  };
}

export async function getMaturityHistory(
  tenantId: string,
  framework: string
): Promise<Array<{ assessmentId: string; maturityLevel: number; score: number; completedAt: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, maturity_level, score, updated_at
     FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND status = 'completed'
       AND deleted_at IS NULL AND maturity_level IS NOT NULL
     ORDER BY updated_at ASC`,
    [tenantId, framework]
  );
  return result.rows.map(r => ({
    assessmentId: r.id,
    maturityLevel: parseInt(r.maturity_level, 10),
    score: parseFloat(r.score),
    completedAt: r.updated_at?.toISOString?.() || r.updated_at,
  }));
}

export async function getFrameworkMaturitySummary(
  tenantId: string,
  framework: string
): Promise<{
  framework: string;
  currentLevel: MaturityLevelDefinition | null;
  currentScore: number | null;
  progression: ReturnType<typeof computeLevelProgression> | null;
  totalAssessments: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT maturity_level, score FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND status = 'completed'
       AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
    [tenantId, framework]
  );
  const countResult = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND deleted_at IS NULL AND assessor != 'question_bank'`,
    [tenantId, framework]
  );

  const latest = result.rows[0];
  const currentLevel = latest ? getLevelById(parseInt(latest.maturity_level, 10)) : null;
  const currentScore = latest ? parseFloat(latest.score) : null;
  const progression = currentLevel && currentScore !== null
    ? computeLevelProgression(currentScore, currentLevel.level)
    : null;

  return {
    framework,
    currentLevel,
    currentScore,
    progression,
    totalAssessments: parseInt(countResult.rows[0]?.cnt || "0", 10),
  };
}
