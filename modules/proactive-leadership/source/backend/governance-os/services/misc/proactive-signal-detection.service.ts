// ============================================
// Proactive Signal Detection
// Sub-module of proactive-leadership-engine:
// Detects trends, patterns, threshold proximity,
// regressions, opportunities, and KSA deadline signals
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { getContext } from '../governance/governance-context-engine.service.js';
import { getMilestoneInstances } from './milestone-engine.service.js';
// getKsaRegulatoryContext is private in the source module; inline equivalent logic
// getNextRegulatoryDeadline does not exist; deadline detection uses direct SQL
import {
  resolveThresholdConfig,
  loadProactiveSignalRules,
  isModuleEnabled,
  getEnabledSignalTypes,
  type ProactiveSignalRule,
} from '../../../proactive-leadership/services/proactive-leadership-config-loader.service.js';

import type { ProactiveSignal } from '../../../proactive-leadership/services/proactive-leadership-engine.service';
import type { GenericRow } from '@dos/types';

/**
 * Detect proactive signals: trends, patterns, upcoming deadlines, regressions
 * Now database-driven: loads enabled modules and signal rules from DB
 */
export async function detectProactiveSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];
  const schema = tenantSchema(tenantId);
  const context = await getContext(tenantId, 'governance' as any, 'tenant');

  // Load database-driven signal rules
  const signalRules = await loadProactiveSignalRules(tenantId);

  // Group rules by signal type
  const rulesByType = new Map<string, ProactiveSignalRule[]>();
  for (const rule of signalRules) {
    if (!rulesByType.has(rule.signalType)) {
      rulesByType.set(rule.signalType, []);
    }
    rulesByType.get(rule.signalType)!.push(rule);
  }

  // Signal 1: Trend detection (database-driven rules)
  if (rulesByType.has('trend')) {
    const trendSignals = await detectTrendsFromRules(tenantId, schema, rulesByType.get('trend')!);
    signals.push(...trendSignals);
  }

  // Signal 2: Pattern detection (database-driven rules)
  if (rulesByType.has('pattern')) {
    const patternSignals = await detectPatternsFromRules(tenantId, schema, rulesByType.get('pattern')!);
    signals.push(...patternSignals);
  }

  // Signal 3: Threshold proximity (database-driven rules)
  if (rulesByType.has('threshold')) {
    const thresholdSignals = await detectThresholdProximityFromRules(tenantId, (context as any) || {} as Record<string, unknown>, rulesByType.get('threshold')!);
    signals.push(...thresholdSignals);
  }

  // Signal 4: Regression detection (milestones regressing, scores dropping)
  const regressionSignals = await detectRegressions(tenantId, schema);
  signals.push(...regressionSignals);

  // Signal 5: Opportunity detection (maturity improvements, automation potential)
  const opportunitySignals = await detectOpportunities(tenantId, (context as any) || {} as Record<string, unknown>);
  signals.push(...opportunitySignals);

  // Signal 6: KSA regulatory deadline anticipation
  const deadlineSignals = await detectKsaDeadlineSignals(tenantId);
  signals.push(...deadlineSignals);

  return signals;
}

/**
 * Detect trends using database-driven rules
 */
export async function detectTrendsFromRules(
  tenantId: string,
  schema: string,
  rules: ProactiveSignalRule[]
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  for (const rule of rules) {
    // Check if module is enabled
    if (!(await isModuleEnabled(tenantId, rule.moduleCode))) continue;
    const enabledTypes = await getEnabledSignalTypes(tenantId);
    if (!enabledTypes.includes('trend')) continue;

    try {
      // Resolve threshold config references
      const resolvedConfig = await resolveThresholdConfig(tenantId, rule.moduleCode);

      // Build query with resolved thresholds
      let query = rule.detectionQuery || '';
      for (const [key, value] of Object.entries(resolvedConfig)) {
        query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }

      // Execute detection query
      const result = await safeQuery(query, []);

      if (result.rows.length === 0) continue;

      // Evaluate trend from results
      const row = result.rows[0];
      const dataPoints = parseInt(row.data_points || result.rows.length);
      const minDataPoints = Number(resolvedConfig.trend_min_data_points) || 3;

      if (dataPoints < minDataPoints) continue;

      // Calculate trend slope
      let trend = 0;
      if (rule.moduleCode === 'compliance' && row.avg_score !== undefined) {
        const scores = result.rows.map((r: GenericRow) => parseFloat(r.avg_score || 0));
        trend = calculateTrend(scores);
      } else if (rule.moduleCode === 'risk' && row.critical_risks !== undefined) {
        const counts = result.rows.map((r: GenericRow) => parseInt(r.critical_risks || 0));
        trend = calculateTrend(counts);
      } else if (rule.moduleCode === 'evidence' && row.stale_count !== undefined) {
        const counts = result.rows.map((r: GenericRow) => parseInt(r.stale_count || 0));
        trend = calculateTrend(counts);
      }

      // Determine severity from threshold config
      const criticalSlope = Number(resolvedConfig.critical_slope) || -5;
      const highSlope = Number(resolvedConfig.high_slope) || -2;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      let timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term' = 'medium_term';

      if (rule.moduleCode === 'compliance' || rule.moduleCode === 'risk') {
        // For compliance: negative trend is bad; for risk: positive trend is bad
        const isBadTrend = rule.moduleCode === 'compliance' ? trend < 0 : trend > 0;
        if (isBadTrend) {
          if (rule.moduleCode === 'compliance' ? trend < Number(criticalSlope) : trend > Math.abs(Number(criticalSlope))) {
            severity = 'critical';
            timeframe = (rule.timeframeMapping?.critical || 'immediate') as typeof timeframe;
          } else if (rule.moduleCode === 'compliance' ? trend < Number(highSlope) : trend > Math.abs(Number(highSlope))) {
            severity = 'high';
            timeframe = (rule.timeframeMapping?.high || 'short_term') as typeof timeframe;
          }
        }
      } else {
        // For evidence: positive trend (increasing staleness) is bad
        if (trend > (Number(resolvedConfig.trend_slope) || 1)) {
          severity = 'medium';
          timeframe = (rule.timeframeMapping?.medium || 'medium_term') as typeof timeframe;
        }
      }

      // Build signal
      signals.push({
        signalType: 'trend',
        moduleCode: rule.moduleCode,
        severity,
        confidence: rule.confidenceBase,
        predictedImpact: rule.recommendedActionTemplate.replace('{trend}', String(trend)),
        recommendedAction: rule.recommendedActionTemplate,
        timeframe,
        evidence: { trend, ruleName: rule.ruleName, dataPoints, resolvedConfig },
      });
    } catch (err) {
      logger.warn('[Proactive Leadership] Trend rule execution failed', {
        tenantId,
        ruleName: rule.ruleName,
        error: (err as Error).message,
      });
    }
  }

  return signals;
}

/**
 * Detect patterns using database-driven rules
 */
export async function detectPatternsFromRules(
  tenantId: string,
  schema: string,
  rules: ProactiveSignalRule[]
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  for (const rule of rules) {
    // Check if module is enabled
    if (!(await isModuleEnabled(tenantId, rule.moduleCode))) continue;
    const enabledTypes = await getEnabledSignalTypes(tenantId);
    if (!enabledTypes.includes('pattern')) continue;

    try {
      // Resolve threshold config references
      const resolvedConfig = await resolveThresholdConfig(tenantId, rule.moduleCode);

      // Build query with resolved thresholds
      let query = rule.detectionQuery || '';
      for (const [key, value] of Object.entries(resolvedConfig)) {
        query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }

      // Execute detection query
      const result = await safeQuery(query, []);

      for (const row of result.rows) {
        // Evaluate severity from threshold config
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term' = 'short_term';

        // Check severity mapping
        for (const [sevLevel, conditions] of Object.entries(rule.severityMapping || {})) {
          let matches = true;
          for (const [conditionKey, conditionValue] of Object.entries(conditions as Record<string, unknown>)) {
            const resolvedCondition = String(conditionValue).replace(/\{[^}]+\}/g, (match) => {
              const key = match.slice(1, -1);
              return String(resolvedConfig[key] || match);
            });

            const rowValue = row[conditionKey];

            if (conditionValue.includes('>=')) {
              const threshold = parseFloat(resolvedCondition.replace('>=', '').trim());
              if (!(parseFloat(rowValue) >= threshold)) matches = false;

            } else if (conditionValue.includes('>')) {
              const threshold = parseFloat(resolvedCondition.replace('>', '').trim());
              if (!(parseFloat(rowValue) > threshold)) matches = false;

            } else if (conditionValue.includes('<=')) {
              const threshold = parseFloat(resolvedCondition.replace('<=', '').trim());
              if (!(parseFloat(rowValue) <= threshold)) matches = false;

            } else if (conditionValue.includes('<')) {
              const threshold = parseFloat(resolvedCondition.replace('<', '').trim());
              if (!(parseFloat(rowValue) < threshold)) matches = false;
            }
          }
          if (matches) {
            severity = sevLevel as 'low' | 'medium' | 'high' | 'critical';
            timeframe = (rule.timeframeMapping?.[sevLevel] || 'short_term') as typeof timeframe;
            break;
          }
        }

        // Build signal
        signals.push({
          signalType: 'pattern',
          moduleCode: rule.moduleCode,
          severity,
          confidence: rule.confidenceBase,
          predictedImpact: rule.recommendedActionTemplate,
          recommendedAction: rule.recommendedActionTemplate,
          timeframe,
          evidence: { ruleName: rule.ruleName, rowData: row, resolvedConfig },
        });
      }
    } catch (err) {
      logger.warn('[Proactive Leadership] Pattern rule execution failed', {
        tenantId,
        ruleName: rule.ruleName,
        error: (err as Error).message,
      });
    }
  }

  return signals;
}

/**
 * Detect threshold proximity using database-driven rules
 */
export async function detectThresholdProximityFromRules(
  tenantId: string,
  context: Record<string, unknown>,
  rules: ProactiveSignalRule[]
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  for (const rule of rules) {
    // Check if module is enabled
    if (!(await isModuleEnabled(tenantId, rule.moduleCode))) continue;
    const enabledTypes = await getEnabledSignalTypes(tenantId);
    if (!enabledTypes.includes('threshold')) continue;

    try {
      const _schema = tenantSchema(tenantId);

      // Resolve threshold config references
      const resolvedConfig = await resolveThresholdConfig(tenantId, rule.moduleCode);

      // Build query with resolved thresholds
      let query = rule.detectionQuery || '';
      for (const [key, value] of Object.entries(resolvedConfig)) {
        query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }

      // Execute detection query
      const result = await safeQuery(query, []);

      if (result.rows.length === 0) continue;

      const row = result.rows[0];
      const count = parseInt(row.count || 0);

      // Determine severity from threshold config
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      let timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term' = 'short_term';

      const criticalCount = Number(resolvedConfig.critical_count) || 50;
      const warningCount = Number(resolvedConfig.warning_count) || 10;

      if (count > criticalCount) {
        severity = 'high';
        timeframe = (rule.timeframeMapping?.high || 'short_term') as typeof timeframe;
      } else if (count > Number(warningCount)) {
        severity = 'medium';
        timeframe = (rule.timeframeMapping?.medium || 'medium_term') as typeof timeframe;
      }

      // Build signal
      signals.push({
        signalType: 'threshold',
        moduleCode: rule.moduleCode,
        severity,
        confidence: rule.confidenceBase,
        predictedImpact: rule.recommendedActionTemplate.replace('{count}', String(count)),
        recommendedAction: rule.recommendedActionTemplate,
        timeframe,
        evidence: { count, ruleName: rule.ruleName, resolvedConfig },
      });
    } catch (err) {
      logger.warn('[Proactive Leadership] Threshold rule execution failed', {
        tenantId,
        ruleName: rule.ruleName,
        error: (err as Error).message,
      });
    }
  }

  return signals;
}

/**
 * Detect opportunities: maturity improvements, automation potential
 */
export async function detectOpportunities(
  tenantId: string,
  _context: Record<string, unknown>
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  try {
    // Opportunity: High evidence coverage -> ready for automation
    const schema = tenantSchema(tenantId);
    const evidenceCoverage = await safeQuery(
      `SELECT
        COUNT(*) FILTER (WHERE source_type = 'system-generated') as automated_count,
        COUNT(*) as total_count
       FROM "${schema}".evidence`,
      []
    );

    if (evidenceCoverage.rows.length > 0) {
      const row = evidenceCoverage.rows[0];
      const automationRate = parseFloat(row.automated_count || 0) / parseFloat(row.total_count || 1);

      if (automationRate > 0.6 && automationRate < 0.8) {
        signals.push({
          signalType: 'opportunity',
          moduleCode: 'evidence',
          severity: 'low',
          confidence: 0.80,
          predictedImpact: `Evidence automation at ${(automationRate * 100).toFixed(0)}%. Can increase to 80%+ with minimal effort.`,
          recommendedAction: 'Fire evidence_automation_expansion initiative',
          timeframe: 'medium_term',
          evidence: { automationRate, automatedCount: row.automated_count, totalCount: row.total_count },
        });
      }
    }

    // Opportunity: Maturity score approaching next level
    const maturityData = await safeQuery(
      `SELECT
        level,
        aggregate
       FROM "${schema}".maturity_assessments
       ORDER BY assessed_at DESC
       LIMIT 1`,
      []
    );

    if (maturityData.rows.length > 0) {
      const row = maturityData.rows[0];
      const currentLevel = parseInt(row.level || 1);
      const aggregate = parseFloat(row.aggregate || 0);

      if (currentLevel < 5 && aggregate >= (currentLevel * 20 - 5)) {
        signals.push({
          signalType: 'opportunity',
          moduleCode: 'qiyas',
          severity: 'low',
          confidence: 0.75,
          predictedImpact: `Maturity score ${aggregate.toFixed(1)} approaching level ${currentLevel + 1}. Push initiative to reach next level.`,
          recommendedAction: 'Fire qiyas_maturity_acceleration initiative',
          timeframe: 'medium_term',
          evidence: { currentLevel, aggregate, nextLevel: currentLevel + 1 },
        });
      }
    }
  } catch (err) {
    logger.warn('[Proactive Leadership] Opportunity detection failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return signals;
}

/**
 * Detect KSA regulatory deadline signals
 */
export async function detectKsaDeadlineSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  try {
    const schema = tenantSchema(tenantId);
    // Check if the tenant has any active compliance frameworks
    const fwResult = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".compliance_frameworks WHERE is_active = true`,
      []
    );
    if (!fwResult.rows.length || parseInt(fwResult.rows[0].cnt || '0', 10) === 0) return signals;

    // Find upcoming regulatory deadlines within 45 days
    const deadlineResult = await safeQuery(
      `SELECT framework_code, due_date, control_code, status
       FROM "${schema}".compliance_obligations
       WHERE due_date > NOW() AND due_date <= NOW() + INTERVAL '45 days'
         AND status != 'compliant'
       ORDER BY due_date ASC
       LIMIT 1`,
      []
    );

    if (deadlineResult.rows.length > 0) {
      const nextDeadline = deadlineResult.rows[0];
      const now = new Date();
      const deadlineDate = new Date(nextDeadline.due_date);
      const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 45 && daysUntil > 0) {
        const frameworkCode = nextDeadline.framework_code || 'unknown';
        signals.push({
          signalType: 'deadline',
          moduleCode: 'compliance',
          severity: daysUntil <= 14 ? 'critical' : daysUntil <= 30 ? 'high' : 'medium',
          confidence: 1.0,
          predictedImpact: `KSA regulatory deadline (${frameworkCode}) in ${daysUntil} days.`,
          recommendedAction: `Fire ${frameworkCode.toLowerCase()}_deadline_preparation initiative`,
          timeframe: daysUntil <= 14 ? 'immediate' : 'short_term',
          evidence: {
            frameworkCode,
            daysUntil,
            controlCode: nextDeadline.control_code,
            status: nextDeadline.status,
          },
        });
      }
    }
  } catch (err) {
    logger.warn('[Proactive Leadership] KSA deadline detection failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return signals;
}

/**
 * Calculate trend from time series data (simple linear regression slope)
 */
export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Check if initiative trigger conditions match signal
 */
export function checkTriggerMatch(
  triggerConditions: Record<string, unknown>,
  signal: ProactiveSignal
): boolean {
  // Simple matching logic - can be enhanced
  if (signal.signalType === 'trend' && triggerConditions.trend) return true;
  if (signal.signalType === 'pattern' && triggerConditions.pattern) return true;
  if (signal.signalType === 'regression' && triggerConditions.regression) return true;
  if (signal.signalType === 'deadline' && triggerConditions.deadline) return true;

  return false;
}

// ── Private helper: detect regressions ──

async function detectRegressions(tenantId: string, schema: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];

  try {
    // Check milestone regressions
    const milestones = await getMilestoneInstances(tenantId);

    for (const milestone of milestones) {
      if (milestone.state === 'regressed') {
        signals.push({
          signalType: 'regression',
          moduleCode: milestone.moduleCode,
          severity: 'high',
          confidence: 1.0,
          predictedImpact: `Milestone ${milestone.milestoneCode} has regressed. Progress lost.`,
          recommendedAction: `Fire ${milestone.moduleCode}_regression_recovery initiative`,
          timeframe: 'immediate',
          evidence: { milestoneCode: milestone.milestoneCode, state: milestone.state, health: milestone.health },
        });
      } else if (milestone.health === 'at_risk') {
        signals.push({
          signalType: 'regression',
          moduleCode: milestone.moduleCode,
          severity: 'medium',
          confidence: 0.75,
          predictedImpact: `Milestone ${milestone.milestoneCode} is at risk of regression.`,
          recommendedAction: `Fire ${milestone.moduleCode}_milestone_stabilization initiative`,
          timeframe: 'short_term',
          evidence: { milestoneCode: milestone.milestoneCode, health: milestone.health, progress: milestone.progressPct },
        });
      }
    }

    // Check score regressions (compliance, risk, maturity)
    const scoreRegressions = await safeQuery(
      `SELECT
        'compliance' as score_type,
        AVG(score) as current_avg,
        (SELECT AVG(score) FROM "${schema}".compliance_scores
         WHERE recorded_at >= NOW() - INTERVAL '30 days'
           AND recorded_at < NOW() - INTERVAL '15 days') as previous_avg
       FROM "${schema}".compliance_scores
       WHERE recorded_at >= NOW() - INTERVAL '15 days'
       HAVING AVG(score) < (SELECT AVG(score) FROM "${schema}".compliance_scores
                             WHERE recorded_at >= NOW() - INTERVAL '30 days'
                               AND recorded_at < NOW() - INTERVAL '15 days')
         AND (SELECT AVG(score) FROM "${schema}".compliance_scores
              WHERE recorded_at >= NOW() - INTERVAL '30 days'
                AND recorded_at < NOW() - INTERVAL '15 days') - AVG(score) > 5`,
      []
    );

    if (scoreRegressions.rows.length > 0) {
      const row = scoreRegressions.rows[0];
      signals.push({
        signalType: 'regression',
        moduleCode: 'compliance',
        severity: 'high',
        confidence: 0.90,
        predictedImpact: `Compliance score regressed from ${row.previous_avg} to ${row.current_avg}.`,
        recommendedAction: 'Fire comp_score_recovery initiative',
        timeframe: 'immediate',
        evidence: { currentAvg: row.current_avg, previousAvg: row.previous_avg, drop: parseFloat(row.previous_avg) - parseFloat(row.current_avg) },
      });
    }
  } catch (err) {
    logger.warn('[Proactive Leadership] Regression detection failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return signals;
}
