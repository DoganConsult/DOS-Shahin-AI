/**
 * Governance AI Module — Manifest Validation Tests
 *
 * MP-26 §12: unit tests for module manifest compliance.
 * Verifies manifest structure matches AGENTS.md Patch 6 requirements.
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { GOVERNANCE_AI_MANIFEST } from './governance_ai.module';

describe('Governance AI Module Manifest', () => {
  it('has correct module code', () => {
    expect(GOVERNANCE_AI_MANIFEST.code).toBe('governance-ai');
  });

  it('has correct tier and category', () => {
    expect(GOVERNANCE_AI_MANIFEST.tier).toBe('full');
    expect(GOVERNANCE_AI_MANIFEST.category).toBe('ai_automation');
  });

  it('has bilingual names', () => {
    expect(GOVERNANCE_AI_MANIFEST.nameEn).toBeTruthy();
    expect(GOVERNANCE_AI_MANIFEST.nameAr).toBeTruthy();
    expect(GOVERNANCE_AI_MANIFEST.descriptionEn).toBeTruthy();
    expect(GOVERNANCE_AI_MANIFEST.descriptionAr).toBeTruthy();
  });

  it('declares owned tables (MP-26 §5)', () => {
    expect(GOVERNANCE_AI_MANIFEST.ownedTables.length).toBeGreaterThan(0);
    expect(GOVERNANCE_AI_MANIFEST.ownedTables).toContain('governance_ai_signals');
    expect(GOVERNANCE_AI_MANIFEST.ownedTables).toContain('governance_ai_pipeline_runs');
    expect(GOVERNANCE_AI_MANIFEST.ownedTables).toContain('governance_ai_health_snapshots');
    expect(GOVERNANCE_AI_MANIFEST.ownedTables).toContain('governance_ai_audit_log');
  });

  it('declares aggregate roots', () => {
    expect(GOVERNANCE_AI_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(GOVERNANCE_AI_MANIFEST.aggregateRoots).toContain('governance_ai_signals');
    expect(GOVERNANCE_AI_MANIFEST.aggregateRoots).toContain('governance_ai_pipeline_runs');
  });

  it('declares published events', () => {
    expect(GOVERNANCE_AI_MANIFEST.publishedEvents.length).toBeGreaterThan(0);
    expect(GOVERNANCE_AI_MANIFEST.publishedEvents).toContain('governance_ai.signal_detected');
    expect(GOVERNANCE_AI_MANIFEST.publishedEvents).toContain('governance_ai.pipeline_completed');
    expect(GOVERNANCE_AI_MANIFEST.publishedEvents).toContain('governance_ai.escalation_triggered');
  });

  it('declares consumed events from all integrated modules', () => {
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents.length).toBeGreaterThanOrEqual(16);
    // Risk module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('risk.score_changed');
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('risk.kri_threshold_breached');
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('risk.appetite_breached');
    // Compliance module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('compliance.posture_changed');
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('compliance.gap_detected');
    // Controls module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('controls.effectiveness_failed');
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('controls.test_overdue');
    // Incident module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('incident.classified');
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('incident.escalated');
    // Audit module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('audit.finding_created');
    // Exception module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('exception.expired');
    // Workflow module
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('workflow.sla_breached');
    // AI Governance
    expect(GOVERNANCE_AI_MANIFEST.consumedEvents).toContain('ai_governance.monitoring_alert');
  });

  it('has correct route base', () => {
    expect(GOVERNANCE_AI_MANIFEST.routeBase).toBe('/api/governance-ai');
  });

  it('has correct event namespace', () => {
    expect(GOVERNANCE_AI_MANIFEST.eventNamespace).toBe('governance_ai');
  });

  it('has table prefix', () => {
    expect(GOVERNANCE_AI_MANIFEST.tablePrefix).toBe('governance_ai_');
  });

  it('has AI capabilities configured', () => {
    expect(GOVERNANCE_AI_MANIFEST.aiEnabled).toBe(true);
    expect(GOVERNANCE_AI_MANIFEST.aiCapabilities).toBeDefined();
    expect(GOVERNANCE_AI_MANIFEST.aiCapabilities!.length).toBeGreaterThan(0);
    expect(GOVERNANCE_AI_MANIFEST.aiCapabilities).toContain('recommendations');
    expect(GOVERNANCE_AI_MANIFEST.aiCapabilities).toContain('scoring');
    expect(GOVERNANCE_AI_MANIFEST.aiCapabilities).toContain('anomaly_detection');
  });

  it('has agent binding A03', () => {
    expect(GOVERNANCE_AI_MANIFEST.agentBinding).toBe('A03');
  });

  it('has feature flags declared', () => {
    expect(GOVERNANCE_AI_MANIFEST.featureFlags).toBeDefined();
    expect(GOVERNANCE_AI_MANIFEST.featureFlags!.length).toBeGreaterThan(0);
  });

  it('has admin surfaces declared', () => {
    expect(GOVERNANCE_AI_MANIFEST.adminSurfaces).toBeDefined();
    expect(GOVERNANCE_AI_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
    expect(GOVERNANCE_AI_MANIFEST.adminSurfaces).toContain('pipeline-config');
    expect(GOVERNANCE_AI_MANIFEST.adminSurfaces).toContain('signal-thresholds');
    expect(GOVERNANCE_AI_MANIFEST.adminSurfaces).toContain('escalation-rules');
  });

  it('has licensing tier', () => {
    expect(GOVERNANCE_AI_MANIFEST.licensingTier).toBe('enterprise');
  });

  it('has provisioning order', () => {
    expect(GOVERNANCE_AI_MANIFEST.provisioningOrder).toBeDefined();
    expect(GOVERNANCE_AI_MANIFEST.provisioningOrder).toBeGreaterThan(0);
  });

  it('has soft deps on all integrated modules', () => {
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('risk');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('compliance');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('audit');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('controls');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('incident');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('exception');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('workflow');
    expect(GOVERNANCE_AI_MANIFEST.softDeps).toContain('ai-governance');
  });
});
