// Shahin — AGRC Event Type Definitions
// Product-specific event types registered with the platform event bus

import type { EventNamespace } from '@dos/contracts';

export const AGRC_EVENT_TYPES = [
  'risk.changed',
  'risk.exceeded_appetite',
  'risk.created',
  'risk.mitigation_required',
  'risk.score_changed',
  'risk.treatment_updated',
  'control.stale',
  'control.state_changed',
  'policy.violated',
  'policy.approved',
  'policy.review_due',
  'policy.impact_simulated',
  'gate.blocked',
  'gate.allowed',
  'gate.overridden',
  'telemetry.ingested',
  'telemetry.threat_high',
  'escalation.triggered',
  'escalation.timeout',
  'delta.detected',
  'delta.impact_assessed',
  'ccm.cycle_completed',
  'ccm.stale_detected',
  'cycle.started',
  'cycle.completed',
  'cycle.failed',
  'constitution.updated',
  'constitution.breach',
  'vendor.gate_blocked',
  'vendor.onboarded',
  'vendor.questionnaire_distributed',
  'vendor.questionnaire_responded',
  'vendor.questionnaire_overdue',
  'vendor.engagement_score_low',
  'vendor.evidence_rejected',
  'incident.created',
  'incident.escalated',
  'audit.finding_created',
  'notification.sent',
  'stakeholder.invited',
  'stakeholder.accepted',
  'stakeholder.invitation_revoked',
  'regulator.request_received',
  'regulator.deadline_approaching',
  'consultant.finding_added',
  'engagement.cycle_completed',
  'task.auto_created',
  'approval.completed',
  'approval.rejected',
  'delegation.granted',
  'delegation.revoked',
  'onboarding.agent_completed',
  'onboarding.scene.welcome',
  'onboarding.profile.captured',
  'onboarding.pain.captured',
  'onboarding.structure.captured',
  'onboarding.governance.captured',
  'onboarding.journey_profile.selected',
  'regulator.inferred',
  'frameworks.assigned',
  'ownership.graph.seeded',
  'workspace.preview.generated',
  'provisioning.started',
  'workspace.activated',
  'cockpit.ready',
  'lifecycle.checkpoint_due',
  'lifecycle.checkpoint_completed',
  'lifecycle.re_answer_applied',
  'lifecycle.misalignment_detected',
  'lifecycle.template_injected',
  'triage.proposals_generated',
  'unified_squad.deployment_mode_defaulted',
  'unified_squad.task_assigned',
  'unified_squad.delivery_failed',
  'unified_squad.status_changed',
  'risk_pair.agent_assessed',
  'calibration.proposed',
  'event.dlq_permanent_failure',
  'compliance.gap_detected',
  'compliance.posture_changed',
  'compliance.assessment_completed',
  'compliance.drift_detected',
  'attestation.draft_generated',
  'evidence.expired',
  'evidence.requested',
] as const;

export const AGRC_EVENT_NAMESPACES: EventNamespace[] = [
  { prefix: 'risk', events: ['changed', 'exceeded_appetite', 'created', 'mitigation_required', 'score_changed', 'treatment_updated', 'status_changed'] },
  { prefix: 'control', events: ['stale', 'state_changed', 'failed', 'implemented', 'effectiveness_low'] },
  { prefix: 'policy', events: ['violated', 'approved', 'review_due', 'created', 'expired', 'review_completed', 'version_created', 'status_changed', 'published'] },
  { prefix: 'gate', events: ['blocked', 'allowed', 'overridden'] },
  { prefix: 'telemetry', events: ['ingested', 'threat_high'] },
  { prefix: 'escalation', events: ['triggered', 'timeout'] },
  { prefix: 'delta', events: ['detected', 'impact_assessed'] },
  { prefix: 'ccm', events: ['cycle_completed', 'stale_detected'] },
  { prefix: 'cycle', events: ['started', 'completed', 'failed'] },
  { prefix: 'constitution', events: ['updated', 'breach'] },
  { prefix: 'vendor', events: ['gate_blocked', 'onboarded', 'risk_changed', 'assessment_due', 'contract_expiring', 'dd_initiated', 'dd_completed', 'dd_expired', 'sla_breached', 'sla_warning', 'fourth_party_flagged', 'concentration_high', 'offboarding_initiated', 'offboarding_completed', 'monitoring_signal', 'risk_propagated', 'compliance_gap_propagated', 'evidence_auto_satisfied', 'audit_finding_propagated', 'framework_sync_triggered', 'posture_recalculated', 'cascade_risk_assessed', 'questionnaire_distributed', 'questionnaire_responded', 'questionnaire_overdue', 'engagement_score_low', 'evidence_rejected', 'status_changed'] },
  { prefix: 'incident', events: ['created', 'resolved', 'root_cause_identified', 'escalated', 'sla_breached', 'near_miss_reported', 'near_miss_converted', 'pir_created', 'pir_signed_off', 'regulatory_notification_due', 'regulatory_submitted', 'risk_linked', 'trend_detected', 'status_changed'] },
  { prefix: 'audit', events: ['finding_created', 'completed', 'remediation_due', 'finding.sla_breached', 'finding.sla_warning', 'schedule.triggered', 'qa.approved', 'qa.rejected', 'capa.effectiveness_tested', 'cross_module.risk_synced', 'status_changed', 'finding.issued'] },
  { prefix: 'compliance', events: ['gap_detected', 'posture_changed', 'assessment_completed', 'status_changed', 'assessment_started', 'assessment_approved', 'assessment_rejected', 'obligation_created', 'obligation_updated', 'obligation_assigned', 'control_mapped', 'applicability_changed', 'evidence_linked', 'owner_assigned', 'finding_raised', 'remediation_linked', 'attestation_campaign_created', 'attestation_submitted', 'exception_created', 'exception_approved', 'exception_rejected', 'review_overdue', 'score_recalculated'] },
  { prefix: 'evidence', events: ['expired', 'requested', 'uploaded', 'coverage_low', 'approved', 'rejected', 'submitted', 'collected', 'version_created', 'task_submitted', 'task_approved', 'task_rejected', 'status_changed'] },
  { prefix: 'framework', events: ['mapped', 'gap_identified', 'updated'] },
  { prefix: 'procedure', events: ['created', 'approved', 'expired', 'review_due', 'version_created'] },
  { prefix: 'notification', events: ['sent'] },
  { prefix: 'stakeholder', events: ['invited', 'accepted', 'invitation_revoked'] },
  { prefix: 'consultant', events: ['finding_added'] },
  { prefix: 'engagement', events: ['cycle_completed'] },
  { prefix: 'task', events: ['auto_created'] },
  { prefix: 'approval', events: ['completed', 'rejected'] },
  { prefix: 'delegation', events: ['granted', 'revoked'] },
  { prefix: 'onboarding', events: ['agent_completed', 'scene.welcome', 'profile.captured', 'pain.captured', 'structure.captured', 'governance.captured', 'journey_profile.selected'] },
  { prefix: 'regulator', events: ['request_received', 'deadline_approaching', 'inferred'] },
  { prefix: 'frameworks', events: ['assigned'] },
  { prefix: 'ownership', events: ['graph.seeded'] },
  { prefix: 'workspace', events: ['preview.generated', 'activated'] },
  { prefix: 'provisioning', events: ['started'] },
  { prefix: 'cockpit', events: ['ready'] },
  { prefix: 'lifecycle', events: ['checkpoint_due', 'checkpoint_completed', 're_answer_applied', 'misalignment_detected', 'template_injected'] },
  { prefix: 'triage', events: ['proposals_generated'] },
  { prefix: 'unified_squad', events: ['deployment_mode_defaulted', 'task_assigned', 'delivery_failed', 'status_changed'] },
  { prefix: 'risk_pair', events: ['agent_assessed'] },
  { prefix: 'calibration', events: ['proposed'] },
  { prefix: 'workflow', events: ['created', 'updated', 'deleted', 'activated', 'archived', 'executed', 'completed', 'failed', 'paused', 'resumed', 'cancelled', 'retried', 'sla_breached', 'sla_warning', 'sla_recovered', 'approval_required', 'approval_completed', 'approval_rejected', 'step_started', 'step_completed', 'step_failed', 'task_assigned', 'task_completed', 'task_reassigned', 'template_published', 'template_instantiated', 'simulation_completed'] },
  { prefix: 'privacy', events: ['impact_high', 'dpia_required'] },
  { prefix: 'knowledge', events: ['gap_detected', 'content_pack_installed', 'content_pack_removed', 'sop_updated', 'training_completed'] },
  { prefix: 'automation', events: ['rule_triggered'] },
  { prefix: 'report', events: ['generated', 'overdue'] },
  { prefix: 'ops', events: ['health_degraded', 'capacity_warning'] },
  { prefix: 'crosshub', events: ['cascade_triggered', 'chain_completed', 'chain_step_started'] },
  { prefix: 'connector', events: ['sync_completed', 'sync_failed', 'connected', 'disconnected', 'health_degraded'] },
  { prefix: 'team', events: ['member_added', 'member_removed', 'role_changed', 'created', 'disbanded'] },
  { prefix: 'process_task', events: ['created', 'assigned', 'sla_warning', 'sla_breached', 'escalated', 'completed', 'unassigned'] },
  { prefix: 'evidence_request', events: ['created', 'submitted', 'overdue'] },
  { prefix: 'raci', events: ['assigned', 'removed', 'gap_detected', 'auto_assigned', 'expired', 'cascade_triggered', 'enforcement_blocked', 'renewal_due'] },
  { prefix: 'bcp', events: ['plan_created', 'plan_activated', 'plan_deactivated', 'plan_stale', 'exercise_scheduled', 'exercise_completed', 'exercise_overdue', 'bia_completed', 'bia_criticality_high', 'crisis_comm_activated', 'recovery_step_completed', 'recovery_step_failed', 'maturity_assessed', 'dependency_critical', 'rto_rpo_drift', 'crisis_readiness_low', 'bia_stale', 'maturity_regression', 'health_check_completed', 'readiness_score_changed', 'status_changed'] },
  { prefix: 'training', events: ['campaign_launched', 'campaign_completed', 'assignment_overdue', 'assignment_completed', 'certification_issued', 'certification_expiring', 'phishing_launched', 'phishing_completed', 'compliance_gap', 'content_published'] },
  { prefix: 'advanced', events: ['redteam_finding', 'vulnerability_found', 'model_risk_high', 'simulation_completed', 'digital_twin_changed'] },
  { prefix: 'admin', events: ['tenant_suspended', 'tenant_activated', 'user_deactivated', 'role_changed', 'plan_upgraded', 'config_changed'] },
  { prefix: 'governance', events: ['charter_expired', 'mandate_expired', 'delegation_expiring', 'delegation_expired', 'action_overdue', 'action_escalated', 'policy_review_overdue', 'enforcement_violation', 'health_score_changed', 'board_attention_item', 'status_changed'] },
  { prefix: 'subscription', events: ['created', 'activated', 'cancelled', 'paused', 'resumed', 'renewed', 'renewal_due', 'expired', 'past_due', 'grace_period_entered', 'grace_started', 'grace_period_expired', 'grace_ending', 'trial_started', 'trial_expired', 'trial_extended', 'extended', 'tier_upgraded', 'upgraded', 'tier_downgraded', 'downgraded', 'downgrade_scheduled', 'downgrade_cancelled', 'payment_succeeded', 'payment_failed', 'renewal_mode_changed', 'usage_limit_reached', 'usage_limit_warning', 'usage_limit_blocked'] },
  { prefix: 'foundation', events: ['organization.created', 'organization.updated', 'organization.deleted', 'organization.status_changed', 'business_unit.created', 'business_unit.updated', 'business_unit.deleted', 'business_unit.status_changed', 'department.created', 'department.updated', 'department.deleted', 'department.status_changed', 'location.created', 'location.updated', 'location.deleted', 'team.created', 'team.updated', 'team.deleted', 'role.created', 'role.updated', 'role.deleted', 'user.created', 'user.updated', 'user.deleted', 'user.status_changed', 'position.created', 'position.updated', 'position.deleted', 'position.status_changed', 'committee.created', 'committee.updated', 'committee.deleted', 'person_created', 'module_assignment_created', 'module_assignment_updated', 'responsibility_confirmed', 'responsibility_rejected', 'bulk_import_completed', 'auto_suggest_completed', 'ownership_wired'] },
  { prefix: 'role', events: ['assigned', 'unassigned'] },
  { prefix: 'sod', events: ['conflict_detected', 'conflict_resolved'] },
  { prefix: 'pdpl', events: ['consent_granted', 'consent_revoked'] },
  { prefix: 'qiyas', events: ['assessment_created', 'assessment_finalized', 'scores_computed', 'gap_critical', 'gap_closed', 'recommendation_generated', 'recommendation_accepted', 'recommendation_rejected', 'maturity_threshold_crossed', 'maturity_improved', 'maturity_regressed', 'indicator_score_updated', 'calibration_proposed', 'calibration_completed', 'benchmark_published', 'certification_gap_closed', 'certification_ready', 'evidence_quality_scored', 'respondent_assigned', 'respondent_completed'] },
  { prefix: 'asset', events: ['created', 'status_changed', 'classified', 'decommissioned'] },
  { prefix: 'remediation', events: ['created', 'status_changed', 'completed'] },
  { prefix: 'action', events: ['created', 'status_changed', 'completed'] },
  { prefix: 'exception', events: ['created', 'status_changed', 'approved', 'rejected'] },
  { prefix: 'ai_supply_chain', events: ['provenance_registered', 'lineage_tracked', 'provider_registered', 'provider_compliance_updated', 'agreement_created', 'modification_recorded', 'modification_substantial'] },
];

export type AGRCEventType =
  | 'risk.changed'
  | 'risk.exceeded_appetite'
  | 'control.stale'
  | 'control.state_changed'
  | 'policy.violated'
  | 'policy.approved'
  | 'policy.review_due'
  | 'gate.blocked'
  | 'gate.allowed'
  | 'gate.overridden'
  | 'telemetry.ingested'
  | 'telemetry.threat_high'
  | 'escalation.triggered'
  | 'escalation.timeout'
  | 'delta.detected'
  | 'delta.impact_assessed'
  | 'ccm.cycle_completed'
  | 'ccm.stale_detected'
  | 'cycle.started'
  | 'cycle.completed'
  | 'cycle.failed'
  | 'constitution.updated'
  | 'constitution.breach'
  | 'vendor.gate_blocked'
  | 'vendor.onboarded'
  | 'incident.created'
  | 'incident.escalated'
  | 'audit.finding_created'
  | 'notification.sent'
  | 'stakeholder.invited'
  | 'stakeholder.accepted'
  | 'stakeholder.invitation_revoked'
  | 'vendor.questionnaire_distributed'
  | 'vendor.questionnaire_responded'
  | 'vendor.questionnaire_overdue'
  | 'vendor.engagement_score_low'
  | 'vendor.evidence_rejected'
  | 'regulator.request_received'
  | 'regulator.deadline_approaching'
  | 'consultant.finding_added'
  | 'engagement.cycle_completed'
  | 'task.auto_created'
  | 'approval.completed'
  | 'approval.rejected'
  | 'delegation.granted'
  | 'delegation.revoked'
  | 'onboarding.agent_completed'
  | 'lifecycle.checkpoint_due'
  | 'lifecycle.checkpoint_completed'
  | 'lifecycle.re_answer_applied'
  | 'lifecycle.misalignment_detected'
  | 'lifecycle.template_injected'
  | 'triage.proposals_generated'
  | 'unified_squad.deployment_mode_defaulted'
  | 'unified_squad.task_assigned'
  | 'unified_squad.delivery_failed'
  | 'unified_squad.status_changed'
  | 'risk_pair.agent_assessed'
  | 'calibration.proposed'
  | 'risk.created'
  | 'risk.mitigation_required'
  | 'risk.score_changed'
  | 'risk.treatment_updated'
  | 'compliance.gap_detected'
  | 'compliance.posture_changed'
  | 'compliance.assessment_completed'
  | 'evidence.expired'
  | 'evidence.requested'
  | 'evidence.uploaded'
  | 'evidence.coverage_low'
  | 'evidence.approved'
  | 'evidence.rejected'
  | 'evidence.submitted'
  | 'evidence.collected'
  | 'evidence.version_created'
  | 'evidence.task_submitted'
  | 'evidence.task_approved'
  | 'evidence.task_rejected'
  | 'control.failed'
  | 'control.implemented'
  | 'control.effectiveness_low'
  | 'policy.created'
  | 'policy.expired'
  | 'policy.review_completed'
  | 'policy.version_created'
  | 'procedure.created'
  | 'procedure.approved'
  | 'procedure.expired'
  | 'procedure.review_due'
  | 'procedure.version_created'
  | 'framework.mapped'
  | 'framework.gap_identified'
  | 'framework.updated'
  | 'vendor.risk_changed'
  | 'vendor.assessment_due'
  | 'vendor.contract_expiring'
  | 'vendor.dd_initiated'
  | 'vendor.dd_completed'
  | 'vendor.dd_expired'
  | 'vendor.sla_breached'
  | 'vendor.sla_warning'
  | 'vendor.fourth_party_flagged'
  | 'vendor.concentration_high'
  | 'vendor.offboarding_initiated'
  | 'vendor.offboarding_completed'
  | 'vendor.monitoring_signal'
  | 'vendor.risk_propagated'
  | 'vendor.compliance_gap_propagated'
  | 'vendor.evidence_auto_satisfied'
  | 'vendor.audit_finding_propagated'
  | 'vendor.framework_sync_triggered'
  | 'vendor.posture_recalculated'
  | 'vendor.cascade_risk_assessed'
  | 'incident.resolved'
  | 'incident.root_cause_identified'
  | 'incident.sla_breached'
  | 'incident.near_miss_reported'
  | 'incident.near_miss_converted'
  | 'incident.pir_created'
  | 'incident.pir_signed_off'
  | 'incident.regulatory_notification_due'
  | 'incident.regulatory_submitted'
  | 'incident.risk_linked'
  | 'incident.trend_detected'
  | 'audit.completed'
  | 'audit.remediation_due'
  | 'workflow.sla_breached'
  | 'workflow.approval_required'
  | 'privacy.impact_high'
  | 'privacy.dpia_required'
  | 'knowledge.gap_detected'
  | 'automation.rule_triggered'
  | 'report.generated'
  | 'report.overdue'
  | 'ops.health_degraded'
  | 'ops.capacity_warning'
  | 'crosshub.cascade_triggered'
  | 'connector.sync_completed'
  | 'connector.sync_failed'
  | 'connector.connected'
  | 'connector.disconnected'
  | 'connector.health_degraded'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.role_changed'
  | 'team.created'
  | 'team.disbanded'
  | 'process_task.created'
  | 'process_task.assigned'
  | 'process_task.sla_warning'
  | 'process_task.sla_breached'
  | 'process_task.escalated'
  | 'process_task.completed'
  | 'evidence.request_created'
  | 'evidence.request_submitted'
  | 'evidence.request_overdue'
  | 'audit.finding.sla_breached'
  | 'audit.finding.sla_warning'
  | 'audit.schedule.triggered'
  | 'audit.qa.approved'
  | 'audit.qa.rejected'
  | 'audit.capa.effectiveness_tested'
  | 'audit.cross_module.risk_synced'
  | 'raci.assigned'
  | 'raci.removed'
  | 'raci.gap_detected'
  | 'raci.auto_assigned'
  | 'raci.expired'
  | 'raci.cascade_triggered'
  | 'raci.enforcement_blocked'
  | 'raci.renewal_due'
  | 'bcp.plan_created'
  | 'bcp.plan_activated'
  | 'bcp.plan_deactivated'
  | 'bcp.plan_stale'
  | 'bcp.exercise_scheduled'
  | 'bcp.exercise_completed'
  | 'bcp.exercise_overdue'
  | 'bcp.bia_completed'
  | 'bcp.bia_criticality_high'
  | 'bcp.crisis_comm_activated'
  | 'bcp.recovery_step_completed'
  | 'bcp.recovery_step_failed'
  | 'bcp.maturity_assessed'
  | 'bcp.dependency_critical'
  | 'bcp.rto_rpo_drift'
  | 'bcp.crisis_readiness_low'
  | 'bcp.bia_stale'
  | 'bcp.maturity_regression'
  | 'bcp.health_check_completed'
  | 'bcp.readiness_score_changed'
  | 'training.campaign_launched'
  | 'training.campaign_completed'
  | 'training.assignment_overdue'
  | 'training.assignment_completed'
  | 'training.certification_issued'
  | 'training.certification_expiring'
  | 'training.phishing_launched'
  | 'training.phishing_completed'
  | 'training.compliance_gap'
  | 'training.content_published'
  | 'advanced.redteam_finding'
  | 'advanced.vulnerability_found'
  | 'advanced.model_risk_high'
  | 'advanced.simulation_completed'
  | 'advanced.digital_twin_changed'
  | 'admin.tenant_suspended'
  | 'admin.tenant_activated'
  | 'admin.user_deactivated'
  | 'admin.role_changed'
  | 'admin.plan_upgraded'
  | 'admin.config_changed'
  | 'knowledge.content_pack_installed'
  | 'knowledge.content_pack_removed'
  | 'knowledge.sop_updated'
  | 'knowledge.training_completed'
  | 'governance.charter_expired'
  | 'governance.mandate_expired'
  | 'governance.delegation_expiring'
  | 'governance.delegation_expired'
  | 'governance.action_overdue'
  | 'governance.action_escalated'
  | 'governance.policy_review_overdue'
  | 'governance.enforcement_violation'
  | 'governance.health_score_changed'
  | 'governance.board_attention_item'
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.cancelled'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.renewed'
  | 'subscription.renewal_due'
  | 'subscription.expired'
  | 'subscription.past_due'
  | 'subscription.grace_period_entered'
  | 'subscription.grace_started'
  | 'subscription.grace_period_expired'
  | 'subscription.grace_ending'
  | 'subscription.trial_started'
  | 'subscription.trial_expired'
  | 'subscription.trial_extended'
  | 'subscription.extended'
  | 'subscription.tier_upgraded'
  | 'subscription.upgraded'
  | 'subscription.tier_downgraded'
  | 'subscription.downgraded'
  | 'subscription.downgrade_scheduled'
  | 'subscription.downgrade_cancelled'
  | 'subscription.payment_succeeded'
  | 'subscription.payment_failed'
  | 'subscription.renewal_mode_changed'
  | 'subscription.usage_limit_reached'
  | 'subscription.usage_limit_warning'
  | 'subscription.usage_limit_blocked'
  | 'foundation.organization.created'
  | 'foundation.organization.updated'
  | 'foundation.organization.deleted'
  | 'foundation.organization.status_changed'
  | 'foundation.business_unit.created'
  | 'foundation.business_unit.updated'
  | 'foundation.business_unit.deleted'
  | 'foundation.business_unit.status_changed'
  | 'foundation.department.created'
  | 'foundation.department.updated'
  | 'foundation.department.deleted'
  | 'foundation.department.status_changed'
  | 'foundation.location.created'
  | 'foundation.location.updated'
  | 'foundation.location.deleted'
  | 'foundation.team.created'
  | 'foundation.team.updated'
  | 'foundation.team.deleted'
  | 'foundation.role.created'
  | 'foundation.role.updated'
  | 'foundation.role.deleted'
  | 'foundation.user.created'
  | 'foundation.user.updated'
  | 'foundation.user.deleted'
  | 'foundation.user.status_changed'
  | 'foundation.person_created'
  | 'foundation.module_assignment_created'
  | 'foundation.module_assignment_updated'
  | 'foundation.responsibility_confirmed'
  | 'foundation.responsibility_rejected'
  | 'foundation.bulk_import_completed'
  | 'foundation.auto_suggest_completed'
  | 'foundation.ownership_wired'
  | 'risk.status_changed'
  | 'compliance.status_changed'
  | 'policy.status_changed'
  | 'policy.published'
  | 'evidence.status_changed'
  | 'audit.status_changed'
  | 'audit.finding.issued'
  | 'incident.status_changed'
  | 'exception.created'
  | 'exception.status_changed'
  | 'exception.approved'
  | 'exception.rejected'
  | 'governance.status_changed'
  | 'vendor.status_changed'
  | 'bcp.status_changed'
  | 'asset.created'
  | 'asset.status_changed'
  | 'asset.classified'
  | 'asset.decommissioned'
  | 'remediation.created'
  | 'remediation.status_changed'
  | 'remediation.completed'
  | 'action.created'
  | 'action.status_changed'
  | 'action.completed'
  | 'crosshub.chain_completed'
  | 'crosshub.chain_step_started'
  | 'process_task.unassigned'
  | 'role.assigned'
  | 'role.unassigned'
  | 'sod.conflict_detected'
  | 'sod.conflict_resolved'
  | 'ai_supply_chain.provenance_registered'
  | 'ai_supply_chain.lineage_tracked'
  | 'ai_supply_chain.provider_registered'
  | 'ai_supply_chain.provider_compliance_updated'
  | 'ai_supply_chain.agreement_created'
  | 'ai_supply_chain.modification_recorded'
  | 'ai_supply_chain.modification_substantial'
  | 'pdpl.consent_granted'
  | 'pdpl.consent_revoked'
  | 'qiyas.assessment_created'
  | 'qiyas.assessment_finalized'
  | 'qiyas.scores_computed'
  | 'qiyas.gap_critical'
  | 'qiyas.gap_closed'
  | 'qiyas.recommendation_generated'
  | 'qiyas.recommendation_accepted'
  | 'qiyas.recommendation_rejected'
  | 'qiyas.maturity_threshold_crossed'
  | 'qiyas.maturity_improved'
  | 'qiyas.maturity_regressed'
  | 'qiyas.indicator_score_updated'
  | 'qiyas.calibration_proposed'
  | 'qiyas.calibration_completed'
  | 'qiyas.benchmark_published'
  | 'qiyas.certification_gap_closed'
  | 'qiyas.certification_ready'
  | 'qiyas.evidence_quality_scored'
  | 'qiyas.respondent_assigned'
  | 'qiyas.respondent_completed'
  | (string & {});

/** Runtime registration uses {@link AGRC_EVENT_TYPES}; typings use the full union above. */
export type AgrcEventType = AGRCEventType;
