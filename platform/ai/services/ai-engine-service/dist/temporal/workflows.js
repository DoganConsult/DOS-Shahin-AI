// AI-OS Temporal workflows. Workflows are deterministic, sandboxed code: they
// MUST NOT do I/O directly — every side effect goes through `proxyActivities`.
//
// Two canonical workflows are defined here:
//   - agentInvocationWorkflow  : single-agent invoke with governance + audit
//   - agentSquadWorkflow       : fan-out N agents, aggregate, escalate on HITL
import { proxyActivities, defineSignal, setHandler, condition } from '@temporalio/workflow';
// Per-activity retry + timeout. Each activity has different failure
// modes so a single shared policy under-protects the LLM call and
// over-retries the audit insert.
//   - checkGovernance: short timeout, more attempts (governance API may be flaky).
//   - invokeAgent: long timeout (LLM round-trips), 5 attempts, exponential backoff;
//     non-retryable errors (auth, validation) tagged in the activity body so
//     Temporal short-circuits without burning the full budget.
//   - recordExecution: short timeout, fewer attempts (audit DB write).
const { checkGovernance } = proxyActivities({
    startToCloseTimeout: '15 seconds',
    retry: { initialInterval: '500ms', maximumInterval: '5s', backoffCoefficient: 2, maximumAttempts: 6 },
});
const { invokeAgent } = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: {
        initialInterval: '2s',
        maximumInterval: '60s',
        backoffCoefficient: 2,
        maximumAttempts: 5,
        // Activity throws Error with one of these names → Temporal does NOT
        // retry. Anything else (network, 5xx, 429) is retried.
        nonRetryableErrorTypes: [
            'MISSING_TENANT',
            'INVALID_AGENT',
            'GOVERNANCE_DENIED',
            'PERMISSION_DENIED',
        ],
    },
});
const { recordExecution } = proxyActivities({
    startToCloseTimeout: '30 seconds',
    retry: { initialInterval: '1s', maximumInterval: '15s', backoffCoefficient: 2, maximumAttempts: 3 },
});
/**
 * Single-agent invocation workflow.
 * Steps: governance pre-check → invoke → record audit. Each step is a Temporal
 * activity so retry/backoff/timeout policies apply.
 */
export async function agentInvocationWorkflow(input) {
    const gov = await checkGovernance({
        tenantId: input.tenantId,
        agentCode: input.agentCode,
        payload: input.input,
    });
    if (gov.decision === 'deny') {
        return {
            executionId: '',
            status: 'rejected',
            governance: { decision: gov.decision, reason: gov.reason },
        };
    }
    const result = await invokeAgent(input);
    await recordExecution({ tenantId: input.tenantId, agentCode: input.agentCode, result });
    return {
        executionId: result.executionId,
        status: result.status,
        output: result.output,
        costUsd: result.costUsd,
        usedTools: result.usedTools,
        governance: { decision: gov.decision, reason: gov.reason },
    };
}
export const cancelSquadSignal = defineSignal('cancel-squad');
/**
 * Squad workflow — fan-out invocations to N agents in parallel, gather results.
 * Supports a `cancel-squad` signal to abort early.
 */
export async function agentSquadWorkflow(input) {
    let cancelled = false;
    setHandler(cancelSquadSignal, () => { cancelled = true; });
    const inflight = input.agentCodes.map(code => agentInvocationWorkflow({ tenantId: input.tenantId, agentCode: code, input: input.input }));
    const settled = await Promise.race([
        Promise.all(inflight),
        condition(() => cancelled).then(() => []),
    ]);
    return settled;
}
//# sourceMappingURL=workflows.js.map