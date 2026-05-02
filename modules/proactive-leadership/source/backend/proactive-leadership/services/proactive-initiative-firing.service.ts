import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Proactive Initiative Firing
// Sub-module of proactive-leadership-engine:
// Fires initiatives, predicts future needs,
// adjusts thresholds dynamically, and learns from patterns
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { runOrchestrator } from '../../governance-os/services/initiative/initiative-orchestrator.service';
import { getInitiativeDefinitions, type InitiativeDefinition } from '../../governance-os/services/initiative/initiative-registry.service';
import {
  loadProactiveSignalRules,
} from './proactive-leadership-config-loader.service';
import { checkTriggerMatch } from '../../governance-os/services/misc/proactive-signal-detection.service';

import type { ProactiveSignal } from './proactive-leadership-engine.service';

/**
 * Fire proactive initiative based on signal (database-driven matching)
 */
export async function fireProactiveInitiative(
  tenantId: string,
  signal: ProactiveSignal
): Promise<boolean> {
  try {
    // Load signal rule to get initiative code pattern
    const rules = await loadProactiveSignalRules(tenantId);
    const matchingRule = rules.find(
      r => r.signalType === signal.signalType &&
           r.moduleCode === signal.moduleCode &&
           r.enabled
    );

    let initiativeCodePattern = matchingRule?.initiativeCodePattern;

    // If rule has pattern, try to resolve it
    if (initiativeCodePattern) {
      // Replace placeholders like {module_code}, {signal_type}
      initiativeCodePattern = initiativeCodePattern
        .replace('{module_code}', signal.moduleCode)
        .replace('{signal_type}', signal.signalType)
        .replace('{severity}', signal.severity);
    }

    // Find matching initiative or create dynamic one
    // Note: getInitiativeDefinitions is global (public schema), not tenant-scoped
    const definitions = await getInitiativeDefinitions();

    // Look for initiative that matches the signal
    let matchingInitiative: InitiativeDefinition | null = null;

    // Try exact match first from recommended action
    if (signal.recommendedAction.includes('Fire')) {
      const extractedCode = signal.recommendedAction
        .replace('Fire', '')
        .replace('initiative', '')
        .trim();

      matchingInitiative = definitions.find(d => ((d as Record<string, unknown>)?.code) === extractedCode) || null;
    }

    // Try pattern from rule
    if (!matchingInitiative && initiativeCodePattern) {
      matchingInitiative = definitions.find(d => {
        // Pattern matching: check if initiative code matches pattern
        if (initiativeCodePattern!.includes('*')) {
          const regex = new RegExp(initiativeCodePattern!.replace(/\*/g, '.*'));

          return regex.test((((d as Record<string, unknown>) as any)?.code));
        }

        return ((d as Record<string, unknown>)?.code)?.includes(initiativeCodePattern!) || initiativeCodePattern!.includes((((d as Record<string, unknown>) as any)?.code));
      }) || null;
    }

    // Try heuristic matching by module and signal type
    if (!matchingInitiative) {
      for (const def of definitions) {

        if (def.moduleCode === signal.moduleCode && def.enabled) {
          // Check if initiative's trigger conditions match signal

          const triggerMatch = checkTriggerMatch(((def as Record<string, unknown>) as any).triggerConditions || {}, signal);
          if (triggerMatch) {
            matchingInitiative = def;
            break;
          }
        }
      }
    }

    if (matchingInitiative) {
      // Fire the matching initiative
      const orchestratorResult = await runOrchestrator(tenantId);

      const fired = orchestratorResult.initiativesTriggered > 0;

      if (fired) {
        logger.info('[Proactive Leadership] Initiative fired from signal', {
          tenantId,
          signalType: signal.signalType,
          moduleCode: signal.moduleCode,

          initiativeCode: ((matchingInitiative as Record<string, unknown>)?.code),
          confidence: signal.confidence,
          ruleName: matchingRule?.ruleName,
        });
      }

      return fired;
    }

    // If no matching initiative, create a dynamic recommendation
    // Use confidence threshold from rule or default
    const minConfidenceForRecommendation = matchingRule?.confidenceBase || 0.8;
    if (signal.confidence >= minConfidenceForRecommendation) {
      const { createRecommendation } = await import('../../ai/services/reasoning/ai-recommendation-engine.service.js');
      await createRecommendation({
        tenantId,
        agentId: 'proactive-leadership-engine',
        entityType: signal.moduleCode,
        recommendationType: 'proactive_action',
        title: `Proactive Action: ${signal.recommendedAction}`,
        description: signal.predictedImpact,
        priority: signal.severity,
        suggestedAction: { actions: [signal.recommendedAction], evidence: signal.evidence },
        createdBy: 'proactive_leadership_engine',
      });

      return true;
    }

    return false;
  } catch (err) {
    logger.error('[Proactive Leadership] Failed to fire initiative', {
      tenantId,
      signalType: signal.signalType,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Predict future needs based on current patterns and trends
 */
export async function predictFutureNeeds(
  tenantId: string,
  signals: ProactiveSignal[]
): Promise<Array<{ need: string; timeframe: string; confidence: number }>> {
  const predictions: Array<{ need: string; timeframe: string; confidence: number }> = [];

  // Predict based on signal patterns
  const trendSignals = signals.filter(s => s.signalType === 'trend');
  const patternSignals = signals.filter(s => s.signalType === 'pattern');

  // Prediction: If compliance trend declining, predict gap increase
  if (trendSignals.some(s => s.moduleCode === 'compliance' && s.severity === 'critical')) {
    predictions.push({
      need: 'Compliance gap remediation resources',
      timeframe: '30 days',
      confidence: 0.85,
    });
  }

  // Prediction: If repeat findings pattern, predict systemic control failure
  if (patternSignals.some(s => s.moduleCode === 'compliance' && s.severity === 'critical')) {
    predictions.push({
      need: 'Systemic control redesign',
      timeframe: '60 days',
      confidence: 0.90,
    });
  }

  // Prediction: If risk escalation clustering, predict risk committee intervention
  if (patternSignals.some(s => s.moduleCode === 'risk' && s.severity === 'critical')) {
    predictions.push({
      need: 'Risk committee escalation',
      timeframe: '14 days',
      confidence: 0.80,
    });
  }

  return predictions;
}

/**
 * Adjust thresholds dynamically based on performance patterns (database-driven)
 */
export async function adjustThresholdsDynamically(
  tenantId: string,
  signals: ProactiveSignal[]
): Promise<Array<{ moduleCode: string; threshold: string; oldValue: number; newValue: number }>> {
  const adjustments: Array<{ moduleCode: string; threshold: string; oldValue: number; newValue: number }> = [];

  try {
    const schema = tenantSchema(tenantId);

    // Load all thresholds with auto-adjust enabled
    const { loadProactiveThresholds } = await import('./proactive-leadership-config-loader.service.js');
    const thresholds = await loadProactiveThresholds(tenantId);
    const adjustableThresholds = thresholds.filter(t => t.autoAdjustEnabled);

    for (const threshold of adjustableThresholds) {
      // Count signals for this module/threshold
      const relevantSignals = signals.filter(
        s => s.moduleCode === threshold.moduleCode
      );

      // Get adjustment policy
      const policy: Record<string, unknown> = (threshold.adjustmentPolicy as unknown as Record<string, unknown>) || {};
      const min = policy.min ?? -Infinity;
      const max = policy.max ?? Infinity;
      const adjustmentFactor = policy.adjustmentFactor ?? 1.1;

      // Determine if adjustment needed
      let shouldAdjust = false;
      let newValue: any = threshold.thresholdValue;

      if ((relevantSignals as any).length > (policy.maxSignals || 5)) {
        // Too many signals -> raise threshold (make it harder to trigger)
        if (typeof threshold.thresholdValue === 'number') {
          newValue = Math.min(

            threshold.thresholdValue * adjustmentFactor,
            (max as any)
          );
          shouldAdjust = newValue !== threshold.thresholdValue;
        }
      } else if (relevantSignals.length === 0 && threshold.lastAdjustedAt) {
        // No signals but threshold was recently adjusted -> might be too high
        // Lower it slightly (only if it was recently raised)
        const daysSinceAdjustment = Math.floor(
          (Date.now() - new Date(threshold.lastAdjustedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if ((daysSinceAdjustment as any) >= (policy.reviewDays || 7)) {
          if (typeof threshold.thresholdValue === 'number') {
            newValue = Math.max(

              threshold.thresholdValue / adjustmentFactor,
              (min as any)
            );
            shouldAdjust = newValue !== threshold.thresholdValue;
          }
        }
      }

      if (shouldAdjust) {
        // Update threshold in DB
        const adjustmentHistory = Array.isArray(threshold.adjustmentHistory)
          ? threshold.adjustmentHistory
          : [];
        adjustmentHistory.push({
          oldValue: threshold.thresholdValue,
          newValue,
          adjustedAt: new Date().toISOString(),
          reason: (relevantSignals as any).length > (policy.maxSignals || 5)
            ? 'too_many_signals'
            : 'no_signals_recent_adjustment',
          signalCount: relevantSignals.length,
        });

        await safeQuery(
          `UPDATE "${schema}".proactive_leadership_thresholds
           SET threshold_value = $1,
               last_adjusted_at = CURRENT_TIMESTAMP,
               adjustment_history = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE threshold_id = $3`,
          [JSON.stringify(newValue), JSON.stringify(adjustmentHistory), threshold.thresholdId]
        );

        adjustments.push({
          moduleCode: threshold.moduleCode,
          threshold: threshold.thresholdKey,
          oldValue: typeof threshold.thresholdValue === 'number' ? threshold.thresholdValue : 0,
          newValue: typeof newValue === 'number' ? newValue : 0,
        });

        logger.info('[Proactive Leadership] Adjusted threshold dynamically', {
          tenantId,
          moduleCode: threshold.moduleCode,
          thresholdKey: threshold.thresholdKey,
          oldValue: threshold.thresholdValue,
          newValue,
          reason: (relevantSignals as any).length > (policy.maxSignals || 5)
            ? 'too_many_signals'
            : 'no_signals_recent_adjustment',
        });
      }
    }
  } catch (err) {
    logger.warn('[Proactive Leadership] Threshold adjustment failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return adjustments;
}

/**
 * Learn from patterns and update predictive models
 */
export async function learnFromPatterns(
  tenantId: string,
  signals: ProactiveSignal[],
  predictions: Array<{ need: string; timeframe: string; confidence: number }>
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);

    // Store learning patterns for future prediction improvement
    await safeQuery(
      `INSERT INTO "${schema}".proactive_leadership_patterns (
        tenant_id, signal_type, module_code, pattern_data, detected_at, confidence
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT DO NOTHING`,
      [
        tenantId,
        signals.map(s => s.signalType).join(','),
        signals.map(s => s.moduleCode).join(','),
        JSON.stringify({ signals, predictions }),
        signals.reduce((max, s) => Math.max(max, s.confidence), 0),
      ]
    ).catch(catchHandler(EC.EVENT_BUS, {})); // Ignore if table doesn't exist yet
  } catch (err) {
    // Learning is non-critical, log but don't fail
    logger.debug('[Proactive Leadership] Pattern learning skipped', {
      tenantId,
      error: (err as Error).message,
    });
  }
}
