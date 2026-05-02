// @ts-nocheck — module-layer imports not yet extracted
/**
 * Shahin-AI — GRC Automation Worker Registration
 *
 * Registers Shahin-AI product-specific automation workers with the
 * DOS TenantAutomationEngine. These workers implement GRC-specific
 * monitoring and enforcement logic.
 *
 * @owner product/shahin-ai
 * @since 2026-03-30
 * @see platform/dos/automation/tenant-automation-engine.service.ts
 */

import { registerAutomationWorker } from '@dos/platform-core/automation/tenant-automation-engine.service';
import { ControlMonitorWorker } from '@dos/module-sdk/agrc-engine/workers/control-monitor.worker';
import { RemediationOverdueWorker } from '@dos/module-sdk/agrc-engine/workers/remediation-overdue.worker';
import { KriBreachWorker } from '@dos/module-sdk/agrc-engine/workers/kri-breach.worker';
import { PolicyReviewWorker } from '@dos/module-sdk/agrc-engine/workers/policy-review.worker';

const controlWorker = new ControlMonitorWorker();
const remediationWorker = new RemediationOverdueWorker();
const kriWorker = new KriBreachWorker();
const policyWorker = new PolicyReviewWorker();

export function registerGrcAutomationWorkers(): void {
  registerAutomationWorker({
    workerCode: 'grc.control-monitor',
    name: 'Control Monitor',
    ownerLayer: 'product',
    ownerCode: 'shahin-ai',
    run: (ctx) => controlWorker.run(ctx).then(r => ({ workerCode: 'grc.control-monitor', ...r })),
  });

  registerAutomationWorker({
    workerCode: 'grc.remediation-overdue',
    name: 'Remediation Overdue',
    ownerLayer: 'product',
    ownerCode: 'shahin-ai',
    run: (ctx) => remediationWorker.run(ctx).then(r => ({ workerCode: 'grc.remediation-overdue', ...r })),
  });

  registerAutomationWorker({
    workerCode: 'grc.kri-breach',
    name: 'KRI Breach',
    ownerLayer: 'product',
    ownerCode: 'shahin-ai',
    run: (ctx) => kriWorker.run(ctx).then(r => ({ workerCode: 'grc.kri-breach', ...r })),
  });

  registerAutomationWorker({
    workerCode: 'grc.policy-review',
    name: 'Policy Review',
    ownerLayer: 'product',
    ownerCode: 'shahin-ai',
    run: (ctx) => policyWorker.run(ctx).then(r => ({ workerCode: 'grc.policy-review', ...r })),
  });
}
