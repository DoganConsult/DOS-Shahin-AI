/**
 * Public Qiyas permission codes — frozen contract for peer-module gating.
 */
export const QIYAS_PERMISSION_CODES = {
  READ: 'qiyas:read',
  WRITE: 'qiyas:write',
  DELETE: 'qiyas:delete',
  APPROVE: 'qiyas:approve',
  MANAGE: 'qiyas:manage',

  DOT_READ: 'qiyas.read',
  DOT_MANAGE: 'qiyas.manage',
  RECORD_READ: 'qiyas.record.read',

  ASSESSMENT_READ: 'qiyas.assessment.read',
  ASSESSMENT_WRITE: 'qiyas.assessment.write',
  ASSESSMENT_START: 'qiyas.assessment.start',
  ASSESSMENT_COMPLETE: 'qiyas.assessment.complete',

  MATURITY_READ: 'qiyas.maturity.read',
  MATURITY_SCORE: 'qiyas.maturity.score',

  GAP_READ: 'qiyas.gap.read',
  GAP_WRITE: 'qiyas.gap.write',

  ROADMAP_READ: 'qiyas.roadmap.read',
  ROADMAP_WRITE: 'qiyas.roadmap.write',

  BENCHMARK_READ: 'qiyas.benchmark.read',
  BENCHMARK_COMPARE: 'qiyas.benchmark.compare',

  TARGET_READ: 'qiyas.target.read',
  TARGET_WRITE: 'qiyas.target.write',

  TREND_READ: 'qiyas.trend.read',
  STRATEGY_READ: 'qiyas.strategy.read',
  STRATEGY_WRITE: 'qiyas.strategy.write',
} as const;

export type QiyasPermissionCode =
  (typeof QIYAS_PERMISSION_CODES)[keyof typeof QIYAS_PERMISSION_CODES];
