// ============================================
// AGRC-OS -- Agent Fallback Responses Service
// Extracted from agent-runner.service.ts
// Rule-based fallback responses when the circuit breaker
// is open or LLM calls are unavailable. Provides heuristic
// actions for agents A01-A12 based on context data.
// ============================================
/**
 * Rule-based fallback when circuit breaker is open.
 * Returns heuristic actions per agent (A01-A10) based on context data,
 * plus any pending handoffs from cooperating agents.
 */
export function _fallbackAgentResponse(agentId, context) {
    const actions = [];
    switch (agentId) {
        case 'A01': {
            const profile = context.orgProfile || {};
            const profileComplete = context.profileComplete ?? false;
            const fwCount = context.frameworkCount ?? 0;
            const ctrlCount = context.controlCount ?? 0;
            if (!profileComplete)
                actions.push({ type: 'create_task', title: 'Incomplete organization profile', description: 'Organization profile is missing critical fields. Complete sector, size, and regulatory scope to enable accurate compliance mapping.', priority: 'high', entityType: 'tenant', assignToRole: 'admin' });
            if (fwCount === 0)
                actions.push({ type: 'create_task', title: 'No frameworks adopted', description: 'No regulatory frameworks have been adopted. Map at least your primary framework (e.g., NCA-ECC, SAMA-CSF) to begin compliance tracking.', priority: 'critical', assignToRole: 'compliance_officer' });
            if (ctrlCount === 0 && fwCount > 0)
                actions.push({ type: 'create_task', title: 'No controls mapped to frameworks', description: 'Frameworks are adopted but no controls are mapped. Run UCF control mapping to populate your control library.', priority: 'high', assignToRole: 'compliance_officer' });
            if (!profile.hasCiso)
                actions.push({ type: 'send_notification', title: 'No CISO designated', description: 'Organization profile does not indicate a designated CISO. KSA regulators expect a named cybersecurity officer.', priority: 'medium', assignToRole: 'admin' });
            break;
        }
        case 'A02': {
            const inactive = context.inactiveUsers ?? 0;
            const adminCount = context.adminCount ?? 0;
            const totalUsers = context.totalUsers ?? 0;
            if (inactive > 0)
                actions.push({ type: 'create_task', title: `${inactive} inactive users (90+ days)`, description: `${inactive} user account(s) have not logged in for over 90 days. Deactivate or review per access control policy.`, priority: inactive > 5 ? 'high' : 'medium', entityType: 'user', assignToRole: 'admin' });
            if (adminCount > 3)
                actions.push({ type: 'flag_risk', title: `${adminCount} admin accounts detected`, description: `${adminCount} users have admin role. Principle of least privilege recommends limiting admin access.`, priority: 'high', entityType: 'user', assignToRole: 'admin' });
            if (totalUsers > 0 && adminCount === totalUsers)
                actions.push({ type: 'escalate', title: 'All users are admins', description: 'Every user account has admin privileges. This violates segregation of duties requirements.', priority: 'critical', entityType: 'user' });
            break;
        }
        case 'A03': {
            const unmapped = context.unmappedControls ?? 0;
            const fwCount = context.frameworkCount ?? 0;
            if (unmapped > 0)
                actions.push({ type: 'create_task', title: `${unmapped} controls not mapped to frameworks`, description: `${unmapped} UCF control(s) have no framework mappings. Map them to applicable frameworks for compliance coverage.`, priority: unmapped > 20 ? 'high' : 'medium', entityType: 'control', assignToRole: 'compliance_officer' });
            if (fwCount === 0)
                actions.push({ type: 'create_task', title: 'No frameworks registered', description: 'Register at least one regulatory framework to begin compliance mapping.', priority: 'critical', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A04': {
            const noDocs = context.controlsWithoutDocs ?? 0;
            const drafts = context.draftPolicies ?? 0;
            if (noDocs > 0)
                actions.push({ type: 'create_task', title: `${noDocs} controls without documentation`, description: `${noDocs} control(s) lack implementation notes. Document implementation details for audit readiness.`, priority: noDocs > 15 ? 'high' : 'medium', entityType: 'control', assignToRole: 'compliance_officer' });
            if (drafts > 0)
                actions.push({ type: 'send_notification', title: `${drafts} draft policies pending finalization`, description: `${drafts} policy/policies remain in draft status. Review, approve, and publish them.`, priority: 'medium', entityType: 'policy', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A05': {
            const expired = context.expiredEvidence ?? 0;
            const missing = context.controlsWithoutEvidence ?? 0;
            const overdueSchedules = context.overdueSchedules ?? 0;
            if (expired > 0)
                actions.push({ type: 'request_evidence', title: `${expired} expired evidence items`, description: `${expired} evidence item(s) have expired and require renewal to maintain audit readiness.`, priority: expired > 5 ? 'high' : 'medium', entityType: 'evidence' });
            if (missing > 0)
                actions.push({ type: 'create_task', title: `${missing} controls without evidence`, description: `${missing} control(s) have no linked evidence. Collect evidence to demonstrate control effectiveness.`, priority: missing > 10 ? 'high' : 'medium', entityType: 'control' });
            if (overdueSchedules > 0)
                actions.push({ type: 'send_notification', title: `${overdueSchedules} overdue evidence collection schedules`, description: `${overdueSchedules} evidence schedule(s) are overdue for collection. Assign custodians and collect.`, priority: 'high', entityType: 'evidence', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A06': {
            const gaps = context.openGaps ?? 0;
            const overdue = context.overdueRemediations ?? 0;
            const score = parseFloat(context.avgComplianceScore ?? '0');
            if (overdue > 0)
                actions.push({ type: 'escalate', title: `${overdue} overdue remediation tasks`, description: `${overdue} remediation task(s) are past their due date. Escalate to responsible owners.`, priority: 'critical', entityType: 'remediation_task', assignToRole: 'compliance_officer' });
            if (gaps > 0)
                actions.push({ type: 'create_task', title: `${gaps} open compliance gaps`, description: `${gaps} compliance gap(s) remain open. Prioritize by severity and create remediation plans.`, priority: gaps > 10 ? 'high' : 'medium', entityType: 'compliance_gap', assignToRole: 'compliance_officer' });
            if (score > 0 && score < 60)
                actions.push({ type: 'flag_risk', title: `Low compliance score: ${score}%`, description: `Average compliance score is ${score}%. This is below acceptable threshold. Immediate remediation required.`, priority: 'high', entityType: 'compliance' });
            break;
        }
        case 'A07': {
            const high = context.highRisks ?? 0;
            const unscored = context.unscoredRisks ?? 0;
            const appetite = context.risksExceedingAppetite ?? 0;
            const maxScore = context.maxRiskScore ?? 0;
            if (appetite > 0)
                actions.push({ type: 'escalate', title: `${appetite} risks exceed appetite`, description: `${appetite} risk(s) exceed the organization's defined risk appetite thresholds. Board-level attention required.`, priority: 'critical', entityType: 'risk' });
            if (unscored > 0)
                actions.push({ type: 'create_task', title: `${unscored} unscored risks`, description: `${unscored} risk(s) require scoring. Assign to risk manager for assessment.`, priority: 'high', entityType: 'risk', assignToRole: 'risk_manager' });
            if (high > 0)
                actions.push({ type: 'flag_risk', title: `${high} high risks active (max: ${maxScore})`, description: `${high} risk(s) with score > 15 remain open. Review treatment plans.`, priority: 'high', entityType: 'risk' });
            break;
        }
        case 'A08': {
            const overdue = context.overdueReview ?? 0;
            const pending = context.pendingApproval ?? 0;
            const expiring = context.policiesExpiringIn30Days ?? 0;
            if (overdue > 0)
                actions.push({ type: 'create_task', title: `${overdue} policies overdue for review`, description: `${overdue} published policy/policies have passed their review date. Schedule review cycle.`, priority: 'high', entityType: 'policy', assignToRole: 'compliance_officer' });
            if (pending > 0)
                actions.push({ type: 'send_notification', title: `${pending} policies pending approval`, description: `${pending} policy/policies are awaiting approval. Review and approve or reject.`, priority: 'medium', entityType: 'policy' });
            if (expiring > 0)
                actions.push({ type: 'send_notification', title: `${expiring} policies expiring within 30 days`, description: `${expiring} policy/policies will expire soon. Initiate review and renewal process.`, priority: 'medium', entityType: 'policy', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A09': {
            const highRisk = context.highRiskVendors ?? 0;
            const dueAssessment = context.vendorsDueForAssessment ?? 0;
            const noAssessment = context.vendorsWithNoAssessmentDate ?? 0;
            if (highRisk > 0)
                actions.push({ type: 'flag_risk', title: `${highRisk} high/critical-risk vendors active`, description: `${highRisk} active vendor(s) rated high or critical risk. Review controls and contractual safeguards.`, priority: 'high', entityType: 'vendor', assignToRole: 'risk_manager' });
            if (dueAssessment > 0)
                actions.push({ type: 'create_task', title: `${dueAssessment} vendors due for reassessment`, description: `${dueAssessment} vendor(s) are due for reassessment within 14 days. Schedule assessment.`, priority: 'medium', entityType: 'vendor', assignToRole: 'risk_manager', dueInDays: 14 });
            if (noAssessment > 0)
                actions.push({ type: 'create_task', title: `${noAssessment} vendors with no assessment date`, description: `${noAssessment} active vendor(s) have never been assessed. Schedule initial risk assessment.`, priority: noAssessment > 5 ? 'high' : 'medium', entityType: 'vendor', assignToRole: 'risk_manager' });
            break;
        }
        case 'A10': {
            const findings = context.openFindings ?? 0;
            const auditItems = context.openAuditItems ?? 0;
            const overdueReports = context.overdueReportSchedules ?? 0;
            if (findings > 0)
                actions.push({ type: 'create_task', title: `${findings} open audit findings`, description: `${findings} audit finding(s) remain open. Track remediation and verify closure.`, priority: findings > 10 ? 'high' : 'medium', entityType: 'finding', assignToRole: 'auditor' });
            if (auditItems > 0)
                actions.push({ type: 'send_notification', title: `${auditItems} audit items in progress`, description: `${auditItems} assessment item(s) from recent audits are still open. Complete and document results.`, priority: 'medium', entityType: 'assessment', assignToRole: 'auditor' });
            if (overdueReports > 0)
                actions.push({ type: 'create_task', title: `${overdueReports} overdue report schedules`, description: `${overdueReports} scheduled report(s) have not run. Generate and distribute.`, priority: 'high', entityType: 'report', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A11': {
            const plans = context.bcpPlans ?? 0;
            const overdueTests = context.overdueBcpTests ?? 0;
            const missingRto = context.plansMissingRtoRpo ?? 0;
            if (plans === 0)
                actions.push({ type: 'create_task', title: 'No BCP plans found', description: 'No business continuity plans are registered. Create at least one plan for critical services and define RTO/RPO.', priority: 'critical', entityType: 'bcp_plan', assignToRole: 'compliance_officer' });
            if (missingRto > 0)
                actions.push({ type: 'create_task', title: `${missingRto} BCP plans missing RTO/RPO`, description: `${missingRto} plan(s) lack defined RTO/RPO. Define recovery objectives to support testing and regulator expectations.`, priority: 'high', entityType: 'bcp_plan', assignToRole: 'compliance_officer' });
            if (overdueTests > 0)
                actions.push({ type: 'create_task', title: `${overdueTests} overdue BCP tests`, description: `${overdueTests} continuity test(s) are overdue. Schedule and execute tests, then record results.`, priority: 'high', entityType: 'bcp_test', assignToRole: 'compliance_officer' });
            break;
        }
        case 'A12': {
            const overdueTraining = context.overdueTrainingAssignments ?? 0;
            const lowCoverage = context.trainingCoveragePercent ?? null;
            const failedPhish = context.failedPhishingSimulations ?? 0;
            if (overdueTraining > 0)
                actions.push({ type: 'create_task', title: `${overdueTraining} overdue training assignments`, description: `${overdueTraining} user training assignment(s) are overdue. Notify users and escalate repeat non-compliance.`, priority: overdueTraining > 10 ? 'high' : 'medium', entityType: 'training_assignment', assignToRole: 'admin' });
            if (typeof lowCoverage === 'number' && lowCoverage < 80)
                actions.push({ type: 'flag_risk', title: `Low training coverage: ${lowCoverage}%`, description: `Training completion coverage is ${lowCoverage}%. Increase completion to meet baseline awareness requirements.`, priority: 'high', entityType: 'training' });
            if (failedPhish > 0)
                actions.push({ type: 'send_notification', title: `${failedPhish} failed phishing simulations`, description: `${failedPhish} user(s) failed phishing simulations. Assign targeted awareness training.`, priority: 'medium', entityType: 'training', assignToRole: 'admin' });
            break;
        }
    }
    // Process handoffs from cooperating agents (applicable to any agent)
    const handoffs = context._pendingHandoffs || [];
    for (const h of handoffs.slice(0, 2)) {
        actions.push({ type: 'create_task', title: `Handoff from ${h.from}: ${h.finding || 'Review needed'}`, description: h.requestedAction || 'Process handoff from cooperating agent', priority: h.priority || 'medium' });
    }
    return { actions: actions.slice(0, 5), summary: actions.length > 0 ? `Rule-based fallback: ${actions.length} action(s)` : 'No immediate actions needed.' };
}
//# sourceMappingURL=agent-fallback-responses.service.js.map